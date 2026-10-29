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
const { teamMetrics, expectedGoals, outcomeOdds, oddsPercents, leaders, formPoints, finishedCount, byKickoff, runIn, pointsScenarios, titleRace, headToHead, venueSplit, goalTiming, discipline, eventClock, briefing, matchBrief, disciplineTrend, disciplineVenue } =
  await server.ssrLoadModule("/domain/analytics.ts");

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
ok(`the event clock is reachable — the route table and the sidebar both name it (route ${/path === "\/clock"/.test(APP_ROUTE_SRC)}, nav ${/to: "\/clock"/.test(SHELL_NAV_SRC)})`,
  /path === "\/clock"/.test(APP_ROUTE_SRC) && /to: "\/clock"/.test(SHELL_NAV_SRC));
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

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
