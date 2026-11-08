import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M992: the blank runs. Two list of fixtures have it, the away woe is the designed fold; every club
// with a blank is listed on the board, sorted into the longest: a scoring fixture ends the run
// and only a longest-blank club gets the headline.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { scorelessStreaks } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

// Hand count (see the M992 ledger entry): A fails to score in f1, f2, f3, f6, f8 — a run of four —
// then scores f9 twice and the run ends; D laughs at one-and-one, B never scores twice in a row in
// the away-heavy run — two squads learn nothing of the actual seed table; C scoring everywhere but a
// blank here and there; B never sees more than two together.
const fx = [
  match("f1", "T38", "A", "B", 0, 1, "2026-09-01"),
  match("f2", "T38", "A", "C", 0, 0, "2026-09-08"),
  match("f3", "T38", "D", "A", 1, 0, "2026-09-15"),
  match("f4", "T38", "B", "C", 0, 1, "2026-09-22"),
  match("f5", "T38", "C", "D", 1, 1, "2026-09-29"),
  match("f6", "T38", "A", "B", 0, 1, "2026-10-06"),
  match("f7", "T38", "B", "D", 1, 0, "2026-10-13"),
  match("f8", "T38", "D", "C", 0, 0, "2026-10-20"),
  match("f9", "T38", "B", "D", 2, 2, "2026-10-27"),
  match("f10", "T38", "C", "B", 3, 0, "2026-11-03"),
  match("f11", "T38", "A", "C", 2, 1, "2026-11-10"),
  match("f12", "T38", "C", "A", null, null, "2026-11-17", "SCHEDULED"),
];
const clubs = ["A", "B", "C", "D"].map((id) => club(id, "T38"));
const board = scorelessStreaks(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`only the clubs that had a blank appear once the fold ran — every row with a zero run included (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 4 && board.rows.every((r) => r.longestScoreless >= 1));
ok(`the hand count scores A's four-blank run, D's away-heavy two, and makes B and C the singles (${row.A.longestScoreless}/${row.D.longestScoreless}/${row.B.longestScoreless}/${row.C.longestScoreless})`,
  row.A.longestScoreless === 4 && row.A.currentScoreless === 0 &&
  row.D.longestScoreless === 2 && row.D.currentScoreless === 0 &&
  row.B.longestScoreless === 1 && row.B.currentScoreless === 1 &&
  row.C.longestScoreless === 1 && row.C.currentScoreless === 0);
ok(`the ordering is by longest, then current, then club id (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows[0].clubId === "A" && board.rows[1].clubId === "D" &&
  board.rows[2].clubId === "B" && board.rows[3].clubId === "C" &&
  board.leagueLongest === 4 && board.leagueHolder === "A");
ok(`an empty world reads nothing, while the same fold above reads a full board`,
  scorelessStreaks([], []).rows.length === 0 &&
  scorelessStreaks([], []).leagueLongest === 0 &&
  scorelessStreaks([], []).leagueHolder === null &&
  scorelessStreaks([], []).matches === 0 &&
  board.rows.length === 4 &&
  JSON.stringify(board) === JSON.stringify(scorelessStreaks(fx, clubs)));

// Seeded arm: over the whole world, every club with at least one finished fixture accounts for itself,
// every longest run is at least one, and the board's ordering is real.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = scorelessStreaks(world, seededClubs);
const rankedWithGames = new Set();
for (const m of world) {
  if (m.status !== "FINISHED") continue;
  rankedWithGames.add(m.homeClubId);
  rankedWithGames.add(m.awayClubId);
}
let branches = true;
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].longestScoreless < seeded.rows[i].longestScoreless) branches = false;
  else if (seeded.rows[i - 1].longestScoreless === seeded.rows[i].longestScoreless) {
    if (seeded.rows[i - 1].currentScoreless < seeded.rows[i].currentScoreless) branches = false;
  }
}
ok(`over the whole world every club with a game is accounted for and the board's ordering holds (${seeded.rows.length} clubs listed, branch ${branches})`,
  branches);

// The screen is a reader: it renders the folded board and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("scorelessStreaks(footballProvider.matches(), footballProvider.clubs())")}, rows ${SCREEN_SRC.includes("blanks.rows.map")}, league ${SCREEN_SRC.includes("leaders.blanksLeague")}, keys ${SCREEN_SRC.includes("leaders.blanksTitle")}/${SCREEN_SRC.includes("leaders.blanksMethod")})`,
  SCREEN_SRC.includes("scorelessStreaks(footballProvider.matches(), footballProvider.clubs())") &&
  SCREEN_SRC.includes("blanks.rows.map") && SCREEN_SRC.includes("blanksPeak") &&
  SCREEN_SRC.includes("leaders.blanksTitle") && SCREEN_SRC.includes("leaders.blanksHint") &&
  SCREEN_SRC.includes("leaders.blanksLeague") && SCREEN_SRC.includes("leaders.blanksColLongest") &&
  SCREEN_SRC.includes("leaders.blanksColNow") && SCREEN_SRC.includes("leaders.blanksMethod") &&
  SCREEN_SRC.includes("leaders.blanksNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
