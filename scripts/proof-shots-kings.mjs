import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1027: the world's trigger fingers — the same stats-block fold as corners, duels, yellows and
// fouls, carrying the metric door's fifth key; clubs ranked by shots per fixture at world scale.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (s) => ({ possession: 50, shots: s, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels: 90, corners: 5, fouls: 8, yellows: 1, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, sHome, sAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(sHome), away: statLine(sAway) },
});

const clubs = [club("A", "T63", 80), club("B", "T63", 70), club("C", "T63", 60)];
const fx = [
  match("f1", "T63", "A", "B", 1, 1, "2026-09-01", 12, 4),
  match("f2", "T63", "C", "A", 2, 0, "2026-09-08", 2, 8),
  match("f3", "T63", "A", "C", 1, 0, "2026-09-15", 12, 5),
];
const board = statsBlockKings(fx, clubs, "shots");
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club is listed once, ordered by shots per match (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 3 && board.rows[0].clubId === "A" &&
  board.rows[1].clubId === "B" && board.rows[2].clubId === "C");
ok(`the hand counts hold (${board.rows.map((r) => `${r.clubId}:${r.perMatch}/${r.played}`).join(" ")})`,
  row.A.played === 3 && row.A.perMatch === Math.round(((12 + 8 + 12) / 3) * 100) / 100 &&
  row.B.perMatch === 4 && row.C.perMatch === Math.round(((2 + 5) / 2) * 100) / 100);
ok(`the league line is the fixture-count-weighted mean (${board.league})`,
  Math.abs(board.league - Math.round(((12 + 4 + 2 + 8 + 12 + 5) / 6) * 100) / 100) < 1e-9);

ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  statsBlockKings([], [], "shots").rows.length === 0 &&
  statsBlockKings([], [], "shots").league === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, clubs, "shots")));

const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = statsBlockKings(world, seededClubs, "shots");
let ordered = true, matched = true;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
for (const r of seeded.rows) {
  const mine = world.filter((m) => m.status === "FINISHED" && m.stats && (m.homeClubId === r.clubId || m.awayClubId === r.clubId));
  const expected = Math.round(mine.reduce((n, m) => n + (m.homeClubId === r.clubId ? m.stats.home : m.stats.away).shots / mine.length, 0) * 100) / 100;
  if (r.perMatch !== expected) matched = false;
}
let totalS = 0;
for (const m of world) if (m.status === "FINISHED" && m.stats) totalS += m.stats.home.shots + m.stats.away.shots;
ok(`over all 15 seeded competitions the board is complete and in order (${seeded.rows.length} clubs listed, ${totalS} shots, league ${seeded.league})`,
  seeded.rows.length >= 50 && ordered && matched);

const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes('statsBlockKings(footballProvider.matches(), footballProvider.clubs(), "shots")')}, rows ${SCREEN_SRC.includes("shotBoard.rows.map")}, keys ${SCREEN_SRC.includes("leaders.shotTitle")}/${SCREEN_SRC.includes("leaders.shotMethod")})`,
  SCREEN_SRC.includes('statsBlockKings(footballProvider.matches(), footballProvider.clubs(), "shots")') &&
  SCREEN_SRC.includes("shotBoard.rows.map") && SCREEN_SRC.includes("shotBoard.league") && SCREEN_SRC.includes("shotPeak") &&
  SCREEN_SRC.includes("leaders.shotTitle") && SCREEN_SRC.includes("leaders.shotHint") &&
  SCREEN_SRC.includes("leaders.shotLeague") && SCREEN_SRC.includes("leaders.shotShare") &&
  SCREEN_SRC.includes("leaders.shotMethod") && SCREEN_SRC.includes("leaders.shotNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
