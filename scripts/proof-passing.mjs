import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M998: the passers. The stats block records per-fixture accuracy; the fold walks only those lines
// through the whole world and ranks clubs by the average, keeping the duel load and pass count on
// the row for context (a "high accuracy, no passes" club reads honestly here too).

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { passingAccuracy } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (pAcc, passes, duels) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes, passAcc: pAcc, tackles: 15, duels, corners: 5, fouls: 8, yellows: 1, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, pAccHome, pAccAway, passesHome, passesAway, duelsHome, duelsAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(pAccHome, passesHome, duelsHome), away: statLine(pAccAway, passesAway, duelsAway) },
});

// Hand count (see the M998 ledger): A is the technician — high accuracy, sensible volume. B passes
// at random but attacks. C is a poor passer who faces heavy duels. D misses the world medal.
const clubs = ["A", "B", "C", "D"].map((id) => club(id, "T40"));
const fx = [
  match("f1", "T40", "A", "B", 1, 1, "2026-09-01", 85, 55, 450, 480, 80, 120),
  match("f2", "T40", "A", "C", 2, 0, "2026-09-08", 90, 40, 500, 400, 70, 130),
  match("f3", "T40", "B", "C", 1, 1, "2026-09-15", 60, 45, 460, 380, 110, 140),
  match("f4", "T40", "C", "A", 0, 3, "2026-09-29", 35, 75, 410, 520, 150, 85),
  // D: no finished fixture — absent from the board.
  match("f5", "T40", "D", "A", null, null, "2026-11-03", 0, 0, 0, 0, 0, 0, "SCHEDULED"),
];
const board = passingAccuracy(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

// Averaging over two matches per club: A (85,90,75) → 70; B (55,60) → 57.5; C (40,45,35) → 40.
ok(`every club with a finished fixture is listed once, ordered by accuracy (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 3 && board.rows[0].clubId === "A" && board.rows[1].clubId === "B" && board.rows[2].clubId === "C");
ok(`the hand counts hold (A ${row.A.passAcc}/${row.A.passes}/${row.A.duels}, B ${row.B.passAcc}/${row.B.passes}/${row.B.duels}, C ${row.C.passAcc}/${row.C.passes}/${row.C.duels})`,
  row.A.passAcc === 83.33 && row.A.passes === 490 && row.A.duels === 78.33 && row.A.played === 3 &&
  row.B.passAcc === 57.5 && row.B.passes === 470 && row.B.duels === 115 && row.B.played === 2 &&
  row.C.passAcc === 40 && row.C.passes === 396.67 && row.C.duels === 140 && row.C.played === 3);
ok(`D, who never finished a fixture, has no row — the board reads only completed games`,
  !board.rows.some((r) => r.clubId === "D"));
ok(`the league line is the mean of the three printed rows (${board.league})`,
  board.league === 60.28);
ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  passingAccuracy([], []).rows.length === 0 &&
  passingAccuracy([], []).league === 0 &&
  JSON.stringify(board) === JSON.stringify(passingAccuracy(fx, clubs)));

// Seeded arm: over the shipped world every club with at least one finished fixture is listed,
// every row's accuracy stays within an accuracy's own floor and ceiling, and the ordering holds.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = passingAccuracy(world, seededClubs);
let inside = true, ordered = true;
for (const r of seeded.rows) {
  if (r.passAcc < 0 || r.passAcc > 100) inside = false;
}
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].passAcc < seeded.rows[i].passAcc) ordered = false;
}
ok(`over the whole world the board is complete, within accuracy, and the ordering holds (${seeded.rows.length} clubs listed, inside ${inside}, order ${ordered})`,
  seeded.rows.length >= 50 && inside && ordered);

// The screen is a reader: it renders the folded board and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("passingAccuracy(footballProvider.matches(), footballProvider.clubs())")}, rows ${SCREEN_SRC.includes("passBoard.rows.map")}, league ${SCREEN_SRC.includes("leaders.passLeague")}, keys ${SCREEN_SRC.includes("leaders.passTitle")}/${SCREEN_SRC.includes("leaders.passMethod")})`,
  SCREEN_SRC.includes("passingAccuracy(footballProvider.matches(), footballProvider.clubs())") &&
  SCREEN_SRC.includes("passBoard.rows.map") && SCREEN_SRC.includes("passBoard.league") &&
  SCREEN_SRC.includes("passPeak") &&
  SCREEN_SRC.includes("leaders.passTitle") && SCREEN_SRC.includes("leaders.passHint") &&
  SCREEN_SRC.includes("leaders.passLeague") && SCREEN_SRC.includes("leaders.passLine") &&
  SCREEN_SRC.includes("leaders.passShare") && SCREEN_SRC.includes("leaders.passMethod") &&
  SCREEN_SRC.includes("leaders.passNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
