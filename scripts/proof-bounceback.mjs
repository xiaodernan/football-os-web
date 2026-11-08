import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M987: after a defeat. Every club's results in kickoff order; every fixture following a loss is
// one data point; the crowd is told whether this side tends to answer back or fade.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { bounceBack } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

// Hand count (12 finished fixtures across A/B/C/D):
// A: W, L, W, D, L, L → after-loss fixtures f4 (W) and f9 (L), 3 points there, rate 1.50.
// B: L, W, W, D, W, L → one after-loss fixture (f3, won), under the two-fixture gate.
// C: D, L, D, D, W, L, L → f6 (D) and f11 (L), 1 point, rate 0.50.
// D: D, L, W, W, W → one after-loss fixture (f7, won), under the gate.
const fx = [
  match("f1", "T31", "A", "B", 1, 0, "2026-09-01"),
  match("f2", "T31", "C", "D", 1, 1, "2026-09-08"),
  match("f3", "T31", "A", "B", 0, 2, "2026-09-15"),
  match("f4", "T31", "C", "A", 0, 1, "2026-09-22"),
  match("f5", "T31", "B", "D", 2, 0, "2026-09-29"),
  match("f6", "T31", "A", "C", 1, 1, "2026-10-06"),
  match("f7", "T31", "D", "A", 1, 0, "2026-10-13"),
  match("f8", "T31", "B", "C", 1, 1, "2026-10-20"),
  match("f9", "T31", "C", "A", 2, 1, "2026-10-27"),
  match("f10", "T31", "B", "C", 1, 0, "2026-11-03"),
  match("f11", "T31", "C", "D", 0, 3, "2026-11-10"),
  match("f12", "T31", "D", "B", 1, 0, "2026-11-17"),
];
const clubs = ["A", "B", "C", "D"].map((id) => club(id, "T31"));
const board = bounceBack("T31", fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`the board ranks by rate, the two-fixture gate holds, and the folded numbers are hand-counted (${board.rows.map((r) => `${r.clubId}:${r.rate}`).join(",")})`,
  board.rows.length === 2 && board.rows[0].clubId === "A" && board.rows[1].clubId === "C" &&
  row.A.rate === 1.5 && row.A.afterLoss === 2 && row.A.points === 3 &&
  row.C.rate === 0.5 && row.C.afterLoss === 2 && row.C.points === 1 &&
  board.underpowered === 2);
ok(`a club with one sample stays off the board however good that sample was (B's single win, D's single win)`,
  !board.rows.some((r) => r.clubId === "B" || r.clubId === "D"));
ok(`the world line is the sum across every club that showed up (${board.world})`,
  board.world === 1.67);
// Empty arms: never-appearing clubs produce no row rather than a board of zeros, and the fold is
// repeat-stable.
ok(`an empty competition reads no rows, the two-arm silence, and repeats exactly`,
  bounceBack("T99", [], []).rows.length === 0 &&
  bounceBack("T99", [], []).world === 0 &&
  bounceBack("T99", [], []).underpowered === 0 &&
  board.rows.length === 2 &&
  JSON.stringify(board) === JSON.stringify(bounceBack("T31", fx, clubs)));

// Seeded arm: over every competition the world ships, every row clears its own gate (rate ===
// points / samples), the world line sits inside its own floor and ceiling, and the ordering holds.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const matches = SVC.footballProvider.matches();
let gated = true, ordered = true, exact = true;
for (const c of comps) {
  const r2 = bounceBack(c.id, matches, seededClubs);
  for (const r of r2.rows) {
    if (r.afterLoss < 2) gated = false;
    if (Math.abs(r.rate - Math.round((r.points / r.afterLoss) * 100) / 100) > 0.005) exact = false;
  }
  if (r2.world < 0 || r2.world > 3) exact = false;
  for (let i = 1; i < r2.rows.length; i++) {
    if (r2.rows[i - 1].rate < r2.rows[i].rate) ordered = false;
  }
}
ok(`over all ${comps.length} seeded competitions the two-fixture gate holds, the rates close on themselves, and the ordering holds (gate ${gated}, rates ${exact}, ordering ${ordered})`,
  gated && exact && ordered);

// The screen is a reader: it renders the folded board and nothing else responds.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/GoalTiming.tsx"), "utf8");
ok(`the timing screen reads the fold and its own panel (fold call ${SCREEN_SRC.includes("bounceBack(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("bounce.rows.map")}, world ${SCREEN_SRC.includes("timing.bbWorld")}, keys ${SCREEN_SRC.includes("timing.bbTitle")}/${SCREEN_SRC.includes("timing.bbRow")})`,
  SCREEN_SRC.includes("bounceBack(compId, matches, clubs)") && SCREEN_SRC.includes("bounce.rows.map") &&
  SCREEN_SRC.includes("timing.bbTitle") && SCREEN_SRC.includes("timing.bbHint") &&
  SCREEN_SRC.includes("timing.bbWorld") && SCREEN_SRC.includes("timing.bbRow") &&
  SCREEN_SRC.includes("timing.bbMethod") && SCREEN_SRC.includes("bounce.rows.length === 0"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
