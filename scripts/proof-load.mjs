import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildLoad, ACUTE_DAYS, CHRONIC_DAYS, ZONE_LABEL, ZONE_LEGEND, ACWR_BANDS, classifyZone } = await server.ssrLoadModule("/domain/load.ts");
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");

// Fixed, midday "now" so day-window boundaries (7d / 28d) never straddle a
// partial day — every session below sits unambiguously inside or outside each
// window.
const DAY = 86400000;
const nowMs = Date.parse("2026-09-23T12:00:00Z");

// A completed session `daysAgo` with the given exercise minutes and self-RPE.
// sessionLoad = round(minutes * selfRating); we always set selfRating so the
// sessionIntensity fallback is not exercised here.
const mk = (daysAgo, minutes, rpe) => ({
  id: `s-${daysAgo}-${minutes}-${rpe}`,
  date: new Date(nowMs - daysAgo * DAY).toISOString(),
  completedAt: new Date(nowMs - daysAgo * DAY).toISOString(),
  status: "completed",
  exercises: minutes > 0 ? [{ minutes }] : [],
  targetMinutes: 0,
  selfRating: rpe,
  focusAttributes: [],
});

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// 1. No sessions: honest empty state, no invented baseline.
let L = buildLoad({ nowMs, sessions: [] });
ok("empty: hasData false", L.hasData === false);
ok("empty: zone none", L.zone === "none");
ok("empty: acwr null", L.acwr === null);
ok("empty: recommendation null", L.recommendation === null);
ok("empty: daily empty", L.daily.length === 0);
ok("empty: monotony null", L.monotony === null && L.strain === null);
ok("empty: sources are 3 fixed strings", L.sources.length === 3);
const keyed = (z) => rowLine(ZONE_LABEL[z], (k) => `⟨${k}⟩`);
ok("empty: the zone name is a dictionary key, not a word", keyed("none") === "⟨ld.zoneNone⟩");

// 2. Only an out-of-window (>28d) session is ignored entirely.
L = buildLoad({ nowMs, sessions: [mk(40, 40, 3)] });
ok("40d-old session: hasData false", L.hasData === false);
ok("40d-old session: zone none", L.zone === "none");

// 3. A future-dated session (completedAt after now) is filtered out.
L = buildLoad({ nowMs, sessions: [mk(-10, 40, 3)] });
ok("future session: hasData false", L.hasData === false);

// 4. Single in-window session: exact Session-RPE load + acute/chronic means.
//    load = round(40 * 3) = 120 in the last 7d; acute=round(120/7)=17,
//    chronic=round(120/28)=4, ACWR=round(17/4*100)/100=4.25 → high spike.
L = buildLoad({ nowMs, sessions: [mk(0, 40, 3)] });
ok("single: hasData true", L.hasData === true);
ok("single: one daily bucket", L.daily.length === 1);
ok("single: weekLoad 120", L.weekLoad === 120);
ok("single: acute 17", L.acute === 17);
ok("single: chronic 4", L.chronic === 4);
ok("single: acwr 4.25", L.acwr === 4.25);
ok("single: zone high", L.zone === "high");
ok("single: recommendation present", L.recommendation !== null);
ok("single: recommendation confidence 60", L.recommendation.confidence === 60);
// weekly monotony for loads [0,0,0,120]: mean 30, sd ~51.96, ratio 0.58.
ok("single: monotony 0.58", L.monotony === 0.58);
ok("single: strain 17", L.strain === 17);

// 5. minutes falls back to targetMinutes when a session has no exercises.
L = buildLoad({ nowMs, sessions: [{ ...mk(0, 0, 4), targetMinutes: 30 }] });
ok("fallback: weekLoad uses targetMinutes*rating (120)", L.weekLoad === 120);

// 6. Even weekly volume → ACWR ≈ 1.0 → optimal band.
//    four identical 140-load sessions at days 0/9/18/27: acuteTotal=140,
//    chronicTotal=560 → acute=chronic=20 → acwr 1.0.
L = buildLoad({ nowMs, sessions: [mk(0, 35, 4), mk(9, 35, 4), mk(18, 35, 4), mk(27, 35, 4)] });
ok("even: acute 20", L.acute === 20);
ok("even: chronic 20", L.chronic === 20);
ok("even: acwr 1.0", L.acwr === 1);
ok("even: zone optimal", L.zone === "optimal");

// 7. Heavy earlier, light this week → ACWR < 0.8 → underloaded.
//    20 in the last 7d, 140+140 earlier: acute=round(20/7)=3, chronic=round(300/28)=11 → 0.27.
L = buildLoad({ nowMs, sessions: [mk(1, 10, 2), mk(15, 35, 4), mk(22, 35, 4)] });
ok("under: acute 3", L.acute === 3);
ok("under: chronic 11", L.chronic === 11);
ok("under: acwr 0.27", L.acwr === 0.27);
ok("under: zone under", L.zone === "under");

// 8. Evidence is a real, non-empty trace tied to the records.
L = buildLoad({ nowMs, sessions: [mk(0, 40, 3)] });
ok("evidence lists the tracked session", L.evidence.some((x) => /Tracked sessions: 1/.test(x)));
ok("evidence cites the ACWR value", L.evidence.some((x) => /4\.25/.test(x)));

// 9. Daily buckets are sorted ascending by date.
L = buildLoad({ nowMs, sessions: [mk(27, 35, 4), mk(0, 35, 4), mk(18, 35, 4)] });
const dates = L.daily.map((d) => d.date);
ok("daily sorted ascending", JSON.stringify(dates) === JSON.stringify([...dates].sort()));

// 10. A zone name is a row, not a word typed into a domain module. The banner, the
//     legend under it, the player workload tile and the dashboard recovery line all
//     print these five names, and the dictionary already carried four of them for the
//     legend — so a 简体中文 reader saw 负荷不足 in one line and "Underloaded" in the
//     one above it. Every zone has to name a key, and no two zones may share one.
const LOAD_SRC = readFileSync(new URL("../domain/load.ts", import.meta.url), "utf8");
// Read out of the module's own declaration, so a sixth band added to the union without
// a label row is a red check here rather than an `undefined` in someone's banner.
const ZONES = (/export type LoadZone = ([^;]+);/.exec(LOAD_SRC)?.[1] ?? "").match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) ?? [];
const zoneKeys = ZONES.map(keyed);
ok("all five zone names are keyed rows", ZONES.length === 5 && zoneKeys.every((k) => /^⟨ld\.zone[A-Za-z]+⟩$/.test(k)));
ok("no two zones print the same key", new Set(zoneKeys).size === 5);
ok("the keyed set is exactly the LoadZone union", Object.keys(ZONE_LABEL).sort().join(",") === [...ZONES].sort().join(","));

// 11. The ACWR band table is the classifier, not a comment describing it. Written out
//     longhand here on purpose — this replica is the rule as it existed when the
//     thresholds lived in a switch and the legend's numbers were typed by hand — and
//     the sweep is every value a published ACWR can take (two decimals, 0.00–4.00).
function legacyZone(acwr, week) {
  if (!week) return "none";
  if (acwr === null) return "caution";
  if (acwr < 0.8) return "under";
  if (acwr <= 1.3) return "optimal";
  if (acwr <= 1.5) return "caution";
  return "high";
}
let drift = [];
const swept = new Set();
for (let i = 0; i <= 400; i++) {
  const v = i / 100;
  const got = classifyZone(v, 100);
  swept.add(got);
  if (got !== legacyZone(v, 100)) drift.push(`${v.toFixed(2)}→${got} vs ${legacyZone(v, 100)}`);
}
ok("the table reproduces the hand-written rule across 401 ratios", drift.length === 0);
ok("the sweep actually crosses every band boundary", swept.size === 4 && !swept.has("none"));
ok("band edges: 0.80 is not under, 0.79 is", classifyZone(0.8, 10) === "optimal" && classifyZone(0.79, 10) === "under");
ok("band edges: 1.30 is optimal, 1.31 is caution", classifyZone(1.3, 10) === "optimal" && classifyZone(1.31, 10) === "caution");
ok("band edges: 1.50 is caution, 1.51 is a spike", classifyZone(1.5, 10) === "caution" && classifyZone(1.51, 10) === "high");

// 12. Weekly load gates everything: an empty window is no verdict, whatever the ratio
//     argument would have said.
ok("no weekly load → no zone, even with a ratio", classifyZone(1.0, 0) === "none");
ok("no weekly load → no zone, even without one", classifyZone(null, 0) === "none");

// 13. A ratio that does not exist used to be answered with a number in prose:
//     "Ratio — is climbing toward the risk band." The band's sentence quoted a figure
//     the reader can see is a dash, and claimed a direction the data never showed.
const FIXTURES = [
  [],
  [mk(40, 40, 3)],
  [mk(0, 40, 3)],
  [mk(0, 35, 4), mk(9, 35, 4), mk(18, 35, 4), mk(27, 35, 4)],
  [mk(1, 10, 2), mk(15, 35, 4), mk(22, 35, 4)],
  [mk(0, 3, 1)],
  [mk(0, 1, 1), mk(1, 1, 1), mk(2, 1, 1)],
];
const FIX = FIXTURES.map((s) => buildLoad({ nowMs, sessions: s }));
const tiny = FIX[5];
ok("a 3 AU week really is the no-ratio case", tiny.weekLoad === 3 && tiny.chronic === 0 && tiny.acwr === null && tiny.zone === "caution");
ok("its advice quotes no dash as a number and claims no climb", !/Ratio —|is —|— —|climbing/i.test(tiny.advice));
ok("its advice names the missing baseline instead", /28-day history/.test(tiny.advice) && /not available yet/.test(tiny.advice));
ok("its recommendation no longer deloads a ratio that does not exist", !/hardest planned session/i.test(tiny.recommendation.text) && /Not enough of a 28-day history/.test(tiny.recommendation.text));
ok("and the confidence stays capped while the ratio is missing", tiny.recommendation.confidence <= 45);
ok("no published sentence prints the dash as a measurement", FIX.every((x) => !/Ratio —|ratio is —/.test(x.advice) && !/Ratio —|ratio is —/.test(x.recommendation?.text ?? "")));

// 13b. The `none` zone is reachable two ways — no history at all, and a month of
//      history with an empty current week — and its sentence used to assert the first:
//      "No completed sessions in the last 28 days", printed to a reader whose log held
//      two. The label carried the same claim as "No data".
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
const rest = buildLoad({ nowMs, sessions: [mk(10, 40, 3), mk(17, 40, 3)] });
ok("a month of history with an empty week really is the rest-week case",
  rest.hasData === true && rest.totalSessions === 2 && rest.weekLoad === 0 && rest.acwr === 0 && rest.zone === "none");
ok("its advice no longer denies the sessions behind it", !/28 days/.test(rest.advice) && /last 7 days/.test(rest.advice));
ok("its recommendation names the empty week instead of a missing baseline",
  !/establish a reliable baseline/.test(rest.recommendation.text) && /Nothing logged in the last 7 days/.test(rest.recommendation.text));
ok("the empty-week name says which window is empty, not that there is no data",
  /week/i.test(DICTIONARIES.en["ld.zoneNone"]) && !/no data/i.test(DICTIONARIES.en["ld.zoneNone"]));
ok("and the no-history reader is told there is nothing to recommend yet",
  FIX[0].recommendation === null && FIX[0].zone === "none");

// 14. The classifier used to branch on the 28-day total too. That arm was dead: the
//     7-day window is a subset of the 28-day one, so a week with any load has a
//     nonzero chronic total — the only route to a missing ratio is a history too short
//     to round up, which is a baseline that exists. Measured on every fixture.
const chronicSums = FIX.map((x) => x.daily.reduce((a, d) => a + d.load, 0));
ok("weekLoad never exceeds the 28-day total", FIX.every((x, i) => x.weekLoad <= chronicSums[i]));
ok("a week with load always has chronic load under it", FIX.every((x, i) => x.weekLoad === 0 || chronicSums[i] > 0));
ok("the dead arm is gone from the classifier's signature", classifyZone.length === 2);

// 15. The legend is composed from the table, so it cannot drift from the verdict above
//     it — and the strings below are what the screen printed before the table existed,
//     which makes this a real regression guard rather than a tautology.
ok("the legend prints the same ranges the banner's classifier uses",
  JSON.stringify(ZONE_LEGEND.map((r) => r.band)) === JSON.stringify(["<0.8", "0.8–1.3", "1.3–1.5", ">1.5"]));
ok("one legend row per band, in band order, and none for the empty state",
  ZONE_LEGEND.length === ACWR_BANDS.length && ZONE_LEGEND.every((r, i) => r.zone === ACWR_BANDS[i].zone) && !ZONE_LEGEND.some((r) => r.zone === "none"));
ok("every legend row names a zone the classifier can return", ZONE_LEGEND.every((r) => ZONE_LABEL[r.zone] !== undefined));

// 16. classifyZone is the function buildLoad runs, not a second copy published for the
//     gate to stroke.
ok("buildLoad's verdict is classifyZone on its own published numbers",
  FIX.every((x) => x.zone === classifyZone(x.acwr, x.weekLoad)));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
