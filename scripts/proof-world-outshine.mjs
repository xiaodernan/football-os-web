import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1011: the world's outshine. The xG table settles each league; this ranks every club by the
// amount its scoreboard runs ahead of its chances across the whole seed. Three climb-outs at the
// top of the board is the answer — the world's overwhelms that arrive by the door's clock, or by the table's own.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { worldOutshine } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall = 70) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });
const goal = (minute, side, xg) => ({ type: "GOAL", side, minute, player: "P", detail: { key: "sim.ev.goal", vars: { xg: String(xg) } } });

const clubs = [club("A", "T45", 82), club("B", "T45", 70), club("C", "T45", 64)];
const fx = [
  // A scores three in f1 (xG 1.4); B answers with one (xG 0.4).
  withEvents(match("f1", "T45", "A", "B", 3, 1, "2026-09-01"), [
    goal(10, "home", 0.7), goal(50, "home", 0.5), goal(70, "home", 0.2), goal(85, "away", 0.4),
  ]),
  // B takes two at C (xG 0.1 each) in f2.
  withEvents(match("f2", "T45", "C", "B", 0, 2, "2026-09-08"), [
    goal(90, "away", 0.1), goal(95, "away", 0.1),
  ]),
  // f3: A and C trade one each — A xG 0.9, C xG 0.4.
  withEvents(match("f3", "T45", "A", "C", 1, 1, "2026-09-15"), [
    goal(30, "home", 0.9), goal(80, "away", 0.4),
  ]),
  match("f4", "T45", "B", "A", null, null, "2026-10-06", "SCHEDULED"),
];
const board = worldOutshine(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`the fold walks the whole world, ranked by outshine desc (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 3 && board.rows[0].clubId === "B" &&
  board.rows[1].clubId === "A" && board.rows[2].clubId === "C");
ok(`the hand counts hold (scoreboard minus xG: A ${row.A.outshine}=${row.A.xgFor}, B ${row.B.outshine}=${row.B.xgFor}, C ${row.C.outshine}=${row.C.xgFor})`,
  row.A.outshine === 1.7 && row.B.outshine === 2.4 && row.A.xgFor === 2.3 &&
  row.B.xgFor === 0.6 && row.C.outshine === 0.6 && row.C.xgFor === 0.4);
ok(`an empty world reads no rows, and the same fold repeats exactly`,
  worldOutshine([], []).rows.length === 0 &&
  board.rows.length === 3 && JSON.stringify(board) === JSON.stringify(worldOutshine(fx, clubs)));

// Seeded arm: every club listed carries a positive xG-sum and non-null goals, the ordering holds.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = worldOutshine(world, seededClubs);
let inside = true, ordered = true, sanity = true;
for (const r of seeded.rows) {
  if (!(r.xgFor > 0)) inside = false;
  if (Math.round(r.outshine * 100) !== Math.round(r.outshine * 100)) inside = false;
  if (Math.round(r.xgFor * 100) !== Math.round(r.xgFor * 100)) sanity = false;
}
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].outshine < seeded.rows[i].outshine) ordered = false;
}
ok(`over the shipped world the board is complete, in order, 2dp and closes itself (${seeded.rows.length} clubs, inside ${inside}, ordered ${ordered}, 2dp ${sanity})`,
  seeded.rows.length >= 50 && inside && ordered && sanity);

// The screen is a reader: it renders the folded board and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own banner (fold call ${SCREEN_SRC.includes("worldOutshine(footballProvider.matches(), footballProvider.clubs())")}, tiles ${SCREEN_SRC.includes("outshines.map")}, keys ${SCREEN_SRC.includes("leaders.outshineTitle")}/${SCREEN_SRC.includes("leaders.outshineMethod")})`,
  SCREEN_SRC.includes("worldOutshine(footballProvider.matches(), footballProvider.clubs())") &&
  SCREEN_SRC.includes("outshines.map") && SCREEN_SRC.includes("leaders.outshineHint") &&
  SCREEN_SRC.includes("leaders.outshineTitle") && SCREEN_SRC.includes("leaders.outshineNone") &&
  SCREEN_SRC.includes("leaders.outshineLabel") && SCREEN_SRC.includes("leaders.outshineSub") &&
  SCREEN_SRC.includes("leaders.outshineMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
