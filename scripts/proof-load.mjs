import { createServer } from "vite";
import { readFileSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildLoad, ACUTE_DAYS, CHRONIC_DAYS, ZONE_LABEL, ZONE_LEGEND, ACWR_BANDS, WEEKS_TO_SETTLE, classifyZone } = await server.ssrLoadModule("/domain/load.ts");
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

// Resolve a row the way the screen does. t() in i18n/index.tsx fills every occurrence of
// `{name}` by global replace, and proof-i18n check 27 pins that shape, so a row which
// leaks a placeholder here is a row which leaks one on the page.
const localeT = (locale) => (key, vars) => {
  let str = DICTIONARIES[locale][key];
  if (str === undefined) return "⟨missing:" + key + "⟩";
  for (const [name, v] of Object.entries(vars ?? {})) str = str.split("{" + name + "}").join(String(v));
  return str;
};
const DICT_LOCALES = Object.keys(DICTIONARIES);
const say = (locale) => (row) => rowLine(row, localeT(locale));

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
ok("empty: sources are 3 fixed rows, each keyed", L.sources.length === 3 && L.sources.every((s) => "key" in s));
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
// 40 base + 1 session × 4 + 1 week of history × 4. The history term counts weeks that
// carry a session, so a first log reads as the thin evidence it is; it used to count the
// fixed 4-bucket chronic window, which credited every padded empty week (60).
ok("single: recommendation confidence 48", L.recommendation.confidence === 48);
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
ok("evidence lists the tracked session", L.evidence.map(say("en")).some((x) => /Tracked sessions: 1/.test(x)));
ok("evidence cites the ACWR value", L.evidence.map(say("en")).some((x) => /4\.25/.test(x)));

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
const tinyAdvice = say("en")(tiny.advice);
const tinyRec = say("en")(tiny.recommendation.text);
ok("its advice quotes no dash as a number and claims no climb", !/Ratio —|is —|— —|climbing/i.test(tinyAdvice));
ok("its advice names the missing baseline instead", /28-day history/.test(tinyAdvice) && /not available yet/.test(tinyAdvice));
ok("its advice is a row, not a sentence typed into the module", "key" in tiny.advice && tiny.advice.key === "ld.ad.noRatio");
ok("its recommendation no longer deloads a ratio that does not exist", !/hardest planned session/i.test(tinyRec) && /Not enough of a 28-day history/.test(tinyRec));
ok("and the confidence stays capped while the ratio is missing", tiny.recommendation.confidence <= 45);
ok("no published sentence prints the dash as a measurement",
  FIX.every((x) => {
    const said = say("en")(x.advice) + " " + (x.recommendation ? say("en")(x.recommendation.text) : "");
    return !/Ratio —|ratio is —|— AU|: —/.test(said);
  }));

// 13b. The `none` zone is reachable two ways — no history at all, and a month of
//      history with an empty current week — and its sentence used to assert the first:
//      "No completed sessions in the last 28 days", printed to a reader whose log held
//      two. The label carried the same claim as "No data".
const rest = buildLoad({ nowMs, sessions: [mk(10, 40, 3), mk(17, 40, 3)] });
ok("a month of history with an empty week really is the rest-week case",
  rest.hasData === true && rest.totalSessions === 2 && rest.weekLoad === 0 && rest.acwr === 0 && rest.zone === "none");
const restSaid = (row) => say("en")(row);
ok("its advice no longer denies the sessions behind it", !/28 days/.test(restSaid(rest.advice)) && /last 7 days/.test(restSaid(rest.advice)));
ok("its recommendation names the empty week instead of a missing baseline",
  !/establish a reliable baseline/.test(restSaid(rest.recommendation.text)) && /Nothing logged in the last 7 days/.test(restSaid(rest.recommendation.text)));
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

// 17. The prose itself. Now that every sentence the model hands the screen is a row,
//     three failures become possible that were not even askable about while the module
//     typed English by hand: a key no locale carries, a placeholder the row forgets to
//     fill, and a row quietly turning back into a string. All three are checked for every
//     fixture in every locale — a sentence only has to be read once to be wrong.
const ROWS = (x) => [
  x.advice,
  ...(x.recommendation ? [x.recommendation.text, x.recommendation.earlyTrend] : []),
  ...x.evidence,
  ...x.sources,
].filter(Boolean);
const ALL_ROWS = FIX.flatMap(ROWS);
ok("the load model emits prose only as rows (" + ALL_ROWS.length + " rows over " + FIX.length + " fixtures)",
  FIX.length === 7 && ALL_ROWS.length >= 60 && ALL_ROWS.every((r) => "key" in r));

const leaks = [];
for (const loc of DICT_LOCALES) for (const x of FIX) for (const r of ROWS(x)) {
  const s = say(loc)(r);
  if (s === "" || /⟨missing:|\{|ld\.[a-z]/.test(s)) leaks.push(loc + ": " + s.slice(0, 64));
}
ok("no row leaks a key, an unfilled placeholder or an empty line in any locale (" + leaks.length + " leaks)",
  DICT_LOCALES.length === 3 && leaks.length === 0);
for (const l of leaks.slice(0, 6)) console.log("       leak: " + l);

// Written out longhand: this is the copy the module published before it had keys, so the
// check below catches a reworded sentence, a wrong number and a broken interpolation at
// once rather than only the last.
const opt = FIX[3];  // even weekly volume → ratio 1.00
const spike = FIX[2];  // one session this week → ratio 4.25
ok("the optimal advice still reads exactly as it did off the page", say("en")(opt.advice) ===
  'Ratio 1.00 sits in the 0.8–1.3 "sweet spot". You\'re absorbing load well — maintain the current rhythm before pushing the volume up.');
ok("the spike advice still reads exactly as it did", say("en")(spike.advice) ===
  "Ratio 4.25 is above the 1.5 spike threshold, where injury risk climbs. Consider a deload: cut volume sharply for a few days before building again.");
ok("the rest-week advice still reads exactly as it did", say("en")(rest.advice) ===
  "Nothing logged in the last 7 days, so there is no weekly load to judge and no ratio to report. Log a session when you're ready to start — or restart — the count.");

// And the numbers inside that copy come from the model, not from someone remembering them.
const quoted = (s, re) => (re.exec(s) ?? []).slice(1);
ok("the range quoted in the advice is the classifier's own band",
  quoted(say("en")(opt.advice), /in the ([\d.]+)–([\d.]+)/).join("-") === [ACWR_BANDS[0].upTo, ACWR_BANDS[1].upTo].join("-"));
ok("the spike threshold quoted in the advice is the classifier's own edge",
  Number(quoted(say("en")(spike.advice), /above the ([\d.]+) spike/)[0]) === ACWR_BANDS[2].upTo);
ok("the evidence names the windows the model actually averages over",
  say("en")(opt.evidence[2]).includes("(" + ACUTE_DAYS + "-day") && say("en")(opt.evidence[3]).includes("(" + CHRONIC_DAYS + "-day"));
ok("the advice's empty week quotes the acute window, not a made-up span",
  say("en")(rest.advice).includes("last " + ACUTE_DAYS + " days"));

// The early-trend caveat used to be glued onto the end of another sentence, which is the
// one thing a translator cannot fix after the fact: the host sentence's word order decides
// whether the fragment even reads. It is its own row now.
ok("the early-trend note is its own row rather than a clause appended in code",
  tiny.recommendation.earlyTrend !== null && !/Early trend/.test(say("en")(tiny.recommendation.text)) &&
  say("en")(tiny.recommendation.earlyTrend).includes("~" + WEEKS_TO_SETTLE + " weeks"));

// Being its own row only matters if the model can reach it. buildWeekly always returns a
// full CHRONIC_DAYS/7 bucket window, so gating the note on that array's length compared a
// variable against a constant: the row existed, the sentence could never print, and the
// same constant inflated the confidence figure for a brand-new log. Two logs with the
// same three sessions at the same per-session load, clustered vs spread, must disagree.
const clustered = buildLoad({ nowMs, sessions: [mk(0, 30, 3), mk(2, 30, 3), mk(4, 30, 3)] });
const spread = buildLoad({ nowMs, sessions: [mk(0, 30, 3), mk(9, 30, 3), mk(18, 30, 3)] });
const activeOf = (x) => x.weekly.filter((w) => w.sessions > 0).length;
ok("the same three sessions, one week apart in placement, are one week and three weeks of history",
  clustered.totalSessions === spread.totalSessions && activeOf(clustered) === 1 && activeOf(spread) === WEEKS_TO_SETTLE);
ok("the early-trend note is reachable for the thin history and silent for the settled one",
  clustered.recommendation.earlyTrend !== null && spread.recommendation.earlyTrend === null);
ok("confidence credits the weeks that carry training, not the empty ones beside them",
  spread.recommendation.confidence === clustered.recommendation.confidence + (WEEKS_TO_SETTLE - 1) * 4);
ok("a settled history carries no early-trend note",
  opt.recommendation.earlyTrend === null && activeOf(opt) >= WEEKS_TO_SETTLE);

// The point of the milestone: a reader of 简体中文 gets this prose in 简体中文. The
// locales are split by what they render rather than by name, so the check cannot be
// satisfied by a dictionary that quietly keeps one locale in English.
const CJK = /[㐀-鿿]/;
const EN = DICT_LOCALES.find((l) => !CJK.test(say(l)(opt.advice)));
const ZH = DICT_LOCALES.filter((l) => l !== EN);
const adviceIn = (x) => DICT_LOCALES.map((l) => say(l)(x.advice));
ok("each locale gets its own words for the same verdict, in all three",
  DICT_LOCALES.length === 3 && ZH.length === 2 && FIX.every((x) => new Set(adviceIn(x)).size === 3));
ok("every row the load model can publish is translated in both Chinese locales",
  ZH.every((l) => FIX.every((x) => ROWS(x).every((r) => CJK.test(say(l)(r))))));
ok("the English locale is the only one whose load prose is Latin-script",
  DICT_LOCALES.filter((l) => !CJK.test(say(l)(opt.advice))).length === 1);

// 18. The other half of the contract: a row the screen never interprets is worse than the
//     string it replaced, because the model now *looks* localised while the reader still
//     gets whatever the component typed. So the page is checked as a source file — which
//     fields it hands to `rowLine`, and whether it prints the early-trend note as its own
//     element rather than folding it back into the recommendation.
const PAGE_SRC = readFileSync(new URL("../features/load/LoadPage.tsx", import.meta.url), "utf8");
const interpreted = new Set([...PAGE_SRC.matchAll(/rowLine\(\s*([A-Za-z_.]+)/g)].map((m) => m[1]));
ok("the page interprets every single-valued prose field the model publishes",
  ["load.advice", "load.recommendation.text", "load.recommendation.earlyTrend"].every((f) => interpreted.has(f)));
ok("the early-trend note renders as its own element, only when the model sends one",
  /load\.recommendation\.earlyTrend &&\s*\(/.test(PAGE_SRC));
// A list is only covered if its items — not just its container — reach the interpreter.
const between = (from, to) => PAGE_SRC.slice(PAGE_SRC.indexOf(from), PAGE_SRC.indexOf(to, PAGE_SRC.indexOf(from)) + 1);
const evBlock = between("load.evidence.map", "/ul>");
const srcBlock = between("load.sources.map", "/div>");
ok("each evidence row is interpreted, and none is dropped into JSX raw",
  /rowLine\(e,\s*t\)/.test(evBlock) && !/\{\s*e\s*\}/.test(evBlock));
ok("each source chip is interpreted, and none is dropped into JSX raw",
  /rowLine\(s,\s*t\)/.test(srcBlock) && !/\{\s*s\s*\}/.test(srcBlock));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
