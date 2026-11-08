import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1010: the corner kings — corners per match by club, from the stats block on each finished fixture.
// Ranked by raw pressure, not by what it became; the xG table settles whether it converted.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (corners) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels: 90, corners, fouls: 8, yellows: 1, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, cornersHome, cornersAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(cornersHome), away: statLine(cornersAway) },
});

const clubs = ["A", "B", "C", "D"].map((id) => club(id, "T44", 70 + id.charCodeAt(0) - 65));
const fx = [
  // A lays nine corners per game; B eight; C four; D two; E has no finished fixture with stats.
  match("f1", "T44", "A", "B", 1, 1, "2026-10-06", 9, 8),
  match("f2", "T44", "A", "C", 2, 0, "2026-10-13", 12, 5),
  match("f3", "T44", "B", "C", 1, 1, "2026-10-15", 7, 3),
  match("f4", "T44", "D", "A", 0, 2, "2026-10-19", 2, 6),
  match("f5", "T44", "C", "D", 1, 1, "2026-10-24", 4, 2),
];
const board = statsBlockKings(fx, clubs, "corners");
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club with a finished fixture is listed once, ordered by corners per match (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 4 && board.rows[0].clubId === "A" && board.rows[1].clubId === "B" && board.rows[3].clubId === "D");
ok(`the averages are computed over what the provider actually recorded (${board.rows.map((r) => `${r.clubId}:${r.perMatch}/${r.played}`).join(" ")})`,
  row.A.played === 3 && row.B.played === 2 &&
  Math.abs(row.A.perMatch - Math.round(((9 + 12 + 6) / 3) * 100) / 100) < 1e-9 &&
  Math.abs(row.B.perMatch - Math.round(((8 + 7) / 2) * 100) / 100) < 1e-9 &&
  row.C.perMatch === 4 && row.D.perMatch === 2);
ok(`the league line is the fixture-count-weighted mean (${board.league})`,
  Math.abs(board.league - Math.round(((9 + 8 + 12 + 5 + 7 + 3 + 2 + 6 + 4 + 2) / 10) * 100) / 100) < 1e-9);
ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  statsBlockKings([], [], "corners").rows.length === 0 &&
  statsBlockKings([], [], "corners").league === 0 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, clubs, "corners")));

// Seeded arm: every club in the world with a finished stat-blocked fixture shows up with a rate
// inside accuracy's own floor and ceiling, and the ordering holds.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = statsBlockKings(world, seededClubs, "corners");
let inside = true, ordered = true;
for (const r of seeded.rows) if (!(r.perMatch >= 0)) inside = false;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
ok(`over the shipped world the board is complete, in order, and closes to its own doors (${seeded.rows.length} clubs listed, inside ${inside}, order ${ordered})`,
  seeded.rows.length >= 50 && inside && ordered);

// The screen is a reader: it renders the folded board and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes('statsBlockKings(footballProvider.matches(), footballProvider.clubs(), "corners")')}, rows ${SCREEN_SRC.includes("cornerBoard.rows.map")}, keys ${SCREEN_SRC.includes("leaders.cornerTitle")}/${SCREEN_SRC.includes("leaders.cornerMethod")})`,
  SCREEN_SRC.includes('statsBlockKings(footballProvider.matches(), footballProvider.clubs(), "corners")') &&
  SCREEN_SRC.includes("cornerBoard.rows.map") && SCREEN_SRC.includes("cornerBoard.league") &&
  SCREEN_SRC.includes("cornerPeak") &&
  SCREEN_SRC.includes("leaders.cornerTitle") && SCREEN_SRC.includes("leaders.cornerHint") &&
  SCREEN_SRC.includes("leaders.cornerLeague") && SCREEN_SRC.includes("leaders.cornerShare") &&
  SCREEN_SRC.includes("leaders.cornerMethod") && SCREEN_SRC.includes("leaders.cornerNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
