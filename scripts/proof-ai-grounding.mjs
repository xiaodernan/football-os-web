import { createServer } from "vite";
import { readFileSync } from "node:fs";

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
const { SEARCH_KINDS } = await server.ssrLoadModule("/domain/types.ts");
const { makeSay } = await import("./lib/rows.mjs");
const { asRowText, rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { say, locales, DICTIONARIES } = await makeSay(server);
// What the panel shows for one answer: the lead row and the fact rows after it, each
// resolved in English the way the screen resolves them for its reader.
const isRow = (x) => !!x && typeof x === "object" && ("key" in x || "value" in x);
// A module that goes back to composing English hands the panel a bare string; resolving
// that would throw, and a crashed proof proves nothing about which rule broke.
const AT = (x) => x.answer.map((r) => (isRow(r) ? say("en")(r) : "⟨NOT A ROW⟩")).join(" ");

// M183: a source is a row now — `{kind, name}` — because the retrieval layer's own
// identifier (`club:mci`) is a code, and the panel used to print it to the visitor.
const sourceIs = (ans, kind, name) => {
  const s = ans.sources?.[0];
  return !!s && "key" in s && s.vars?.kind === kind && s.vars?.name === name;
};

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Fixtures are self-selected from the seeded world so the proof stays
// deterministic without hardcoding synthetic names: we take the first high-value
// player / club whose answer actually resolves to that entity as the top hit.
function valueFixture() {
  for (const p of trendingPlayers(40)) {
    const q = `How much is ${p.name} worth?`;
    const ans = askIntelligence(q);
    if (sourceIs(ans, "player", p.name) && AT(ans).includes(formatValue(p.value))) return { p, q, ans };
  }
  return null;
}
function clubFixture() {
  for (const c of footballProvider.clubs()) {
    const q = `Who is the key player at ${c.name}?`;
    const ans = askIntelligence(q);
    if (sourceIs(ans, "club", c.name) && /Based on the retrieved data about/.test(AT(ans))) return { c, q, ans };
  }
  return null;
}

// ---- M102: a player value question extracts the real currency figure ----
const vf = valueFixture();
ok("a high-value player resolves to a value answer", !!vf);
if (vf) {
  ok("value answer states the market-value lead", /current market value is/.test(AT(vf.ans)));
  ok("value answer embeds the exact listed figure", AT(vf.ans).includes(formatValue(vf.p.value)));
  ok("value answer carries a real € token", /€[\d.]+[MBK]?/.test(AT(vf.ans)));
  // Predicted from the records, not from whatever the answer happened to contain: the
  // three priciest players in the dataset, each asked by name, must each be answered with
  // that player's own listed figure. A hardcoded €-string cannot match three values, and
  // the regex-scraping this replaced could quietly satisfy one player out of four hundred.
  const rich = footballProvider.players().slice().sort((x, y) => y.value - x.value).slice(0, 3);
  const wrongFigure = rich.filter((x) => !AT(askIntelligence(`How much is ${x.name} worth?`)).includes(formatValue(x.value)));
  ok("the three most valuable players each get their own figure back (" + wrongFigure.length + " wrong)",
    wrongFigure.length === 0);
  // The M102 bug degraded every value answer to these stubs; assert neither returns.
  ok("value answer is NOT the 'not in the retrieved data' stub", !/not in the retrieved data/.test(AT(vf.ans)));
  ok("value answer is NOT the old 'sits at listed' stub", !/sits at listed/.test(AT(vf.ans)));
}

// ---- M91: a who/key question is grounded, never a fabricated ranking ----
const cf = clubFixture();
ok("a club who-question resolves to a grounded answer", !!cf);
if (cf) {
  ok("who answer uses the grounded 'retrieved data' framing", /Based on the retrieved data about/.test(AT(cf.ans)));
  ok("who answer does NOT invent a decisive-player ranking", !/most influential figure|stands out in/i.test(AT(cf.ans)));
  ok("who answer cites at least one retrieved fact", cf.ans.facts.length >= 1);
}

// ---- No-hits refusal: never invent when retrieval comes up empty ----
const none = askIntelligence("qqzz xxwv nonexistent fixture zzz 42711");
ok("empty retrieval refuses to invent an answer", /will not invent/i.test(AT(none)));
ok("empty retrieval labels the demo provider", /Demo retrieval|no live model|API key/i.test(AT(none)));
ok("empty retrieval has no fabricated facts", none.facts.length === 0);
ok("empty retrieval confidence sits at the honest floor", none.confidence === 20);

// ---- Always-grounded contract on every answer (evidence + sources + confidence) ----
if (vf) {
  const a = vf.ans;
  ok("answer is a non-empty list of rows", Array.isArray(a.answer) && a.answer.length > 0 && AT(a).length > 20);
  ok("answer ships an evidence fact list", Array.isArray(a.facts) && a.facts.length >= 1);
  ok("every answer element is a row", a.answer.every(isRow));
  ok("and the answer is its lead plus at least one retrieved fact, not a lead alone",
    a.answer.length >= 2);
  ok("every evidence line is a row", a.facts.every((f) => isRow(f.text) && isRow(f.label)));
  ok("answer ships sources (or the honest 'no entity' label)", Array.isArray(a.sources) && a.sources.length >= 1);
  ok("confidence is an integer within the 20..92 band", Number.isInteger(a.confidence) && a.confidence >= 20 && a.confidence <= 92);
}

// ---- M106: the write-only raw-hits field is no longer carried on an answer ----
if (vf) ok("answer no longer exposes the removed `retrieved` field", !("retrieved" in vf.ans));

// ---- Determinism: identical question reproduces the grounded result ----
if (vf) {
  const b = askIntelligence(vf.q);
  ok("deterministic answer rows", JSON.stringify(b.answer) === JSON.stringify(vf.ans.answer));
  ok("deterministic confidence", b.confidence === vf.ans.confidence);
  ok("deterministic facts", JSON.stringify(b.facts) === JSON.stringify(vf.ans.facts));
  ok("deterministic sources", JSON.stringify(b.sources) === JSON.stringify(vf.ans.sources));
}

// ---- M183: the chips and the source line are rows, in every locale ----
{
  const answers = ["How much is Mbappé worth?", "Where do Arsenal sit in the Premier League?", "Any transfer news about Haaland?", "Real Madrid"]
    .map((q) => askIntelligence(q));
  const isRow = (x) => !!x && typeof x === "object" && ("key" in x || "value" in x);
  const sources = answers.flatMap((a) => a.sources);
  const labels = answers.flatMap((a) => a.facts.map((f) => f.label));
  ok("every source line is a row naming a kind and a retrieved title",
    sources.length >= 4 && sources.every((s) => isRow(s) && "key" in s && s.key === "ai.src.entity" && SEARCH_KINDS.includes(s.vars.kind) && String(s.vars.name).length > 1));
  ok("no source line carries the retrieval layer's own `type:id` code",
    !sources.some((s) => isRow(s) && "key" in s && String(s.vars.name).includes(":")));
  const leaked = [];
  for (const s of sources) for (const l of locales) {
    if (!isRow(s)) { leaked.push(`${l}: ${JSON.stringify(s)} is not a row`); continue; }
    const line = say(l)(s);
    if (!line.trim() || /\{\w+\}/.test(line) || line.startsWith("ai.src")) leaked.push(`${l}: ${line}`);
    // The kind word must be the locale's own — the same row the graph legend renders.
    else if (!line.includes(DICTIONARIES[l][`ai.legend.${s.vars?.kind}`])) leaked.push(`${l}: kind left untranslated — ${line}`);
  }
  ok("a reader of any locale sees `Club · Real Madrid`, never `club:lr` (" + leaked.length + " bad)", leaked.length === 0);
  for (const b of leaked.slice(0, 4)) console.log("       " + b);
  ok("every evidence chip label is a row", labels.length >= 4 && labels.every(isRow));
  ok("a chip's English word is keyed, never typed as a value",
    labels.every((lab) => !isRow(lab) || "key" in lab || !["Standings", "Key man", "Profile", "Fixture", "Model", "Career arc", "Template edge", "Next fixture", "Next fixture model"].includes(lab.value)));
  const recordLabeled = labels.filter((lab) => isRow(lab) && "value" in lab);
  ok("a record-derived chip is never empty or a placeholder",
    recordLabeled.every((lab) => typeof lab.value === "string" && lab.value.trim().length > 1 && !/[{]/.test(lab.value)));
  const labelKeys = [...new Set(labels.filter((lab) => isRow(lab) && "key" in lab).map((lab) => lab.key))];
  ok("the queries above actually walk the chip vocabulary (" + labelKeys.length + " distinct labels)",
    labelKeys.length >= 4 && labelKeys.every((k) => k.startsWith("ai.lab.") || k.startsWith("det.scout.")));
  const chipLeaks = labels.filter((lab) => isRow(lab) && "key" in lab).flatMap((lab) => locales.filter((l) => !(DICTIONARIES[l][lab.key] ?? "").trim()))
    .concat(labels.filter((lab) => isRow(lab) && "key" in lab).flatMap((lab) => locales.filter((l) => /\{/.test(DICTIONARIES[l][lab.key] ?? ""))));
  ok("every chip word exists and interpolates nothing in all three locales (" + chipLeaks.length + " problems)", chipLeaks.length === 0);
  // The stored log is the other half of the contract: a chat row written before this
  // change holds plain strings, and they must still render as written rather than as
  // "[object Object]" or a bare key.
  const legacy = asRowText("club:mci");
  ok("the panel normalises a stored string answer into a row rather than reading it raw",
  /content: Array\.isArray\(m\.content\) \? m\.content : \[asRowText/.test(readFileSync("features/ai/AiStudio.tsx", "utf8")));
  ok("a stored plain-string row is kept verbatim, not re-interpreted",
    "value" in legacy && rowLine(legacy, (k) => k) === "club:mci");
  // The screen is the other half of the contract: a row the panel prints raw is
  // "[object Object]" on the page, and the raw-UI scan cannot see it because the words are
  // not in the component at all.
  const PANEL = readFileSync("features/ai/AiStudio.tsx", "utf8");
  ok("the chat panel interprets the chip label and the source row through rowLine",
    (PANEL.match(/rowLine\(f\.label,\s*t\)/g) ?? []).length === 2 && /rowLine\(s,\s*t\)/.test(PANEL));
  ok("and it reads the stored log through the normaliser, never the raw array",
    /entries\.map\(\(m, i\)/.test(PANEL) && !/\{\s*log\.map\(/.test(PANEL));
  ok("the normaliser is the boundary the legacy strings need",
    /asRowText\(f\.label/.test(PANEL) && /asRowText\(s\s+as\s+string\s*\|\s*RowText\)/.test(PANEL));
}

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
