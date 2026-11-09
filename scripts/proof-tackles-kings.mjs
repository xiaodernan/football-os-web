import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1032: the world's tackling kings — the same stats-block fold as corners, duels, yellows, fouls
// and shots, carrying the metric door's sixth key; clubs ranked by tackles won per fixture here.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (t) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: t, duels: 90, corners: 5, fouls: 8, yellows: 1, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, tHome, tAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(tHome), away: statLine(tAway) },
});

const clubs = [club("A", "T65", 80), club("B", "T65", 70), club("C", "T65", 60)];
const fx = [
  match("f1", "T65", "A", "B", 1, 1, "2026-09-01", 20, 8),
  match("f2", "T65", "C", "A", 2, 0, "2026-09-08", 5, 12),
  match("f3", "T65", "A", "C", 1, 0, "2026-09-15", 18, 4),
];
const board = statsBlockKings(fx, clubs, "tackles");
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club is listed once, ordered by tackles per match (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 3 && board.rows[0].clubId === "A" &&
  board.rows[1].clubId === "B" && board.rows[2].clubId === "C");
ok(`the hand counts hold (${board.rows.map((r) => `${r.clubId}:${r.perMatch}/${r.played}`).join(" ")})`,
  row.A.played === 3 && row.A.perMatch === Math.round(((20 + 12 + 18) / 3) * 100) / 100 &&
  row.B.perMatch === 8 && row.C.perMatch === Math.round(((5 + 4) / 2) * 100) / 100);
ok(`the league line is the fixture-count-weighted mean (${board.league})`,
  Math.abs(board.league - Math.round(((20 + 8 + 5 + 12 + 18 + 4) / 6) * 100) / 100) < 1e-9);

ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  statsBlockKings([], [], "tackles").rows.length === 0 &&
  statsBlockKings([], [], "tackles").league === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, clubs, "tackles")));

const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = statsBlockKings(world, seededClubs, "tackles");
let ordered = true, matched = true;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
for (const r of seeded.rows) {
  const mine = world.filter((m) => m.status === "FINISHED" && m.stats && (m.homeClubId === r.clubId || m.awayClubId === r.clubId));
  const expected = Math.round(mine.reduce((n, m) => n + (m.homeClubId === r.clubId ? m.stats.home : m.stats.away).tackles / mine.length, 0) * 100) / 100;
  if (r.perMatch !== expected) matched = false;
}
let totalT = 0;
for (const m of world) if (m.status === "FINISHED" && m.stats) totalT += m.stats.home.tackles + m.stats.away.tackles;
ok(`over all 15 seeded competitions the board is complete and in order (${seeded.rows.length} clubs listed, ${totalT} tackles, league ${seeded.league})`,
  seeded.rows.length >= 50 && ordered && matched);

const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`the discipline screen renders the fold and its own board (fold call ${SCREEN_SRC.includes('statsBlockKings(matches, clubs, "tackles")')}, rows ${SCREEN_SRC.includes("tackleBoard.rows.map")}, keys ${SCREEN_SRC.includes("disc.tackleTitle")}/${SCREEN_SRC.includes("disc.tackleMethod")})`,
  SCREEN_SRC.includes('statsBlockKings(matches, clubs, "tackles")') && SCREEN_SRC.includes("tackleBoard.rows.map") &&
  SCREEN_SRC.includes("tackleBoard.league") && SCREEN_SRC.includes("tacklePeak") &&
  SCREEN_SRC.includes("disc.tackleTitle") && SCREEN_SRC.includes("disc.tackleHint") &&
  SCREEN_SRC.includes("disc.tackleWorld") && SCREEN_SRC.includes("disc.tackleShare") &&
  SCREEN_SRC.includes("disc.tackleMethod") && SCREEN_SRC.includes("disc.tackleNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
