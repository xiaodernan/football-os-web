import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1021: the world's leading foulers — the same stats-block fold as corners, duels and yellows,
// carrying the metric door's fourth key; clubs ranked by fouls per fixture at world scale.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (f) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels: 90, corners: 5, fouls: f, yellows: 1, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, fHome, fAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(fHome), away: statLine(fAway) },
});

const clubs = [club("A", "T52", 80), club("B", "T52", 70), club("C", "T52", 60)];
const fx = [
  match("f1", "T52", "A", "B", 1, 1, "2026-09-01", 6, 2),
  match("f2", "T52", "C", "A", 2, 0, "2026-09-08", 1, 4),
  match("f3", "T52", "A", "C", 1, 0, "2026-09-15", 5, 3),
];
const board = statsBlockKings(fx, clubs, "fouls");
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club is listed once, ordered by fouls per match (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 3 && board.rows[0].clubId === "A" &&
  board.rows[1].clubId === "B" && board.rows[2].clubId === "C");
ok(`the hand counts hold (${board.rows.map((r) => `${r.clubId}:${r.perMatch}/${r.played}`).join(" ")})`,
  row.A.played === 3 && Math.abs(row.A.perMatch - 5) < 1e-9 &&
  row.B.perMatch === 2 && row.C.perMatch === 2);
ok(`the league line is the fixture-count-weighted mean (${board.league})`,
  Math.abs(board.league - Math.round((21 / 6) * 100) / 100) < 1e-9);

// Empty arm with the positive companion from the same door above.
ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  statsBlockKings([], [], "fouls").rows.length === 0 &&
  statsBlockKings([], [], "fouls").league === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, clubs, "fouls")));

// Seeded arm: over the whole world the ordering holds and the totals close to independent recount.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = statsBlockKings(world, seededClubs, "fouls");
let ordered = true, matched = true;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
for (const r of seeded.rows) {
  const mine = world.filter((m) => m.status === "FINISHED" && m.stats && (m.homeClubId === r.clubId || m.awayClubId === r.clubId));
  const expected = Math.round(mine.reduce((n, m) => n + (m.homeClubId === r.clubId ? m.stats.home : m.stats.away).fouls / mine.length, 0) * 100) / 100;
  if (r.perMatch !== expected) matched = false;
}
let totalF = 0;
for (const m of world) if (m.status === "FINISHED" && m.stats) totalF += m.stats.home.fouls + m.stats.away.fouls;
ok(`over all 15 seeded competitions the board is complete and in order (${seeded.rows.length} clubs listed, ${totalF} fouls, league ${seeded.league})`,
  seeded.rows.length >= 50 && ordered && matched);

// The screen is a reader: it renders the folded board and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`the discipline screen renders the fold and its own board (fold call ${SCREEN_SRC.includes('statsBlockKings(matches, clubs, "fouls")')}, rows ${SCREEN_SRC.includes("foulBoard.rows.map")}, keys ${SCREEN_SRC.includes("disc.foulTitle")}/${SCREEN_SRC.includes("disc.foulMethod")})`,
  SCREEN_SRC.includes('statsBlockKings(matches, clubs, "fouls")') && SCREEN_SRC.includes("foulBoard.rows.map") &&
  SCREEN_SRC.includes("foulBoard.league") && SCREEN_SRC.includes("foulPeak") &&
  SCREEN_SRC.includes("disc.foulTitle") && SCREEN_SRC.includes("disc.foulHint") &&
  SCREEN_SRC.includes("disc.foulWorld") && SCREEN_SRC.includes("disc.foulShare") &&
  SCREEN_SRC.includes("disc.foulMethod") && SCREEN_SRC.includes("disc.foulNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
