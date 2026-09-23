import { createServer } from "vite";

// Pins the AI grounding + honesty contract for the retrieval layer: the answer
// surface is the product's most sensitive claim (spec §44–§47) and until now had
// no runnable gate. This covers the two honesty fixes that a future edit could
// silently regress — M91 (never invent a decisive-player ranking) and M102 (a
// value question must surface the real listed figure, not degrade to a stub) —
// plus the always-grounded contract, the no-hits refusal, determinism, and the
// M106 removal of the write-only `retrieved` field from every answer.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { askIntelligence } = await server.ssrLoadModule("/data/intelligence.ts");
const { footballProvider, formatValue, trendingPlayers } = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Fixtures are self-selected from the seeded world so the proof stays
// deterministic without hardcoding synthetic names: we take the first high-value
// player / club whose answer actually resolves to that entity as the top hit.
function valueFixture() {
  for (const p of trendingPlayers(40)) {
    const q = `How much is ${p.name} worth?`;
    const ans = askIntelligence(q);
    if (ans.sources[0] === "player:" + p.id && ans.answer.includes(formatValue(p.value))) return { p, q, ans };
  }
  return null;
}
function clubFixture() {
  for (const c of footballProvider.clubs()) {
    const q = `Who is the key player at ${c.name}?`;
    const ans = askIntelligence(q);
    if (ans.sources[0] === "club:" + c.id && /Based on the retrieved data about/.test(ans.answer)) return { c, q, ans };
  }
  return null;
}

// ---- M102: a player value question extracts the real currency figure ----
const vf = valueFixture();
ok("a high-value player resolves to a value answer", !!vf);
if (vf) {
  ok("value answer states the market-value lead", /current market value is/.test(vf.ans.answer));
  ok("value answer embeds the exact listed figure", vf.ans.answer.includes(formatValue(vf.p.value)));
  ok("value answer carries a real € token", /€[\d.]+[MBK]?/.test(vf.ans.answer));
  // The M102 bug degraded every value answer to these stubs; assert neither returns.
  ok("value answer is NOT the 'not in the retrieved data' stub", !/not in the retrieved data/.test(vf.ans.answer));
  ok("value answer is NOT the old 'sits at listed' stub", !/sits at listed/.test(vf.ans.answer));
}

// ---- M91: a who/key question is grounded, never a fabricated ranking ----
const cf = clubFixture();
ok("a club who-question resolves to a grounded answer", !!cf);
if (cf) {
  ok("who answer uses the grounded 'retrieved data' framing", /Based on the retrieved data about/.test(cf.ans.answer));
  ok("who answer does NOT invent a decisive-player ranking", !/most influential figure|stands out in/i.test(cf.ans.answer));
  ok("who answer cites at least one retrieved fact", cf.ans.facts.length >= 1);
}

// ---- No-hits refusal: never invent when retrieval comes up empty ----
const none = askIntelligence("qqzz xxwv nonexistent fixture zzz 42711");
ok("empty retrieval refuses to invent an answer", /will not invent/i.test(none.answer));
ok("empty retrieval labels the demo provider", /Demo retrieval|no live model|API key/i.test(none.answer));
ok("empty retrieval has no fabricated facts", none.facts.length === 0);
ok("empty retrieval confidence sits at the honest floor", none.confidence === 20);

// ---- Always-grounded contract on every answer (evidence + sources + confidence) ----
if (vf) {
  const a = vf.ans;
  ok("answer has a non-empty string body", typeof a.answer === "string" && a.answer.length > 0);
  ok("answer ships an evidence fact list", Array.isArray(a.facts) && a.facts.length >= 1);
  ok("answer ships sources (or the honest 'no entity' label)", Array.isArray(a.sources) && a.sources.length >= 1);
  ok("confidence is an integer within the 20..92 band", Number.isInteger(a.confidence) && a.confidence >= 20 && a.confidence <= 92);
}

// ---- M106: the write-only raw-hits field is no longer carried on an answer ----
if (vf) ok("answer no longer exposes the removed `retrieved` field", !("retrieved" in vf.ans));

// ---- Determinism: identical question reproduces the grounded result ----
if (vf) {
  const b = askIntelligence(vf.q);
  ok("deterministic answer text", b.answer === vf.ans.answer);
  ok("deterministic confidence", b.confidence === vf.ans.confidence);
  ok("deterministic facts", JSON.stringify(b.facts) === JSON.stringify(vf.ans.facts));
  ok("deterministic sources", JSON.stringify(b.sources) === JSON.stringify(vf.ans.sources));
}

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
