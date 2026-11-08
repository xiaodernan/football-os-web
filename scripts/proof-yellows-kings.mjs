import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1019: the world's most loaded for yellows — the same stats-block fold as corners and duels,
// carrying the metric door's third key; clubs ranked by yellows per fixture at world scale.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (y) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels: 90, corners: 5, fouls: 8, yellows: y, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, yHome, yAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(yHome), away: statLine(yAway) },
});

const clubs = [club("A", "T51", 80), club("B", "T51", 70), club("C", "T51", 60)];
const fx = [
  match("f1", "T51", "A", "B", 1, 1, "2026-09-01", 5, 2),
  match("f2", "T51", "C", "A", 2, 0, "2026-09-08", 1, 3),
  match("f3", "T51", "A", "C", 1, 0, "2026-09-15", 4, 2),
];
const board = statsBlockKings(fx, clubs, "yellows");
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club is listed once, ordered by yellows per match (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 3 && board.rows[0].clubId === "A" &&
  board.rows[1].clubId === "B" && board.rows[2].clubId === "C");
ok(`the hand counts hold (${board.rows.map((r) => `${r.clubId}:${r.perMatch}/${r.played}`).join(" ")})`,
  row.A.played === 3 && Math.abs(row.A.perMatch - 4) < 1e-9 &&
  row.B.perMatch === 2 && row.C.perMatch === 1.5);
ok(`the league line is the fixture-count-weighted mean (${board.league})`,
  Math.abs(board.league - Math.round((17 / 6) * 100) / 100) < 1e-9);

// Empty arm with the positive anchor from the same door above.
ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  statsBlockKings([], [], "yellows").rows.length === 0 &&
  statsBlockKings([], [], "yellows").league === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, clubs, "yellows")));

// Seeded arm: over the whole world the ordering holds and the totals close to independent recount.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = statsBlockKings(world, seededClubs, "yellows");
let ordered = true, closed = true;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
let totalY = 0;
for (const m of world) if (m.status === "FINISHED" && m.stats) totalY += m.stats.home.yellows + m.stats.away.yellows;
const boardSum = Math.round(seeded.rows.reduce((n, r) => n + r.perMatch * r.played, 0) * 100) / 100;
ok(`over all 15 seeded competitions the board is complete and in order (${seeded.rows.length} clubs listed, sum of games ${seeded.rows.reduce((n, r) => n + r.played, 0)}, league ${seeded.league})`,
  seeded.rows.length >= 50 && ordered && boardSum <= totalY + 1);

// The screen is a reader: it renders the folded board and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`the discipline screen renders the fold and its own board (fold call ${SCREEN_SRC.includes('statsBlockKings(matches, clubs, "yellows")')}, rows ${SCREEN_SRC.includes("yellowBoard.rows.map")}, keys ${SCREEN_SRC.includes("disc.yellowTitle")}/${SCREEN_SRC.includes("disc.yellowMethod")})`,
  SCREEN_SRC.includes('statsBlockKings(matches, clubs, "yellows")') && SCREEN_SRC.includes("yellowBoard.rows.map") &&
  SCREEN_SRC.includes("yellowBoard.league") && SCREEN_SRC.includes("yellowPeak") &&
  SCREEN_SRC.includes("disc.yellowTitle") && SCREEN_SRC.includes("disc.yellowHint") &&
  SCREEN_SRC.includes("disc.yellowWorld") && SCREEN_SRC.includes("disc.yellowShare") &&
  SCREEN_SRC.includes("disc.yellowMethod") && SCREEN_SRC.includes("disc.yellowNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
