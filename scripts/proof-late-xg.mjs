import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M989: closing time. The timing clock reads when the goals arrive; this one reads how much of the
// chance lands in the last window — the window's own share of a club's xG. A 0-0 with an events
// list proves nothing against the fold: only clubs with recorded xG appear at all.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { lateXg } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });
const goal = (minute, side, xg) => ({ type: "GOAL", side, minute, player: "P", detail: { key: "sim.ev.goal", vars: { xg: String(xg) } } });

const fx = [
  withEvents(match("f1", "T32", "A", "B", 1, 0, "2026-09-01"), [
    goal(10, "home", 0.3), goal(80, "home", 0.9), goal(85, "away", 0.2),
  ]),
  withEvents(match("f2", "T32", "A", "C", 2, 2, "2026-09-08"), [
    goal(10, "home", 0.6), goal(88, "home", 0.4),
    goal(45, "away", 0.7), goal(90, "away", 0.2),
  ]),
  withEvents(match("f3", "T32", "B", "A", 1, 1, "2026-09-15"), [
    goal(77, "home", 0.5), goal(30, "away", 0.8),
  ]),
  withEvents(match("f4", "T32", "C", "A", 1, 0, "2026-09-22"), [
    goal(83, "home", 0.7),
  ]),
  match("f5", "T32", "B", "C", 0, 0, "2026-09-29"),
  withEvents(match("f6", "T32", "A", "B", 1, 1, "2026-10-06"), [
    goal(90, "home", 0.6), goal(88, "away", 0.4),
  ]),
];
const clubs = ["A", "B", "C"].map((id) => club(id, "T32"));
const board = lateXg("T32", fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`the fold counts the five fixtures that carried events, and every club that banked xG is listed once (five matches: ${board.matches}, rows: ${board.rows.length})`,
  board.matches === 5 && board.rows.length === 3);
ok(`the shares are hand-counted (${board.rows.map((r) => `${r.clubId}: ${r.xgLate}/${r.xgAll} ${r.lateShare}%`).join(", ")})`,
  row.A.lateShare === 52.78 && row.A.xgLate === 1.9 && row.A.xgAll === 3.6 &&
  row.C.lateShare === 56.25 && row.C.xgLate === 0.9 && row.C.xgAll === 1.6 &&
  row.B.lateShare === 100 && row.B.xgLate === 1.1 && row.B.xgAll === 1.1);
ok(`the ordering is the league share under review (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows[0].clubId === "B" && board.rows[1].clubId === "C" && board.rows[2].clubId === "A" &&
  board.leagueLate === 61.9);
ok(`an empty competition reads no rows, a measured zero, while the same fold above reads three`,
  lateXg("T99", [], [club("Q", "T99")]).rows.length === 0 &&
  lateXg("T99", [], [club("Q", "T99")]).leagueLate === 0 &&
  lateXg("T99", [], [club("Q", "T99")]).matches === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(lateXg("T32", fx, clubs)));

// Seeded arm: across every competition the world ships, every row's rate is closed over its own
// counted totals, the board only holds clubs with at least one xG, and the ordering holds.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
let closed = true, ordered = true, hasXg = true;
for (const c of comps) {
  const r2 = lateXg(c.id, world, seededClubs);
  for (const r of r2.rows) {
    if (r.xgAll <= 0) hasXg = false;
    if (Math.abs(r.lateShare - Math.round((r.xgLate / r.xgAll) * 10000) / 100) > 0.005) closed = false;
  }
  for (let i = 1; i < r2.rows.length; i++) {
    if (r2.rows[i - 1].lateShare < r2.rows[i].lateShare) ordered = false;
  }
}
ok(`over all ${comps.length} seeded competitions every club on the board banked at least one xG and the ordering holds (gate ${hasXg}, closed ${closed}, order ${ordered})`,
  hasXg && closed && ordered);

// The screen is a reader: it renders the folded board and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/GoalTiming.tsx"), "utf8");
ok(`the timing screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("lateXg(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("lateXgBoard.rows.map")}, world ${SCREEN_SRC.includes("timing.lateXgWorld")}, keys ${SCREEN_SRC.includes("timing.lateXgTitle")}/${SCREEN_SRC.includes("timing.lateXgRow")})`,
  SCREEN_SRC.includes("lateXg(compId, matches, clubs)") && SCREEN_SRC.includes("lateXgBoard.rows.map") &&
  SCREEN_SRC.includes("timing.lateXgTitle") && SCREEN_SRC.includes("timing.lateXgHint") &&
  SCREEN_SRC.includes("timing.lateXgWorld") && SCREEN_SRC.includes("timing.lateXgRow") &&
  SCREEN_SRC.includes("timing.lateXgMethod") && SCREEN_SRC.includes("timing.lateXgNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
