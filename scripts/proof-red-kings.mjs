import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1018: the world's red card kings — clubs ranked by total reds across the whole seeded world.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { redCardKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall = 70) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (reds, yellows) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels: 90, corners: 5, fouls: 8, yellows, reds });
const match = (id, comp, home, away, hg, ag, kickoff, rHome, rAway, yHome = 1, yAway = 1, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(rHome, yHome), away: statLine(rAway, yAway) },
});

const clubs = [club("A", "T49", 85), club("B", "T49", 70), club("C", "T49", 64), club("D", "T50", 55)];
const fx = [
  match("f1", "T49", "A", "B", 2, 1, "2026-09-01", 1, 3, 4, 5),
  match("f2", "T49", "C", "A", 1, 1, "2026-09-08", 0, 0, 2, 3),
  match("f3", "T49", "B", "C", 0, 1, "2026-09-15", 2, 1, 3, 4),
  match("f4", "T49", "D", "A", 1, 0, "2026-09-22", 0, 2, 1, 1), // D is T50, outside this comp — must not count
];
const board = redCardKings(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club with at least one red is listed once, ordered by reds descending (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.map((r) => r.clubId).join(",") === "B,A,C");
ok(`the hand counts hold — every red in the seed tabulated to its own club (${board.rows.map((r) => `${r.clubId}:${r.reds}`).join(" ")})`,
  row.A.reds === 3 && row.A.yellows === 8 && row.A.played === 3 &&
  row.B.reds === 5 && row.B.yellows === 8 && row.B.played === 2 &&
  row.C.reds === 1 && row.D === undefined);
// T50's D is outside the fixtures — must not appear in rows, though it might appear in matches count.
ok(`the world's own red rate per club-fixture is right (${board.perMatch})`,
  board.matches === 8 && board.perMatch === 1.13);

// Empty arm with a positive companion.
ok(`an empty world reads no rows, a measured zero, and the same fixture repeats exactly`,
  redCardKings([], []).rows.length === 0 &&
  redCardKings([], []).perMatch === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(redCardKings(fx, clubs)));

// Seeded arm: over the shipped world the totals match an independent recount from the doors; the
// ordering holds.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = redCardKings(world, seededClubs);
let matched = true, ordered = true, complete = true;
for (const r of seeded.rows) {
  const mine = world.filter((m) => m.status === "FINISHED" && m.stats && (m.homeClubId === r.clubId || m.awayClubId === r.clubId));
  const expected = mine.reduce((n, m) => n + (m.homeClubId === r.clubId ? m.stats.home : m.stats.away).reds, 0);
  if (r.reds !== expected) matched = false;
}
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].reds < seeded.rows[i].reds) ordered = false;
}
let worldReds = 0;
for (const m of world) if (m.status === "FINISHED" && m.stats) { worldReds += m.stats.home.reds + m.stats.away.reds; }
const totals = seeded.rows.reduce((n, r) => n + r.reds, 0);
ok(`over all 15 seeded competitions the board closes on an independent recount (${seeded.rows.length} clubs listed, ${totals} reds of ${worldReds}, order ${ordered}, matched ${matched})`,
  matched && ordered && totals === worldReds);

// The screen is a reader: it renders the folded board.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`the discipline screen renders the fold and its own panel (fold call ${SCREEN_SRC.includes("redCardKings(matches, clubs)")}, rows ${SCREEN_SRC.includes("redKingsBoard.rows.map")}, world line ${SCREEN_SRC.includes("disc.redKingsWorld")}, keys ${SCREEN_SRC.includes("disc.redKingsTitle")}/${SCREEN_SRC.includes("disc.redKingsMethod")})`,
  SCREEN_SRC.includes("redCardKings(matches, clubs)") && SCREEN_SRC.includes("redKingsBoard.rows.map") &&
  SCREEN_SRC.includes("disc.redKingsTitle") && SCREEN_SRC.includes("disc.redKingsHint") &&
  SCREEN_SRC.includes("disc.redKingsWorld") && SCREEN_SRC.includes("disc.redKingsLine") &&
  SCREEN_SRC.includes("disc.redKingsMethod") && SCREEN_SRC.includes("disc.redKingsNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
