// Proof for the player-comparison model (domain/compare.ts). It independently
// re-derives every headline the UI shows — the aWins/bWins tally, the advantage
// verdict, the attribute-edge sort, the index-aligned category averages, the
// EUR formatting and the mirror-symmetry of A-vs-B — so a future change can't
// quietly make the "who has the edge" read contradict its own stated rule.
// Run: node scripts/proof-compare.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { compare } = await server.ssrLoadModule("/domain/compare.ts");
const { headroom, valueIndex, primeYears, primeWindow, primeHold, primeYearsLabel, bucketOf } =
  await server.ssrLoadModule("/domain/scouting.ts");
const { categoryAverages, attributeLabel } = await server.ssrLoadModule("/domain/attributes.ts");
const { footballProvider, getPlayer } = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Independent re-implementations of the private helpers compare.ts relies on.
const round1 = (n) => Math.round(n * 10) / 10;
const advantage = (p) =>
  p.overall + headroom(p) * 0.6 + primeHold(p) * 1.5 - Math.min(20, p.value / 100_000_000);
const dataOnly = (r) => JSON.stringify({
  aId: r.a.id, bId: r.b.id, sameBucket: r.sameBucket, aWins: r.aWins, bWins: r.bWins,
  verdict: r.verdict, hasAttributes: r.hasAttributes,
  metrics: r.metrics.map((m) => ({ key: m.key, dir: m.dir, a: m.a, b: m.b })),
  attributeEdges: r.attributeEdges, categoryEdges: r.categoryEdges,
});
const metric = (r, key) => r.metrics.find((m) => m.key === key);

// --- Guard clauses ---------------------------------------------------------
ok("unknown ids → null", compare("__nope_a__", "__nope_b__") === null);

const players = footballProvider.players();
ok("dataset has ≥ 2 players", players.length >= 2);
const pa = getPlayer(players[0].id);
const pb = getPlayer(players[1].id);
ok("compare(a, a) → null (same id rejected)", compare(pa.id, pa.id) === null);
ok("one known + one unknown → null", compare(pa.id, "__nope__") === null);

// --- Core comparison on two real players -----------------------------------
const r = compare(pa.id, pb.id);
ok("two distinct players → a result", !!r);
ok("result side A is the first id, B is the second", r.a.id === pa.id && r.b.id === pb.id);
ok("determinism: same call reproduces identical data", dataOnly(compare(pa.id, pb.id)) === dataOnly(r));

// --- Headline metrics: fixed set, stated directions, real source values ----
ok("exactly 7 headline metrics", r.metrics.length === 7);
const metricKeys = r.metrics.map((m) => m.key);
const wantKeys = ["overall", "potential", "headroom", "age", "prime", "value", "valueIndex"];
ok("metric keys present in the documented order", JSON.stringify(metricKeys) === JSON.stringify(wantKeys));
ok("age is a 'low is better' metric", metric(r, "age").dir === "low");
ok("market value is a neutral 'info' metric", metric(r, "value").dir === "info");
ok("quality metrics are 'high is better'", ["overall", "potential", "headroom", "prime", "valueIndex"]
  .every((k) => metric(r, k).dir === "high"));

const srcMatch =
  metric(r, "overall").a === pa.overall && metric(r, "overall").b === pb.overall &&
  metric(r, "potential").a === pa.potential &&
  metric(r, "headroom").a === headroom(pa) && metric(r, "headroom").b === headroom(pb) &&
  metric(r, "age").a === pa.age &&
  metric(r, "prime").a === Math.round(primeHold(pa)) && metric(r, "prime").b === Math.round(primeHold(pb)) &&
  metric(r, "value").a === pa.value &&
  metric(r, "valueIndex").a === round1(valueIndex(pa)) && metric(r, "valueIndex").b === round1(valueIndex(pb));
ok("every metric value traces to the stored player fields (nothing estimated)", srcMatch);

// --- aWins / bWins tally, recomputed from the stated directions ------------
let expA = 0, expB = 0, ties = 0;
for (const m of r.metrics) {
  if (m.dir === "info") continue;
  if (m.a === m.b) { ties++; continue; }
  const aBetter = m.dir === "high" ? m.a > m.b : m.a < m.b;
  if (aBetter) expA++; else expB++;
}
ok("aWins matches the direction-based recount", r.aWins === expA);
ok("bWins matches the direction-based recount", r.bWins === expB);
ok("wins + ties cover exactly the non-info metrics", r.aWins + r.bWins + ties === r.metrics.length - 1);

// --- Verdict, recomputed from the transparent advantage formula -----------
const adv = advantage(pa) - advantage(pb);
const expVerdict = Math.abs(adv) < 1.5 ? "even" : adv > 0 ? "a" : "b";
ok("verdict matches the advantage formula within its 1.5 dead-band", r.verdict === expVerdict);
ok("verdict is one of a / b / even", ["a", "b", "even"].includes(r.verdict));

// --- Attribute edges: gate, sourcing, sort order, capped, honest ----------
ok("dataset players both carry vectors", r.hasAttributes === true);
ok("attributeEdges is capped at 8", r.attributeEdges.length <= 8);
const sharedKeys = Object.keys(pa.attributes).filter((k) => typeof pb.attributes[k] === "number");
const expEdges = sharedKeys
  .map((k) => { const d = pa.attributes[k] - pb.attributes[k]; return { key: k, a: pa.attributes[k], b: pb.attributes[k], delta: d, favor: d > 0 ? "a" : d < 0 ? "b" : "even" }; })
  .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.key.localeCompare(y.key))
  .slice(0, 8);
ok("attribute edges equal the fully recomputed shared-key set", JSON.stringify(r.attributeEdges) === JSON.stringify(expEdges));
ok("each edge's delta is exactly a − b and favor tracks its sign",
  r.attributeEdges.every((e) => e.delta === e.a - e.b && e.favor === (e.delta > 0 ? "a" : e.delta < 0 ? "b" : "even")));
ok("every attribute edge carries its key and numbers only — no display label reaches the UI",
  r.attributeEdges.every((e) => Object.keys(e).sort().join(",") === "a,b,delta,favor,key"));
ok("each edge key resolves in the attribute name table (an unknown key would echo itself, a raw key reads as snake_case)",
  r.attributeEdges.every((e) => attributeLabel(e.key) !== e.key && !/_/.test(attributeLabel(e.key))));
const sortedDesc = r.attributeEdges.every((e, i) => i === 0 || Math.abs(r.attributeEdges[i - 1].delta) >= Math.abs(e.delta));
ok("edges are ordered by |delta| descending", sortedDesc);

// --- Category edges: fixed order, index-aligned A↔B, correct pairing -------
const catA = categoryAverages(pa.attributes);
const catB = categoryAverages(pb.attributes);
ok("one category edge per category, in the shared fixed order",
  r.categoryEdges.length === catA.length && r.categoryEdges.every((c, i) => c.category === catA[i].category));
ok("category edge a/b pair the SAME category across players (index alignment holds)",
  r.categoryEdges.every((c, i) => c.a === catA[i].value && c.b === catB[i].value));
ok("category delta is a − b with a sign-consistent favor",
  r.categoryEdges.every((c) => c.delta === c.a - c.b && c.favor === (c.delta > 0 ? "a" : c.delta < 0 ? "b" : "even")));

// --- Mirror symmetry: compare(b, a) flips every directional field ----------
const rr = compare(pb.id, pa.id);
ok("verdict mirrors under swapped sides", rr.verdict === (r.verdict === "a" ? "b" : r.verdict === "b" ? "a" : "even"));
ok("win tallies swap under swapped sides", rr.aWins === r.bWins && rr.bWins === r.aWins);
ok("sameBucket is symmetric", rr.sameBucket === r.sameBucket);
ok("hasAttributes is symmetric", rr.hasAttributes === r.hasAttributes);
const edgeBy = (list) => Object.fromEntries(list.map((e) => [e.key, e]));
const ea = edgeBy(r.attributeEdges), eb = edgeBy(rr.attributeEdges);
ok("attribute deltas flip sign and favor under swapped sides",
  Object.keys(ea).every((k) => eb[k] && eb[k].delta === -ea[k].delta && eb[k].favor === (ea[k].favor === "a" ? "b" : ea[k].favor === "b" ? "a" : "even")));

// --- sameBucket reflects the real position-group buckets, both ways -------
let sawSame = false, sawDiff = false, bucketBad = 0;
for (let i = 0; i < players.length && !(sawSame && sawDiff); i++) {
  for (let j = i + 1; j < players.length; j++) {
    const x = getPlayer(players[i].id), y = getPlayer(players[j].id);
    const cmp = compare(x.id, y.id);
    const exp = bucketOf(x.positionGroup) === bucketOf(y.positionGroup);
    if (cmp.sameBucket !== exp) bucketBad++;
    if (exp) sawSame = true; else sawDiff = true;
    if (sawSame && sawDiff) break;
  }
}
ok("sameBucket matches the recomputed position-group bucket test", bucketBad === 0);
ok("dataset exercises both same- and cross-bucket pairings", sawSame && sawDiff);

// --- EUR / number formatting branch coverage (display fn is exposed) -------
const money = metric(r, "value").display;
ok("€B for ≥ 1e9", money(2_500_000_000) === "€2.5B");
ok("€M integer for ≥ 10M", money(120_000_000) === "€120M");
ok("€M one decimal below 10M", money(5_500_000) === "€5.5M");
ok("€K below 1M", money(900_000) === "€900K");
ok("€ raw below 1K", money(500) === "€500");
ok("overall displays as a bare integer", metric(r, "overall").display(70) === "70");
ok("headroom displays with an explicit + sign", metric(r, "headroom").display(5) === "+5");
ok("valueIndex displays one decimal", metric(r, "valueIndex").display(3.14) === "3.1");

// --- The prime window: a display bound, and what the reader is told when it bites --
// The window is measured on a scale from about -7 to +20 and shown on 0..10, so for
// most players the bound is what they are actually seeing. That is a fine display rule
// and a wrong model input, which is the distinction these checks hold apart.
const P = (potential, overall, age) => ({ potential, overall, age });
const past = P(77, 77, 34);      // raw -7   below the floor
const justIn = P(89, 70, 27);    // raw 9.5  rounds onto the bound without passing it
const onBound = P(90, 70, 27);   // raw 10   exactly the bound
const past10 = P(91, 70, 27);    // raw 10.5 through it
const far = P(96, 70, 20);       // raw 20   far beyond it

ok("beyond the bound: years show the bound, and raw plus capped keep the truth",
  primeWindow(far).raw === 20 && primeYears(far) === 10 && primeWindow(far).capped === true &&
  primeYearsLabel(far) === "10+" && primeHold(far) === 20);
ok("a measurement that lands on the bound is not labelled as a bound",
  primeWindow(onBound).raw === 10 && primeWindow(onBound).capped === false &&
  primeYearsLabel(onBound) === "10" && primeYearsLabel(past10) === "10+" &&
  primeWindow(justIn).capped === false && primeYears(justIn) === 10);
ok("below the floor the window reads 0 to a reader but never negative to the model",
  primeWindow(past).raw === -7 && primeYears(past) === 0 && primeHold(past) === 0 &&
  primeYearsLabel(past) === "0" && primeWindow(past).capped === false);
ok("the bound flattens players the window itself can tell apart",
  primeYears(justIn) === primeYears(far) &&
  Math.round(primeHold(justIn)) === 10 && Math.round(primeHold(far)) === 20);
ok("one year of age moves the window by one, two points of headroom by one",
  primeHold(P(80, 70, 24)) - primeHold(P(80, 70, 25)) === 1 &&
  primeHold(P(82, 70, 25)) - primeHold(P(80, 70, 25)) === 1);

const all = footballProvider.players();
const capped = all.filter((p) => primeWindow(p).capped);
const floored = all.filter((p) => primeWindow(p).raw < 0);
const bareAtCap = capped.filter((p) => primeYearsLabel(p) !== "10+").map((p) => p.id);
ok(`the dataset really reaches both edges of the bound (${capped.length} past the cap, ${floored.length} past the floor, of ${all.length})`,
  capped.length > 0 && floored.length > 0);
ok(`no player at the ceiling is shown as a bare measurement (${bareAtCap.length} wrong)`,
  bareAtCap.length === 0);
const shownYears = new Set(all.map(primeYears)).size;
const shownHold = new Set(all.map((p) => Math.round(primeHold(p)))).size;
ok(`the window the verdict reads tells more players apart than the display bound does (${shownHold} vs ${shownYears} distinct values)`,
  shownHold > shownYears && shownYears >= 2);

const cmpSrc = readFileSync("domain/compare.ts", "utf8");
ok("the verdict reads the uncapped window, and the clamped figure is gone from that file",
  cmpSrc.includes("primeHold(p) * 1.5") && !/\bprimeYears\(/.test(cmpSrc));

// The label is only honest if the screens actually use it — a bare {primeYears(p)} in
// JSX renders "10" for a 20-year window and nothing else would notice.
const readers = ["features/scouting/ScoutingPanel.tsx", "features/watchlist/WatchlistBoard.tsx"];
const bareReaders = readers.filter((f) => /\bprimeYears\(/.test(readFileSync(f, "utf8")));
ok(`both prime columns print the labelled window, never the raw bound (${bareReaders.join(", ") || "none bare"})`,
  bareReaders.length === 0 && readers.every((f) => readFileSync(f, "utf8").includes("primeYearsLabel(")));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
