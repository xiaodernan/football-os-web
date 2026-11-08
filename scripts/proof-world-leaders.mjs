import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M994: the world's league leaders. Every competition in the seeded world has finished fixtures in
// it, so every table exists and knows its standings; this board names whoever sits on top of it.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { worldLeaders, teamMetrics } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall = 70) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

const clubsPL = [club("A", "pl-like"), club("B", "pl-like"), club("E", "pl-like"), club("F", "pl-like")];
const clubsLiga = [club("C", "liga-like"), club("D", "liga-like")];
const clubs = [...clubsPL, ...clubsLiga];
const fx = [
  // PL: A wins all three — 9 points, clean table.
  match("p1", "pl-like", "A", "B", 2, 0, "2026-09-01"),
  match("p2", "pl-like", "A", "B", 1, 0, "2026-09-08"),
  match("p3", "pl-like", "B", "A", 0, 1, "2026-09-15"),
  match("p4", "pl-like", "A", "E", null, null, "2026-10-06", "SCHEDULED"),
  // Liga: level on points and GD — D ahead on goals scored? C scores twice, D scores twice,
  // GD equal. D ahead on goals scored.
  match("l1", "liga-like", "C", "D", 1, 0, "2026-09-01"),
  match("l2", "liga-like", "D", "C", 3, 1, "2026-09-08"),
  // A third competition with no finished fixtures at all must not be listed.
  match("n1", "liga-like", "D", "C", null, null, "2026-11-03", "SCHEDULED"),
];
const board = worldLeaders(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.competitionId, r]));

ok(`every competition shows once, ordered by its own id (${board.rows.map((r) => r.competitionId).join(",")})`,
  board.rows.map((r) => r.competitionId).join(",") === "liga-like,pl-like");
ok(`the table order names the club first (${board.rows.map((r) => `${r.competitionId}:${r.leaderId}(${r.points})`).join(",")})`,
  row["pl-like"].leaderId === "A" && row["pl-like"].points === 9 && row["pl-like"].played === 3 &&
  row["liga-like"].leaderId === "D" && row["liga-like"].points === 3);
ok(`a competition with no finished fixture is not listed (${board.rows.length} league rows)`,
  board.rows.length === 2 && board.leaderCount === 2 && board.rows.every((r) => r.played > 0));

ok(`an empty world reads no leaders and a measured zero count, while the same fold above names two`,
  worldLeaders([], []).rows.length === 0 &&
  worldLeaders([], []).leaderCount === 0 &&
  board.rows.length === 2 &&
  JSON.stringify(board) === JSON.stringify(worldLeaders(fx, clubs)));

// Seeded arm: every competition the seed emits is listed here, each leader is a club of that comp,
// and each row closes on the metrics fold's own ordering.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = worldLeaders(world, seededClubs);
let fits = true;
for (const r of seeded.rows) {
  const c = comps.find((x) => x.id === r.competitionId);
  if (!c) fits = false;
  const metrics = teamMetrics(r.competitionId, world, seededClubs).find((m) => m.played > 0);
  if (!metrics || metrics.clubId !== r.leaderId || metrics.points !== r.points || metrics.played !== r.played) fits = false;
}
ok(`over all ${comps.length} seed leagues the fold quotes the metrics fold verbatim (${seeded.leaderCount} league tables)`,
  seeded.rows.length === comps.length && fits && seeded.leaderCount === comps.length);

// The screen shows the table without recomputing it.
const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok(`the world screen renders the leader IDs straight off the fold (fold call ${SCREEN_SRC.includes("worldLeaders(worldMatches")}, rows ${SCREEN_SRC.includes("leaders.rows.map")}, keys ${SCREEN_SRC.includes("world.leadersTitle")}/${SCREEN_SRC.includes("world.leadersHint")})`,
  SCREEN_SRC.includes("worldLeaders(worldMatches") && SCREEN_SRC.includes("leaders.rows.map") &&
  SCREEN_SRC.includes("world.leadersTitle") && SCREEN_SRC.includes("world.leadersHint") &&
  SCREEN_SRC.includes("world.leadersNone") && SCREEN_SRC.includes("getCompetition(r.competitionId)") &&
  SCREEN_SRC.includes("leaders.rows.length === 0"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
