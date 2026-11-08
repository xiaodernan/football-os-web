import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1016: the lethal read, the world over. The timing screen shows one competition's conversion;
// this fold walks the whole seed and answers the same question with every fixture read once.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { worldLethal } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });
const shot = (side) => ({ minute: 10, type: "SHOT", side, player: "P" });
const goal = (side) => ({ minute: 20, type: "GOAL", side, player: "P", detail: { key: "sim.ev.goal", vars: { xg: "0.5" } } });

const clubs = [club("A", "T48", 80), club("B", "T48", 70), club("C", "T48", 60), club("D", "T49", 50)];
// Hand count: A 4 attempts (2 SHOT + 2 GOAL over f1+f2), 2 goals = 50.00%; B 1 attempt, 1 goal = 100.00%.
const fx = [
  withEvents(match("f1", "T48", "A", "B", 1, 1, "2026-09-01"), [
    shot("home"), shot("home"), goal("home"), goal("away"),
  ]),
  withEvents(match("f2", "T48", "C", "A", 2, 0, "2026-09-08"), [
    shot("home"), shot("home"), goal("away"), goal("home"), goal("home"),
  ]),
  match("f3", "T48", "B", "C", null, null, "2026-10-06", "SCHEDULED"),
];
const board = worldLethal(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club with at least one attempt is listed once, ordered by conversion (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.map((r) => r.clubId).join(",") === "B,A,C");
ok(`the hand counts hold (B ${row.B.goals}/${row.B.shots + row.B.goals}=${row.B.rate}%, A ${row.A.goals}/${row.A.shots + row.A.goals}=${row.A.rate}%, C ${row.C.goals}/${row.C.shots + row.C.goals}=${row.C.rate}%)`,
  row.A.rate === 50 && row.A.shots === 2 && row.A.goals === 2 &&
  row.B.rate === 100 && row.B.shots === 0 && row.B.goals === 1 &&
  row.C.rate === 50 && row.C.shots === 2 && row.C.goals === 2);
ok(`the league line is every goal over every attempt (${board.league})`,
  Math.abs(board.league - 55.56) < 1e-9);

ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  worldLethal([], []).rows.length === 0 &&
  worldLethal([], []).league === 0 &&
  JSON.stringify(board) === JSON.stringify(worldLethal(fx, clubs)));

// Seeded arm: over the whole world the ordering holds, rates stay inside the door's floor and ceiling.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = worldLethal(world, seededClubs);
let inside = true, ordered = true, complete = true;
for (const r of seeded.rows) if (r.rate < 0 || r.rate > 100) inside = false;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].rate < seeded.rows[i].rate) ordered = false;
const attemptsTotal = seeded.rows.reduce((n, r) => n + r.shots + r.goals, 0);
ok(`over the whole world the board is complete and ordered (${seeded.rows.length} clubs, ${attemptsTotal} attempts)`,
  seeded.rows.length >= 50 && attemptsTotal > 10000 && inside && ordered);

// The screen is a reader: it renders the folded board.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("worldLethal(footballProvider.matches(), footballProvider.clubs())")}, rows ${SCREEN_SRC.includes("lethalWorld.rows.map")}, keys ${SCREEN_SRC.includes("leaders.lethalTitle")}/${SCREEN_SRC.includes("leaders.lethalMethod")})`,
  SCREEN_SRC.includes("worldLethal(footballProvider.matches(), footballProvider.clubs())") &&
  SCREEN_SRC.includes("lethalWorld.rows.map") && SCREEN_SRC.includes("lethalWorld.league") &&
  SCREEN_SRC.includes("leaders.lethalTitle") && SCREEN_SRC.includes("leaders.lethalHint") &&
  SCREEN_SRC.includes("leaders.lethalLeague") && SCREEN_SRC.includes("leaders.lethalShare") &&
  SCREEN_SRC.includes("leaders.lethalMethod") && SCREEN_SRC.includes("leaders.lethalNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
