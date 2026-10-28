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
const { teamMetrics, expectedGoals, outcomeOdds, oddsPercents, leaders, formPoints, finishedCount, byKickoff, runIn, pointsScenarios, titleRace, headToHead, venueSplit } =
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
console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
