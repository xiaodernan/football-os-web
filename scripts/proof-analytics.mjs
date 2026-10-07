import { createServer } from "vite";
import { readFileSync } from "node:fs";
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
const { teamMetrics, expectedGoals, outcomeOdds, oddsPercents, leaders, formPoints } =
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
ok("every outcome probability is a valid fraction", [o.home, o.draw, o.away].every((p) => p >= 0 && p <= 1));
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
ok("both forecast surfaces render the figure (a write-only field again would fail this)", (() => {
  const dataRoom = readFileSync(resolve(root, "features/analytics/DataRoom.tsx"), "utf8");
  const world = readFileSync(resolve(root, "features/football/FootballWorld.tsx"), "utf8");
  return dataRoom.includes("odds.expectedTotalGoals") && world.includes("fc.expectedTotalGoals");
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

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
