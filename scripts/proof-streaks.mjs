import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M962: runs, not averages. Every finished fixture in the competition, ordered by kickoff per club,
// walked once to find the longest winning and unbeaten runs and the run each club is on now. Form
// letters read five results; this reads the shape of the season — and it needs no event list.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { streaks } = await server.ssrLoadModule("/domain/analytics.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

// Hand count: A wins, wins, loses, draws in that order — a two-game winning run and a two-game
// unbeaten run, with the current run a single draw. D won its only fixture, E drew its only one,
// B and C lost theirs. A scheduled fixture and another competition are noise.
const streakClubs = ["A", "B", "C", "D", "E"].map((id) => club(id, "T15"));
const streakFixtures = [
  match("s1", "T15", "A", "B", 2, 0, "2026-08-01"),
  match("s2", "T15", "A", "C", 1, 0, "2026-08-02"),
  match("s3", "T15", "A", "D", 0, 3, "2026-08-03"),
  match("s4", "T15", "A", "E", 1, 1, "2026-08-04"),
  match("s5", "T15", "B", "C", 1, 0, "2026-08-09", "SCHEDULED"),
  match("s6", "T16", "F", "G", 5, 0, "2026-08-10"),
];
const runs = streaks("T15", streakFixtures, streakClubs);
const row = Object.fromEntries(runs.rows.map((r) => [r.clubId, r]));

ok(`streaks reads only this competition's finished fixtures, ordered by kickoff (matches ${runs.matches}, rows ${runs.rows.map((r) => r.clubId).join("")})`,
  runs.matches === 4 && runs.rows.length === 5 && runs.rows.map((r) => r.clubId).join("") === "ADEBC");
ok(`streaks finds the longest winning and unbeaten runs and the run each club is on now (A ${row.A.longestWin}/${row.A.longestUnbeaten}, current ${row.A.currentWin}/${row.A.currentUnbeaten}; D ${row.D.longestWin}; E ${row.E.longestUnbeaten})`,
  row.A.longestWin === 2 && row.A.longestUnbeaten === 2 && row.A.currentWin === 0 &&
  row.A.currentUnbeaten === 1 && row.A.played === 4 &&
  row.D.longestWin === 1 && row.D.longestUnbeaten === 1 && row.D.currentWin === 1 &&
  row.E.longestUnbeaten === 1 && row.E.currentUnbeaten === 1 && row.E.currentWin === 0 &&
  row.B.longestUnbeaten === 0 && row.B.currentUnbeaten === 0 && row.B.played === 1);
// M964: the other record. A lost once and then drew, so its drought is two and it is still in it;
// D won its only match, so it has none.
ok(`streaks reads the longest run without a win and the one a club is in now (A ${row.A.longestWinless} longest / ${row.A.currentWinless} now; B ${row.B.longestWinless}, E ${row.E.currentWinless}, D ${row.D.longestWinless})`,
  row.A.longestWinless === 2 && row.A.currentWinless === 2 &&
  row.B.longestWinless === 1 && row.B.currentWinless === 1 &&
  row.E.longestWinless === 1 && row.E.currentWinless === 1 &&
  row.D.longestWinless === 0 && row.D.currentWinless === 0);
ok(`streaks names the holders and repeats exactly (win ${runs.longestWin} by ${runs.winHolder}, unbeaten ${runs.longestUnbeaten} by ${runs.unbeatenHolder})`,
  runs.longestWin === 2 && runs.winHolder === "A" && runs.longestUnbeaten === 2 &&
  runs.unbeatenHolder === "A" &&
  JSON.stringify(runs) === JSON.stringify(streaks("T15", streakFixtures, streakClubs)));

// An empty competition: no rows to rank, no holder, and a zero that the fixture set above proves is
// measured rather than blind.
const runsEmpty = streaks("T99", [], [club("Q", "T99")]);
ok(`streaks answers an empty competition with no runs and no holder (rows ${runsEmpty.rows.length}, best ${runsEmpty.longestWin}, holder ${runsEmpty.unbeatenHolder ?? "none"}, matches ${runsEmpty.matches}), while the same fold names a holder above, so the zero is measured and not a blind spot`,
  runsEmpty.rows.length === 1 && runsEmpty.longestWin === 0 && runsEmpty.longestUnbeaten === 0 &&
  runsEmpty.winHolder === null && runsEmpty.unbeatenHolder === null && runsEmpty.matches === 0);

// ---- M963: the same runs at each end ---------------------------------------------------------
// Hand count for A: at home it won, won, lost (a two-run and a two-unbeaten); away it drew then won
// (one win, two unbeaten). The season run is W,D,W,W,L — four unbeaten, the current run zero.
const venueClubs = ["A", "B", "C", "D", "E", "F"].map((id) => club(id, "T17"));
const venueFixtures = [
  match("v1", "T17", "A", "B", 2, 0, "2026-09-01"),
  match("v2", "T17", "C", "A", 1, 1, "2026-09-02"),
  match("v3", "T17", "A", "D", 3, 0, "2026-09-03"),
  match("v4", "T17", "E", "A", 0, 1, "2026-09-04"),
  match("v5", "T17", "A", "F", 1, 2, "2026-09-05"),
];
const venueRuns = streaks("T17", venueFixtures, venueClubs);
const vrow = Object.fromEntries(venueRuns.rows.map((r) => [r.clubId, r]));
ok(`streaks reads each run again inside the home matches and inside the away matches (A home ${vrow.A.homeWin}/${vrow.A.homeUnbeaten}, away ${vrow.A.awayWin}/${vrow.A.awayUnbeaten}, season ${vrow.A.longestWin}/${vrow.A.longestUnbeaten} current ${vrow.A.currentWin}/${vrow.A.currentUnbeaten})`,
  vrow.A.homeWin === 2 && vrow.A.homeUnbeaten === 2 &&
  vrow.A.awayWin === 1 && vrow.A.awayUnbeaten === 2 &&
  vrow.A.longestWin === 2 && vrow.A.longestUnbeaten === 4 &&
  vrow.A.currentWin === 0 && vrow.A.currentUnbeaten === 0 &&
  vrow.C.homeUnbeaten === 1 && vrow.C.awayUnbeaten === 0 &&
  vrow.F.awayWin === 1 && vrow.F.awayUnbeaten === 1 && vrow.F.homeUnbeaten === 0 &&
  vrow.B.homeUnbeaten === 0 && vrow.A.longestWinless === 1 && vrow.A.currentWinless === 1 &&
  JSON.stringify(venueRuns) === JSON.stringify(streaks("T17", venueFixtures, venueClubs)));

// ---- M968: the record's edge -----------------------------------------------------------------
// Hand count for A: it won s1 and s2, so its best unbeaten run is two and ends at s2; the next
// fixture (s3, A 0-3 D) is the one that broke the record. D, E and the two losers either never
// had a run or reached their last finished match with it, so they have no breaker to name.
ok(`streaks names the fixture that ended each longest unbeaten run (A's record broken by ${row.A.unbeatenBreak?.opponentId ?? "none"} ${row.A.unbeatenBreak?.goalsFor ?? 0}-${row.A.unbeatenBreak?.goalsAgainst ?? 0} in ${row.A.unbeatenBreak?.matchId ?? "none"}; D ${row.D.unbeatenBreak ?? "none"}, E ${row.E.unbeatenBreak ?? "none"}, B ${row.B.unbeatenBreak ?? "none"})`,
  row.A.unbeatenBreak?.matchId === "s3" && row.A.unbeatenBreak?.opponentId === "D" &&
  row.A.unbeatenBreak?.goalsFor === 0 && row.A.unbeatenBreak?.goalsAgainst === 3 &&
  row.A.unbeatenBreak?.kickoff === "2026-08-03" &&
  row.D.unbeatenBreak === null && row.E.unbeatenBreak === null && row.B.unbeatenBreak === null);
// The same edge read inside the venue fixture: A's four-match unbeaten run ends at v4 and v5
// (A 1-2 F) is the breaker; F itself won its only fixture, so its run is alive.
ok(`the breaker is the fixture after the best run, and a run that reaches the last match has none (A ${vrow.A.unbeatenBreak?.matchId ?? "none"} ${vrow.A.unbeatenBreak?.goalsFor ?? 0}-${vrow.A.unbeatenBreak?.goalsAgainst ?? 0} vs ${vrow.A.unbeatenBreak?.opponentId ?? "none"}; F ${vrow.F.unbeatenBreak ?? "none"})`,
  vrow.A.unbeatenBreak?.matchId === "v5" && vrow.A.unbeatenBreak?.opponentId === "F" &&
  vrow.A.unbeatenBreak?.goalsFor === 1 && vrow.A.unbeatenBreak?.goalsAgainst === 2 &&
  vrow.F.unbeatenBreak === null && vrow.B.unbeatenBreak === null &&
  JSON.stringify(venueRuns) === JSON.stringify(streaks("T17", venueFixtures, venueClubs)));
ok(`every named breaker is a match the club lost, and the fold never names a breaker without a run (${runs.rows.filter((r) => r.unbeatenBreak).map((r) => `${r.clubId}:${r.unbeatenBreak.goalsFor}-${r.unbeatenBreak.goalsAgainst}`).join(" ")})`,
  runs.rows.every((r) => !r.unbeatenBreak || (r.unbeatenBreak.goalsFor < r.unbeatenBreak.goalsAgainst && r.longestUnbeaten >= 2)));

// The screen is a reader, not a second engine: it must render the folded board, and the route must
// exist for the sidebar entry that names it.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Streaks.tsx"), "utf8");
const APP_ROUTE_SRC = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const SHELL_NAV_SRC = readFileSync(resolve(root, "features/shell/AppShell.tsx"), "utf8");
ok(`the runs screen reads the fold and its own board (fold call ${SCREEN_SRC.includes("streaks(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("runs.rows")}, bars ${SCREEN_SRC.includes("pctOf(r.longestUnbeaten, peak)")})`,
  SCREEN_SRC.includes("streaks(compId, matches, clubs)") && SCREEN_SRC.includes("runs.rows") &&
  SCREEN_SRC.includes("pctOf(r.longestUnbeaten, peak)") && !SCREEN_SRC.includes("GOAL_BANDS") &&
  SCREEN_SRC.includes("streaks.venueLine") && SCREEN_SRC.includes("r.homeUnbeaten") &&
  SCREEN_SRC.includes("streaks.droughtLine") && SCREEN_SRC.includes("streaks.drought"));
ok(`the runs screen reads the breaker off the fold rather than rebuilding it (edge ${SCREEN_SRC.includes("r.unbeatenBreak")}, alive ${SCREEN_SRC.includes("streaks.edgeAlive")}, ended ${SCREEN_SRC.includes("streaks.edgeEnded")}, date ${SCREEN_SRC.includes("formatDate(locale, r.unbeatenBreak.kickoff)")})`,
  SCREEN_SRC.includes("r.unbeatenBreak") && SCREEN_SRC.includes("streaks.edgeAlive") &&
  SCREEN_SRC.includes("streaks.edgeEnded") && SCREEN_SRC.includes("streaks.edgeRun") &&
  SCREEN_SRC.includes("formatDate(locale, r.unbeatenBreak.kickoff)") &&
  SCREEN_SRC.includes("r.longestUnbeaten >= 2") && !SCREEN_SRC.includes("byKickoff"));
ok(`the runs screen is reachable — the route table and the sidebar both name it (route ${/path === "\/streaks"/.test(APP_ROUTE_SRC)}, nav ${/to: "\/streaks"/.test(SHELL_NAV_SRC)})`,
  /path === "\/streaks"/.test(APP_ROUTE_SRC) && /to: "\/streaks"/.test(SHELL_NAV_SRC));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
