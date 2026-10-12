// Proof for the player-comparison model (domain/compare.ts). It independently
// re-derives every headline the UI shows — the aWins/bWins tally, the advantage
// verdict, the attribute-edge sort, the index-aligned category averages, the
// EUR formatting and the mirror-symmetry of A-vs-B — so a future change can't
// quietly make the "who has the edge" read contradict its own stated rule.
// Run: node scripts/proof-compare.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { compare } = await server.ssrLoadModule("/domain/compare.ts");
const { headroom, valueIndex, primeYears, primeWindow, primeHold, primeYearsLabel, bucketOf, scoutComparators, round1: shippedRound1 } =
  await server.ssrLoadModule("/domain/scouting.ts");
const { categoryAverages, attributeLabel } = await server.ssrLoadModule("/domain/attributes.ts");
const { footballProvider, getPlayer, formatValue } = await server.ssrLoadModule("/data/footballService.ts");

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
// M324 companion: a comparison with real players produces non-zero metrics, so the "nothing estimated" clause above has a population pin.
ok("the comparison produces all 7 headline metrics with real values", r.metrics.length === 7 && r.metrics.every((m) => typeof m.a === "number" && typeof m.b === "number"));

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
  r.attributeEdges.length > 0 && r.attributeEdges.every((e) => Object.keys(e).sort().join(",") === "a,b,delta,favor,key"));
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
ok("sameBucket matches the recomputed position-group bucket test", players.length > 0 && sawSame && sawDiff && bucketBad === 0);
ok("dataset exercises both same- and cross-bucket pairings", sawSame && sawDiff);

// --- EUR / number formatting branch coverage (display fn is exposed) -------
const money = metric(r, "value").display;
ok("€B for ≥ 1e9", money(2_500_000_000) === "€2.5B");
ok("€M integer for ≥ 10M", money(120_000_000) === "€120M");
ok("€M one decimal below 10M", money(5_500_000) === "€5.5M");
ok("€K below 1M", money(900_000) === "€900K");
ok("€ raw below 1K", money(500) === "€500");
// M331: /compare's value row must ride the app's single currency door. It used to call a
// private `formatEUR` that happened to be a byte-for-byte copy of footballService's
// `formatValue` — identical today, so nothing the reader sees changes, but two formulas that
// can drift apart the moment one is edited. These clauses bind the seam three ways: the exact
// function the row resolves to, the source that imports it, and the absence of any money
// formatting left in compare.ts itself.
ok("the value row's display is the shared formatValue itself, not a lookalike copy",
  metric(r, "value").display === formatValue);
const cmpMoneySrc = readFileSync("domain/compare.ts", "utf8");
const cmpEurs = (cmpMoneySrc.match(/€/g) || []).length;
ok(`domain/compare.ts imports formatValue from the data layer and quotes no currency of its own (${cmpEurs} "€" glyph, formatEUR present: ${/formatEUR/.test(cmpMoneySrc)}; the money source is ${cmpMoneySrc.length} byte(s))`,
  cmpMoneySrc.length > 0 &&
    /import[^;]*\bformatValue\b[^;]*from "@\/data\/footballService"/.test(cmpMoneySrc) &&
    cmpEurs === 0 && !/formatEUR/.test(cmpMoneySrc));
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
  readers.length > 0 && bareReaders.length === 0 && readers.every((f) => readFileSync(f, "utf8").includes("primeYearsLabel(")));

// --- M340→M342: the round1 seam -------------------------------------------
// M340 folded compare/transfers/careerArc's three private `round1` copies and transfers' inline
// fourth onto scouting's single export. M342 completes the sweep: review, filmInsights, footprint,
// gap, projection, training and worldEngine each inlined `Math.round(<expr> * 10) / 10` — seven more
// spellings of the same rounding, three of them nested two parens deep (avgOverall divides inside
// Math.round's argument; avgRating sums a reduce; the projection/training delta wraps a clamp).
// Identical today, so nothing a reader sees changes — but ten formulas that part company the moment
// one is re-rounded (to banker's rounding, say: the comparison row, the transfer feed, the career
// arc, the review card, the film evidence and the world average would then disagree on one number).
// All ten now ride scouting's single exported round1, except domain/career.ts — a separate session's
// active M335 lane this unit must not touch, so it is pinned below as the sole known residue and a
// reader can see exactly what is left and nothing more. The inline scan is a balanced-paren walk,
// not a fixed-nesting regex: `[^)]*` and even the one-level `(?:[^()]|\([^()]*\))*` go blind at depth
// two, which is precisely the shape three of these files carried. Each clause is armed by planted
// witnesses of the exact shape it charges, so "no copies found" is a measurement and not a blind scan.
const R1_HOME = "domain/scouting.ts";
const R1_CONSUMERS = ["domain/compare.ts", "domain/transfers.ts", "domain/careerArc.ts",
  "domain/review.ts", "domain/filmInsights.ts", "domain/footprint.ts", "domain/gap.ts",
  "domain/projection.ts", "domain/training.ts", "domain/worldEngine.ts"];
const r1src = Object.fromEntries([R1_HOME, ...R1_CONSUMERS].map((f) => [f, readFileSync(f, "utf8")]));
const LOCAL_DEF = /\n[ \t]*(?:export[ \t]+)?const[ \t]+round1[ \t]*=/g;
// Both spellings in the tree: nine consumers under domain/ import "./scouting", worldEngine imports
// "@/domain/scouting". The scan accepts either, so the importer pin is not blind to the @/ form.
const IMPORTS_R1 = /import[^;]*\bround1\b[^;]*from ["'](?:\.\/|@\/domain\/)scouting["']/g;
const nlocal = (s) => (s.match(LOCAL_DEF) || []).length;
// Balanced-paren inline round1 counter: find `Math.round(`, walk to its matching close, require the
// argument to end in `* 10` and the close to be followed by `/ 10`. Catches any nesting depth, which
// a fixed-nesting regex cannot.
const inlineRound1 = (src) => {
  let n = 0, i = 0;
  const KEY = "Math.round(";
  while ((i = src.indexOf(KEY, i)) !== -1) {
    let depth = 1, j = i + KEY.length;
    while (j < src.length && depth > 0) { const c = src[j++]; if (c === "(") depth++; else if (c === ")") depth--; }
    if (/\*\s*10$/.test(src.slice(i + KEY.length, j - 1).trimEnd()) && /^\s*\/\s*10\b/.test(src.slice(j))) n++;
    i = j;
  }
  return n;
};
// Plants: each scan above must prove it matches. plantLocal arms the re-declaration scan; plantFlat
// and plantNested arm the balanced walk on both a flat and a two-level-nested rounding (the naive
// one-level regex reads plantNested as 0 — that blind spot is the whole reason for the walk); the two
// import plants arm the spelling-tolerant importer scan. A plant reading 0 makes the verdict vacuous.
const plantLocal = nlocal("\nconst round1 = (n: number) => Math.round(n * 10) / 10;");
const plantFlat = inlineRound1("      valueIndex: Math.round(valueIndex(player) * 10) / 10,");
const plantNested = inlineRound1("  const a = Math.round((xs.reduce((s, x) => s + x, 0) / n) * 10) / 10;");
const plantImpDot = ("import { round1 } from \"./scouting\";".match(IMPORTS_R1) || []).length;
const plantImpAt = ("import { round1 } from \"@/domain/scouting\";".match(IMPORTS_R1) || []).length;
const privateDefs = R1_CONSUMERS.filter((f) => nlocal(r1src[f]) > 0).map((f) => `${f}(${nlocal(r1src[f])})`);
const importers = R1_CONSUMERS.filter((f) => (r1src[f].match(IMPORTS_R1) || []).length > 0);
const inlineInConsumers = R1_CONSUMERS.filter((f) => inlineRound1(r1src[f]) > 0).map((f) => `${f}(${inlineRound1(r1src[f])})`);
// Domain-wide residue: walk every domain module and list the ones that still inline a rounding. The
// measurement is that this is scouting's own exported body (the one legitimate copy) plus career.ts
// and nothing else — so the seam is otherwise closed across the whole directory, not just the ten.
const domainCarriers = readdirSync("domain").filter((f) => f.endsWith(".ts"))
  .map((f) => [`domain/${f}`, inlineRound1(readFileSync(`domain/${f}`, "utf8"))])
  .filter(([, n]) => n > 0);
const residue = domainCarriers.map(([f]) => f).filter((f) => f !== R1_HOME);

ok(`scouting.ts declares the one round1 and none of the ten consumers re-declares it (${privateDefs.join(", ") || "none"}; plant armed: ${plantLocal})`,
  plantLocal === 1 && nlocal(r1src[R1_HOME]) === 1 && privateDefs.length === 0);
ok(`the balanced inline scan is armed at both nesting depths and no consumer still inlines it (${inlineInConsumers.join(", ") || "none"}; plants: flat ${plantFlat}, nested ${plantNested})`,
  plantFlat === 1 && plantNested === 1 && inlineInConsumers.length === 0 && inlineRound1(r1src[R1_HOME]) === 1);
ok(`each of the ten consumers imports round1 from scouting, either spelling (${importers.join(", ") || "none"})`,
  plantImpDot === 1 && plantImpAt === 1 && importers.length === R1_CONSUMERS.length && R1_CONSUMERS.every((f) => importers.includes(f)));
ok(`across the whole domain directory the only inline round1 outside scouting's own body is the pinned career.ts residue (${residue.join(", ") || "none"}; carriers: ${domainCarriers.map(([f, n]) => `${f}:${n}`).join(", ")})`,
  plantNested === 1 && residue.length === 1 && residue[0] === "domain/career.ts" && inlineRound1(r1src[R1_HOME]) === 1);
ok("the shared rounder still rounds to one decimal for the model and the display alike",
  shippedRound1(2.467) === 2.5 && shippedRound1(3.14) === 3.1 && shippedRound1(-2.467) === -2.5 && shippedRound1(12) === 12);

// --- M345: the scout sort-comparator seam ---------------------------------
// `features/watchlist/WatchlistBoard.tsx` used to re-type the four-comparator object
// (value / potential / overall / age) that `domain/scouting.ts` uses to order the
// scout board's candidate list. Byte-identical, both in-place: today the two screens
// agree, tomorrow a rule edit on one (say, tie-break potential by headroom, or flip
// the age sign) means the two lists diverge and no reader can see why. The rule is
// one door now: `scoutComparators` in the module that owns the ranking, and every
// other consumer rides the import. This is the sort-rule class M348 closed for
// byKickoff; the comparator object is that class's other shape.
//
// Charge the signature of the value arm (`value: (a, b) => valueIndex(b) - valueIndex(a)`
// on one line) rather than the whole object literal: it is the least-collidable shape
// a re-typed copy has to carry to actually mean what scouting means, and a per-arm scan
// catches a partial re-inline (someone copies three of four arms and stops caring about
// the fourth). The plant below is the exact line the removed copy used.
const SC_COMP_HOME = "domain/scouting.ts";
const SC_CONSUMERS = ["features/watchlist/WatchlistBoard.tsx"];
const scSrc = Object.fromEntries([SC_COMP_HOME, ...SC_CONSUMERS].map((f) => [f, readFileSync(f, "utf8")]));
const DECL = /\nexport const scoutComparators[ \t]*[:=]/g;
const IMPORTS_SC = /import[^;]*\bscoutComparators\b[^;]*from ["']@\/domain\/scouting["']/g;
// Value-arm signature: `value: (a, b) => valueIndex(b) - valueIndex(a)` — a re-typed
// copy has to carry the argument order to actually mean the same rule.
const VALUE_ARM = /[ \t]value:[ \t]*\(a,[ \t]*b\)[ \t]*=>[ \t]*valueIndex\(b\)[ \t]*-[ \t]*valueIndex\(a\)[ \t]*,?/g;
const decl = (s) => (s.match(DECL) || []).length;
const arm = (s) => (s.match(VALUE_ARM) || []).length;
// Plants arm each scan so a "no copies" reading is a measurement.
const plantDecl = decl("\nexport const scoutComparators: Record<X, (a, b) => number> = {\n  value: (a, b) => 0,\n};");
const plantValueArm = arm("  value: (a, b) => valueIndex(b) - valueIndex(a),");
// Population: everything under domain/ and features/ (walk every subtree; features
// nests two levels for shell pages, so recursion is required).
const walk = (d) => {
  const out = [];
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
};
const tree = [...walk("domain"), ...walk("features"), ...walk("data"), ...walk("lib")];
const valueArmSites = tree.filter((f) => arm(readFileSync(f, "utf8")) > 0);
const scImporters = SC_CONSUMERS.filter((f) => (scSrc[f].match(IMPORTS_SC) || []).length > 0);
// Residue = anything charging VALUE_ARM that is neither the door itself nor a declared
// import of the door. Today: only the door's own body.
const scResidue = valueArmSites.filter((f) => f !== SC_COMP_HOME);
ok(`scouting.ts exports the one comparator object and the watchlist re-imports rather than retypes it (${scResidue.join(", ") || "none"}; plants: decl ${plantDecl}, arm ${plantValueArm})`,
  plantDecl === 1 && plantValueArm === 1 && decl(scSrc[SC_COMP_HOME]) === 1 && SC_CONSUMERS.every((f) => arm(scSrc[f]) === 0));
ok(`the value-arm signature appears in the tree exactly once, inside scouting (${valueArmSites.join(", ") || "none"})`,
  valueArmSites.length === 1 && valueArmSites[0] === SC_COMP_HOME);
ok(`every watchlist consumer of the shared comparator imports it by name from @/domain/scouting (${scImporters.join(", ") || "none"})`,
  scImporters.length === SC_CONSUMERS.length && SC_CONSUMERS.every((f) => scImporters.includes(f)));

// Behavioural: the four orderings on the real provider list obey their stated rules
// for consecutive pairs — this is the shipped comparator, so the measurement is
// about the file, not about a hand-typed twin.
const list = players;
const chkValue = [...list].sort(scoutComparators.value).every((p, i, a) => i === 0 || valueIndex(a[i - 1]) >= valueIndex(p));
const chkPotential = [...list].sort(scoutComparators.potential).every((p, i, a) => {
  if (i === 0) return true; const prev = a[i - 1];
  return prev.potential > p.potential || (prev.potential === p.potential && headroom(prev) >= headroom(p));
});
const chkOverall = [...list].sort(scoutComparators.overall).every((p, i, a) => i === 0 || a[i - 1].overall >= p.overall);
const chkAge = [...list].sort(scoutComparators.age).every((p, i, a) => {
  if (i === 0) return true; const prev = a[i - 1];
  return prev.age < p.age || (prev.age === p.age && prev.potential >= p.potential);
});
ok("the shipped comparators agree with their own rules across the whole provider list",
  list.length >= 8 && chkValue && chkPotential && chkOverall && chkAge);
// One arm's rule is not the others': a list already sorted by overall descending must
// not, on a fresh sort, also happen to be age-ascending unless age and overall are
// perfectly monotone in the data — on a real seed they are not.
const byOverall = [...list].sort(scoutComparators.overall);
const byAge = [...list].sort(scoutComparators.age);
const sameOrder = byOverall.length === byAge.length && byOverall.every((p, i) => p.id === byAge[i].id);
ok("the four comparators are four orderings, not one relabelled", !sameOrder && new Set([
  byOverall.map((p) => p.id).join(","),
  byAge.map((p) => p.id).join(","),
  [...list].sort(scoutComparators.value).map((p) => p.id).join(","),
  [...list].sort(scoutComparators.potential).map((p) => p.id).join(","),
]).size === 4);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
