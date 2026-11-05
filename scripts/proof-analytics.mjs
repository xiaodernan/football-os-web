import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Pins domain/analytics.ts — the numeric engine behind /data, /matches, club
// pages and every grounded AI projection. Two halves: (1) teamMetrics() on a
// hand-computed three-club fixture so the aggregation is checked against
// arithmetic we did by hand, and (2) the pure model helpers (shrinkage→M62,
// λ clamping, home advantage, the largest-remainder oddsPercents bug guard,
// outcomeOdds normalisation, leaders directionality). Deterministic, no browser.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { teamMetrics, expectedGoals, outcomeOdds, oddsPercents, leaders, formPoints, finishedCount, byKickoff, runIn, pointsScenarios, ceilingPlaces, titleRace, headToHead, venueSplit, goalTiming, discipline, eventClock, briefing, matchBrief, disciplineTrend, disciplineVenue, clubDisciplineTrend, rankSwing, cardTiming, clockContrast, goalVenueClock, eventVenueClock, clubRhythm, cardSeverity } =
  await server.ssrLoadModule("/domain/analytics.ts");

const resultClockSum = (fold) => fold.resultClock.won + fold.resultClock.drew + fold.resultClock.lost;
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- teamMetrics: a tiny league we scored by hand ------------------------
const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const clubs = [club("A", "T1"), club("B", "T1"), club("C", "T1"), club("D", "T2"), club("E", "T2")];
const fixtures = [
  match("m1", "T1", "A", "B", 2, 0, "2026-01-01"),
  match("m2", "T1", "B", "C", 1, 1, "2026-01-02"),
  match("m3", "T1", "C", "A", 0, 3, "2026-01-03"),
  match("m4", "T1", "A", "C", 1, 2, "2026-01-04"),
  match("m5", "T1", "B", "A", 2, 1, "2026-01-05"),
  match("m6", "T1", "A", "B", 5, 0, "2026-01-06", "SCHEDULED"), // ignored: not finished
  match("m7", "T2", "D", "E", 3, 0, "2026-01-06"),              // ignored: other competition
];
const rows = teamMetrics("T1", fixtures, clubs);
const byId = Object.fromEntries(rows.map((r) => [r.clubId, r]));

ok("only the target competition's clubs appear (D/E excluded)", rows.length === 3 && ["A", "B", "C"].every((c) => byId[c]));
ok("scheduled match is ignored", byId.A.played === 4);
ok("A: hand-computed record 4-2-0-2, GF7 GA4 GD+3 Pts6",
  byId.A.played === 4 && byId.A.won === 2 && byId.A.drawn === 0 && byId.A.lost === 2 &&
  byId.A.gf === 7 && byId.A.ga === 4 && byId.A.gd === 3 && byId.A.points === 6);
// M321 companion: at least one club has positive draws, so the "drawn === 0" clause above has a population pin.
ok("the table shows at least one club with positive draws", Object.values(byId).some((c) => c.drawn > 0));
ok("A: two clean sheets (conceded 0 in m1 and m3)", byId.A.cleanSheets === 2);
// M321 companion: at least one club has positive clean sheets, so the "cleanSheets === 2" clause above has a population pin.
ok("the table shows at least one club with positive clean sheets", Object.values(byId).some((c) => c.cleanSheets > 0));
ok("A: form is results in kickoff order (W,W,L,L)", byId.A.form.join(",") === "W,W,L,L");
ok("B: 3-1-1-1, GD-1", byId.B.played === 3 && byId.B.won === 1 && byId.B.drawn === 1 && byId.B.lost === 1 && byId.B.gd === -1);
ok("C: 3-1-1-1, GD-2 (loses the point-tiebreak to B)", byId.C.played === 3 && byId.C.gd === -2);
ok("standings sort by points then goal difference (A,B,C)", rows.map((r) => r.clubId).join(",") === "A,B,C");
ok("league average is goals per team per game (13 goals / 10 team-games)", near(byId.A.leagueAvg, 1.3));
ok("attack is gfAvg / leagueAvg (A: 1.75/1.3 = 1.35)", near(byId.A.attack, 1.35));
ok("defence is gaAvg / leagueAvg (A: 1.00/1.3 = 0.77)", near(byId.A.defence, 0.77));

for (const r of rows) {
  ok(`${r.clubId}: W+D+L == played`, r.won + r.drawn + r.lost === r.played);
  ok(`${r.clubId}: points == 3W+D`, r.points === r.won * 3 + r.drawn);
  ok(`${r.clubId}: gd == gf-ga`, r.gd === r.gf - r.ga);
  ok(`${r.clubId}: home+away splits rebuild the totals`,
    r.home.played + r.away.played === r.played && r.home.gf + r.away.gf === r.gf && r.home.ga + r.away.ga === r.ga);
}

// --- pure model helpers --------------------------------------------------
const tm = (o) => ({
  clubId: "x", played: 10, won: 5, drawn: 2, lost: 3, gf: 12, ga: 9, gd: 3, points: 17, ppg: 1.7,
  gfAvg: 1.2, gaAvg: 0.9, cleanSheets: 4, form: ["W"], home: {}, away: {}, attack: 1.2, defence: 0.9, leagueAvg: 1.3, ...o,
});

const even = tm({ attack: 1.3, defence: 1.0, played: 20 });
const xgEven = expectedGoals(even, even, 1.3);
ok("identical sides still favour the home team (1.12 vs 0.92)", xgEven.home > xgEven.away);

const strong = tm({ attack: 8, defence: 8, played: 300 });
const xgCap = expectedGoals(strong, strong, 1.3);
ok("λ is clamped to the ceiling (3.5) for absurd ratings", xgCap.home === 3.5 && xgCap.away === 3.5);
const weak = tm({ attack: 0, defence: 0, played: 100 });
const xgFloor = expectedGoals(weak, weak, 1.3);
ok("λ is clamped to the floor (0.15) for starved ratings", xgFloor.home === 0.15 && xgFloor.away === 0.15);

const neutral = tm({ attack: 1, defence: 1, played: 200 });
const lowSample = tm({ attack: 2.2, defence: 1, played: 2 });
const highSample = tm({ attack: 2.2, defence: 1, played: 40 });
const xgLow = expectedGoals(lowSample, neutral, 1.3).home;
const xgHigh = expectedGoals(highSample, neutral, 1.3).home;
ok("small samples regress toward the mean more than large ones (M62)", xgHigh > xgLow);
ok("expectedGoals is deterministic", JSON.stringify(expectedGoals(even, strong, 1.3)) === JSON.stringify(expectedGoals(even, strong, 1.3)));

const o = outcomeOdds(even, even, 1.3);
ok("outcome probabilities sum to ~1", Math.abs(o.home + o.draw + o.away - 1) < 0.002);
ok("every outcome probability is a strictly positive fraction of at most 1", [o.home, o.draw, o.away].every((p) => p > 0 && p <= 1));
ok("λ pair equals expectedGoals rounded onto the 2dp grid the UI prints",
  o.lambdaHome === Math.round(xgEven.home * 100) / 100 && o.lambdaAway === Math.round(xgEven.away * 100) / 100);
// Exact, not `near`: this is the arithmetic a visitor can do off the screen.
ok("expectedTotalGoals is exactly the summed displayed λ pair",
  o.expectedTotalGoals === Math.round((o.lambdaHome + o.lambdaAway) * 100) / 100);
// The above can only diverge if λ stops arriving on the display grid, so pin that
// precondition too — it is the part a future edit to expectedGoals could break.
const on2dp = (v) => Math.round(v * 100) === v * 100;
ok("expectedGoals hands back λ already rounded to the 2dp grid the UI prints (clamped and unclamped alike)",
  [xgEven, xgCap, xgFloor].every((x) => on2dp(x.home) && on2dp(x.away)));
ok("most-likely score is a parseable scoreline with positive probability", /^\d-\d$/.test(o.mostLikelyScore) && o.mostLikelyPct > 0 && o.mostLikelyPct <= 1);
ok("the model favours the home side in probabilities too", o.home > o.away);
ok("outcomeOdds is deterministic", JSON.stringify(o) === JSON.stringify(outcomeOdds(even, even, 1.3)));

const battery = [
  { home: 0.3337, draw: 0.3337, away: 0.3326 },
  { home: 0.5, draw: 0.5, away: 0 },
  { home: 0.001, draw: 0.001, away: 0.998 },
  { home: 1, draw: 0, away: 0 },
  { home: 0.02, draw: 0.02, away: 0.96 },
  { home: 0.333333, draw: 0.333333, away: 0.333334 },
];
for (const [i, odds] of battery.entries()) {
  const p = oddsPercents(odds);
  ok(`oddsPercents battery[${i}] totals exactly 100`, p.home + p.draw + p.away === 100);
  const legal = (v, raw) => v === Math.floor(raw * 100) || v === Math.floor(raw * 100) + 1;
  ok(`oddsPercents battery[${i}] uses largest-remainder (never off by >1)`,
    legal(p.home, odds.home) && legal(p.draw, odds.draw) && legal(p.away, odds.away));
}

const lead = [
  tm({ clubId: "L1", played: 10, form: ["W", "W", "W"], attack: 1.0, defence: 1.0, gfAvg: 1.0 }),
  tm({ clubId: "L2", played: 10, form: ["W", "W", "D"], attack: 2.5, defence: 1.0, gfAvg: 1.0 }),
  tm({ clubId: "L3", played: 10, form: ["W", "W", "W", "W"], attack: 1.0, defence: 0.3, gfAvg: 1.0 }),
  tm({ clubId: "L4", played: 10, form: ["L"], attack: 1.0, defence: 1.0, gfAvg: 3.0 }),
  tm({ clubId: "L5", played: 1, form: ["W", "W", "W", "W", "W"], attack: 9, defence: 0.01, gfAvg: 9 }), // one game → excluded
];
const L = leaders(lead);
ok("leaders ignores teams with fewer than 2 matches (L5 excluded everywhere)",
  [L.bestForm, L.strongestAttack, L.bestDefence, L.highestScoring].every((m) => m && m.clubId !== "L5"));
ok("bestForm ranks by recent result points", L.bestForm.clubId === "L3");
ok("strongestAttack ranks by attack rating", L.strongestAttack.clubId === "L2");
ok("bestDefence picks the LOWEST defence rating (direction guard)", L.bestDefence.clubId === "L3");
ok("highestScoring ranks by goals-for average", L.highestScoring.clubId === "L4");
ok("leaders of an empty table is all-null", (() => { const e = leaders([]); return !e.bestForm && !e.strongestAttack && !e.bestDefence && !e.highestScoring; })());
ok("formPoints: W=3 D=1 L=0", formPoints(tm({ form: ["W", "D", "L"] })) === 4 && formPoints(tm({ form: [] })) === 0 && formPoints(tm({ form: ["W", "W"] })) === 6);

// --- real dataset smoke: the engine must hold on production seed ---------
const { WORLD } = await server.ssrLoadModule("/data/footballSeed.ts");
const compId = WORLD.competitions[0].id;
const real = teamMetrics(compId, WORLD.matches, WORLD.clubs);
ok("real competition yields a non-empty metrics table", real.length >= 1 && real.every((r) => r.played >= 0));
ok("real table is deterministic", JSON.stringify(real) === JSON.stringify(teamMetrics(compId, WORLD.matches, WORLD.clubs)));
ok("real rows satisfy every bookkeeping identity",
  real.every((r) => r.won + r.drawn + r.lost === r.played && r.points === r.won * 3 + r.drawn && r.gd === r.gf - r.ga && r.home.gf + r.away.gf === r.gf));
const realPair = real.filter((r) => r.played >= 2);
if (realPair.length >= 2) {
  const ro = outcomeOdds(realPair[0], realPair[1]);
  ok("a real fixture projection stays normalised and in λ range",
    Math.abs(ro.home + ro.draw + ro.away - 1) < 0.002 && ro.lambdaHome >= 0.15 && ro.lambdaHome <= 3.5 && ro.lambdaAway >= 0.15 && ro.lambdaAway <= 3.5);
} else {
  ok("a real fixture projection stays normalised and in λ range", true);
}

// --- the expected-total line (M142) ---------------------------------------
// The figure was computed for 100+ milestones and read by nobody. It is now the
// third number on both forecast surfaces, so pin the identity a visitor can check
// by hand, that both surfaces really render it, and that its label is translated.
// Every pairing the closed-form model can be asked for inside one competition —
// the same pairing rule the forecast panels use (both sides come from one league).
const pairs = [];
for (const comp of WORLD.competitions) {
  const rows = teamMetrics(comp.id, WORLD.matches, WORLD.clubs).filter((r) => r.played >= 2);
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) pairs.push([rows[i], rows[j]]);
}
ok("the in-competition pair sweep has something to check (not vacuous)", pairs.length > 50);
ok("expectedTotalGoals equals the on-screen λ pair summed to 2dp, for every real pairing",
  pairs.every(([h, a]) => {
    const ro = outcomeOdds(h, a);
    return ro.expectedTotalGoals === Math.round((ro.lambdaHome + ro.lambdaAway) * 100) / 100;
  }));
ok("the total never exceeds the λ ceiling the model clamps to",
  pairs.every(([h, a]) => outcomeOdds(h, a).expectedTotalGoals <= 7));
ok("both forecast surfaces render the figure, and both read it from the data layer's own forecast (a write-only field again would fail this)", (() => {
  const dataRoom = readFileSync(resolve(root, "features/analytics/DataRoom.tsx"), "utf8");
  const world = readFileSync(resolve(root, "features/football/FootballWorld.tsx"), "utf8");
  return dataRoom.includes("expectedTotalGoals") && dataRoom.includes("fixtureForecast(")
    && world.includes("fc.expectedTotalGoals");
})());
const { DICTIONARIES: DICTS, LOCALES: LOCS } = await server.ssrLoadModule("/i18n/dictionaries.ts");
ok("the three locales are the ones the picker offers", LOCS.length === 3);
// `const zhTW = { ...zhCN, … }`, so a key that is not written out in the zh-TW
// block still reads as present on the assembled object: deleting the line left
// every `key in DICTIONARIES["zh-TW"]` check green. So verify against the literal
// blocks and only then ask the assembled value about its placeholders.
const dictSrc = readFileSync(resolve(root, "i18n/dictionaries.ts"), "utf8");
const decl = (n) => dictSrc.indexOf(`const ${n}: Dict = {`);
const starts = [["en", decl("en")], ["zh-CN", decl("zhCN")], ["zh-TW", decl("zhTW")]];
const dictEnd = dictSrc.indexOf("export const DICTIONARIES");
const blockOf = (i) => dictSrc.slice(starts[i][1], i + 1 < starts.length ? starts[i + 1][1] : dictEnd);
ok("all three dictionary literal blocks are locatable by name (else the checks below slice garbage)",
  starts.every(([, at]) => at > 0) && dictEnd > decl("zhTW"));
for (const k of ["fw.match.total", "data.totalGoals"]) {
  const re = new RegExp(`"${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "g");
  ok(`"${k}" is written into all three dictionaries rather than inherited, and interpolates {n}`,
    starts.every(([id], i) => (blockOf(i).match(re) ?? []).length === 1
      && (DICTS[id][k].match(/\{\w+\}/g) ?? []).join() === "{n}"));
}

// ---------------------------------------------------------------------------
// M336 — the competition's finished-match count is the domain's, not a halved sum
// ---------------------------------------------------------------------------
// The data room's section hint used to be `metrics.reduce((s, m) => s + m.played, 0) / 2 | 0`:
// a per-team sum the page halved and floored. It is right while the sum is even and silently one
// short the moment it is odd, which a mid-round competition reaches every round. The domain
// already counts the list its own figures are measured over, so that count is exported now and
// the page reads it; these clauses are the seam, in both directions.
const DATAROOM_SRC = readFileSync(new URL("../features/analytics/DataRoom.tsx", import.meta.url), "utf8");
const ANALYTICS_SRC = readFileSync(new URL("../domain/analytics.ts", import.meta.url), "utf8");
ok("the data room reads its finished-match count through the domain's finishedCount, and halved no sum of its own",
  /import \{[^}]*\bfinishedCount\b[^}]*\} from "@\/domain\/analytics"/.test(DATAROOM_SRC) &&
  /hint=\{t\("data\.matchesPlayed", \{ n: playedCount \}\)\}/.test(DATAROOM_SRC) &&
  !/reduce\(\(s, m\) => s \+ m\.played, 0\) \/ 2/.test(DATAROOM_SRC.replace(/\/\/[^\n]*/g, '')) &&
  !/metrics\.reduce\([^)]*played[^)]*\)/.test(DATAROOM_SRC.replace(/\/\/[^\n]*/g, ''))); /* M323-PLANT: a page that kept its reduce would still import finishedCount for nothing else */
ok("…and the domain counts the same list its own league average is measured over, so a correction to what 'finished' means lands in one place",
  /export function finishedFixtures\(/.test(ANALYTICS_SRC) &&
  /export function finishedCount\(/.test(ANALYTICS_SRC) &&
  /const fixtures = finishedFixtures\(compId, matches\);/.test(ANALYTICS_SRC) &&
  !/matches\.filter\(\s*\(m\): m is Match & \{ homeGoals: number; awayGoals: number \} => m\.competitionId === compId && isFinished\(m\),\s*\)/.test(ANALYTICS_SRC));
// The count itself, over the seeded dataset: it is the number of finished matches in the
// competition, and it is NOT the halved per-team sum whenever that sum is odd — the case the old
// page floored. Measured on every seeded competition, so a seed change that unbalances the
// schedule fails here rather than in the page.
const seededMatches = (await server.ssrLoadModule("/data/footballService.ts")).footballProvider.matches();
const seededClubs = WORLD.clubs;
const seededComps = [...new Set(seededClubs.map((c) => c.competitionId))];
const countChecks = seededComps.map((id) => {
  const clubs = seededClubs.filter((c) => c.competitionId === id);
  const metrics = teamMetrics(id, seededMatches, clubs);
  const halved = Math.floor(metrics.reduce((s, m) => s + m.played, 0) / 2);
  const real = finishedCount(id, seededMatches);
  const finished = seededMatches.filter((m) => m.competitionId === id && m.status === "FINISHED").length;
  return { id, halved, real, finished, agree: real === finished && halved === finished };
});
ok("every seeded competition's finishedCount is its real finished-match count, and equals the halved per-team sum only because those sums happen to be even (12 competitions, 8 distinct per-team counts in the largest)",
  seededComps.length >= 10 && countChecks.every((c) => c.agree),
  countChecks.filter((c) => !c.agree).map((c) => `${c.id}: count=${c.real} finished=${c.finished} halved=${c.halved}`).join(", ") || "all agree");

// ---- kickoff ordering, written once ----
// Six readers ordered a list by kickoff: `finishedFixtures`, the data room's forecast, three
// service functions and the AI's next-fixture lookup. Six identical comparators is six chances
// for one of them to drift into a different order than the rest — and the two that matter most
// (the finished-fixtures list every figure is measured over, and the data room's forecast) had
// no visible connection at all. `byKickoff` is the door, and this census charges it both ways.
const walkSrc = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walkSrc(p));
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const APP_SRC = ["domain", "features", "lib", "store", "data", "src", "components"].flatMap(walkSrc);
const DOOR_FILE = "domain/analytics.ts";
const comparatorSites = APP_SRC.filter((f) => /a\.kickoff\.localeCompare\(b\.kickoff\)/.test(readFileSync(f, "utf8")));
const bareSort = APP_SRC.filter((f) => /\.sort\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\1\.kickoff\.localeCompare\(\s*\2\.kickoff\s*\)/.test(readFileSync(f, "utf8")));
ok(`the kickoff comparator is written in exactly one place, and it is the domain's door (${APP_SRC.length} app files walked, ${comparatorSites.length} site(s): ${comparatorSites.join(", ") || "none"}; ${bareSort.length} hand-rolled ordering rule(s))`,
  APP_SRC.length >= 90 && comparatorSites.length === 1 && comparatorSites[0] === DOOR_FILE && bareSort.length === 0);
const KICKOFF_READERS = [
  "domain/analytics.ts",
  "features/analytics/DataRoom.tsx",
  "data/footballService.ts",
  "data/intelligence.ts",
];
const readerReads = KICKOFF_READERS.map((f) => [f, readFileSync(f, "utf8").split(/\r?\n/).filter((l) => /\.sort\(/.test(l) && /byKickoff/.test(l)).length]);
ok(`every reader that orders by kickoff calls the door (${readerReads.map(([f, n]) => `${f}: ${n}`).join("; ")})`,
  KICKOFF_READERS.every((f) => readerReads.find(([g]) => g === f)[1] >= 1) &&
  readerReads.reduce((n, [, c]) => n + c, 0) >= 6);
// The plant: a reader that writes its own comparator again, and a line that sorts by something
// else. The first must be flagged, the second must not — a reader that flagged every `.sort(`
// would pass the clause above while accusing the app of nothing.
const plantedOwn = 'return matches.sort((a, b) => a.kickoff.localeCompare(b.kickoff));';
const plantedOther = 'return rows.sort((a, b) => b.overall - a.overall);';
ok(`the ordering reader, planted both ways, flags a hand-written kickoff comparator and accuses a sort by any other field (${/a\.kickoff\.localeCompare\(b\.kickoff\)/.test(plantedOwn)} of 1 flagged, ${/a\.kickoff\.localeCompare\(b\.kickoff\)/.test(plantedOther)} of 0 flagged)`,
  /a\.kickoff\.localeCompare\(b\.kickoff\)/.test(plantedOwn) === true &&
  /a\.kickoff\.localeCompare\(b\.kickoff\)/.test(plantedOther) === false);
// And the value: the door orders chronologically, including across same-day kickoffs, and it is
// a pure comparator so it can be handed straight to `.sort`.
const laterDay = { kickoff: "2026-03-02T19:00:00Z" };
const earlierDay = { kickoff: "2026-01-31T15:00:00Z" };
const laterSameDay = { kickoff: "2026-01-31T18:00:00Z" };
const kickoffOrder = byKickoff(laterDay, earlierDay);
const sameDay = byKickoff(laterSameDay, earlierDay);
ok(`byKickoff is the text ordering of the ISO kickoff, so it sorts chronologically at any time of day (${kickoffOrder} for a later day, ${sameDay} for a later time on the same day)`,
  kickoffOrder > 0 && sameDay > 0 && byKickoff(earlierDay, laterDay) < 0);
// The one place that orders by kickoff the other way round. `recentMatchesForClub` wants newest
// first, so a future "let us use the door here too" would invert a real semantic. The census above
// deliberately does not charge it — a reverse comparator is not a copy — and this clause is what
// stops the exception from being quietly normalised away.
const SERVICE_SRC = readFileSync(resolve(root, "data/footballService.ts"), "utf8");
const recentBlock = (SERVICE_SRC.match(/export function recentMatchesForClub[\s\S]*?\n}/) || [""])[0];
ok(`recentMatchesForClub still orders newest-first rather than through the door (the reverse comparator ${/b\.kickoff\.localeCompare\(a\.kickoff\)/.test(recentBlock) ? "is present" : "is GONE"})`,
  /b\.kickoff\.localeCompare\(a\.kickoff\)/.test(recentBlock) === true && /byKickoff/.test(recentBlock) === false);

// --- The run-in: difficulty is the opponents' record, not the club's own. ----------------
// T1 has one scheduled fixture left (m6: A home to B), so the hand numbers are one row each:
// B's run is the harder one because the only club it still faces is A (4 played, 2-0-2, 6 pts,
// 1.5 PPG), while A faces B (3 played, 1-1-1, 4 pts, 1.33 PPG). C has nothing left and must
// read zero and sort last rather than masquerade as the easiest remaining schedule.
const runs = runIn("T1", fixtures, clubs);
const runById = Object.fromEntries(runs.map((r) => [r.clubId, r]));
ok(`the run-in reads each club's remaining opponents rather than its own record: B is hardest (avg ${runById.B.avgOppPpg} over ${runById.B.remaining} fixture(s) against ${runById.B.opponents.join(",")}), A next (${runById.A.avgOppPpg} against ${runById.A.opponents.join(",")}), C last with nothing left (${runById.C.remaining}, avg ${runById.C.avgOppPpg})`,
  runs.length === 3 && runs[0].clubId === "B" && runById.B.remaining === 1 &&
  runById.B.avgOppPpg === 1.5 && runById.B.opponents.join(",") === "A" &&
  runById.A.remaining === 1 && runById.A.avgOppPpg === 1.33 && runById.A.opponents.join(",") === "B" &&
  runById.C.remaining === 0 && runById.C.avgOppPpg === 0 && runs[2].clubId === "C");
ok(`a run-in row carries the club's own record beside the opponents it has left, so the read never needs a second lookup (A: ${runById.A.points} pts in ${runById.A.played}, B: ${runById.B.points} in ${runById.B.played})`,
  runById.A.points === 6 && runById.A.played === 4 && runById.B.points === 4 && runById.B.played === 3);
// A finished fixture is not a remaining one, and another competition's schedule is not this one's:
// the four finished T1 matches and T2's played match must not appear as opponents anywhere.
ok(`the run-in counts only the competition's scheduled fixtures — the finished m1-m5 never appear and T2 stays out (opponents: ${runs.map((r) => r.opponents.join("|")).join(" / ")})`,
  runs.every((r) => !r.opponents.includes("C") && !r.opponents.includes("D") && !r.opponents.includes("E")));

// --- The points scenarios: what the table can still become. --------------------------------
// Same T1 micro-league, one scheduled fixture left (m6: A v B). A has 6 points from 4 games and
// one to play, so its ceiling is 9 and its at-rate projection is 6 + 1.5 = 7.5. B has 4 from 3 and
// one to play: ceiling 7, at-rate 4 + 1.33 = 5.33, two behind the leader and still able to reach
// the leader's current 6. C has 4 from 3 and nothing left: ceiling 4, no way to catch A.
const scenarios = pointsScenarios("T1", fixtures, clubs);
const scenarioById = Object.fromEntries(scenarios.map((r) => [r.clubId, r]));
ok(`the points scenarios keep the table's order and read each club's own ceiling and rate (A ${scenarioById.A.points}→${scenarioById.A.maxPoints}/${scenarioById.A.ratePoints}, B ${scenarioById.B.points}→${scenarioById.B.maxPoints}/${scenarioById.B.ratePoints}, C ${scenarioById.C.points}→${scenarioById.C.maxPoints}/${scenarioById.C.ratePoints})`,
  scenarios.map((r) => r.clubId).join(",") === "A,B,C" &&
  scenarioById.A.remaining === 1 && scenarioById.A.maxPoints === 9 && scenarioById.A.ratePoints === 7.5 &&
  scenarioById.B.remaining === 1 && scenarioById.B.maxPoints === 7 && scenarioById.B.ratePoints === 5.33 &&
  scenarioById.C.remaining === 0 && scenarioById.C.maxPoints === 4 && scenarioById.C.ratePoints === 4);
ok(`the leader's gap is zero and only clubs whose ceiling reaches its total are still in reach (leader A ${scenarioById.A.behindLeader}/${scenarioById.A.canCatchLeader}, B ${scenarioById.B.behindLeader}/${scenarioById.B.canCatchLeader}, C ${scenarioById.C.behindLeader}/${scenarioById.C.canCatchLeader})`,
  scenarioById.A.behindLeader === 0 && scenarioById.A.canCatchLeader === false &&
  scenarioById.B.behindLeader === 2 && scenarioById.B.canCatchLeader === true &&
  scenarioById.C.behindLeader === 2 && scenarioById.C.canCatchLeader === false);
ok(`a finished fixture is not points left: C's ceiling is its current total, and the other competition never enters the rows (rows ${scenarios.length}, C ${scenarioById.C.maxPoints})`,
  scenarios.length === 3 && scenarioById.C.maxPoints === scenarioById.C.points &&
  scenarios.every((r) => !["D", "E"].includes(r.clubId)));
const scenariosAgain = pointsScenarios("T1", fixtures, clubs);
ok("pointsScenarios is deterministic over the same fixtures", JSON.stringify(scenarios) === JSON.stringify(scenariosAgain));

// --- M716: what those ceilings are worth in PLACES -------------------------------------------
// T1 again: A leads on 6 with one fixture left (ceiling 9), B is second on 4 with one left
// (ceiling 7), C third on 4 with none left (ceiling 4). The ceilings sort against EACH OTHER, so
// B's sweep to 7 still sits behind A's sweep to 9 and no club moves. Asking the other question —
// could this club pass a frozen leader — is what maxPoints already answers, and on the shipped
// Premier League table nine of ten clubs pass a frozen leader that way: a column of 1s.
const climb = ceilingPlaces("T1", fixtures, clubs);
const climbById = Object.fromEntries(climb.rows.map((r) => [r.clubId, r]));
ok(`ceilings are compared with ceilings, not with the table frozen behind them (A ${climbById.A.place}→${climbById.A.ceilingPlace}, B ${climbById.B.place}→${climbById.B.ceilingPlace}, C ${climbById.C.place}→${climbById.C.ceilingPlace})`,
  climb.rows.map((r) => r.clubId).join(",") === "A,B,C" &&
  climbById.A.place === 1 && climbById.A.ceilingPlace === 1 && climbById.A.moves === 0 &&
  climbById.B.place === 2 && climbById.B.ceilingPlace === 2 && climbById.B.moves === 0 &&
  climbById.C.place === 3 && climbById.C.ceilingPlace === 3 && climbById.C.moves === 0);
ok(`a table whose ceilings are already in order peaks at the leader with zero to gain, not at a null (peak ${climb.peak.clubId} +${climb.peak.moves})`,
  climb.peak.clubId === "A" && climb.peak.moves === 0);
// TC: Q has 9 pts / 3-0 and nothing left to play; P has 6 pts / 3-1 and TWO fixtures left, so its
// ceiling is 12 against Q's 9. P takes the place and Q loses the one it holds — which is the honest
// half of the read, and why the moves sum to zero: this is one table re-sorted, not three claims.
const climbClubs = [club("P", "TC"), club("Q", "TC"), club("N", "TC")];
const climbFixtures = [
  match("c1", "TC", "Q", "N", 1, 0, "2026-02-01"),
  match("c2", "TC", "Q", "N", 1, 0, "2026-02-02"),
  match("c3", "TC", "Q", "P", 1, 0, "2026-02-03"),
  match("c4", "TC", "P", "N", 2, 0, "2026-02-04"),
  match("c5", "TC", "P", "N", 1, 0, "2026-02-05"),
  match("c6", "TC", "P", "N", 1, 0, "2026-02-06", "SCHEDULED"),
  match("c7", "TC", "N", "P", 0, 1, "2026-02-07", "SCHEDULED"),
];
const climbC = ceilingPlaces("TC", climbFixtures, climbClubs);
const climbCById = Object.fromEntries(climbC.rows.map((r) => [r.clubId, r]));
ok(`the club with more left to play takes the place of the club with nothing left (Q ${climbCById.Q.place}→${climbCById.Q.ceilingPlace} on ${climbCById.Q.moves}, P ${climbCById.P.place}→${climbCById.P.ceilingPlace} on ${climbCById.P.moves}, N ${climbCById.N.place}→${climbCById.N.ceilingPlace})`,
  climbC.rows.map((r) => r.clubId).join(",") === "Q,P,N" &&
  climbCById.Q.place === 1 && climbCById.Q.ceilingPlace === 2 && climbCById.Q.moves === -1 &&
  climbCById.P.place === 2 && climbCById.P.ceilingPlace === 1 && climbCById.P.moves === 1 &&
  climbCById.N.place === 3 && climbCById.N.ceilingPlace === 3 && climbCById.N.moves === 0 &&
  climbC.rows.reduce((s, r) => s + r.moves, 0) === 0);
ok(`the tile names the club the ceilings carry furthest (peak ${climbC.peak.clubId} +${climbC.peak.moves})`,
  climbC.peak.clubId === "P" && climbC.peak.moves === 1);
// TD is the goal-difference half. S leads on 6 pts / 3-1 (+2) with nothing left; R sits second on
// 3 pts / 4-3 (+1) with one fixture left, so its ceiling is 6 pts / 5-3: level with S on points AND
// goal difference, ahead on goals for — the table's third tie-break, reached only because each
// lifted fixture carries the smallest winning margin rankSwing already uses.
const sweepClubs = [club("S", "TD"), club("R", "TD"), club("M", "TD")];
const sweepFixtures = [
  match("d1", "TD", "S", "M", 2, 1, "2026-03-01"),
  match("d2", "TD", "S", "M", 1, 0, "2026-03-02"),
  match("d3", "TD", "R", "M", 4, 3, "2026-03-04"),
  match("d4", "TD", "R", "M", 1, 0, "2026-03-05", "SCHEDULED"),
];
const climbT = ceilingPlaces("TD", sweepFixtures, sweepClubs);
const climbTById = Object.fromEntries(climbT.rows.map((r) => [r.clubId, r]));
ok(`a sweep is scored, not just banked: R reaches S's points and S's goal difference and passes on goals for (R ${climbTById.R.place}→${climbTById.R.ceilingPlace} on ${climbTById.R.moves}, S ${climbTById.S.place}→${climbTById.S.ceilingPlace})`,
  climbT.rows.map((r) => r.clubId).join(",") === "S,R,M" &&
  climbTById.R.place === 2 && climbTById.R.ceilingPlace === 1 && climbTById.R.moves === 1 &&
  climbTById.S.place === 1 && climbTById.S.ceilingPlace === 2 && climbTById.S.moves === -1);
// The counterfactual the clause above needs: with points alone (no goals counted) S and R both sit
// on 6 and the sort keeps the incumbent, so the pass is the goal convention's doing.
const tdCeiling = new Map(pointsScenarios("TD", sweepFixtures, sweepClubs).map((s) => [s.clubId, s.maxPoints]));
const pointsOnly = [...climbT.rows].sort((a, b) => tdCeiling.get(b.clubId) - tdCeiling.get(a.clubId));
ok(`a points-only lift would leave R behind the incumbent, so the goals the sweep scores are what pass it (points-only first ${pointsOnly[0].clubId}, fold first ${climbTById.R.ceilingPlace === 1 ? "R" : "not R"})`,
  pointsOnly[0].clubId === "S" && climbTById.R.ceilingPlace === 1);
// A competition with no rows has no places to lift: the rows are empty and the peak is null rather
// than a maxBy over nothing; a club outside this competition's table never enters the rows, and the
// rows that DO exist are the two clubs T2 actually has.
const climbEmpty = ceilingPlaces("TZ", fixtures, clubs);
const climbT2 = ceilingPlaces("T2", fixtures, clubs);
ok(`an empty table gives no rows and no peak rather than a crash, and the other competition keeps its own two rows (${climbEmpty.rows.length} row(s) for a competition with no clubs, peak ${climbEmpty.peak}; T2 ${climbT2.rows.map((r) => r.clubId).join(",")})`,
  climbEmpty.rows.length === 0 && climbEmpty.peak === null &&
  climbT2.rows.length === 2 && climbT2.rows.map((r) => r.clubId).join(",") === "D,E" &&
  climbT2.rows.every((r) => !["A", "B", "C"].includes(r.clubId)));
// M778: the place is a number, but the column also names the row it lands on. The landed-on club
// is the neighbour one place DOWN the ceiling table, read off the same sorted fold: the bottom row
// has nobody below it, every other row names exactly the club ranked directly behind it, and a row
// the ceilings push DOWN still names its new neighbour.
const ceilingRowOf = new Map(climb.rows.map((r) => [r.ceilingPlace, r.clubId]));
const lastCeilingPlace = Math.max(...climb.rows.map((r) => r.ceilingPlace));
ok(`every ceiling row names the club it sits directly above, and the bottom row names nobody (A ${climbById.A.landedOn}, B ${climbById.B.landedOn}, C ${climbById.C.landedOn})`,
  climb.rows.every((r) => (r.ceilingPlace === lastCeilingPlace ? r.landedOn === null : r.landedOn === ceilingRowOf.get(r.ceilingPlace + 1))) &&
  climbById.A.landedOn === "B" && climbById.B.landedOn === "C" && climbById.C.landedOn === null);
// TC again: P's sweep takes first, so it lands on Q — the club it displaced — and Q, pushed down
// to second, lands on N. N holds the bottom row and names nobody.
ok(`a climb lands on the club it displaced while the displaced club lands on the row below it (P over ${climbCById.P.landedOn}, Q over ${climbCById.Q.landedOn})`,
  climbCById.P.ceilingPlace === 1 && climbCById.P.landedOn === "Q" &&
  climbCById.Q.ceilingPlace === 2 && climbCById.Q.landedOn === "N" &&
  climbCById.N.ceilingPlace === 3 && climbCById.N.landedOn === null);
// The landing name is a read of the SAME ranking the place came from: rebuilding the ceiling rows
// outside the fold and sorting them again must agree with the printed neighbour, row by row.
const ceilingOutside = [...climbC.rows]
  .sort((a, b) => a.ceilingPlace - b.ceilingPlace)
  .map((r) => r.clubId);
ok(`the landing names agree with the ceiling table's own order (${ceilingOutside.join(" ← ")})`,
  ceilingOutside.join(",") === "P,Q,N" &&
  climbC.rows.every((r) => {
    const i = ceilingOutside.indexOf(r.clubId);
    return r.landedOn === (i >= 0 && i < ceilingOutside.length - 1 ? ceilingOutside[i + 1] : null);
  }));
ok("ceilingPlaces is deterministic over the same fixtures",
  JSON.stringify(ceilingPlaces("T1", fixtures, clubs)) === JSON.stringify(climb));
// The scenarios screen prints the new column and tile off the fold and never ranks the table
// itself; an absent row falls to the shared absence glyph the other columns use.
const SCENARIO_SRC = readFileSync(resolve(root, "features/analytics/PointsScenario.tsx"), "utf8");
const climbScreen = SCENARIO_SRC.includes("ceilingPlaces(") && SCENARIO_SRC.includes("standing.ceilingPlace") &&
  SCENARIO_SRC.includes("standing.landedOn") && SCENARIO_SRC.includes('t("scenario.landedOn"') &&
  SCENARIO_SRC.includes('t("scenario.landedBottom"') &&
  SCENARIO_SRC.includes('t("scenario.colMaxPlace")') && SCENARIO_SRC.includes('t("scenario.climb")') &&
  SCENARIO_SRC.includes('t("scenario.climbSub"') && SCENARIO_SRC.includes("climb.peak &&") &&
  !SCENARIO_SRC.includes("byTableStanding") && !SCENARIO_SRC.includes(".sort(");
ok(`the scenarios screen reads the ceiling places off the fold and ranks nothing itself (screen ${climbScreen})`,
  climbScreen);

// --- titleRace: the gap week by week, on a hand-built finish line ------------------------------
// A wins week 0 (A 3, C second on goal difference), B overtakes in week 1 (4 to A's 3), A takes it
// back in week 2 (6 to B's 4). The scheduled r5 and the other competition's r6 are noise.
const raceFixtures = [
  match("r1", "T1", "A", "B", 2, 0, "2026-01-01T12:00:00.000Z"),
  match("r2", "T1", "C", "B", 1, 1, "2026-01-01T18:00:00.000Z"),
  match("r3", "T1", "B", "A", 1, 0, "2026-01-09T12:00:00.000Z"),
  match("r4", "T1", "A", "C", 3, 0, "2026-01-16T12:00:00.000Z"),
  match("r5", "T1", "A", "B", 9, 0, "2026-01-10T12:00:00.000Z", "SCHEDULED"),
  match("r6", "T2", "D", "E", 3, 0, "2026-01-02T12:00:00.000Z"),
];
const race = titleRace("T1", raceFixtures, clubs);
ok(`titleRace buckets the season into weeks and keeps the table as it stood (weeks ${race.weeks.length}, leaders ${race.weeks.map((w) => w.leaderId).join(",")}, gaps ${race.weeks.map((w) => w.gap).join(",")})`,
  race.weeks.length === 3 && race.weeks.map((w) => w.leaderId).join(",") === "A,B,A" &&
  race.weeks.map((w) => w.gap).join(",") === "2,1,2" &&
  race.weeks.map((w) => w.leaderPoints).join(",") === "3,4,6" &&
  race.weeks.map((w) => w.played).join(",") === "2,3,4");
ok(`titleRace names the club in second, counts lead changes, and settles on the final gap (second ${race.weeks.map((w) => w.secondId).join(",")}, changes ${race.leadChanges}, current ${race.currentGap}, widest ${race.biggestGap} in week ${race.biggestGapWeek})`,
  race.weeks.map((w) => w.secondId).join(",") === "C,A,B" && race.leadChanges === 2 &&
  race.currentGap === 2 && race.biggestGap === 2 && race.biggestGapWeek === 1);
ok(`titleRace's buckets are seven-day windows from the first kickoff, so the same fixtures always land in the same week (${race.weeks.map((w) => w.from + ".." + w.to).join(", ")})`,
  race.weeks[0].from === "2026-01-01" && race.weeks[0].to === "2026-01-01" &&
  race.weeks[1].from === "2026-01-08" && race.weeks[1].to === "2026-01-09" &&
  race.weeks[2].from === "2026-01-15" && race.weeks[2].to === "2026-01-16");
const raceAgain = titleRace("T1", raceFixtures, clubs);
const raceEmpty = titleRace("T3", raceFixtures, clubs);
ok(`titleRace is deterministic and a competition with no finished fixture charts nothing (same series ${JSON.stringify(race) === JSON.stringify(raceAgain)}, weeks ${race.weeks.length}, empty weeks ${raceEmpty.weeks.length}, empty week ${raceEmpty.biggestGapWeek})`,
  JSON.stringify(race) === JSON.stringify(raceAgain) && race.weeks.length === 3 &&
  raceEmpty.weeks.length === 0 &&
  raceEmpty.biggestGap === 0 && raceEmpty.biggestGapWeek === 0);

// --- headToHead: the pair's whole record, across competitions -----------------------------------
// A 2-0 B, B 1-1 A, A 0-3 B in another competition, B 4-1 A; a third club's match, a scheduled
// meeting and a live one are all noise. Read from A's side: 1W 1D 2L, 4 goals for, 8 against,
// two competitions, widest 3 (the first such meeting by kickoff), and the latest two B wins.
const h2hFixtures = [
  match("h1", "T1", "A", "B", 2, 0, "2026-01-01T12:00:00.000Z"),
  match("h4", "T1", "A", "C", 5, 0, "2026-01-03T12:00:00.000Z"),
  match("h2", "T1", "B", "A", 1, 1, "2026-01-05T12:00:00.000Z"),
  match("h3", "T2", "A", "B", 0, 3, "2026-01-09T12:00:00.000Z"),
  match("h5", "T1", "B", "A", 4, 1, "2026-01-13T12:00:00.000Z"),
  match("h6", "T1", "A", "B", 9, 0, "2026-01-15T12:00:00.000Z", "SCHEDULED"),
  match("h7", "T1", "A", "B", 1, 0, "2026-01-16T12:00:00.000Z", "LIVE"),
];
const h2h = headToHead("A", "B", h2hFixtures);
ok(`headToHead counts only finished meetings and reads the record from club A's side (played ${h2h.played}, ${h2h.winsA}W ${h2h.draws}D ${h2h.winsB}L, goals ${h2h.goalsA}-${h2h.goalsB}, ${h2h.competitions} competitions)`,
  h2h.played === 4 && h2h.meetings.map((m) => m.matchId).join(",") === "h1,h2,h3,h5" &&
  h2h.winsA === 1 && h2h.draws === 1 && h2h.winsB === 2 &&
  h2h.goalsA === 4 && h2h.goalsB === 8 && h2h.competitions === 2 &&
  h2h.meetings.map((m) => m.winner).join(",") === "a,,b,b");
ok(`headToHead names the widest meeting, the latest run, and the two orientations agree (widest ${h2h.biggest?.matchId} by ${h2h.biggest ? Math.abs(h2h.biggest.goalsA - h2h.biggest.goalsB) : "none"}; run ${h2h.streak?.side} ${h2h.streak?.length})`,
  h2h.biggest?.matchId === "h3" && h2h.biggest?.winner === "b" &&
  h2h.streak?.side === "b" && h2h.streak?.length === 2 &&
  h2h.meetings[0].homeGoals === 2 && h2h.meetings[0].awayGoals === 0);
const mirror = headToHead("B", "A", h2hFixtures);
ok(`headToHead swapped is the same record seen from the other side (played ${mirror.played}, ${mirror.winsA}W ${mirror.winsB}L, goals ${mirror.goalsA}-${mirror.goalsB})`,
  mirror.played === h2h.played && mirror.winsA === h2h.winsB && mirror.winsB === h2h.winsA &&
  mirror.goalsA === h2h.goalsB && mirror.goalsB === h2h.goalsA &&
  mirror.biggest?.matchId === h2h.biggest?.matchId && mirror.streak?.side === "a");
const h2hEmpty = headToHead("A", "E", h2hFixtures);
const h2hAgain = headToHead("A", "B", h2hFixtures);
ok(`headToHead is deterministic and a pair that never met reads empty rather than a zero record (played ${h2h.played}, same fold ${JSON.stringify(h2h) === JSON.stringify(h2hAgain)}, empty played ${h2hEmpty.played}, empty widest ${h2hEmpty.biggest ? "someone" : "none"}, empty run ${h2hEmpty.streak ? "something" : "none"})`,
  JSON.stringify(h2h) === JSON.stringify(h2hAgain) && h2h.played === 4 &&
  h2hEmpty.played === 0 && h2hEmpty.biggest === null &&
  h2hEmpty.streak === null && h2hEmpty.goalsA === 0 && h2hEmpty.goalsB === 0 && h2hEmpty.competitions === 0);

// --- venueSplit: the season's two halves, and the league's own venue effect --------------------
// A wins at home (2-0 B), C draws B at home (1-1) and beats A at home (1-0), B draws A at home
// (2-2) — four home fixtures, two home wins, two draws, no away win. The scheduled v5 and the
// other competition's v6 are noise. A and C tie on 4 points and +1 goal difference; A's four
// goals break the tie ahead of C's two.
const venueFixtures = [
  match("v1", "T1", "A", "B", 2, 0, "2026-01-01"),
  match("v2", "T1", "C", "B", 1, 1, "2026-01-02"),
  match("v3", "T1", "C", "A", 1, 0, "2026-01-03"),
  match("v4", "T1", "B", "A", 2, 2, "2026-01-04"),
  match("v5", "T1", "A", "B", 9, 0, "2026-01-10", "SCHEDULED"),
  match("v6", "T2", "D", "E", 3, 0, "2026-01-02"),
];
const venue = venueSplit("T1", venueFixtures, clubs);
const vById = Object.fromEntries(venue.rows.map((r) => [r.clubId, r]));
ok(`venueSplit counts the league's fixtures by venue, and scheduled or other-competition noise stays out (${venue.played} played: ${venue.homeWins} home wins, ${venue.draws} draws, ${venue.awayWins} away wins; goals ${venue.homeGoals}-${venue.awayGoals})`,
  venue.played === 4 && venue.homeWins === 2 && venue.draws === 2 && venue.awayWins === 0 &&
  venue.homeGoals === 6 && venue.awayGoals === 3);
ok(`venueSplit gives each club its two halves: points, per-game rate and the home edge (A home ${vById.A.homePoints} pts / ${vById.A.homePpg} ppg, away ${vById.A.awayPoints} pts / ${vById.A.awayPpg} ppg, edge ${vById.A.homeEdge})`,
  vById.A.homePoints === 3 && vById.A.awayPoints === 1 &&
  vById.A.homePpg === 3 && vById.A.awayPpg === 0.5 && vById.A.homeEdge === 2.5 &&
  vById.A.home.won === 1 && vById.A.home.drawn === 0 && vById.A.home.lost === 0 &&
  vById.A.away.won === 0 && vById.A.away.drawn === 1 && vById.A.away.lost === 1 &&
  vById.B.homeEdge === 0.5);
ok(`a club that has not travelled yet reads an unplayed half rather than a zero record (C away ${vById.C.away.played} played, ${vById.C.awayPoints} pts, ${vById.C.awayPpg} ppg; home ${vById.C.homePpg} ppg; rows ${venue.rows.map((r) => r.clubId).join(",")})`,
  vById.C.away.played === 0 && vById.C.awayPoints === 0 && vById.C.awayPpg === 0 &&
  vById.C.home.played === 2 && vById.C.homePpg === 2 && vById.C.homeEdge === 2 &&
  venue.rows.map((r) => r.clubId).join(",") === "A,C,B");
const venueAgain = venueSplit("T1", venueFixtures, clubs);
const venueEmpty = venueSplit("T3", venueFixtures, clubs);
ok(`venueSplit is deterministic, keeps the table's own order, and a competition with no fixture reads empty (${venue.rows.length} rows, same split ${JSON.stringify(venue) === JSON.stringify(venueAgain)}, empty rows ${venueEmpty.rows.length}, empty played ${venueEmpty.played})`,
  venue.rows.length === 3 && JSON.stringify(venue) === JSON.stringify(venueAgain) &&
  venueEmpty.rows.length === 0 && venueEmpty.played === 0 && venueEmpty.homeGoals === 0 &&
  venueEmpty.awayGoals === 0);

// --- goalTiming: when the goals arrive, window by window ---------------------------------------
// A 2-1 B with goals at 12' (A), 44' (B), 78' (A); C 0-1 A with the goal at 92'; a scheduled
// fixture carrying a goal, another competition's goals, and a finished match with no events at
// all are noise. A: 3 scored (bands 0 and 5 twice), 1 conceded (band 2), late share 66.67.
const goal = (minute, side) => ({ minute, type: "GOAL", side, player: "p" });
const timingFixtures = [
  { ...match("g1", "T1", "A", "B", 2, 1, "2026-02-01"), events: [goal(12, "home"), goal(44, "away"), goal(78, "home")] },
  { ...match("g2", "T1", "C", "A", 0, 1, "2026-02-02"), events: [goal(92, "away")] },
  { ...match("g3", "T1", "B", "C", 1, 0, "2026-02-03", "SCHEDULED"), events: [goal(10, "home")] },
  { ...match("g4", "T2", "D", "E", 1, 1, "2026-02-04"), events: [goal(5, "home"), goal(88, "away")] },
];
const timing = goalTiming("T1", timingFixtures, clubs);
const tmg = Object.fromEntries(timing.map((r) => [r.clubId, r]));
ok(`goalTiming folds only this competition's finished goals into six windows, sorted by how late they come (${timing.map((r) => r.clubId).join(",")}; A ${tmg.A.scored} for ${tmg.A.conceded} against)`,
  timing.length === 3 && timing.map((r) => r.clubId).join(",") === "A,B,C" &&
  tmg.A.scored === 3 && tmg.A.conceded === 1 &&
  tmg.A.scoredBands.join(",") === "1,0,0,0,0,2" && tmg.A.concededBands.join(",") === "0,0,1,0,0,0" &&
  tmg.A.lateScored === 2 && near(tmg.A.lateShare, 66.67, 0.005));
ok(`goalTiming reads the conceding side from the same events, and a club that never scored still owns its conceding windows (B conceded ${tmg.B.lateConceded} late, C ${tmg.C.conceded} against and share ${tmg.C.lateShare})`,
  tmg.B.scored === 1 && tmg.B.conceded === 2 &&
  tmg.B.scoredBands.join(",") === "0,0,1,0,0,0" && tmg.B.concededBands.join(",") === "1,0,0,0,0,1" &&
  tmg.B.lateScored === 0 && tmg.B.lateConceded === 1 &&
  tmg.C.scored === 0 && tmg.C.conceded === 1 && tmg.C.lateConceded === 1 && tmg.C.lateShare === 0);
// The window edges, measured rather than described: 15/16, 45/46, 75/76 each step one band, and
// a stoppage-time minute stays in the last window instead of inventing a seventh.
const edgeClubs = [club("F", "T3"), club("G", "T3")];
const edge = goalTiming("T3", [
  { ...match("e1", "T3", "F", "G", 6, 0, "2026-03-01"), events: [15, 16, 45, 46, 75, 76].map((m) => goal(m, "home")) },
], edgeClubs);
const edgeBy = Object.fromEntries(edge.map((r) => [r.clubId, r]));
ok(`goalTiming's six windows are the 15-minute edges (15,16,45,46,75,76 land in ${edgeBy.F.scoredBands.join(",")}; a 97' goal lands in window ${tmg.A.scoredBands.length - 1}, the same one as 78')`,
  edgeBy.F.scoredBands.join(",") === "1,1,1,1,1,1" &&
  edgeBy.G.concededBands.join(",") === "1,1,1,1,1,1" &&
  edgeBy.F.lateScored === 1 && edgeBy.G.lateConceded === 1 &&
  tmg.A.scoredBands[5] === 2 && tmg.A.scoredBands.length === 6);
const timingAgain = goalTiming("T1", timingFixtures, clubs);
const silentClubs = [club("H", "T4"), club("I", "T4")];
const timingSilent = goalTiming("T4", [
  { ...match("n1", "T4", "H", "I", 1, 0, "2026-03-02") },
], silentClubs);
ok(`goalTiming is deterministic and a match without recorded events contributes no goals (same fold ${JSON.stringify(timing) === JSON.stringify(timingAgain)}, silent rows ${timingSilent.length}, silent goals ${timingSilent.reduce((s, r) => s + r.scored + r.conceded, 0)})`,
  JSON.stringify(timing) === JSON.stringify(timingAgain) && timingSilent.length === 2 &&
  timingSilent.every((r) => r.scored === 0 && r.conceded === 0 && r.lateShare === 0));

// ---- discipline(): cards and fouls read from the stats block, not the events. -------------------
const statLine = (fouls, yellows, reds) => ({
  possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 80,
  tackles: 15, duels: 20, corners: 4, fouls, yellows, reds,
});
const withStats = (m, home, away) => ({ ...m, stats: { home, away } });
const discClubs = [club("A", "T5"), club("B", "T5"), club("C", "T5"), club("D", "T6"), club("E", "T6"), club("F", "T7"), club("G", "T7")];
const discFixtures = [
  withStats(match("d1", "T5", "A", "B", 2, 0, "2026-04-01"), statLine(12, 2, 0), statLine(8, 1, 1)),
  withStats(match("d2", "T5", "C", "A", 1, 1, "2026-04-02"), statLine(10, 3, 1), statLine(14, 2, 0)),
  withStats(match("d3", "T5", "B", "C", 0, 2, "2026-04-03"), statLine(6, 1, 0), statLine(9, 2, 0)),
  withStats(match("d4", "T5", "A", "C", 1, 0, "2026-04-04", "SCHEDULED"), statLine(9, 9, 9), statLine(9, 9, 9)),
  withStats(match("d5", "T6", "D", "E", 0, 0, "2026-04-05"), statLine(11, 3, 0), statLine(7, 1, 0)),
  match("d6", "T5", "A", "B", 3, 3, "2026-04-06"),
];
const board = discipline("T5", discFixtures, discClubs);
const byClub = (rows, id) => rows.find((r) => r.clubId === id);
const rowA = byClub(board.rows, "A"), rowB = byClub(board.rows, "B"), rowC = byClub(board.rows, "C");
ok(`discipline reads only finished fixtures carrying a stats block (matches ${board.matches}, yellows ${board.yellows}, reds ${board.reds}, fouls ${board.fouls}, cards a match ${board.perMatch})`,
  board.matches === 3 && board.yellows === 11 && board.reds === 2 && board.fouls === 59 && board.perMatch === 4.33);
ok(`discipline folds each stats block to its own side and sorts by reds then yellows (rows ${board.rows.map((r) => r.clubId).join("")}; A ${rowA.yellows}Y/${rowA.reds}R/${rowA.fouls}F booked ${rowA.bookings} at ${rowA.bookingsPerMatch}/game, ${rowA.foulsPerMatch} fouls; B ${rowB.bookings} at ${rowB.bookingsPerMatch}; C ${rowC.bookings} at ${rowC.bookingsPerMatch}, ${rowC.foulsPerMatch} fouls)`,
  board.rows.map((r) => r.clubId).join("") === "CBA" &&
  rowA.yellows === 4 && rowA.reds === 0 && rowA.fouls === 26 && rowA.bookings === 4 &&
  rowA.bookingsPerMatch === 2 && rowA.foulsPerMatch === 13 &&
  rowB.yellows === 2 && rowB.reds === 1 && rowB.fouls === 14 && rowB.bookings === 3 && rowB.bookingsPerMatch === 1.5 &&
  rowC.yellows === 5 && rowC.reds === 1 && rowC.fouls === 19 && rowC.bookings === 6 &&
  rowC.bookingsPerMatch === 3 && rowC.foulsPerMatch === 9.5);
const quiet = discipline("T7", [
  withStats(match("q1", "T7", "F", "G", 0, 0, "2026-04-07"), statLine(5, 0, 0), statLine(3, 0, 0)),
], discClubs);
ok(`a stats block with no cards is a real zero, not an absent reading (matches ${quiet.matches}, cards ${quiet.yellows + quiet.reds}, rows ${quiet.rows.length}, rates ${quiet.rows.map((r) => r.bookingsPerMatch).join(",")}, fouls ${quiet.rows.map((r) => r.foulsPerMatch).join(",")})`,
  quiet.matches === 1 && quiet.yellows === 0 && quiet.reds === 0 && quiet.rows.length === 2 &&
  quiet.rows.every((r) => r.played === 1 && r.bookings === 0 && r.bookingsPerMatch === 0) &&
  quiet.rows.map((r) => r.foulsPerMatch).join(",") === "5,3");
const discAgain = discipline("T5", discFixtures, discClubs);
const discEmpty = discipline("T8", [], discClubs);
ok(`discipline is deterministic and a competition with no fixture reads empty (same fold ${JSON.stringify(board) === JSON.stringify(discAgain)}, empty rows ${discEmpty.rows.length}, matches ${discEmpty.matches}, rate ${discEmpty.perMatch})`,
  JSON.stringify(board) === JSON.stringify(discAgain) && board.rows.length === 3 && discEmpty.rows.length === 0 &&
  discEmpty.matches === 0 && discEmpty.perMatch === 0);
// M572: the club page reads this same board and finds its own row, so the board has to be a
// roll-call of the whole competition — an unfixtured club still has a row, at zero rates.
const rollClubs = [...discClubs, club("H", "T5")];
const roll = discipline("T5", discFixtures, rollClubs);
const rollH = byClub(roll.rows, "H");
ok(`the discipline board is a roll-call of the competition — one row per club the table ranks, an unfixtured club at zero (${roll.rows.length} rows, H ${rollH ? `${rollH.played} played at ${rollH.bookingsPerMatch} cards a game` : "missing"}, order ${roll.rows.map((r) => r.clubId).join("")})`,
  roll.rows.length === 4 && rollH !== undefined && rollH.played === 0 && rollH.bookings === 0 &&
  rollH.bookingsPerMatch === 0 && roll.matches === 3 && roll.rows.map((r) => r.clubId).join("") === "CBAH");

// ---- M574: the other events on the same clock ------------------------------------------------
// The goals screen asks when goals land; this asks when the shots, the saves that answered them
// and the reviews that interrupted them land. Fixture: c1 A 2-1 B with shots at 12/78 (A) and
// 30 (B), saves at 12 (B) and 78 (A), a review at 50 (A); c2 C 0-0 A with an A shot at 91' and a
// C review at 5'; a scheduled fixture carrying all three, another competition's shot, and a
// finished fixture with no event list at all are noise.
const clockClubs = [club("A", "T9"), club("B", "T9"), club("C", "T9")];
const ev = (type, minute, side) => ({ minute, type, side, player: "p" });
const clockFixtures = [
  { ...match("c1", "T9", "A", "B", 2, 1, "2026-05-01"), events: [ev("SHOT", 12, "home"), ev("SHOT", 78, "home"), ev("SHOT", 30, "away"), ev("SAVE", 12, "away"), ev("SAVE", 78, "home"), ev("VAR", 50, "home")] },
  { ...match("c2", "T9", "C", "A", 0, 0, "2026-05-02"), events: [ev("SHOT", 91, "away"), ev("VAR", 5, "home")] },
  { ...match("c3", "T9", "A", "C", 1, 0, "2026-05-03", "SCHEDULED"), events: [ev("SHOT", 10, "home"), ev("SAVE", 10, "away"), ev("VAR", 10, "home")] },
  { ...match("c4", "T10", "D", "E", 1, 1, "2026-05-04"), events: [ev("SHOT", 5, "home")] },
  { ...match("c5", "T9", "B", "C", 0, 0, "2026-05-05") },
];
const clock = eventClock("T9", clockFixtures, clockClubs);
const clk = Object.fromEntries(clock.rows.map((r) => [r.clubId, r]));
ok(`eventClock folds only this competition's finished fixtures that carry events (matches ${clock.matches}, shots ${clock.shots}, saves ${clock.saves}, reviews ${clock.vars})`,
  clock.matches === 2 && clock.shots === 4 && clock.saves === 2 && clock.vars === 2);
ok(`eventClock lands every shot, save and review in the sixth-window clock, stoppage clamps into the last window (shots ${clock.shotsBands.join(",")}, saves ${clock.savesBands.join(",")}, reviews ${clock.varBands.join(",")})`,
  clock.shotsBands.join(",") === "1,1,0,0,0,2" && clock.savesBands.join(",") === "1,0,0,0,0,1" &&
  clock.varBands.join(",") === "1,0,0,1,0,0" && clock.shotsBands.length === 6);
ok(`eventClock keeps a row for every ranked club, sorts by shots then saves, and reads the late share off a club's own shots (order ${clock.rows.map((r) => r.clubId).join("")}; A ${clk.A.lateShots} late of ${clk.A.shots} at ${clk.A.lateShare}%)`,
  clock.rows.map((r) => r.clubId).join("") === "ABC" && clock.rows.length === 3 &&
  clk.A.shots === 3 && clk.A.saves === 1 && clk.A.vars === 1 && clk.A.lateShots === 2 &&
  near(clk.A.lateShare, 66.67, 0.005) && clk.B.shots === 1 && clk.B.saves === 1 && clk.B.vars === 0 &&
  clk.B.lateShots === 0 && clk.B.lateShare === 0 && clk.C.shots === 0 && clk.C.vars === 1);
const clockAgain = eventClock("T9", clockFixtures, clockClubs);
const clockEmpty = eventClock("T11", [], [club("J", "T11"), club("K", "T11")]);
const clockSilent = eventClock("T5", discFixtures, discClubs);
ok(`eventClock repeats its fold exactly and an eventless fixture still leaves every ranked club its six windows (same fold ${JSON.stringify(clock) === JSON.stringify(clockAgain)}, silent rows ${clockSilent.rows.length}, empty rows ${clockEmpty.rows.length}, empty windows ${clockEmpty.shotsBands.length})`,
  JSON.stringify(clock) === JSON.stringify(clockAgain) && clockSilent.matches === 0 &&
  clockSilent.rows.length === 3 && clockSilent.rows.every((r) => r.shots === 0 && r.vars === 0) &&
  clockEmpty.rows.length === 2 && clockEmpty.matches === 0 && clockEmpty.shotsBands.length === 6 &&
  clockEmpty.shotsBands.every((n) => n === 0));
// The screen is a reader, not a second engine: it must render all three families off the folded
// clock, and the route must exist for the sidebar entry that names it.
const CLOCK_SRC = readFileSync(resolve(root, "features/analytics/EventClock.tsx"), "utf8");
const APP_ROUTE_SRC = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const SHELL_NAV_SRC = readFileSync(resolve(root, "features/shell/AppShell.tsx"), "utf8");
ok(`the event clock screen renders all three folded families and both league rows and the board (rows ${["clock.shotsBands", "clock.savesBands", "clock.varBands"].filter((k) => CLOCK_SRC.includes(k)).length})`,
  ["clock.shotsBands", "clock.savesBands", "clock.varBands"].every((k) => CLOCK_SRC.includes(k)) &&
  CLOCK_SRC.includes("clock.rows.map(") && CLOCK_SRC.includes("eventClock(compId, matches, clubs)") &&
  !/GOAL_BANDS|goalBand\(/.test(CLOCK_SRC));
// M625: the defending end of the same clock. Every SHOT and SAVE by one side is an attempt the
// other side faced, and a SAVE is that other side's keeper making the stop. Hand-count on the
// same fixture: B faces A's two shots and one saved shot (3 faced, 1 stop), A faces B's shot and
// saved shot (2, 1), C faces the one stoppage-time shot (1, 0). The mirror has to close — the
// league's faced total is exactly shots + saves, because each of those events faced one club.
const facedTotal = clock.rows.reduce((s, r) => s + r.faced, 0);
const stopsTotal = clock.rows.reduce((s, r) => s + r.stops, 0);
ok(`every shot and save is charged to the defender as well as the shooter — faced ${facedTotal} = ${clock.shots} shots + ${clock.saves} saves, stops ${stopsTotal} = the saves (A ${clk.A.faced}/${clk.A.stops} at ${clk.A.stopShare}%, B ${clk.B.faced}/${clk.B.stops} at ${clk.B.stopShare}%, C ${clk.C.faced}/${clk.C.stops} at ${clk.C.stopShare}%)`,
  facedTotal === clock.shots + clock.saves && stopsTotal === clock.saves &&
  clk.A.faced === 2 && clk.A.stops === 1 && near(clk.A.stopShare, 50, 0.005) &&
  clk.B.faced === 3 && clk.B.stops === 1 && near(clk.B.stopShare, 33.33, 0.005) &&
  clk.C.faced === 1 && clk.C.stops === 0 && clk.C.stopShare === 0);
ok(`the defending read has its own order and a club that faced nothing reads zero (siege ${clock.siege.map((r) => r.clubId).join("")}, silent ${clockSilent.siege.length}, empty ${clockEmpty.siege.length})`,
  clock.siege.map((r) => r.clubId).join("") === "BAC" && clock.siege.length === 3 &&
  clockSilent.siege.length === 3 && clockSilent.siege.every((r) => r.faced === 0 && r.stops === 0 && r.stopShare === 0) &&
  clockEmpty.siege.length === 2 && clockEmpty.siege.every((r) => r.faced === 0 && r.stopShare === 0));
ok(`the event clock screen reads the defending end off the same fold (siege ${CLOCK_SRC.includes("clock.siege")}, faced ${CLOCK_SRC.includes("r.faced")}, stops ${CLOCK_SRC.includes("r.stops")}, share line ${CLOCK_SRC.includes("clock.stopLine")})`,
  CLOCK_SRC.includes("clock.siege") && CLOCK_SRC.includes("r.faced") && CLOCK_SRC.includes("r.stops") &&
  CLOCK_SRC.includes("clock.stopLine") && !/SHOT|SAVE/.test(CLOCK_SRC));
// M712: the late read of the defending end — the third ordering of the same rows. B took 2 of its
// 3 faced attempts after the 75th, C all 1 of 1, A none of 2, so the board reads BCA. A clock where
// nobody was hit late still lists every club (all zero late), which is why the screen filters those
// rows out rather than printing a column of zeros.
ok(`the late siege orders the same rows by the load they took after the 75th (late ${clock.lateSiege.map((r) => r.clubId).join("")}; B ${clk.B.lateFaced} of ${clk.B.faced} at ${clk.B.lateFacedShare}%, C ${clk.C.lateFaced} of ${clk.C.faced}, A ${clk.A.lateFaced} of ${clk.A.faced}; silent ${clockSilent.lateSiege.map((r) => r.clubId).join("")} at ${clockSilent.lateSiege.map((r) => r.lateFaced).join(",")})`,
  clock.lateSiege.map((r) => r.clubId).join("") === "BCA" && clock.lateSiege.length === 3 &&
  clk.B.lateFaced === 2 && near(clk.B.lateFacedShare, 66.67, 0.005) &&
  clk.C.lateFaced === 1 && clk.C.lateFacedShare === 100 && clk.A.lateFaced === 0 &&
  clockSilent.lateSiege.length === 3 && clockSilent.lateSiege.every((r) => r.lateFaced === 0) &&
  clockEmpty.lateSiege.length === 2);
ok(`the event clock screen reads the late siege off the same fold and drops a club that took nothing late (late ${CLOCK_SRC.includes("clock.lateSiege")}, filter ${CLOCK_SRC.includes("r.lateFaced > 0")}, line ${CLOCK_SRC.includes("clock.lateSiegeLine")})`,
  CLOCK_SRC.includes("clock.lateSiege.filter(") && CLOCK_SRC.includes("r.lateFaced > 0") &&
  CLOCK_SRC.includes("clock.lateSiegeLine") && CLOCK_SRC.includes("lateSiege.map(") &&
  CLOCK_SRC.includes("clock.lateSiegeTitle") && !/SHOT|SAVE/.test(CLOCK_SRC));
ok(`the event clock is reachable — the route table and the sidebar both name it (route ${/path === "\/clock"/.test(APP_ROUTE_SRC)}, nav ${/to: "\/clock"/.test(SHELL_NAV_SRC)})`,
  /path === "\/clock"/.test(APP_ROUTE_SRC) && /to: "\/clock"/.test(SHELL_NAV_SRC));
// M773: the first window gets the four numbers the last one already carries, off the same pass.
// Hand-count on the T9 fixtures: A shot once inside 15 minutes (1 of its 3, 33.33%) and was faced
// once there (1 of 2, 50%) by B's save at 12; B took no shot early but faced once early (1 of 3,
// 33.33%); C's only faced attempt arrived at 91', so its opening reads 0 of 1 rather than NaN.
// The two ends share a tie-break here exactly as M712's late board does: A and B both faced 1 early,
// and the whole faced load puts B (3) ahead of A (2), so the opening board reads BAC.
ok(`the opening window counts the same events at both ends (A ${clk.A.earlyShots} of ${clk.A.shots} shots at ${clk.A.earlyShare}%, faced ${clk.A.earlyFaced} of ${clk.A.faced} at ${clk.A.earlyFacedShare}%; B ${clk.B.earlyShots} shots but ${clk.B.earlyFaced} of ${clk.B.faced} faced at ${clk.B.earlyFacedShare}%; C ${clk.C.earlyFaced} of ${clk.C.faced})`,
  clk.A.earlyShots === 1 && near(clk.A.earlyShare, 33.33, 0.005) &&
  clk.A.earlyFaced === 1 && near(clk.A.earlyFacedShare, 50, 0.005) &&
  clk.B.earlyShots === 0 && clk.B.lateShots === 0 && clk.B.shots === 1 &&
  clk.B.earlyFaced === 1 && near(clk.B.earlyFacedShare, 33.33, 0.005) &&
  clk.C.earlyShots === 0 && clk.C.shots === 0 && clk.C.earlyShare === 0 &&
  clk.C.earlyFaced === 0 && clk.C.faced === 1 && clk.C.earlyFacedShare === 0);
ok(`the opening siege orders the same rows by the load they took inside fifteen minutes and breaks the tie on the whole faced load (early ${clk.B.earlyFaced} each for B and A, faced B ${clk.B.faced} over A ${clk.A.faced}; order ${clock.earlySiege.map((r) => r.clubId).join("")})`,
  clock.earlySiege.map((r) => r.clubId).join("") === "BAC" && clock.earlySiege.length === 3 &&
  clock.earlySiege.every((r) => r.earlyFaced <= r.faced) &&
  clock.earlySiege.every((r) => r.earlyFaced >= 0) &&
  clock.rows.length === 3 && clk.B.faced === 3 && clk.A.faced === 2);
// The opening counters cannot disagree with the window series they were folded out of: window 1 of
// each club's own shots and of what it faced IS its early counter, and league-wide the two series add
// up the same way M628 made every window add up — one pass, two reads.
ok(`the opening counters are the first window itself, per club and league-wide (shots ${clock.shotsBands[0]} league / ${clock.rows.reduce((s, r) => s + r.earlyShots, 0)} summed, faced ${clock.facedBands[0]} league / ${clock.rows.reduce((s, r) => s + r.earlyFaced, 0)} summed)`,
  clock.rows.every((r) => r.shotsBands[0] === r.earlyShots && r.facedBands[0] === r.earlyFaced) &&
  clock.shotsBands[0] === clock.rows.reduce((s, r) => s + r.earlyShots, 0) &&
  clock.facedBands[0] === clock.rows.reduce((s, r) => s + r.earlyFaced, 0) &&
  clock.facedBands[0] === 2 && clock.shotsBands[0] === 1);
// A table with no events still gets an opening: every row keeps six windows and two zeroed opening
// counters, so the screen's board is empty by count rather than by a missing field.
ok(`a silent and an empty table both keep their opening rows (silent ${clockSilent.earlySiege.length} rows at ${clockSilent.earlySiege.map((r) => r.earlyFaced).join(",")}, empty ${clockEmpty.earlySiege.length} rows, windows ${clockEmpty.rows[0].facedBands.length})`,
  clockSilent.matches === 0 && clockSilent.earlySiege.length === 3 &&
  clockSilent.earlySiege.every((r) => r.earlyFaced === 0 && r.earlyFacedShare === 0) &&
  clockEmpty.earlySiege.length === 2 && clockEmpty.rows.length === 2 &&
  clockEmpty.rows[0].earlyShare === 0 && clockEmpty.rows[0].facedBands.length === 6);
ok(`the event clock screen reads the opening off the fold, prints it beside the late line and ranks nothing itself (board ${CLOCK_SRC.includes("clock.earlySiege.filter(")}, gate ${CLOCK_SRC.includes("r.earlyFaced > 0")}, line ${CLOCK_SRC.includes("clock.openSiegeLine")}, record ${CLOCK_SRC.includes("clock.openRecord")}, sorting ${/\.sort\(/.test(CLOCK_SRC)})`,
  CLOCK_SRC.includes("clock.earlySiege.filter(") && CLOCK_SRC.includes("r.earlyFaced > 0") &&
  CLOCK_SRC.includes("clock.openSiegeTitle") && CLOCK_SRC.includes("clock.openSiegeLine") &&
  CLOCK_SRC.includes("earlySiege.map(") && CLOCK_SRC.includes('t("clock.openRecord", { e: r.earlyShots, p: r.earlyShare })') &&
  CLOCK_SRC.includes('t("clock.record", { l: r.lateShots, p: r.lateShare })') &&
  !/\.sort\(/.test(CLOCK_SRC) && !/earlyFaced\+\+|band === 0/.test(CLOCK_SRC));
// M777: the attacking mirror of M773's opening board. A took one of its three shots inside the
// first window, B none of its one, C none at all (it never shot), so the board ranked by the
// opening shots and then the whole shot load reads ABC. The closing counter is the last window of
// the same series, so a row's two ends cannot disagree with the bars above it.
ok(`the opening attack orders the same rows by the shots they took inside fifteen minutes and prints the closing counter off the same row (early ${clock.earlyAttack.map((r) => r.clubId).join("")}; A ${clk.A.earlyShots} of ${clk.A.shots} at ${clk.A.earlyShare}% late ${clk.A.lateShots} at ${clk.A.lateShare}%; B ${clk.B.earlyShots} of ${clk.B.shots}; C ${clk.C.earlyShots} of ${clk.C.shots})`,
  clock.earlyAttack.map((r) => r.clubId).join("") === "ABC" && clock.earlyAttack.length === 3 &&
  clock.rows.every((r) => r.shotsBands[0] === r.earlyShots && r.shotsBands[5] === r.lateShots) &&
  clock.rows.every((r) => r.earlyShots + r.lateShots <= r.shots) &&
  clk.A.shots === 3 && clk.A.earlyShots === 1 && clk.A.lateShots === 2 &&
  near(clk.A.earlyShare, 33.33, 0.005) && near(clk.A.lateShare, 66.67, 0.005) &&
  clk.B.earlyShots === 0 && clk.C.earlyShots === 0);
// A table with no shots at all still keeps a full opening-attack order — every club sits in it at
// zero, which is why the screen drops those rows instead of printing a column of zeros.
ok(`a silent and an empty table both keep their opening-attack order (silent ${clockSilent.earlyAttack.length} rows, empty ${clockEmpty.earlyAttack.length} rows)`,
  clockSilent.matches === 0 && clockSilent.earlyAttack.length === 3 &&
  clockSilent.earlyAttack.every((r) => r.earlyShots === 0 && r.earlyShare === 0) &&
  clockEmpty.earlyAttack.length === 2 &&
  clockEmpty.earlyAttack.every((r) => r.shots === 0 && r.earlyShots === 0 && r.lateShots === 0));
ok(`the event clock screen reads the opening attack off the fold, prints the closing share on the same row and ranks nothing itself (board ${CLOCK_SRC.includes("clock.earlyAttack.filter(")}, gate ${CLOCK_SRC.includes("r.earlyShots > 0")}, line ${CLOCK_SRC.includes("clock.strikeLine")}, sorting ${/\.sort\(/.test(CLOCK_SRC)})`,
  CLOCK_SRC.includes("clock.earlyAttack.filter(") && CLOCK_SRC.includes("r.earlyShots > 0") &&
  CLOCK_SRC.includes("clock.strikeTitle") && CLOCK_SRC.includes("clock.strikeLine") &&
  CLOCK_SRC.includes("earlyAttack.map(") &&
  CLOCK_SRC.includes('t("clock.strikeLine", { e: r.earlyShots, p: r.earlyShare, l: r.lateShots, q: r.lateShare })') &&
  !/\.sort\(/.test(CLOCK_SRC) && !/earlyShots\+\+/.test(CLOCK_SRC));
// M780: the closing attack read on its own order. T12 gives P no early shot and three late ones,
// R one at each end and Q one in the middle, so the opening board reads RPQ (early count, then the
// whole load) while the closing board reads PRQ (late count, then the whole load) — the same fold
// names a different first club at each end of the match.
const lateClubs = [club("P", "T12"), club("Q", "T12"), club("R", "T12")];
const lateFixtures = [
  { ...match("q1", "T12", "P", "Q", 2, 1, "2026-06-01"), events: [ev("SHOT", 80, "home"), ev("SHOT", 85, "home"), ev("SHOT", 20, "away")] },
  { ...match("q2", "T12", "R", "P", 1, 3, "2026-06-02"), events: [ev("SHOT", 5, "home"), ev("SHOT", 90, "home"), ev("SHOT", 88, "away")] },
];
const lateClock = eventClock("T12", lateFixtures, lateClubs);
const late = Object.fromEntries(lateClock.rows.map((r) => [r.clubId, r]));
const lateAgain = eventClock("T12", lateFixtures, lateClubs);
ok(`the closing attack orders the same rows by the shots they took after the 75th, apart from the opening order (late ${lateClock.lateAttack.map((r) => r.clubId).join("")}; early ${lateClock.earlyAttack.map((r) => r.clubId).join("")}; P ${late.P.lateShots} of ${late.P.shots} at ${late.P.lateShare}%, R ${late.R.lateShots} of ${late.R.shots} at ${late.R.lateShare}%, Q ${late.Q.lateShots} of ${late.Q.shots})`,
  lateClock.lateAttack.map((r) => r.clubId).join("") === "PRQ" &&
  lateClock.earlyAttack.map((r) => r.clubId).join("") === "RPQ" && lateClock.lateAttack.length === 3 &&
  lateClock.rows.every((r) => r.shotsBands[5] === r.lateShots) &&
  late.P.shots === 3 && late.P.earlyShots === 0 && late.P.lateShots === 3 && near(late.P.lateShare, 100, 0.005) &&
  late.R.shots === 2 && late.R.earlyShots === 1 && late.R.lateShots === 1 && near(late.R.lateShare, 50, 0.005) &&
  late.Q.shots === 1 && late.Q.earlyShots === 0 && late.Q.lateShots === 0 && late.Q.lateShare === 0);
ok(`a silent and an empty table both keep their closing-attack order (silent ${clockSilent.lateAttack.length} rows, empty ${clockEmpty.lateAttack.length} rows)`,
  clockSilent.matches === 0 && clockSilent.lateAttack.length === 3 &&
  clockSilent.lateAttack.every((r) => r.lateShots === 0 && r.lateShare === 0) &&
  clockEmpty.lateAttack.length === 2 && clockEmpty.lateAttack.every((r) => r.lateShots === 0 && r.shots === 0));
ok(`the closing attack repeats its order on a second read and the screen reads it off the fold without ranking anything itself (repeat ${JSON.stringify(lateAgain.lateAttack) === JSON.stringify(lateClock.lateAttack)}, board ${CLOCK_SRC.includes("clock.lateAttack.filter(")}, gate ${CLOCK_SRC.includes("r.lateShots > 0")})`,
  JSON.stringify(lateAgain) === JSON.stringify(lateClock) &&
  CLOCK_SRC.includes("clock.lateAttack.filter(") && CLOCK_SRC.includes("r.lateShots > 0") &&
  CLOCK_SRC.includes("lateAttack.map(") && CLOCK_SRC.includes("clock.lateStrikeTitle") &&
  CLOCK_SRC.includes("clock.lateStrikeHint") && CLOCK_SRC.includes('t("timing.w6")') &&
  !/lateAttack.*\.sort\(/.test(CLOCK_SRC) && !/lateShots\+\+/.test(CLOCK_SRC));
// --- briefing: one club's next fixture, joined with the five season reads -----------------------
// T1 hand-count: f1 A 2-0 B, f2 B 1-1 A, f3 C 3-1 B finished; s1 A-B (May 10), s2 B-C (May 12),
// z1 C-A (Jun 1) scheduled; l1 A-C is LIVE and must stay out of the pick, the record and the venue
// halves. A: 2 played, 4 pts, 2 left, ceiling 10, rate 8; B: 3 played, 1 pt, 2 left, ceiling 7;
// C: 1 played, 3 pts, 2 left, ceiling 9, one behind A. A's run-in opponents average
// (B 0.33 + C 3.00) / 2 = 1.67; A's venues are 3.00 home vs 1.00 away, edge 2; the pair's record
// is 2 finished meetings, A 1W-1D, 3-1 on goals. The race has one week, A one point clear.
// F (T2) has two booked fixtures on one kickoff, w1 F-A and w2 F-B, so the tie-break is readable;
// s3 D-A is D's cross-competition next-up.
const briefingClubs = [...clubs, club("F", "T2")];
const briefingFixtures = [
  match("f1", "T1", "A", "B", 2, 0, "2026-04-01"),
  match("f2", "T1", "B", "A", 1, 1, "2026-04-02"),
  match("f3", "T1", "C", "B", 3, 1, "2026-04-03"),
  match("l1", "T1", "A", "C", 0, 0, "2026-04-09", "LIVE"),
  match("s1", "T1", "A", "B", 0, 0, "2026-05-10", "SCHEDULED"),
  match("s2", "T1", "B", "C", 0, 0, "2026-05-12", "SCHEDULED"),
  match("z1", "T1", "C", "A", 0, 0, "2026-06-01", "SCHEDULED"),
  match("s3", "T2", "D", "A", 0, 0, "2026-05-11", "SCHEDULED"),
  match("w2", "T2", "F", "B", 0, 0, "2026-07-01", "SCHEDULED"),
  match("w1", "T2", "F", "A", 0, 0, "2026-07-01", "SCHEDULED"),
];
const briefA = briefing("A", briefingFixtures, briefingClubs);
ok(`briefing picks a club's earliest SCHEDULED fixture across competitions and ignores the live one (A: fixture ${briefA.fixture.id}, side ${briefA.side}, opponent ${briefA.opponentId}; clubId ${briefA.clubId})`,
  briefA.fixture.id === "s1" && briefA.side === "home" && briefA.opponentId === "B" &&
  briefA.clubId === "A" && briefA.fixture.status === "SCHEDULED");
ok(`briefing joins the table-and-ceiling read for both ends (A ${briefA.us.points} pts / ${briefA.us.played} played / ceiling ${briefA.us.maxPoints} / rate ${briefA.us.ratePoints} / behind ${briefA.us.behindLeader}; B ${briefA.them.points} pts / ${briefA.them.played} played / ceiling ${briefA.them.maxPoints} / behind ${briefA.them.behindLeader} / can catch ${briefA.them.canCatchLeader})`,
  briefA.us.points === 4 && briefA.us.played === 2 && briefA.us.maxPoints === 10 &&
  briefA.us.ratePoints === 8 && briefA.us.behindLeader === 0 && briefA.us.canCatchLeader === false &&
  briefA.them.points === 1 && briefA.them.played === 3 && briefA.them.maxPoints === 7 &&
  briefA.them.behindLeader === 3 && briefA.them.canCatchLeader === true);
ok(`briefing's run-in row names the opponents in kickoff order and averages their ppg (A: ${briefA.runInRow.remaining} left [${briefA.runInRow.opponents.join(",")}], avg ${briefA.runInRow.avgOppPpg})`,
  briefA.runInRow.remaining === 2 && briefA.runInRow.opponents.join(",") === "B,C" &&
  briefA.runInRow.avgOppPpg === 1.67);
ok(`briefing's venue row counts finished halves only, so the live fixture pays nothing (A home ${briefA.venueRow.homePpg} / away ${briefA.venueRow.awayPpg}, edge ${briefA.venueRow.homeEdge}, halves ${briefA.venueRow.home.played}+${briefA.venueRow.away.played})`,
  briefA.venueRow.homePpg === 3 && briefA.venueRow.awayPpg === 1 &&
  briefA.venueRow.homeEdge === 2 && briefA.venueRow.home.played === 1 && briefA.venueRow.away.played === 1);
ok(`briefing's record reads every finished meeting, the live fixture excluded (${briefA.record.played} played: A ${briefA.record.winsA}W ${briefA.record.draws}D ${briefA.record.winsB}L, ${briefA.record.goalsA}-${briefA.record.goalsB}, ${briefA.record.competitions} competition, widest ${briefA.record.biggest.matchId}, run ${briefA.record.streak.side}×${briefA.record.streak.length})`,
  briefA.record.played === 2 && briefA.record.winsA === 1 && briefA.record.draws === 1 &&
  briefA.record.winsB === 0 && briefA.record.goalsA === 3 && briefA.record.goalsB === 1 &&
  briefA.record.competitions === 1 && briefA.record.biggest.matchId === "f1" &&
  briefA.record.streak.side === "draw" && briefA.record.streak.length === 1);
ok(`briefing's race is the fixture competition's own weekly fold (${briefA.race.weeks.length} week, gap ${briefA.race.currentGap}, lead changes ${briefA.race.leadChanges}, widest ${briefA.race.biggestGap} in week ${briefA.race.biggestGapWeek})`,
  briefA.race.weeks.length === 1 && briefA.race.currentGap === 1 && briefA.race.leadChanges === 0 &&
  briefA.race.biggestGap === 1 && briefA.race.biggestGapWeek === 1);
// Two scheduled fixtures on the same kickoff: the pick falls to the smaller id, and reversing the
// fixture list changes nothing. D's fixture is in a competition where the opponent has no table
// row, so the opponent join reads null rather than inventing a zero record; a club with nothing
// booked reads no briefing at all.
const briefF = briefing("F", briefingFixtures, briefingClubs);
const briefD = briefing("D", briefingFixtures, briefingClubs);
const briefARight = briefing("A", [...briefingFixtures].reverse(), briefingClubs);
ok(`briefing breaks a kickoff tie by id and is order-independent (F ${briefF.fixture.id} vs ${briefF.opponentId}; A reversed ${briefARight.fixture.id}, same fold ${JSON.stringify(briefA) === JSON.stringify(briefARight)})`,
  briefF.fixture.id === "w1" && briefF.side === "home" && briefF.opponentId === "A" &&
  briefARight.fixture.id === "s1" && JSON.stringify(briefA) === JSON.stringify(briefARight));
ok(`briefing reads a competition that has no table row for the opponent as null, not as a zero record (D fixture ${briefD.fixture.id} in ${briefD.fixture.competitionId}: us ${briefD.us.points} pts, them ${briefD.them}, run-in ${briefD.runInRow.remaining} left, record ${briefD.record.played} played; E with nothing booked: ${briefing("E", briefingFixtures, briefingClubs)})`,
  briefD.fixture.id === "s3" && briefD.opponentId === "A" && briefD.us.points === 0 &&
  briefD.them === null && briefD.runInRow.remaining === 1 && briefD.record.played === 0 &&
  briefing("E", briefingFixtures, briefingClubs) === null);

// --- matchBrief: the same join, anchored to the fixture the reader chose ------------------------
// On the same T1 set: s1 is A at home to B, so the brief must read A's ceiling (10), B's (7), both
// run-ins (2 left each), A's home half (3 pts at 3.00 a game) against B's away half (0 pts, 0.00),
// the pair's two meetings A-first (1W 1D, 3-1) and the one-week race. f2 is the reverse fixture,
// B at home to A, so the record flips to B-first (0W 1D 1L) and the venue halves swap ends.
const stakeS1 = matchBrief("s1", briefingFixtures, briefingClubs);
const stakeF2 = matchBrief("f2", briefingFixtures, briefingClubs);
const stakeRight = matchBrief("s1", [...briefingFixtures].reverse(), briefingClubs);
ok(`matchBrief anchors on the chosen fixture and joins both ends of the table, the calendar and the venue split (${stakeS1.fixture.id}: home ${stakeS1.home.points} pts / ceiling ${stakeS1.home.maxPoints} / ${stakeS1.homeRunIn.remaining} left, away ${stakeS1.away.points} pts / ceiling ${stakeS1.away.maxPoints} / ${stakeS1.awayRunIn.remaining} left; home half ${stakeS1.homeVenue.homePoints} pts at ${stakeS1.homeVenue.homePpg}, away half ${stakeS1.awayVenue.awayPoints} pts at ${stakeS1.awayVenue.awayPpg})`,
  stakeS1.fixture.id === "s1" && stakeS1.fixture.homeClubId === "A" && stakeS1.fixture.awayClubId === "B" &&
  stakeS1.home.points === 4 && stakeS1.home.maxPoints === 10 && stakeS1.homeRunIn.remaining === 2 &&
  stakeS1.away.points === 1 && stakeS1.away.maxPoints === 7 && stakeS1.awayRunIn.remaining === 2 &&
  stakeS1.homeVenue.homePoints === 3 && stakeS1.homeVenue.homePpg === 3 &&
  stakeS1.awayVenue.awayPoints === 0 && stakeS1.awayVenue.awayPpg === 0);
ok(`matchBrief orients the record and the venue halves to the fixture, not to a club id (f2 ${stakeF2.fixture.homeClubId}-${stakeF2.fixture.awayClubId}: ${stakeF2.record.winsA}W ${stakeF2.record.draws}D ${stakeF2.record.winsB}L, ${stakeF2.record.goalsA}-${stakeF2.record.goalsB}; home half ${stakeF2.homeVenue.homePoints} pts at ${stakeF2.homeVenue.homePpg}, away half ${stakeF2.awayVenue.awayPoints} pts at ${stakeF2.awayVenue.awayPpg})`,
  stakeF2.fixture.id === "f2" && stakeF2.fixture.homeClubId === "B" && stakeF2.fixture.awayClubId === "A" &&
  stakeF2.record.played === 2 && stakeF2.record.winsA === 0 && stakeF2.record.draws === 1 &&
  stakeF2.record.winsB === 1 && stakeF2.record.goalsA === 1 && stakeF2.record.goalsB === 3 &&
  stakeF2.homeVenue.homePoints === 1 && stakeF2.homeVenue.homePpg === 1 &&
  stakeF2.awayVenue.awayPoints === 1 && stakeF2.awayVenue.awayPpg === 1);
ok(`matchBrief's race is the fixture competition's own weekly fold, and an unknown fixture id reads null rather than an empty brief (${stakeS1.race.weeks.length} week, gap ${stakeS1.race.currentGap}, lead changes ${stakeS1.race.leadChanges}; missing ${matchBrief("nope", briefingFixtures, briefingClubs)})`,
  stakeS1.race.weeks.length === 1 && stakeS1.race.currentGap === 1 && stakeS1.race.leadChanges === 0 &&
  matchBrief("nope", briefingFixtures, briefingClubs) === null);
ok(`matchBrief is order-independent byte for byte (reversed fixture list: ${JSON.stringify(stakeS1) === JSON.stringify(stakeRight)})`,
  JSON.stringify(stakeS1) === JSON.stringify(stakeRight));
const DETAILS_SRC = readFileSync(resolve(root, "features/football/Details.tsx"), "utf8");
const MATCH_BRIEF_IMPORT = /import \{[^}]*\bmatchBrief\b[^}]*\} from "@\/domain\/analytics"/.test(DETAILS_SRC);
ok(`the match page reads the brief off the domain fold rather than re-deriving it (import ${MATCH_BRIEF_IMPORT}, call ${DETAILS_SRC.includes("matchBrief(matchId")}, panel ${DETAILS_SRC.includes('t("stakes.title")')} with the link home ${DETAILS_SRC.includes('to="/briefing"')})`,
  MATCH_BRIEF_IMPORT && DETAILS_SRC.includes("matchBrief(matchId") &&
  DETAILS_SRC.includes('t("stakes.title")') && DETAILS_SRC.includes('to="/briefing"'));
// M713: the match page's card ledger — the discipline board read for the fixture's two ends. On
// the T5 fixture d4 (A hosting C, still scheduled) A has 2 counted games for 4Y0R (2.00 a game)
// and C 2 for 5Y1R (3.00). A cross-competition fixture (T2's D-A) has no T2 row for the visitor
// yet, so that end reads null rather than a zero ledger, while the host's unfixtured row is real.
const stakeD4 = matchBrief("d4", discFixtures, discClubs);
const stakeCross = matchBrief("s3", briefingFixtures, briefingClubs);
ok(`matchBrief joins each end's own card ledger off the discipline fold (d4 A ${stakeD4.homeCards.played} played, ${stakeD4.homeCards.yellows}Y ${stakeD4.homeCards.reds}R at ${stakeD4.homeCards.bookingsPerMatch}; C ${stakeD4.awayCards.played} played, ${stakeD4.awayCards.yellows}Y ${stakeD4.awayCards.reds}R at ${stakeD4.awayCards.bookingsPerMatch}; cross host ${stakeCross.homeCards ? `${stakeCross.homeCards.played} played` : "null"}, visitor ${stakeCross.awayCards})`,
  stakeD4.homeCards.played === 2 && stakeD4.homeCards.yellows === 4 && stakeD4.homeCards.reds === 0 &&
  stakeD4.homeCards.bookingsPerMatch === 2 &&
  stakeD4.awayCards.played === 2 && stakeD4.awayCards.yellows === 5 && stakeD4.awayCards.reds === 1 &&
  stakeD4.awayCards.bookingsPerMatch === 3 &&
  stakeD4.homeCards.bookings === stakeD4.homeCards.yellows + stakeD4.homeCards.reds &&
  stakeCross.homeCards !== null && stakeCross.homeCards.played === 0 && stakeCross.awayCards === null);
ok(`the match page's stakes panel prints both card ledgers off the brief rather than re-summing the stats blocks (home ${DETAILS_SRC.includes("brief.homeCards")}, away ${DETAILS_SRC.includes("brief.awayCards")}, line ${DETAILS_SRC.includes("stakes.cardsLine")})`,
  DETAILS_SRC.includes("brief.homeCards") && DETAILS_SRC.includes("brief.awayCards") &&
  DETAILS_SRC.includes("stakes.cardsLine") && DETAILS_SRC.includes("bookingsPerMatch"));
// M714: the fixture's two defending clocks, joined off the same eventClock fold. c3 is T9's
// scheduled A-C: A faced 2 attempts (none late), C faced 1 (all late). A cross-competition
// fixture reads no T2 clock row for the visitor, while the host's row is the real zero the
// /clock board keeps for a club that has faced nothing.
const stakeClock = matchBrief("c3", clockFixtures, clockClubs);
const stakeClockCross = matchBrief("s3", briefingFixtures, briefingClubs);
ok(`matchBrief joins each end's defending clock off the event fold (c3 A ${stakeClock.homeClock.faced} faced ${stakeClock.homeClock.lateFaced} late; C ${stakeClock.awayClock.faced} faced ${stakeClock.awayClock.lateFaced} late at ${stakeClock.awayClock.lateFacedShare}%; cross host ${stakeClockCross.homeClock ? `${stakeClockCross.homeClock.faced} faced` : "null"}, visitor ${stakeClockCross.awayClock})`,
  stakeClock.homeClock.faced === 2 && stakeClock.homeClock.lateFaced === 0 &&
  stakeClock.homeClock.lateFacedShare === 0 &&
  stakeClock.awayClock.faced === 1 && stakeClock.awayClock.lateFaced === 1 &&
  stakeClock.awayClock.lateFacedShare === 100 &&
  stakeClockCross.homeClock !== null && stakeClockCross.homeClock.faced === 0 &&
  stakeClockCross.awayClock === null);
ok(`the stakes panel prints the two siege lines off the brief and silences a side that faced nothing (home ${DETAILS_SRC.includes("brief.homeClock")}, away ${DETAILS_SRC.includes("brief.awayClock")}, guard ${DETAILS_SRC.includes("brief.homeClock.faced > 0")}, line ${DETAILS_SRC.includes("stakes.siegeLine")})`,
  DETAILS_SRC.includes("brief.homeClock") && DETAILS_SRC.includes("brief.awayClock") &&
  DETAILS_SRC.includes("brief.homeClock.faced > 0") && DETAILS_SRC.includes("brief.awayClock.faced > 0") &&
  DETAILS_SRC.includes("stakes.siegeLine"));
// M774: the same defending clock read at its opening. On c3's two clubs the fold's early window is
// already counted: A faced two attempts all told and one of them inside the first window (the
// 12th-minute save), so 1 of 2 is 50%; C's only faced attempt arrived at 91', so its opening is a
// real 0 of 1 rather than a missing reading. The cross fixture's host has the zero row the /clock
// board keeps, and its visitor has no row at all.
ok(`matchBrief hands the opening load through the same clock row as the late one (c3 A ${stakeClock.homeClock.earlyFaced} of ${stakeClock.homeClock.faced} early at ${stakeClock.homeClock.earlyFacedShare}%; C ${stakeClock.awayClock.earlyFaced} of ${stakeClock.awayClock.faced} at ${stakeClock.awayClock.earlyFacedShare}%; cross host ${stakeClockCross.homeClock ? `${stakeClockCross.homeClock.earlyFaced} early` : "null"}, visitor ${stakeClockCross.awayClock})`,
  stakeClock.homeClock.earlyFaced === 1 && stakeClock.homeClock.earlyFacedShare === 50 &&
  stakeClock.awayClock.earlyFaced === 0 && stakeClock.awayClock.earlyFacedShare === 0 &&
  stakeClock.homeClock.earlyFaced <= stakeClock.homeClock.faced &&
  stakeClockCross.homeClock !== null && stakeClockCross.homeClock.earlyFaced === 0 &&
  stakeClockCross.homeClock.earlyFacedShare === 0 && stakeClockCross.awayClock === null);
ok(`the stakes panel prints the opening line too, off the same brief and under the same silence (line ${DETAILS_SRC.includes("stakes.earlySiegeLine")}, home ${DETAILS_SRC.includes("brief.homeClock.earlyFaced")}, away ${DETAILS_SRC.includes("brief.awayClock.earlyFaced")})`,
  DETAILS_SRC.includes("stakes.earlySiegeLine") &&
  DETAILS_SRC.includes("brief.homeClock.earlyFaced") && DETAILS_SRC.includes("brief.awayClock.earlyFaced") &&
  DETAILS_SRC.includes("brief.homeClock.faced > 0") && DETAILS_SRC.includes("brief.awayClock.faced > 0"));

// ---- M622: the same stats blocks folded by round --------------------------------------------
// The discipline board answers who is booked; the trend answers when the bookings arrive. Fixture
// over T12: round 1 one fixture (4 cards), round 2 one (6), round 3 two (4 combined) — cumulative
// 4, 10, 14 with round 3 the only two-fixture row. A scheduled round, another competition's
// stats and a finished fixture with no stats block are noise.
const trendFixture = (id, home, away, round, hs, as, status = "FINISHED") => ({
  ...withStats(match(id, "T12", home, away, 1, 0, `2026-06-0${round}`, status), hs, as), round,
});
const trendFixtures = [
  trendFixture("t1", "A", "B", 1, statLine(10, 2, 0), statLine(8, 1, 1)),
  trendFixture("t2", "C", "A", 2, statLine(9, 3, 1), statLine(7, 2, 0)),
  trendFixture("t3", "B", "C", 3, statLine(6, 1, 0), statLine(5, 2, 0)),
  trendFixture("t4", "A", "C", 3, statLine(4, 1, 0), statLine(4, 0, 0)),
  trendFixture("t5", "A", "B", 4, statLine(9, 9, 9), statLine(9, 9, 9), "SCHEDULED"),
  withStats(match("t6", "T13", "D", "E", 0, 0, "2026-06-06"), statLine(9, 9, 9), statLine(9, 9, 9)),
  match("t7", "T12", "B", "A", 2, 1, "2026-06-07"),
];
const trend = disciplineTrend("T12", trendFixtures);
ok(`disciplineTrend folds counting fixtures by round and cumulates in round order (rounds ${trend.rounds.map((r) => r.round).join(",")}, in-round ${trend.rounds.map((r) => r.inRound).join(",")}, cumulative ${trend.rounds.map((r) => r.cards).join(",")}, peak ${trend.peak})`,
  trend.rounds.length === 3 && trend.rounds.map((r) => r.round).join(",") === "1,2,3" &&
  trend.rounds.map((r) => r.inRound).join(",") === "4,6,4" &&
  trend.rounds.map((r) => r.cards).join(",") === "4,10,14" && trend.peak === 6);
ok(`disciplineTrend counts every fixture in a round and reads cards per fixture off that round (round 3 matches ${trend.rounds[2].matches}, rate ${trend.rounds[2].perMatch}; round 1 rate ${trend.rounds[0].perMatch}, round 2 rate ${trend.rounds[1].perMatch})`,
  trend.rounds[2].matches === 2 && trend.rounds[2].perMatch === 2 &&
  trend.rounds[0].matches === 1 && trend.rounds[0].perMatch === 4 &&
  trend.rounds[1].perMatch === 6 && trend.rounds[2].yellows === 4 && trend.rounds[2].reds === 0);
// The trend and the board read the same list, so their totals must be the same number: four
// counted fixtures, 12 yellows, 2 reds, 14 cards at 3.5 a game.
const trendBoard = discipline("T12", trendFixtures, discClubs);
const trendEmpty = disciplineTrend("T14", []);
ok(`disciplineTrend and discipline agree on the same fixtures, and a competition with no round reads an empty trend (board ${trendBoard.matches} matches, ${trendBoard.yellows}Y, ${trendBoard.reds}R, ${trendBoard.perMatch} a game; empty rounds ${trendEmpty.rounds.length}, peak ${trendEmpty.peak})`,
  trendBoard.matches === 4 && trendBoard.yellows === 12 && trendBoard.reds === 2 && trendBoard.perMatch === 3.5 &&
  trend.rounds[2].cards === trendBoard.yellows + trendBoard.reds &&
  trendEmpty.rounds.length === 0 && trendEmpty.peak === 0);
const trendAgain = disciplineTrend("T12", trendFixtures);
const DISCIPLINE_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`disciplineTrend is deterministic and the discipline screen reads its rounds off the domain fold rather than re-deriving them (same fold ${JSON.stringify(trend) === JSON.stringify(trendAgain)}, renders ${[...DISCIPLINE_SRC.matchAll(/trend\.rounds/g)].length} round reads)`,
  JSON.stringify(trend) === JSON.stringify(trendAgain) &&
  /import \{[^}]*\bdisciplineTrend\b[^}]*\} from "@\/domain\/analytics"/.test(DISCIPLINE_SRC) &&
  DISCIPLINE_SRC.includes("disciplineTrend(compId, matches)") &&
  DISCIPLINE_SRC.includes("trend.rounds.map(") && DISCIPLINE_SRC.includes("trend.peak"));
// M711: the same round fold read from one side of each stats block — the club page's own curve.
// On the T12 fixture A hosts t1 (2Y0R = 2), visits C in t2 (2Y0R = 2) and hosts C in t3
// (1Y0R = 1), so rounds 1,2,3 read 2,2,1 with cumulatives 2,4,5 and a peak of 2 first reached in
// round 1. C visits A in t2 (3Y1R against it = 4) and hosts B in t3 (2Y0R = 2): rounds 2,3 with
// peak 4, and it never appears in round 1. B visits A in t1 (1Y1R = 2) and hosts C in t3 (1Y0R =
// 1), so its round 2 is absent rather than drawn at zero. D never appears in T12 at all, and a
// competition with no rows is empty.
const trendA = clubDisciplineTrend("T12", "A", trendFixtures);
const trendB = clubDisciplineTrend("T12", "B", trendFixtures);
const trendC = clubDisciplineTrend("T12", "C", trendFixtures);
const trendD = clubDisciplineTrend("T12", "D", trendFixtures);
ok(`clubDisciplineTrend lifts one club out of each stats block and folds it by round (A rounds ${trendA.rounds.map((r) => r.round).join(",")}, in-round ${trendA.rounds.map((r) => r.inRound).join(",")}, cumulative ${trendA.rounds.map((r) => r.cards).join(",")}, peak ${trendA.peak})`,
  trendA.rounds.map((r) => r.round).join(",") === "1,2,3" &&
  trendA.rounds.map((r) => r.inRound).join(",") === "2,2,1" &&
  trendA.rounds.map((r) => r.cards).join(",") === "2,4,5" && trendA.peak === 2 &&
  trendA.rounds.map((r) => r.perMatch).join(",") === "2,2,1" &&
  trendA.rounds.map((r) => r.matches).join(",") === "1,1,1" &&
  trendA.rounds[0].yellows === 2 && trendA.rounds[0].reds === 0);
ok(`a club that sat a counted round out skips it rather than reading a zero, and the peak is the single round not the season (B rounds ${trendB.rounds.map((r) => r.round).join(",")}, in-round ${trendB.rounds.map((r) => r.inRound).join(",")}, cumulative ${trendB.rounds.map((r) => r.cards).join(",")}, peak ${trendB.peak}; C rounds ${trendC.rounds.map((r) => r.round).join(",")}, in-round ${trendC.rounds.map((r) => r.inRound).join(",")}, cumulative ${trendC.rounds.map((r) => r.cards).join(",")}, peak ${trendC.peak})`,
  trendB.rounds.map((r) => r.round).join(",") === "1,3" &&
  trendB.rounds.map((r) => r.inRound).join(",") === "2,1" &&
  trendB.rounds.map((r) => r.cards).join(",") === "2,3" && trendB.peak === 2 &&
  trendC.rounds.map((r) => r.round).join(",") === "2,3" &&
  trendC.rounds.map((r) => r.inRound).join(",") === "4,2" &&
  trendC.rounds.map((r) => r.cards).join(",") === "4,6" && trendC.peak === 4 &&
  trendD.rounds.length === 0 && trendD.peak === 0);
// The two ends of each fixture are the league row read separately, so the three clubs above must
// close on the league fold: per-round the club cards add up to the league's in-round count (4, 6,
// 4) and in total to the board's 12Y + 2R.
const trendPerRound = trend.rounds.map((r) =>
  (trendA.rounds.find((x) => x.round === r.round)?.inRound ?? 0)
  + (trendB.rounds.find((x) => x.round === r.round)?.inRound ?? 0)
  + (trendC.rounds.find((x) => x.round === r.round)?.inRound ?? 0));
ok(`club trends close on the league fold round by round (clubs ${trendPerRound.join(",")} against league ${trend.rounds.map((r) => r.inRound).join(",")}, total ${trendA.rounds[2].cards + trendB.rounds[1].cards + trendC.rounds[1].cards} against ${trendBoard.yellows + trendBoard.reds})`,
  trendPerRound.join(",") === trend.rounds.map((r) => r.inRound).join(",") &&
  trendA.rounds[2].cards + trendB.rounds[1].cards + trendC.rounds[1].cards === trendBoard.yellows + trendBoard.reds);
const trendAgainA = clubDisciplineTrend("T12", "A", trendFixtures);
ok(`clubDisciplineTrend is deterministic and the club page reads the curve off the domain fold rather than re-deriving it (same fold ${JSON.stringify(trendA) === JSON.stringify(trendAgainA)}, renders ${[...DETAILS_SRC.matchAll(/cardTrend\.rounds/g)].length} round reads)`,
  JSON.stringify(trendA) === JSON.stringify(trendAgainA) &&
  DETAILS_SRC.includes("clubDisciplineTrend(c.competitionId") &&
  DETAILS_SRC.includes("cardTrend.rounds.map(") && DETAILS_SRC.includes("det.cards.trendLine"));
// --- M779: cards by the minute, on the same six windows as the goal clock ------------------
// U hosts u1: a yellow on 5' (band 0), a red on 80' (band 5), while V takes a yellow on 76'
// (band 5). U then visits u2: a yellow on 20' (band 1) for U and one on 75' (band 4) for W,
// which is exactly the window boundary the last band must NOT swallow. V hosts u3 and takes a
// red on 90' (band 5). A scheduled u4 and another competition's u5 are noise.
const cardClubs = [club("U", "TE"), club("V", "TE"), club("W", "TE"), club("X", "TE")];
const cardEvent = (minute, type, side) => ({ minute, type, side, player: "P" });
const cardFixture = (id, comp, home, away, events, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff: "2026-07-01",
  round: 1, status, homeGoals: status === "FINISHED" ? 0 : null, awayGoals: status === "FINISHED" ? 0 : null,
  events,
});
const cardFixtures = [
  cardFixture("u1", "TE", "U", "V", [
    cardEvent(5, "YELLOW", "home"),
    cardEvent(76, "YELLOW", "away"),
    cardEvent(80, "RED", "home"),
  ]),
  cardFixture("u2", "TE", "W", "U", [
    cardEvent(20, "YELLOW", "away"),
    cardEvent(75, "YELLOW", "home"),
  ]),
  cardFixture("u3", "TE", "V", "W", [cardEvent(90, "RED", "home")]),
  cardFixture("u4", "TE", "V", "W", [cardEvent(45, "YELLOW", "away")], "SCHEDULED"),
  cardFixture("u5", "TF", "V", "W", [cardEvent(45, "YELLOW", "away")]),
  // X plays and is never booked: a real row with zero cards, not a missing one.
  cardFixture("u6", "TE", "W", "X", []),
];
const cards = cardTiming("TE", cardFixtures, cardClubs);
const cardById = Object.fromEntries(cards.rows.map((r) => [r.clubId, r]));
ok(`cardTiming reads every recorded yellow and red in its window and ranks the opening (U ${cardById.U.cards} cards ${cardById.U.bands.join("")}, V ${cardById.V.cards} ${cardById.V.bands.join("")}, W ${cardById.W.cards} ${cardById.W.bands.join("")})`,
  cards.rows.map((r) => r.clubId).join(",") === "U,V,W,X" &&
  cardById.U.cards === 3 && cardById.U.yellows === 2 && cardById.U.reds === 1 &&
  cardById.U.bands.join(",") === "1,1,0,0,0,1" &&
  cardById.V.cards === 2 && cardById.V.yellows === 1 && cardById.V.reds === 1 &&
  cardById.V.bands.join(",") === "0,0,0,0,0,2" &&
  cardById.W.cards === 1 && cardById.W.bands.join(",") === "0,0,0,0,1,0");
ok(`a 5' card is early and a 20' one is not; 75' is not late and 76' is (U early ${cardById.U.earlyCards} late ${cardById.U.lateCards}, W band ${cardById.W.bands[4]} on 75' but late ${cardById.W.lateCards}, V late ${cardById.V.lateCards} on 76' and 90')`,
  cardById.U.earlyCards === 1 && cardById.U.lateCards === 1 &&
  cardById.U.earlyShare === 33.33 && cardById.U.lateShare === 33.33 &&
  cardById.W.bands[4] === 1 && cardById.W.lateCards === 0 && cardById.W.lateShare === 0 &&
  cardById.V.lateCards === 2 && cardById.V.lateShare === 100);
ok(`a scheduled fixture and another competition's events do not enter the clock (total ${cards.rows.reduce((s, r) => s + r.cards, 0)} cards against the three finished fixtures; earliest ${cards.earliest?.clubId})`,
  cards.rows.reduce((s, r) => s + r.cards, 0) === 6 &&
  cards.earliest?.clubId === "U" && cards.earliest?.earlyCards === 1);
ok(`a club that played and was never booked keeps a row with zero cards and zero shares, and a competition with no rows reads an empty clock rather than a crash (X ${cardById.X.cards}/${cardById.X.earlyShare}/${cardById.X.lateShare}; empty rows ${cardTiming("TG", cardFixtures, cardClubs).rows.length}, earliest ${cardTiming("TG", cardFixtures, cardClubs).earliest})`,
  cardById.X.cards === 0 && cardById.X.earlyShare === 0 && cardById.X.lateShare === 0 &&
  cardById.X.bands.every((b) => b === 0) &&
  cardTiming("TG", cardFixtures, cardClubs).rows.length === 0 &&
  cardTiming("TG", cardFixtures, cardClubs).earliest === null);
const cardsAgain = cardTiming("TE", cardFixtures, cardClubs);
const DISC_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`cardTiming is deterministic and the discipline screen prints the clock off the fold, dropping unbooked rows rather than drawing zeros (same fold ${JSON.stringify(cards) === JSON.stringify(cardsAgain)}, renders ${[...DISC_SRC.matchAll(/clock\.rows/g)].length} clock reads)`,
  JSON.stringify(cards) === JSON.stringify(cardsAgain) &&
  DISC_SRC.includes("cardTiming(compId, matches, clubs)") && DISC_SRC.includes("clock.rows.filter(") &&
  DISC_SRC.includes('t("clock.strikeLine"') && DISC_SRC.includes('t("disc.clockNone"') &&
  !DISC_SRC.includes("byTableStanding") && !DISC_SRC.includes(".sort("));
// --- M783: the red card read on its own six windows ------------------------------------------
// TE already carries the shared fold: U's red landed on 80' (band 5) and V's on 90' (band 5).
// TH is the dedicated board: P is sent off at 10' and 20' — a tie on one apiece, so the EARLIEST
// window wins, band 0; Q twice inside the last window (85', 88'); R on 50' and T on 60', tied on
// one red and one peak, split by club id. S plays and is never sent off, so it keeps its row and
// is absent from the red board. A scheduled red on 5' and a red in TI are noise.
const redClubs = [club("P", "TH"), club("Q", "TH"), club("R", "TH"), club("S", "TH"), club("T", "TH")];
const redFixtures = [
  cardFixture("h1", "TH", "P", "Q", [
    cardEvent(10, "RED", "home"),
    cardEvent(20, "RED", "home"),
    cardEvent(85, "RED", "away"),
    cardEvent(88, "RED", "away"),
  ]),
  cardFixture("h2", "TH", "R", "S", [cardEvent(50, "RED", "home")]),
  cardFixture("h3", "TH", "S", "T", [cardEvent(60, "RED", "away")]),
  cardFixture("h4", "TH", "R", "T", [cardEvent(5, "RED", "home")], "SCHEDULED"),
  cardFixture("h5", "TI", "R", "T", [cardEvent(5, "RED", "home")]),
];
const reds = cardTiming("TH", redFixtures, redClubs);
const redById = Object.fromEntries(reds.rows.map((r) => [r.clubId, r]));
const redPeak = Object.fromEntries(reds.redRows.map((r) => [r.clubId, r]));
ok(`cardTiming folds reds into their own windows, a tie on the peak count going to the earliest window (P ${redById.P.redBands.join("")} peak ${redPeak.P.peakBand}×${redPeak.P.peakCount}, Q ${redById.Q.redBands.join("")} peak ${redPeak.Q.peakBand}×${redPeak.Q.peakCount}, R ${redById.R.redBands.join("")}, T ${redById.T.redBands.join("")}, S ${redById.S.reds} reds in ${redById.S.redBands.length} windows)`,
  redById.P.redBands.join(",") === "1,1,0,0,0,0" && redPeak.P.peakBand === 0 && redPeak.P.peakCount === 1 &&
  redById.Q.redBands.join(",") === "0,0,0,0,0,2" && redPeak.Q.peakBand === 5 && redPeak.Q.peakCount === 2 &&
  redById.R.redBands.join(",") === "0,0,0,1,0,0" && redById.T.redBands.join(",") === "0,0,0,1,0,0" &&
  redById.S.reds === 0 && redById.S.redBands.every((n) => n === 0));
ok(`the red board ranks by reds, then the peak window's count, then the club id, and a club never sent off is absent from it (order ${reds.redRows.map((r) => r.clubId).join("")}; ${reds.redRows.map((r) => `${r.clubId} ${r.reds}/${r.peakCount}@${r.peakBand}`).join(", ")})`,
  reds.redRows.map((r) => r.clubId).join(",") === "Q,P,R,T" &&
  reds.redRows.map((r) => r.reds).join(",") === "2,2,1,1" &&
  reds.redRows.map((r) => r.peakCount).join(",") === "2,1,1,1" &&
  reds.redRows.map((r) => r.peakBand).join(",") === "5,0,3,3" &&
  !reds.redRows.some((r) => r.clubId === "S") && reds.rows.some((r) => r.clubId === "S"));
ok(`redWindows add up to each club's reds, a scheduled red and another competition's red stay out, and a competition with rows but no reds reads an empty board (TE sums ${cards.rows.map((r) => r.redBands.reduce((s, n) => s + n, 0)).join("")} against reds ${cards.rows.map((r) => r.reds).join("")}; TH R ${redById.R.reds} red; silent ${cardTiming("TF", cardFixtures, cardClubs).rows.length} rows/${cardTiming("TF", cardFixtures, cardClubs).redRows.length} reds, empty ${cardTiming("TG", cardFixtures, cardClubs).redRows.length})`,
  cards.rows.every((r) => r.redBands.reduce((s, n) => s + n, 0) === r.reds) &&
  redById.R.reds === 1 &&
  cardTiming("TF", cardFixtures, cardClubs).rows.length === 2 &&
  cardTiming("TF", cardFixtures, cardClubs).redRows.length === 0 &&
  cardTiming("TG", cardFixtures, cardClubs).redRows.length === 0);
const redsAgain = cardTiming("TH", redFixtures, redClubs);
ok(`the red board is deterministic and the discipline screen reads it off the fold, printing the peak window with the shared band labels and sorting nothing itself (same fold ${JSON.stringify(reds) === JSON.stringify(redsAgain)}; band labels ${["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"].filter((k) => DISC_SRC.includes(`t("${k}")`)).length}/6)`,
  JSON.stringify(reds) === JSON.stringify(redsAgain) &&
  DISC_SRC.includes("clock.redRows.map(") && DISC_SRC.includes("clock.redRows.length === 0") &&
  DISC_SRC.includes('t("disc.redLine", { w: bandLabels[r.peakBand], n: r.peakCount })') &&
  DISC_SRC.includes('t("disc.redNone"') && DISC_SRC.includes('t("disc.redTotal"') &&
  ["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"]
    .every((k) => DISC_SRC.includes(`t("${k}")`)) &&
  !/\.sort\(/.test(DISC_SRC) && !DISC_SRC.includes("redRows.sort("));
// --- M785: the league's own card curve, on the same six windows -------------------------------
// TE's six cards land 5' (band 0), 20' (band 1), 75' (band 4), 76', 80' and 90' (band 5), so the
// league curve is 1,1,0,0,1,3 and two of the last window's three are red. TH is all red: its six
// sendings-off make the two series identical. TF has one yellow on 45' (band 2) and no red at all.
ok(`the league card curve folds every counted card into the clock's six windows, and each window is the sum of the clubs' own window (TE ${cards.windows.join("")} against rows ${cards.windows.map((_, i) => cards.rows.reduce((s, r) => s + r.bands[i], 0)).join("")})`,
  cards.windows.join(",") === "1,1,0,0,1,3" && cards.windows.length === 6 &&
  cards.windows.every((n, i) => n === cards.rows.reduce((s, r) => s + r.bands[i], 0)) &&
  cards.windows.reduce((s, n) => s + n, 0) === cards.rows.reduce((s, r) => s + r.cards, 0));
ok(`the red curve is the same six windows read on the red count alone, and a league with no sending-off reads six zeros (TE ${cards.redWindows.join("")} = ${cards.rows.reduce((s, r) => s + r.reds, 0)} reds; TH windows ${reds.windows.join("")} equal reds ${reds.redWindows.join("")}; TF ${cardTiming("TF", cardFixtures, cardClubs).windows.join("")} with reds ${cardTiming("TF", cardFixtures, cardClubs).redWindows.join("")}; empty ${cardTiming("TG", cardFixtures, cardClubs).windows.length} windows all ${cardTiming("TG", cardFixtures, cardClubs).windows.every((n) => n === 0)})`,
  cards.redWindows.join(",") === "0,0,0,0,0,2" &&
  cards.redWindows.reduce((s, n) => s + n, 0) === cards.rows.reduce((s, r) => s + r.reds, 0) &&
  reds.windows.join(",") === reds.redWindows.join(",") &&
  reds.windows.reduce((s, n) => s + n, 0) === reds.rows.reduce((s, r) => s + r.reds, 0) &&
  cardTiming("TF", cardFixtures, cardClubs).windows.join(",") === "0,0,1,0,0,0" &&
  cardTiming("TF", cardFixtures, cardClubs).redWindows.every((n) => n === 0) &&
  cardTiming("TG", cardFixtures, cardClubs).windows.length === 6 &&
  cardTiming("TG", cardFixtures, cardClubs).windows.every((n) => n === 0));
const windowsAgain = cardTiming("TE", cardFixtures, cardClubs);
ok(`the league curve is deterministic and the discipline screen draws it off the fold, labelling the six windows and printing reds only where they land (same fold ${JSON.stringify(windowsAgain.windows) === JSON.stringify(cards.windows)} and ${JSON.stringify(windowsAgain.redWindows) === JSON.stringify(cards.redWindows)})`,
  JSON.stringify(windowsAgain.windows) === JSON.stringify(cards.windows) &&
  JSON.stringify(windowsAgain.redWindows) === JSON.stringify(cards.redWindows) &&
  DISC_SRC.includes("clock.windows.map(") && DISC_SRC.includes("clock.windows.every(") &&
  DISC_SRC.includes("peakWindow") && DISC_SRC.includes("pctOf(n, peakWindow)") &&
  DISC_SRC.includes('t("disc.windowTitle"') && DISC_SRC.includes('t("disc.windowHint"') &&
  DISC_SRC.includes('t("disc.redTotal", { n: clock.redWindows[i] })') &&
  DISC_SRC.includes("{clock.redWindows[i] > 0 &&") && !/\.sort\(/.test(DISC_SRC));
// --- M786: goals against cards on the same six windows ----------------------------------------
// TK carries both families. k1: A 3-1 B — A scores on 10' (band 0), 80' and 90' (band 5); B
// scores on 50' (band 3); B is booked on 20' (band 1); A is sent off on 85' (band 5). k2: C 0-0 A
// — C booked on 5' (band 0) and A on 76' (band 5). So the league's goals are 1,0,0,1,0,2 and its
// cards 1,1,0,0,0,2, both totals 4 and both peaks in the last window. A scheduled goal and another
// competition's goal and booking are noise.
const crossClubs = [club("A", "TK"), club("B", "TK"), club("C", "TK")];
const crossFixtures = [
  cardFixture("k1", "TK", "A", "B", [
    cardEvent(10, "GOAL", "home"),
    cardEvent(20, "YELLOW", "away"),
    cardEvent(50, "GOAL", "away"),
    cardEvent(80, "GOAL", "home"),
    cardEvent(85, "RED", "home"),
    cardEvent(90, "GOAL", "home"),
  ]),
  cardFixture("k2", "TK", "C", "A", [cardEvent(5, "YELLOW", "home"), cardEvent(76, "YELLOW", "away")]),
  cardFixture("k3", "TK", "B", "C", [cardEvent(10, "GOAL", "home")], "SCHEDULED"),
  cardFixture("k4", "TL", "A", "B", [cardEvent(50, "GOAL", "home"), cardEvent(60, "YELLOW", "home")]),
];
const cross = clockContrast("TK", crossFixtures, crossClubs);
ok(`clockContrast folds goals and cards into the same six windows, one league series each (goals ${cross.windows.map((w) => w.goals).join("")} against cards ${cross.windows.map((w) => w.cards).join("")}; totals ${cross.goals}/${cross.cards}; peaks ${cross.peakGoal}/${cross.peakCard})`,
  cross.windows.length === 6 &&
  cross.windows.map((w) => w.goals).join(",") === "1,0,0,1,0,2" &&
  cross.windows.map((w) => w.cards).join(",") === "1,1,0,0,0,2" &&
  cross.goals === 4 && cross.cards === 4 && cross.peakGoal === 5 && cross.peakCard === 5 &&
  cross.goals === goalTiming("TK", crossFixtures, crossClubs).reduce((s, r) => s + r.scored, 0) &&
  cross.cards === cardTiming("TK", crossFixtures, crossClubs).rows.reduce((s, r) => s + r.cards, 0));
// Each series can be silent on its own: T1's goals fixture carries no booking, TE's cards
// fixture carries no goal, and a competition with no fixture has neither. A silent series is a
// null peak, not a zero window crowned as busiest.
const crossGoalsOnly = clockContrast("T1", timingFixtures, clubs);
const crossCardsOnly = clockContrast("TE", cardFixtures, cardClubs);
const crossEmpty = clockContrast("TM", crossFixtures, crossClubs);
ok(`a peak is named only for a series that has an event: a goals-only league has no card peak, a cards-only league no goal peak, and an empty competition six silent windows with neither (T1 goals ${crossGoalsOnly.windows.map((w) => w.goals).join("")} cards ${crossGoalsOnly.windows.map((w) => w.cards).join("")} peaks ${crossGoalsOnly.peakGoal}/${crossGoalsOnly.peakCard}; TE ${crossCardsOnly.goals}/${crossCardsOnly.cards} peaks ${crossCardsOnly.peakGoal}/${crossCardsOnly.peakCard}; empty ${crossEmpty.windows.length} windows ${crossEmpty.goals}/${crossEmpty.cards} peaks ${crossEmpty.peakGoal}/${crossEmpty.peakCard})`,
  crossGoalsOnly.goals === 4 && crossGoalsOnly.cards === 0 &&
  crossGoalsOnly.windows.map((w) => w.goals).join(",") === "1,0,1,0,0,2" &&
  crossGoalsOnly.windows.every((w) => w.cards === 0) &&
  crossGoalsOnly.peakGoal === 5 && crossGoalsOnly.peakCard === null &&
  crossCardsOnly.goals === 0 && crossCardsOnly.cards === 6 &&
  crossCardsOnly.windows.every((w) => w.goals === 0) &&
  crossCardsOnly.peakGoal === null && crossCardsOnly.peakCard === 5 &&
  crossEmpty.windows.length === 6 &&
  crossEmpty.windows.every((w) => w.goals === 0 && w.cards === 0) &&
  crossEmpty.goals === 0 && crossEmpty.cards === 0 &&
  crossEmpty.peakGoal === null && crossEmpty.peakCard === null);
const crossAgain = clockContrast("TK", crossFixtures, crossClubs);
const EV_CLOCK_SRC = readFileSync(resolve(root, "features/analytics/EventClock.tsx"), "utf8");
ok(`clockContrast is deterministic and the event clock screen prints both series off the fold, labelling the six windows and naming a peak only for a series that has one (same fold ${JSON.stringify(cross) === JSON.stringify(crossAgain)}; band labels ${["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"].filter((k) => EV_CLOCK_SRC.includes(`t("${k}")`)).length}/6)`,
  JSON.stringify(cross) === JSON.stringify(crossAgain) &&
  EV_CLOCK_SRC.includes("clockContrast(compId, matches, clubs)") &&
  EV_CLOCK_SRC.includes("contrast.windows.map(") && EV_CLOCK_SRC.includes("crossRows.map(") &&
  EV_CLOCK_SRC.includes('t("clock.crossTitle"') && EV_CLOCK_SRC.includes('t("clock.crossHint"') &&
  EV_CLOCK_SRC.includes('t("clock.crossGoals"') && EV_CLOCK_SRC.includes('t("clock.crossCards"') &&
  EV_CLOCK_SRC.includes('t("clock.crossPeak"') && EV_CLOCK_SRC.includes('t("clock.emptyShort"') &&
  EV_CLOCK_SRC.includes("contrast.peakGoal === null ? ABSENT") &&
  EV_CLOCK_SRC.includes("contrast.peakCard === null ? ABSENT") &&
  !/\.sort\(/.test(EV_CLOCK_SRC));
// --- M787: the league card curve split by the end the card was earned at ---------------------
// On TE, the home side earns a yellow on 5' (band 0), one on 75' (band 4), a red on 80' and one
// on 90' (band 5): home 1,0,0,0,1,2. The away side earns a yellow on 20' (band 1) and one on 76'
// (band 5): away 0,1,0,0,0,1. Summed window for window that is the league curve 1,1,0,0,1,3, and
// the two totals are the six cards the club rows count. The scheduled card on 45' (u4) and TF's
// card (u5) stay out.
ok(`cardTiming splits its league curve by the end the card was earned at, the two sides adding up to the league window for window (TE home ${cards.homeWindows.join("")} against away ${cards.awayWindows.join("")}; totals ${cards.homeWindows.reduce((s, n) => s + n, 0)}/${cards.awayWindows.reduce((s, n) => s + n, 0)})`,
  cards.homeWindows.length === 6 && cards.awayWindows.length === 6 &&
  cards.homeWindows.join(",") === "1,0,0,0,1,2" &&
  cards.awayWindows.join(",") === "0,1,0,0,0,1" &&
  cards.homeWindows.every((n, i) => n + cards.awayWindows[i] === cards.windows[i]) &&
  cards.homeWindows.reduce((s, n) => s + n, 0) === 4 &&
  cards.awayWindows.reduce((s, n) => s + n, 0) === 2 &&
  cards.homeWindows.reduce((s, n) => s + n, 0) + cards.awayWindows.reduce((s, n) => s + n, 0) ===
    cards.rows.reduce((s, r) => s + r.cards, 0));
// TK earns the same shape the other way round: its home cards are the 5' yellow and the 85' red,
// its away cards the 20' booking and the 76' one — so the split is not the league curve twice. A
// competition with no fixture reads six silent windows on both sides.
const tkCards = cardTiming("TK", crossFixtures, crossClubs);
const venueSilent = cardTiming("TG", cardFixtures, cardClubs);
ok(`the venue split follows the side each event names rather than the result or the club, and an empty competition reads six silent home and away windows (TK home ${tkCards.homeWindows.join("")} away ${tkCards.awayWindows.join("")}; TG ${venueSilent.homeWindows.length}+${venueSilent.awayWindows.length} windows)`,
  tkCards.homeWindows.join(",") === "1,0,0,0,0,1" &&
  tkCards.awayWindows.join(",") === "0,1,0,0,0,1" &&
  tkCards.homeWindows.every((n, i) => n + tkCards.awayWindows[i] === tkCards.windows[i]) &&
  venueSilent.homeWindows.length === 6 && venueSilent.awayWindows.length === 6 &&
  venueSilent.homeWindows.every((n) => n === 0) && venueSilent.awayWindows.every((n) => n === 0) &&
  venueSilent.windows.every((n) => n === 0));
const cardsVenueAgain = cardTiming("TE", cardFixtures, cardClubs);
ok(`the venue split is deterministic and the discipline screen draws it off the fold, labelling the six windows and dropping nothing to its own sort (same fold ${JSON.stringify(cardsVenueAgain.homeWindows) === JSON.stringify(cards.homeWindows)} and ${JSON.stringify(cardsVenueAgain.awayWindows) === JSON.stringify(cards.awayWindows)}; band labels ${["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"].filter((k) => DISC_SRC.includes(`t("${k}")`)).length}/6)`,
  JSON.stringify(cardsVenueAgain.homeWindows) === JSON.stringify(cards.homeWindows) &&
  JSON.stringify(cardsVenueAgain.awayWindows) === JSON.stringify(cards.awayWindows) &&
  DISC_SRC.includes("clock.homeWindows") && DISC_SRC.includes("clock.awayWindows") &&
  DISC_SRC.includes("venuePeak") && DISC_SRC.includes("pctOf(n, venuePeak)") &&
  DISC_SRC.includes('t("disc.venueClockTitle"') && DISC_SRC.includes('t("disc.venueClockHint"') &&
  DISC_SRC.includes('t("disc.venueClockHome"') && DISC_SRC.includes('t("disc.venueClockAway"') &&
  DISC_SRC.includes('t("disc.clockNone"') && !/\.sort\(/.test(DISC_SRC));
// --- M788: the goal clock split by the end that scored ---------------------------------------
// T1's goals fixture: g1 A hosts B and scores on 12' (band 0) and 78' (band 5) while B scores on
// 44' (band 2); g2 C hosts A and A scores on 92' (band 5). Home 1,0,0,0,0,1 and away 0,0,1,0,0,1,
// together the four goals goalTiming reads. The scheduled g3 goal and T2's g4 goals stay out.
const venueClock = goalVenueClock("T1", timingFixtures, clubs);
ok(`goalVenueClock splits the league's recorded goals by the side that scored, the two series adding up to the goal fold's total (T1 home ${venueClock.homeWindows.join("")} against away ${venueClock.awayWindows.join("")}; totals ${venueClock.home}/${venueClock.away})`,
  venueClock.homeWindows.length === 6 && venueClock.awayWindows.length === 6 &&
  venueClock.homeWindows.join(",") === "1,0,0,0,0,1" &&
  venueClock.awayWindows.join(",") === "0,0,1,0,0,1" &&
  venueClock.home === 2 && venueClock.away === 2 &&
  venueClock.home + venueClock.away === timing.reduce((s, r) => s + r.scored, 0) &&
  venueClock.homeWindows.every((n, i) => n + venueClock.awayWindows[i] ===
    timing.reduce((s, r) => s + r.scoredBands[i], 0)));
// TK is not symmetric: its home goals are the 10', 80' and 90' ones and its one away goal the
// 50' one, so the split is a real reading rather than the team fold twice. A competition with no
// fixture reads six silent windows on both sides, and no card is charged to the goal clock.
const tkVenueClock = goalVenueClock("TK", crossFixtures, crossClubs);
const venueClockSilent = goalVenueClock("TM", crossFixtures, crossClubs);
ok(`the goal clock follows the side each GOAL event names and charges no booking to it (TK home ${tkVenueClock.homeWindows.join("")} away ${tkVenueClock.awayWindows.join("")} totals ${tkVenueClock.home}/${tkVenueClock.away}; empty ${venueClockSilent.homeWindows.length}+${venueClockSilent.awayWindows.length} windows ${venueClockSilent.home}/${venueClockSilent.away})`,
  tkVenueClock.homeWindows.join(",") === "1,0,0,0,0,2" &&
  tkVenueClock.awayWindows.join(",") === "0,0,0,1,0,0" &&
  tkVenueClock.home === 3 && tkVenueClock.away === 1 &&
  tkVenueClock.home + tkVenueClock.away === cross.goals &&
  venueClockSilent.homeWindows.length === 6 && venueClockSilent.awayWindows.length === 6 &&
  venueClockSilent.homeWindows.every((n) => n === 0) &&
  venueClockSilent.awayWindows.every((n) => n === 0) &&
  venueClockSilent.home === 0 && venueClockSilent.away === 0);
const venueClockAgain = goalVenueClock("T1", timingFixtures, clubs);
const VENUE_SRC = readFileSync(resolve(root, "features/analytics/VenueSplit.tsx"), "utf8");
ok(`the goal clock is deterministic and the venue screen draws it off the fold, labelling the six windows and printing a total per side (same fold ${JSON.stringify(venueClockAgain) === JSON.stringify(venueClock)}; band labels ${["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"].filter((k) => VENUE_SRC.includes(`t("${k}")`)).length}/6)`,
  JSON.stringify(venueClockAgain) === JSON.stringify(venueClock) &&
  VENUE_SRC.includes("goalVenueClock(compId, matches, clubs)") &&
  VENUE_SRC.includes("clock.homeWindows") && VENUE_SRC.includes("clock.awayWindows") &&
  VENUE_SRC.includes("clockPeak") && VENUE_SRC.includes("pctOf(n, clockPeak)") &&
  VENUE_SRC.includes('t("venue.clockTitle"') && VENUE_SRC.includes('t("venue.clockHint"') &&
  VENUE_SRC.includes('t("venue.clockHome"') && VENUE_SRC.includes('t("venue.clockAway"') &&
  VENUE_SRC.includes('t("timing.emptyHint"') && !/\.sort\(/.test(VENUE_SRC));
// --- M943: the shot and save clocks split by the end ------------------------------------------
// The engine names a SAVE after the side whose move was saved, so the save belongs to the
// OTHER end's keeper. v1: A shoots on 12' (band 0) and 78' (band 5), B on 30' (band 1); B's
// keeper answers on 44' (band 2, a home-side SAVE event), A's on 80' (band 5, away side). v2:
// A shoots on 90' (band 5), B on 5' (band 0) and 92' (band 5). The scheduled v3 SHOT and the
// eventless v4 stay out.
const vs = (minute, side, type) => ({ minute, type, side, player: "p" });
const venueEventFixtures = [
  { ...match("v1", "T5", "A", "B", 1, 0, "2026-05-01"), events: [
    vs(12, "home", "SHOT"), vs(30, "away", "SHOT"), vs(44, "home", "SAVE"), vs(78, "home", "SHOT"), vs(80, "away", "SAVE"),
  ] },
  { ...match("v2", "T5", "B", "A", 0, 2, "2026-05-02"), events: [
    vs(5, "away", "SHOT"), vs(90, "home", "SHOT"), vs(92, "away", "SHOT"),
  ] },
  { ...match("v3", "T5", "A", "B", 2, 1, "2026-05-03", "SCHEDULED"), events: [vs(10, "home", "SHOT")] },
  { ...match("v4", "T5", "A", "B", 1, 1, "2026-05-04") },
];
const venueEventClubs = [club("A", "T5"), club("B", "T5")];
const evVenue = eventVenueClock("T5", venueEventFixtures, venueEventClubs);
ok(`eventVenueClock charges each shot to the end that took it and each save to the keeper's end (home shots ${evVenue.homeShotsWindows.join("")} against away ${evVenue.awayShotsWindows.join("")}; home saves ${evVenue.homeSavesWindows.join("")} against away ${evVenue.awaySavesWindows.join("")})`,
  evVenue.homeShotsWindows.join(",") === "1,0,0,0,0,2" &&
  evVenue.awayShotsWindows.join(",") === "1,1,0,0,0,1" &&
  evVenue.homeSavesWindows.join(",") === "0,0,0,0,0,1" &&
  evVenue.awaySavesWindows.join(",") === "0,0,1,0,0,0" &&
  evVenue.homeShots === 3 && evVenue.awayShots === 3 &&
  evVenue.homeSaves === 1 && evVenue.awaySaves === 1);
// One event set, two folds: the venue split's four series add up, window for window, to the
// league bands eventClock reads off the same fixtures — the reconciliation that keeps the two
// screens from disagreeing about the same match.
const evFold = eventClock("T5", venueEventFixtures, venueEventClubs);
ok(`the venue split reconciles with the event clock window for window (shots ${evVenue.homeShots + evVenue.awayShots} = fold ${evFold.shots}; saves ${evVenue.homeSaves + evVenue.awaySaves} = fold ${evFold.saves})`,
  evVenue.homeShotsWindows.every((n, i) => n + evVenue.awayShotsWindows[i] === evFold.shotsBands[i]) &&
  evVenue.homeSavesWindows.every((n, i) => n + evVenue.awaySavesWindows[i] === evFold.savesBands[i]) &&
  evVenue.homeShots + evVenue.awayShots === evFold.shots &&
  evVenue.homeSaves + evVenue.awaySaves === evFold.saves);
// A competition with no fixture reads eight silent windows, a SAVE charged to nobody's goal
// columns stays out, and the fold is deterministic.
const evSilent = eventVenueClock("TM", venueEventFixtures, venueEventClubs);
const evAgain = eventVenueClock("T5", venueEventFixtures, venueEventClubs);
const crossEv = eventVenueClock("TK", crossFixtures, crossClubs);
ok(`the event venue clock is silent on an unknown competition, deterministic on a rerun, and charges no goal or card to itself (silent ${evSilent.homeShots + evSilent.awayShots + evSilent.homeSaves + evSilent.awaySaves}; TK shots ${crossEv.homeShots + crossEv.awayShots}; same fold ${JSON.stringify(evAgain) === JSON.stringify(evVenue)})`,
  evSilent.homeShotsWindows.length === 6 && evSilent.awaySavesWindows.length === 6 &&
  evSilent.homeShots + evSilent.awayShots + evSilent.homeSaves + evSilent.awaySaves === 0 &&
  crossEv.homeShots + crossEv.awayShots === 0 && crossEv.homeSaves + crossEv.awaySaves === 0 &&
  JSON.stringify(evAgain) === JSON.stringify(evVenue));
ok(`the venue screen draws the shot/save clock off the same fold, four labelled series over the shared band labels (screen ${[
  't("venue.clockShotsTitle"', 't("venue.shotsHome"', 't("venue.shotsAway"',
  't("venue.savesHome"', 't("venue.savesAway"', "eventVenueClock(compId, matches, clubs)",
  "pctOf(n, evPeak)",
].filter((k) => VENUE_SRC.includes(k)).length}/7)`,
  VENUE_SRC.includes("eventVenueClock(compId, matches, clubs)") &&
  VENUE_SRC.includes("evClock.homeShotsWindows") && VENUE_SRC.includes("pctOf(n, evPeak)") &&
  VENUE_SRC.includes('t("venue.clockShotsTitle"') && VENUE_SRC.includes('t("venue.clockShotsHint"') &&
  VENUE_SRC.includes('t("venue.shotsHome"') && VENUE_SRC.includes('t("venue.shotsAway"') &&
  VENUE_SRC.includes('t("venue.savesHome"') && VENUE_SRC.includes('t("venue.savesAway"') &&
  VENUE_SRC.includes('t("timing.emptyHint"') && !/\.sort\(/.test(VENUE_SRC));
// --- M789: each red club's own six-window clock -------------------------------------------------
// The red board already names each club's peak window; this hands the screen the whole series. On
// TH, P's two early reds are 1,1,0,0,0,0, Q's pair in the last window 0,0,0,0,0,2, and R and T one
// apiece in band 3 — the same series each club's row folds, carried onto the board row as a copy so
// the screen never reaches back into `rows` and never draws a series the fold did not hand it.
const redBandsCopy = reds.redRows.every((r) => r.bands.join(",") === redById[r.clubId].redBands.join(",") &&
  r.bands.length === 6 && r.bands !== redById[r.clubId].redBands);
ok(`each red board row carries its club's own six-window series, a copy that sums to its reds (P ${redPeak.P.bands.join("")}, Q ${redPeak.Q.bands.join("")}, R ${redPeak.R.bands.join("")}, T ${redPeak.T.bands.join("")}; copies ${redBandsCopy})`,
  redBandsCopy && redPeak.P.bands.join(",") === "1,1,0,0,0,0" &&
  redPeak.Q.bands.join(",") === "0,0,0,0,0,2" &&
  redPeak.R.bands.join(",") === "0,0,0,1,0,0" &&
  redPeak.T.bands.join(",") === "0,0,0,1,0,0" &&
  reds.redRows.every((r) => r.bands.reduce((s, n) => s + n, 0) === r.reds));
ok(`the board's peak window is the window its own series peaks in, and a competition with rows but no reds reads no series at all (peaks ${reds.redRows.map((r) => `${r.peakBand}@${Math.max(...r.bands)}`).join(", ")}; silent ${cardTiming("TF", cardFixtures, cardClubs).redRows.length} rows, empty ${cardTiming("TG", cardFixtures, cardClubs).redRows.length})`,
  reds.redRows.every((r) => r.bands[r.peakBand] === Math.max(...r.bands)) &&
  reds.redRows.every((r) => r.peakCount === Math.max(...r.bands)) &&
  cardTiming("TF", cardFixtures, cardClubs).rows.length === 2 &&
  cardTiming("TF", cardFixtures, cardClubs).redRows.length === 0 &&
  cardTiming("TG", cardFixtures, cardClubs).redRows.length === 0);
const redBandsAgain = cardTiming("TH", redFixtures, redClubs);
ok(`the red series is deterministic and the discipline screen draws each club's own six windows under its row, labelling them with the shared band labels and sorting nothing itself (same fold ${JSON.stringify(redBandsAgain) === JSON.stringify(reds)}; band labels ${["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"].filter((k) => DISC_SRC.includes(`t("${k}")`)).length}/6)`,
  JSON.stringify(redBandsAgain) === JSON.stringify(reds) &&
  DISC_SRC.includes("redPeak") && DISC_SRC.includes("pctOf(n, redPeak)") &&
  DISC_SRC.includes("r.bands.map(") && DISC_SRC.includes("bandLabels[r.peakBand]") &&
  DISC_SRC.includes('t("disc.redLine", { w: bandLabels[r.peakBand], n: r.peakCount })') &&
  ["timing.w1", "timing.w2", "timing.w3", "timing.w4", "timing.w5", "timing.w6"]
    .every((k) => DISC_SRC.includes(`t("${k}")`)) &&
  !/\.sort\(/.test(DISC_SRC));
// --- M944: each booked club's red clock read against its own card clock ------------------------
// TJ: Y's bookings are early (10', 30') while its red lands late (80'); Z mirrors it — a late
// booking (70') and a late red (90'). Y reads 33.33% early cards against 0% early reds (gap
// -33.33) and 33.33% late cards against 100% late reds (+66.67); Z reads 0/0 early and 50%
// against 100% late (+50). The bigger early skew boards first: Y, then Z.
const contrastFixtures = [
  cardFixture("j1", "TJ", "Y", "Z", [
    cardEvent(10, "YELLOW", "home"), cardEvent(30, "YELLOW", "home"), cardEvent(80, "RED", "home"),
    cardEvent(70, "YELLOW", "away"), cardEvent(90, "RED", "away"),
  ]),
];
const contrastClubs = [club("Y", "TJ"), club("Z", "TJ")];
const redContrast = cardTiming("TJ", contrastFixtures, contrastClubs);
const cby = Object.fromEntries(redContrast.contrast.map((r) => [r.clubId, r]));
ok(`the contrast board reads each club's red shares against its own card shares, the early skew boarding first (Y cards ${cby.Y.earlyCardShare}/${cby.Y.lateCardShare} against reds ${cby.Y.earlyRedShare}/${cby.Y.lateRedShare}, gaps ${cby.Y.earlyGap}/${cby.Y.lateGap}; Z gaps ${cby.Z.earlyGap}/${cby.Z.lateGap}; order ${redContrast.contrast.map((r) => r.clubId).join(",")})`,
  cby.Y.earlyCardShare === 33.33 && cby.Y.lateCardShare === 33.33 &&
  cby.Y.earlyRedShare === 0 && cby.Y.lateRedShare === 100 &&
  cby.Y.earlyGap === -33.33 && cby.Y.lateGap === 66.67 &&
  cby.Z.earlyGap === 0 && cby.Z.lateGap === 50 &&
  redContrast.contrast.map((r) => r.clubId).join(",") === "Y,Z" &&
  redContrast.contrast.every((r) => r.cards > 0));
// TH's reds are its only cards, so every share pair reads the same number and every gap sits at
// zero — the tiebreak falls to the red count, then the id. A competition with rows but no cards
// boards nobody at all.
const thContrast = cardTiming("TH", redFixtures, redClubs);
ok(`a club whose reds are its only cards reads zero gaps everywhere, ranked by reds then id (order ${thContrast.contrast.map((r) => r.clubId).join(",")}; gaps ${thContrast.contrast.map((r) => r.earlyGap).join(",")}; silent ${cardTiming("TG", cardFixtures, cardClubs).contrast.length})`,
  thContrast.contrast.map((r) => r.clubId).join(",") === "P,Q,R,T" &&
  thContrast.contrast.every((r) => r.earlyGap === 0 && r.lateGap === 0) &&
  cardTiming("TG", cardFixtures, cardClubs).contrast.length === 0);
ok(`the discipline screen draws the contrast off the fold, shares then the signed gap per end (screen ${[
  't("disc.contrastTitle"', 't("disc.contrastHint"', 't("disc.contrastNone"',
  't("disc.contrastEarly"', 't("disc.contrastLate"', 't("disc.contrastCards"',
  't("disc.contrastReds"', "clock.contrast", "DELTA_CLASS[deltaSign(r.earlyGap)]",
].filter((k) => DISC_SRC.includes(k)).length}/9)`,
  DISC_SRC.includes("clock.contrast") && DISC_SRC.includes("r.earlyCardShare") &&
  DISC_SRC.includes("DELTA_CLASS[deltaSign(r.earlyGap)]") && DISC_SRC.includes("signed(r.earlyGap)") &&
  DISC_SRC.includes('t("disc.contrastTitle"') && DISC_SRC.includes('t("disc.contrastHint"') &&
  DISC_SRC.includes('t("disc.contrastNone"') && DISC_SRC.includes('t("disc.contrastEarly"') &&
  DISC_SRC.includes('t("disc.contrastLate"') && !/\.sort\(/.test(DISC_SRC));
// --- M945: the same cards split by the receiving side's result ---------------------------------
// MR: r1 A hosts B and wins 2-1 — A's 10' booking reads won, B's 30' red lost; r2 draws 1-1,
// B's 50' and A's 85' bookings both read drew; r3 is scheduled and stays out. Won 1,0,0,0,0,0,
// drew 0,0,0,1,0,1, lost 0,1,0,0,0,0 — and the three series add up to the fold's own windows.
const resultFixtures = [
  { ...match("r1", "MR", "A", "B", 2, 1, "2026-08-01"), events: [
    cardEvent(10, "YELLOW", "home"), cardEvent(30, "RED", "away"),
  ] },
  { ...match("r2", "MR", "B", "A", 1, 1, "2026-08-02"), events: [
    cardEvent(50, "YELLOW", "home"), cardEvent(85, "YELLOW", "away"),
  ] },
  { ...match("r3", "MR", "A", "B", 0, 3, "2026-08-03", "SCHEDULED"), events: [
    cardEvent(5, "RED", "home"),
  ] },
];
const resultClubs = [club("A", "MR"), club("B", "MR")];
const resultClock = cardTiming("MR", resultFixtures, resultClubs).resultClock;
ok(`the result clock charges each card to the booked side's own outcome (won ${resultClock.wonWindows.join("")} drew ${resultClock.drewWindows.join("")} lost ${resultClock.lostWindows.join("")}; totals ${resultClock.won}/${resultClock.drew}/${resultClock.lost})`,
  resultClock.wonWindows.join(",") === "1,0,0,0,0,0" &&
  resultClock.drewWindows.join(",") === "0,0,0,1,0,1" &&
  resultClock.lostWindows.join(",") === "0,1,0,0,0,0" &&
  resultClock.won === 1 && resultClock.drew === 2 && resultClock.lost === 1);
// One card set, four windows series: the result axis's three series and the venue axis's two
// must both sum to the fold's own window series, window for window, on the same fixtures.
const teFold = cardTiming("TE", cardFixtures, cardClubs);
ok(`the result and venue axes both reconcile with the fold's own window series (TE result ${resultClockSum(teFold)} = windows ${teFold.windows.reduce((a, b) => a + b, 0)}; venue ${teFold.homeWindows.reduce((a, b) => a + b, 0) + teFold.awayWindows.reduce((a, b) => a + b, 0)})`,
  [0, 1, 2, 3, 4, 5].every((i) =>
    teFold.resultClock.wonWindows[i] + teFold.resultClock.drewWindows[i] + teFold.resultClock.lostWindows[i] === teFold.windows[i]) &&
  [0, 1, 2, 3, 4, 5].every((i) => teFold.homeWindows[i] + teFold.awayWindows[i] === teFold.windows[i]) &&
  resultClockSum(teFold) === teFold.windows.reduce((a, b) => a + b, 0));
ok(`the discipline screen draws the result clock off the fold, three labelled series over the shared band labels (screen ${[
  't("disc.resultTitle"', 't("disc.resultHint"', 't("disc.resultWon"',
  't("disc.resultDrew"', 't("disc.resultLost"', "clock.resultClock.wonWindows",
  "pctOf(n, peak)",
].filter((k) => DISC_SRC.includes(k)).length}/7)`,
  DISC_SRC.includes("clock.resultClock.wonWindows") && DISC_SRC.includes("pctOf(n, peak)") &&
  DISC_SRC.includes('t("disc.resultTitle"') && DISC_SRC.includes('t("disc.resultHint"') &&
  DISC_SRC.includes('t("disc.resultWon"') && DISC_SRC.includes('t("disc.resultDrew"') &&
  DISC_SRC.includes('t("disc.resultLost"') && DISC_SRC.includes('t("disc.contrastNone"') &&
  !/\.sort\(/.test(DISC_SRC));
// --- M946: the rhythm ratio — goals per card on the contrast clock -----------------------------
// MR again, where goals and cards share fixtures: r1's 12' goal and 10' booking land together in
// band 0 (1 goal / 1 card = 1.00), r1's 44' goal sits alone in band 2 and r2's 85' goal in band 5
// — windows that booked nobody read zero through the door and the screen says so with the shared
// absence glyph. The sharpest window is band 0, the only one with a denominator.
const rhythmFixtures = [
  { ...match("q1", "MR", "A", "B", 2, 1, "2026-08-01"), events: [
    { minute: 12, type: "GOAL", side: "home", player: "p" }, cardEvent(10, "YELLOW", "home"),
    { minute: 44, type: "GOAL", side: "away", player: "p" },
  ] },
  { ...match("q2", "MR", "B", "A", 1, 1, "2026-08-02"), events: [
    { minute: 85, type: "GOAL", side: "away", player: "p" },
  ] },
];
const rhythm = clockContrast("MR", rhythmFixtures, resultClubs);
ok(`the contrast clock reads goals per card through the safeDiv door — a denominator-less window carries the floor's own figure, which the screen declines to print — and names the sharpest window (band 0: ${rhythm.windows[0].goalsPerCard}; band 2: ${rhythm.windows[2].goalsPerCard} on ${rhythm.windows[2].goals} goals and ${rhythm.windows[2].cards} cards; peak ${rhythm.peakRhythm})`,
  rhythm.windows[0].goalsPerCard === 1 && rhythm.windows[2].goalsPerCard === 1 &&
  rhythm.windows[2].goals === 1 && rhythm.windows[2].cards === 0 &&
  rhythm.windows[5].goalsPerCard === 1 && rhythm.peakRhythm === 0);
// A competition with bookings but no goals reads 0.00 everywhere it booked, and one with goals
// but no bookings names no sharpest window at all.
const rhythmDark = clockContrast("TE", cardFixtures, cardClubs);
const rhythmQuiet = clockContrast("T1", timingFixtures, clubs);
ok(`a booked but scoreless competition reads zero rhythm and a scoreline-only one names no sharpest window (TE peak ${rhythmDark.peakRhythm}, ratios ${rhythmDark.windows.filter((w) => w.cards > 0).map((w) => w.goalsPerCard).join(",")}; T1 peak ${rhythmQuiet.peakRhythm})`,
  rhythmDark.peakRhythm !== null && rhythmDark.windows.every((w) => w.cards === 0 || w.goalsPerCard === 0) &&
  rhythmQuiet.peakRhythm === null);
ok(`the event clock screen reads the rhythm row and the sharpest-window sentence off the fold (screen ${[
  't("clock.crossRhythm"', 't("clock.crossRhythmPeak"', "contrast.peakRhythm",
  "w.goalsPerCard",
].filter((k) => CLOCK_SRC.includes(k)).length}/4)`,
  CLOCK_SRC.includes("contrast.peakRhythm") && CLOCK_SRC.includes("w.goalsPerCard") &&
  CLOCK_SRC.includes('t("clock.crossRhythm"') && CLOCK_SRC.includes('t("clock.crossRhythmPeak"') &&
  !/\.sort\(/.test(CLOCK_SRC));
// --- M947: each club's own season rhythm -------------------------------------------------------
// MR: A scored 2 (12' and the 85' away goal in q2) for 1 card — 2.00; B scored 1 and booked
// nobody, so it carries no denominator and follows A. TE's clubs booked without scoring: every
// ratio reads zero and the sharpest seat still exists. A competition with no booking names no
// sharpest club at all.
const seasonRhythm = clubRhythm("MR", rhythmFixtures, resultClubs);
ok(`the club rhythm joins the goal and card folds, sharpest first and denominator-less clubs after (A ${seasonRhythm.rows[0].goals}/${seasonRhythm.rows[0].cards} = ${seasonRhythm.rows[0].goalsPerCard}; B ${seasonRhythm.rows[1].goals}/${seasonRhythm.rows[1].cards} printed ${seasonRhythm.rows[1].goalsPerCard}; order ${seasonRhythm.rows.map((r) => r.clubId).join(",")}; sharpest ${seasonRhythm.sharpest?.clubId})`,
  seasonRhythm.rows[0].clubId === "A" && seasonRhythm.rows[0].goals === 2 &&
  seasonRhythm.rows[0].goalsPerCard === 2 && seasonRhythm.rows[1].clubId === "B" &&
  seasonRhythm.rows[1].goals === 1 && seasonRhythm.rows[1].cards === 0 &&
  seasonRhythm.sharpest?.clubId === "A");
const teRhythm = clubRhythm("TE", cardFixtures, cardClubs);
const silentRhythm = clubRhythm("TG", cardFixtures, cardClubs);
ok(`a booked-but-scoreless competition reads zero ratios with a sharpest seat, and one with no booking names none (TE sharpest ${teRhythm.sharpest?.clubId}, ratios ${teRhythm.rows.filter((r) => r.cards > 0).map((r) => r.goalsPerCard).join(",")}; TG sharpest ${silentRhythm.sharpest})`,
  teRhythm.sharpest !== null && teRhythm.rows.every((r) => r.cards === 0 || r.goalsPerCard === 0) &&
  silentRhythm.sharpest === null);
ok(`the event clock screen reads the club rhythm off the join, the sharpest club in the primary colour (screen ${[
  't("clock.clubRhythmTitle"', 't("clock.clubRhythmHint"', 't("clock.rhythmGoals"',
  't("clock.rhythmCards"', "rhythm.rows.map(", "rhythm.sharpest?.clubId",
].filter((k) => CLOCK_SRC.includes(k)).length}/6)`,
  CLOCK_SRC.includes("clubRhythm(compId, matches, clubs)") && CLOCK_SRC.includes("rhythm.rows.map(") &&
  CLOCK_SRC.includes("rhythm.sharpest?.clubId === r.clubId") &&
  CLOCK_SRC.includes('t("clock.clubRhythmTitle"') && CLOCK_SRC.includes('t("clock.clubRhythmHint"') &&
  CLOCK_SRC.includes('t("clock.rhythmGoals"') && CLOCK_SRC.includes('t("clock.rhythmCards"') &&
  !/\.sort\(/.test(CLOCK_SRC));
// --- M948: how often a booking ends red, by club ------------------------------------------------
// TQ carries three clubs. q1: F hosts G — F takes a yellow on 10' (band 0) and a red on 20' (band
// 1); G takes a red on 47' and a yellow on 50' (both band 3) and a yellow on 35' (band 2). q2: H
// hosts F — H takes two yellows inside band 0 (5', 8') and F is sent on 70' (band 4). So F is 2 reds
// of 3 cards (66.67) with bands 1 and 4 both fully red and the earlier one named, G is 1 of 3
// (33.33) worst in band 3 at 50, and H is 0 of 2 with no red anywhere and therefore no window to
// name. q3 is scheduled noise, q4 belongs to another competition. The league is 3 reds of 8 cards.
const sevClubs = [club("F", "TQ"), club("G", "TQ"), club("H", "TQ")];
const sevFixtures = [
  cardFixture("q1", "TQ", "F", "G", [
    cardEvent(10, "YELLOW", "home"), cardEvent(20, "RED", "home"),
    cardEvent(35, "YELLOW", "away"), cardEvent(47, "RED", "away"), cardEvent(50, "YELLOW", "away"),
  ]),
  cardFixture("q2", "TQ", "H", "F", [
    cardEvent(5, "YELLOW", "home"), cardEvent(8, "YELLOW", "home"), cardEvent(70, "RED", "away"),
  ]),
  cardFixture("q3", "TQ", "G", "H", [cardEvent(10, "YELLOW", "home")], "SCHEDULED"),
  cardFixture("q4", "TR", "F", "G", [cardEvent(15, "RED", "home")]),
];
const sev = cardSeverity("TQ", sevFixtures, sevClubs);
const sevOf = (r) => `${r.clubId} ${r.reds}/${r.cards}=${r.redShare}${r.worst === null ? " none" : `@${r.worst.band}:${r.worst.share}`}`;
ok(`cardSeverity divides each club's reds by its own cards and names the window where that share runs highest, earliest on a tie (${sev.rows.map(sevOf).join(" · ")})`,
  sev.rows.length === 3 &&
  sev.rows.map((r) => r.clubId).join(",") === "F,G,H" &&
  sev.rows[0].redShare === 66.67 && sev.rows[0].cards === 3 && sev.rows[0].reds === 2 &&
  sev.rows[0].worst?.band === 1 && sev.rows[0].worst?.share === 100 &&
  sev.rows[1].redShare === 33.33 && sev.rows[1].worst?.band === 3 && sev.rows[1].worst?.share === 50 &&
  sev.rows[2].redShare === 0 && sev.rows[2].cards === 2 && sev.rows[2].reds === 0 &&
  sev.rows[2].worst === null &&
  sev.league === 37.5);
// A club with no fixture in the competition has no row at all, and a league that never sends
// anybody off reads zero rather than dividing by an empty clock. On the seeded world the shares
// are exactly the two counts the card clocks already print, the named window is a window the club
// was booked in with a red inside it, and the board is ordered.
const sevEmpty = cardSeverity("TG", cardFixtures, cardClubs);
const sevNoReds = cardSeverity("TF", cardFixtures, cardClubs);
const sevSeeded = seededComps.map((id) => {
  const comps = seededClubs.filter((c) => c.competitionId === id);
  const s = cardSeverity(id, seededMatches, comps);
  const c = cardTiming(id, seededMatches, comps);
  return {
    id,
    match: s.rows.every((row) => {
      const src = c.rows.find((r) => r.clubId === row.clubId);
      const share = src.cards ? Math.round((src.reds / src.cards) * 100 * 100) / 100 : 0;
      const worstOk = row.worst === null
        ? src.reds === 0
        : src.bands[row.worst.band] > 0 && src.redBands[row.worst.band] > 0
          && row.worst.share === Math.round((src.redBands[row.worst.band] / src.bands[row.worst.band]) * 100 * 100) / 100;
      return row.redShare === share && row.cards === src.cards && row.reds === src.reds && worstOk;
    }),
    ordered: s.rows.every((row, i) => i === 0 || s.rows[i - 1].redShare >= row.redShare),
    league: s.league === (c.windows.every((n) => n === 0) ? 0
      : Math.round((c.redWindows.reduce((t, n) => t + n, 0) / c.windows.reduce((t, n) => t + n, 0)) * 100 * 100) / 100),
  };
});
ok(`the severity board is the card clock divided, never a third count (TG rows ${sevEmpty.rows.length} league ${sevEmpty.league}; TF ${sevNoReds.rows.map(sevOf).join(" · ")}; seeded ${sevSeeded.filter((s) => s.match && s.ordered && s.league).length}/${sevSeeded.length})`,
  sevEmpty.rows.length === 0 && sevEmpty.league === 0 &&
  sevNoReds.rows.every((r) => r.reds === 0 && r.worst === null) &&
  sevSeeded.length >= 2 && sevSeeded.every((s) => s.match && s.ordered && s.league));
const sevAgain = cardSeverity("TQ", sevFixtures, sevClubs);
ok(`cardSeverity is deterministic and the discipline screen ranks off the fold, printing the share, its denominator and the worst window only where a red exists (same fold ${JSON.stringify(sevAgain) === JSON.stringify(sev)})`,
  JSON.stringify(sevAgain) === JSON.stringify(sev) &&
  DISC_SRC.includes("cardSeverity(compId, matches, clubs)") &&
  DISC_SRC.includes("severity.rows.filter((r) => r.cards > 0)") &&
  DISC_SRC.includes("severe.length === 0") && DISC_SRC.includes("severe.map(") &&
  DISC_SRC.includes("{r.worst && (") &&
  DISC_SRC.includes('t("disc.sevTitle"') && DISC_SRC.includes('t("disc.sevHint"') &&
  DISC_SRC.includes('t("disc.sevLeague", { p: fmt2(severity.league) })') &&
  DISC_SRC.includes('t("disc.sevRow", { p: fmt2(r.redShare), c: r.cards })') &&
  DISC_SRC.includes('t("disc.sevPeak", { w: bandLabels[r.worst.band], p: fmt2(r.worst.share) })') &&
  DISC_SRC.includes('t("disc.clockNone"') &&
  DISC_SRC.includes('t("disc.redTotal", { n: r.reds })') &&
  !/\.sort\(/.test(DISC_SRC));
// M626: the same cards split by the end they were earned at. On the T5 fixture A hosted d1 for
// 2 cards and visited d2 for 2; B hosted d3 for 1 and visited d1 for 2; C hosted d2 for 4 and
// visited d3 for 2. So A is 2.00 both ends (gap 0), B 1.00 home against 2.00 away (+1.00), C
// 4.00 home against 2.00 away (−2.00), and the sort puts B first, then A, then C. The league is
// 7 cards in 3 home games against 6 in 3 away games, so the home end is the rougher one, and the
// two halves must add up to the board's own 13 cards.
const discVenue = disciplineVenue("T5", discFixtures, discClubs);
const dvA = byClub(discVenue.rows, "A"), dvB = byClub(discVenue.rows, "B"), dvC = byClub(discVenue.rows, "C");
ok(`disciplineVenue charges each counted fixture's cards to the end they were earned at (order ${discVenue.rows.map((r) => r.clubId).join("")}, ${discVenue.matches} matches; A ${dvA.homePerMatch}/${dvA.awayPerMatch} gap ${dvA.gap}, B ${dvB.homePerMatch}/${dvB.awayPerMatch} gap ${dvB.gap}, C ${dvC.homePerMatch}/${dvC.awayPerMatch} gap ${dvC.gap})`,
  discVenue.matches === 3 && discVenue.rows.map((r) => r.clubId).join("") === "BAC" &&
  dvA.playedHome === 1 && dvA.playedAway === 1 && dvA.homePerMatch === 2 && dvA.awayPerMatch === 2 && dvA.gap === 0 &&
  dvB.playedHome === 1 && dvB.playedAway === 1 && dvB.homePerMatch === 1 && dvB.awayPerMatch === 2 && dvB.gap === 1 &&
  dvC.playedHome === 1 && dvC.playedAway === 1 && dvC.homePerMatch === 4 && dvC.awayPerMatch === 2 && dvC.gap === -2);
ok(`the venue split closes on the board's own card count and picks the rougher end (home ${discVenue.home.bookings} at ${discVenue.home.perMatch}, away ${discVenue.away.bookings} at ${discVenue.away.perMatch}, rougher ${discVenue.rougher})`,
  discVenue.home.bookings === 7 && near(discVenue.home.perMatch, 2.33, 0.005) &&
  discVenue.away.bookings === 6 && discVenue.away.perMatch === 2 && discVenue.rougher === "home" &&
  discVenue.matches === board.matches && discVenue.home.bookings + discVenue.away.bookings === board.yellows + board.reds);
// A club that only played one end has no gap to report, so the screen's board is guarded to
// both-end clubs; a zero-card game is still a played end read at zero, and nothing counted at
// all reads empty rather than a tie.
const discVenueQuiet = disciplineVenue("T7", [
  withStats(match("q1", "T7", "F", "G", 0, 0, "2026-04-07"), statLine(5, 0, 0), statLine(3, 0, 0)),
], discClubs);
const discVenueEmpty = disciplineVenue("T8", [], discClubs);
const discVenueAgain = disciplineVenue("T5", discFixtures, discClubs);
const venueDrift = JSON.stringify(discVenue) === JSON.stringify(discVenueAgain);
ok(`the venue split reads a played end at zero and an empty competition as empty, and the screen renders it off the fold with the both-end guard (quiet rows ${discVenueQuiet.rows.length}, rates ${discVenueQuiet.rows.map((r) => `${r.homePerMatch}/${r.awayPerMatch}`).join(",")}, rougher ${discVenueQuiet.rougher}; empty rows ${discVenueEmpty.rows.length}, matches ${discVenueEmpty.matches}, rougher ${discVenueEmpty.rougher}; same fold ${venueDrift})`,
  discVenueQuiet.matches === 1 && discVenueQuiet.rows.length === 2 &&
  discVenueQuiet.rows.every((r) => r.homePerMatch === 0 && r.awayPerMatch === 0 && r.gap === 0) &&
  discVenueQuiet.rougher === null && discVenueEmpty.rows.length === 0 && discVenueEmpty.matches === 0 &&
  discVenueEmpty.rougher === null && venueDrift &&
  /import \{[^}]*\bdisciplineVenue\b[^}]*\} from "@\/domain\/analytics"/.test(DISCIPLINE_SRC) &&
  DISCIPLINE_SRC.includes("disciplineVenue(compId, matches, clubs)") &&
  DISCIPLINE_SRC.includes("venue.rows.filter((r) => r.playedHome > 0 && r.playedAway > 0)") &&
  ["venue.home.perMatch", "venue.away.perMatch", "r.homePerMatch", "r.awayPerMatch", "r.gap",
    "disc.venueTitle", "disc.venueLeague", "disc.venueGap", "disc.venueNone"].every((k) => DISCIPLINE_SRC.includes(k)));
// M627: the fixture's own arithmetic. s1 is A (4 pts, ceiling 10) at home to B (1 pt, ceiling 7),
// so the hosts lead by 3: a win makes it 6, a draw leaves 3, an away win makes it 0. The fixture is
// one of the two games each ceiling is built on, so a win keeps the ceiling where it is, a draw
// costs two points of room and a loss costs three.
const stakeS3 = matchBrief("s3", briefingFixtures, briefingClubs);
const swing = stakeS1.swing;
ok(`matchBrief folds what the fixture can still change for both sides (lead ${swing.lead}; home win ${swing.ifHomeWin}, draw ${swing.ifDraw}, away win ${swing.ifAwayWin}; ceilings A ${swing.homeCeiling.win}/${swing.homeCeiling.draw}/${swing.homeCeiling.loss}, B ${swing.awayCeiling.win}/${swing.awayCeiling.draw}/${swing.awayCeiling.loss})`,
  swing !== null && swing.lead === 3 && swing.ifHomeWin === 6 && swing.ifDraw === 3 && swing.ifAwayWin === 0 &&
  swing.homeCeiling.win === 10 && swing.homeCeiling.draw === 8 && swing.homeCeiling.loss === 7 &&
  swing.awayCeiling.win === 7 && swing.awayCeiling.draw === 5 && swing.awayCeiling.loss === 4);
// A finished fixture already spent its game, and a side with no table row has nothing to measure
// from: both read null rather than a swing built on numbers the fold does not have.
const swingScreen = DETAILS_SRC.includes("brief.swing") && DETAILS_SRC.includes("signed(brief.swing.lead)") &&
  DETAILS_SRC.includes("stakes.swingLine") && DETAILS_SRC.includes("stakes.ceilingLine") &&
  DETAILS_SRC.includes("brief.swing &&");
ok(`a played fixture and a side with no table row read no swing, and the panel renders the two lines only when the fold has one (f2 ${stakeF2.swing}, s3 ${stakeS3.swing}; screen ${swingScreen})`,
  stakeF2.swing === null && stakeS3.swing === null && swingScreen && swing.homeCeiling.loss === 7 &&
  JSON.stringify(stakeS1) === JSON.stringify(stakeRight));
// M628: the defending end gets the clock too. On the T9 fixture B faces A's shot at 12 and the
// saved A shot at 78 (window 0 once, window 5 twice); A faces B's shot at 30 (window 1) and the
// saved B shot at 12 (window 0); C faces the stoppage-time shot at 91 (window 5). The league's
// faced series is the mirror of shots + saves: every one of those events faced exactly one club.
const facedSum = clock.facedBands.reduce((s, n) => s + n, 0);
ok(`eventClock lands each faced event in its window and names the busiest one (A ${clk.A.facedBands.join(",")} busiest ${clk.A.worstBand} at ${clk.A.lateFacedShare}% late, B ${clk.B.facedBands.join(",")} busiest ${clk.B.worstBand} at ${clk.B.lateFacedShare}%, C ${clk.C.facedBands.join(",")} busiest ${clk.C.worstBand} at ${clk.C.lateFacedShare}%)`,
  clk.A.facedBands.join(",") === "1,1,0,0,0,0" && clk.A.worstBand === 0 && clk.A.lateFaced === 0 && clk.A.lateFacedShare === 0 &&
  clk.B.facedBands.join(",") === "1,0,0,0,0,2" && clk.B.worstBand === 5 && clk.B.lateFaced === 2 && near(clk.B.lateFacedShare, 66.67, 0.005) &&
  clk.C.facedBands.join(",") === "0,0,0,0,0,1" && clk.C.worstBand === 5 && clk.C.lateFaced === 1 && clk.C.lateFacedShare === 100);
const facedMirror = clock.facedBands.every((n, b) => n === clock.shotsBands[b] + clock.savesBands[b]);
const silentFaced = clockSilent.rows.every((r) => r.facedBands.every((n) => n === 0) && r.worstBand === -1 && r.lateFacedShare === 0);
const facedScreen = CLOCK_SRC.includes("clock.facedBands") && CLOCK_SRC.includes("r.worstBand") &&
  CLOCK_SRC.includes("r.lateFacedShare") && CLOCK_SRC.includes("clock.siegeBand") && CLOCK_SRC.includes("r.faced > 0");
ok(`the league's faced clock mirrors its shots and saves window for window, and a silent or empty clock still carries six windows (series ${clock.facedBands.join(",")}, mirror ${facedMirror}, total ${facedSum} = shots + saves; silent ${clockSilent.facedBands.join(",")} worst ${clockSilent.rows.map((r) => r.worstBand).join(",")}; empty ${clockEmpty.facedBands.join(",")}; screen ${facedScreen})`,
  facedMirror && facedSum === clock.shots + clock.saves && facedSum === clock.rows.reduce((s, r) => s + r.faced, 0) &&
  clockSilent.facedBands.every((n) => n === 0) && silentFaced && clockEmpty.facedBands.length === 6 &&
  clockEmpty.facedBands.every((n) => n === 0) && facedScreen);
// M629: the club page's card ledger gains the same venue split, read off disciplineVenue rather
// than re-summed from the stats blocks. B's T5 row is 1.00 at home against 2.00 away (+1.00);
// the quiet T7 fixture gives each club exactly one end, and the screen writes the line only when
// both ends have been played, so a zero rate it has not earned is never printed.
const clubVenue = disciplineVenue("T5", discFixtures, discClubs);
const cvB = byClub(clubVenue.rows, "B");
const quietOneEnd = discVenueQuiet.rows.every((r) => (r.playedHome > 0) !== (r.playedAway > 0));
const venueClubScreen = /import \{[^}]*\bdisciplineVenue\b[^}]*\} from "@\/domain\/analytics"/.test(DETAILS_SRC) &&
  DETAILS_SRC.includes("disciplineVenue(c.competitionId, footballProvider.matches(), footballProvider.clubs())") &&
  DETAILS_SRC.includes(".rows.find((r) => r.clubId === id)") &&
  DETAILS_SRC.includes("venue.playedHome > 0 && venue.playedAway > 0") &&
  DETAILS_SRC.includes("det.cards.venueLine") && DETAILS_SRC.includes("disc.venueTitle");
ok(`the club page reads the venue split off the board's own fold and prints it only for a club that has played both ends (B ${cvB.homePerMatch}/${cvB.awayPerMatch} gap ${cvB.gap}; one-end rows ${quietOneEnd}; screen ${venueClubScreen})`,
  cvB.homePerMatch === 1 && cvB.awayPerMatch === 2 && cvB.gap === 1 &&
  discVenueQuiet.rows.length === 2 && quietOneEnd && venueClubScreen);
// M631: the club page reads the clock's defending end for this club — B on T9 faces the shot at
// 12 and the saved shot at 78, so it reads 3 faced, 1 stopped at 33.33%, busiest window 5 (the
// last one) with 66.67% of the load late. The guard is the same one the clock board uses: a club
// that faced nothing (T5 carries no events) prints no line rather than a zero share.
const siegeScreen = /import \{[^}]*\beventClock\b[^}]*\} from "@\/domain\/analytics"/.test(DETAILS_SRC) &&
  DETAILS_SRC.includes("eventClock(c.competitionId, footballProvider.matches(), footballProvider.clubs())") &&
  DETAILS_SRC.includes("clockRow && clockRow.faced > 0") &&
  DETAILS_SRC.includes("clockRow.worstBand") && DETAILS_SRC.includes("det.siege.line") &&
  DETAILS_SRC.includes("clock.siegeTitle") && DETAILS_SRC.includes("bandLabels[clockRow.worstBand]");
ok(`the club page reads when it gets hit off the event clock's defending end, labelled with the clock's own windows and silenced when nothing was faced (B ${clk.B.faced} faced, ${clk.B.stops} stopped at ${clk.B.stopShare}%, busiest ${clk.B.worstBand} late ${clk.B.lateFacedShare}%; silent ${clockSilent.rows.every((r) => r.faced === 0)}; screen ${siegeScreen})`,
  clk.B.faced === 3 && clk.B.stops === 1 && near(clk.B.stopShare, 33.33, 0.005) &&
  clk.B.worstBand === 5 && near(clk.B.lateFacedShare, 66.67, 0.005) &&
  clockSilent.rows.every((r) => r.faced === 0) && siegeScreen);

// M630: the briefing's next fixture now carries the fixture's own arithmetic — the same swing the
// match page prints. s1 is A at home to B, so A's briefing (side home) and B's briefing (side away)
// must read the same object: hosts minus visitors, lead 3, a home win 6 / draw 3 / away win 0,
// ceilings 10/8/7 against 7/5/4. A "us minus them" reading would flip the sign for B's reader.
const briefB = briefing("B", briefingFixtures, briefingClubs);
const briefC = briefing("C", briefingFixtures, briefingClubs);
const swingDrift = JSON.stringify(briefA.swing) === JSON.stringify(briefB.swing);
ok(`briefing carries the fixture's swing, oriented by the host rather than by the reader (A lead ${briefA.swing.lead}, B lead ${briefB.swing.lead}, same object ${swingDrift}; home win ${briefA.swing.ifHomeWin}, draw ${briefA.swing.ifDraw}, away win ${briefA.swing.ifAwayWin})`,
  briefB.fixture.id === "s1" && briefB.side === "away" && briefB.opponentId === "A" &&
  swingDrift && briefA.swing.lead === 3 && briefA.swing.ifHomeWin === 6 &&
  briefA.swing.ifDraw === 3 && briefA.swing.ifAwayWin === 0);
// The orientation survives a negative gap: C's next fixture is s2 at B, so the hosts are two points
// behind and the same three results read 1 / −2 / −5 while each ceiling loses its own room.
ok(`briefing keeps a negative host-minus-visitor gap negative and both ceilings in fixture order (C at B: lead ${briefC.swing.lead}, results ${briefC.swing.ifHomeWin}/${briefC.swing.ifDraw}/${briefC.swing.ifAwayWin}; B ceiling ${briefC.swing.homeCeiling.win}/${briefC.swing.homeCeiling.draw}/${briefC.swing.homeCeiling.loss}, C ceiling ${briefC.swing.awayCeiling.win}/${briefC.swing.awayCeiling.draw}/${briefC.swing.awayCeiling.loss})`,
  briefC.fixture.id === "s2" && briefC.side === "away" && briefC.swing.lead === -2 &&
  briefC.swing.ifHomeWin === 1 && briefC.swing.ifDraw === -2 && briefC.swing.ifAwayWin === -5 &&
  briefC.swing.homeCeiling.win === 7 && briefC.swing.homeCeiling.draw === 5 && briefC.swing.homeCeiling.loss === 4 &&
  briefC.swing.awayCeiling.win === 9 && briefC.swing.awayCeiling.draw === 7 && briefC.swing.awayCeiling.loss === 6);
// A side with no table row still has nothing to measure from; the screen reads the fold (never
// pointsScenarios itself) and reuses the match page's two keys, printing the shared absence glyph
// when the swing is null.
const BRIEFING_SRC = readFileSync(resolve(root, "features/analytics/Briefing.tsx"), "utf8");
const briefSwingScreen = BRIEFING_SRC.includes("brief?.swing") && BRIEFING_SRC.includes("signed(swing.lead)") &&
  BRIEFING_SRC.includes('t("stakes.swingLine"') && BRIEFING_SRC.includes('t("stakes.ceilingLine"') &&
  BRIEFING_SRC.includes('t("briefing.swingHint"') && BRIEFING_SRC.includes("homeClub?.name") &&
  BRIEFING_SRC.includes(": ABSENT") && !BRIEFING_SRC.includes("pointsScenarios");
ok(`the briefing panel reads the swing off the fold and never re-derives it (D's cross-competition brief ${briefD.swing}; screen ${briefSwingScreen})`,
  briefD.swing === null && briefSwingScreen);
// M632: the same three results asked of the standings. T1 after f1–f3: A 4 pts (+2), C 3 (+2),
// B 1 (−4) — so A-B leaves A first whatever happens, while B's win lifts it to second on four
// points ahead of C's three. B-C is the other way round: B's win lifts it to second, and a draw
// or a C win lifts C to first — on a 1-1 draw C passes A on goals for at equal points and goal
// difference, which is `byTableStanding`'s third tie-break, not a new one.
const rankS1 = rankSwing("T1", "A", "B", briefingFixtures, briefingClubs);
const rankS2 = rankSwing("T1", "B", "C", briefingFixtures, briefingClubs);
ok(`rankSwing reads both clubs' places now and after each result off the table's own ordering (A-B: now ${rankS1.now.home}/${rankS1.now.away}, ${rankS1.ifHomeWin.home}/${rankS1.ifHomeWin.away}, ${rankS1.ifDraw.home}/${rankS1.ifDraw.away}, ${rankS1.ifAwayWin.home}/${rankS1.ifAwayWin.away}; B-C: now ${rankS2.now.home}/${rankS2.now.away}, ${rankS2.ifHomeWin.home}/${rankS2.ifHomeWin.away}, ${rankS2.ifDraw.home}/${rankS2.ifDraw.away}, ${rankS2.ifAwayWin.home}/${rankS2.ifAwayWin.away})`,
  rankS1.now.home === 1 && rankS1.now.away === 3 &&
  rankS1.ifHomeWin.home === 1 && rankS1.ifHomeWin.away === 3 &&
  rankS1.ifDraw.home === 1 && rankS1.ifDraw.away === 3 &&
  rankS1.ifAwayWin.home === 1 && rankS1.ifAwayWin.away === 2 &&
  rankS2.now.home === 3 && rankS2.now.away === 2 &&
  rankS2.ifHomeWin.home === 2 && rankS2.ifHomeWin.away === 3 &&
  rankS2.ifDraw.home === 3 && rankS2.ifDraw.away === 1 &&
  rankS2.ifAwayWin.home === 3 && rankS2.ifAwayWin.away === 1 &&
  JSON.stringify(rankS1) === JSON.stringify(rankSwing("T1", "A", "B", briefingFixtures, briefingClubs)));
// A full tie keeps the incumbent order: T3's X, Y and Z have each drawn every game 1-1, so a 1-1
// draw in X-Y leaves X and Y level on points, goal difference and goals for — the stable sort
// keeps X first rather than inventing a fourth tie-break. A club with no row has no place to
// read, and the match brief gates the fold the same way it gates the points swing.
const tieClubs = [club("X", "T3"), club("Y", "T3"), club("Z", "T3")];
const tieFixtures = [
  match("t1", "T3", "X", "Y", 1, 1, "2026-04-01"),
  match("t2", "T3", "Y", "Z", 1, 1, "2026-04-02"),
  match("t3", "T3", "Z", "X", 1, 1, "2026-04-03"),
  match("t4", "T3", "X", "Y", 0, 0, "2026-05-01", "SCHEDULED"),
];
const rankTie = rankSwing("T3", "X", "Y", tieFixtures, tieClubs);
const rankScreen = DETAILS_SRC.includes("stakes.rankHomeLine") && DETAILS_SRC.includes("stakes.rankAwayLine") &&
  DETAILS_SRC.includes("brief.rank &&") && DETAILS_SRC.includes("brief.rank.now.home") &&
  !DETAILS_SRC.includes("rankSwing") && !DETAILS_SRC.includes("byTableStanding");
ok(`a full tie keeps the incumbent's place, a side without a row reads no places, and the match page prints the two lines off the brief rather than ranking the table itself (tie draw X/Y ${rankTie.ifDraw.home}/${rankTie.ifDraw.away}, away win ${rankTie.ifAwayWin.home}/${rankTie.ifAwayWin.away}; missing ${rankSwing("T1", "A", "Z", briefingFixtures, briefingClubs)}; brief s1 ${stakeS1.rank ? `${stakeS1.rank.now.home}/${stakeS1.rank.now.away}` : "null"}, f2 ${stakeF2.rank}, s3 ${stakeS3.rank}; screen ${rankScreen})`,
  rankTie.now.home === 1 && rankTie.ifDraw.home === 1 && rankTie.ifDraw.away === 2 &&
  rankTie.ifAwayWin.home === 3 && rankTie.ifAwayWin.away === 1 &&
  rankSwing("T1", "A", "Z", briefingFixtures, briefingClubs) === null &&
  stakeS1.rank !== null && stakeS1.rank.now.home === 1 && stakeS1.rank.now.away === 3 &&
  JSON.stringify(stakeS1.rank) === JSON.stringify(rankS1) &&
  stakeF2.rank === null && stakeS3.rank === null && rankScreen);
// M715: the briefing carries the same standing read for the fixture it was written around. A and B
// read one fixture (s1) from opposite ends, so both must hand the screen the same places, oriented
// by the host; C's next fixture is s2 at B, where the hosts sit third and the visitor second.
// D's fixture is in a competition its opponent has no table row in, so the places are absent there
// exactly as the swing is.
ok(`briefing carries the fixture's places oriented by the host, not by the reader (A-B ${briefA.rank.now.home}/${briefA.rank.now.away} now, ${briefA.rank.ifAwayWin.home}/${briefA.rank.ifAwayWin.away} on an away win; B reading the same fixture ${JSON.stringify(briefA.rank) === JSON.stringify(briefB.rank)}; C at B ${briefC.rank.now.home}/${briefC.rank.now.away}, on a draw ${briefC.rank.ifDraw.home}/${briefC.rank.ifDraw.away}; D ${briefD.rank})`,
  JSON.stringify(briefA.rank) === JSON.stringify(rankS1) &&
  JSON.stringify(briefA.rank) === JSON.stringify(briefB.rank) &&
  JSON.stringify(briefC.rank) === JSON.stringify(rankS2) &&
  briefC.rank.now.home === 3 && briefC.rank.now.away === 2 &&
  briefC.rank.ifDraw.home === 3 && briefC.rank.ifDraw.away === 1 &&
  briefD.rank === null);
// The briefing panel prints the places off the brief with the match page's own two keys and never
// ranks the table itself; a null read falls to the shared absence glyph the other two lines use.
const briefRankScreen = BRIEFING_SRC.includes("brief?.rank") && BRIEFING_SRC.includes("rank.now.home") &&
  BRIEFING_SRC.includes('t("stakes.rankHomeLine"') && BRIEFING_SRC.includes('t("stakes.rankAwayLine"') &&
  !BRIEFING_SRC.includes("rankSwing") && !BRIEFING_SRC.includes("byTableStanding") &&
  !BRIEFING_SRC.includes("teamMetrics");
ok(`the briefing panel reads the places off the fold and reuses the match page's two keys (screen ${briefRankScreen})`,
  briefRankScreen);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
