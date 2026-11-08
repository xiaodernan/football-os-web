import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M990: the world's most open leagues. Every finished fixture in every competition, one per-match
// goals ratio, ranked the world order so the reader can see which league decided earlier that it
// wanted goals.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { leagueOpenness } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

// A blowout league (T33), a quiet league (T34), a middling league (T35) — two blank games to prove
// the fold counts noisy games honestly.
const fx = [
  match("a1", "T33", "H", "A", 5, 2, "2026-09-01"),
  match("a2", "T33", "H", "A", 6, 1, "2026-09-08"),
  match("a3", "T33", "H", "A", 3, 3, "2026-09-15"),
  match("q1", "T34", "H", "A", 1, 0, "2026-09-01"),
  match("q2", "T34", "H", "A", 0, 1, "2026-09-08"),
  match("q3", "T34", "H", "A", 0, 0, "2026-09-15"),
  match("m1", "T35", "H", "A", 2, 1, "2026-09-01"),
  match("m2", "T35", "H", "A", 3, 0, "2026-09-08"),
  match("x1", "T36", "H", "A", null, null, "2026-09-01", "SCHEDULED"),
];
const board = leagueOpenness(fx);
const row = Object.fromEntries(board.rows.map((r) => [r.competitionId, r]));

ok(`every league with finished fixtures appears once, sorted by goals per match (${board.rows.map((r) => `${r.competitionId}:${r.perMatch}`).join(",")})`,
  board.rows.length === 3 && board.rows[0].competitionId === "T33" &&
  board.rows[1].competitionId === "T35" && board.rows[2].competitionId === "T34");
ok(`the hand counts hold (T33 ${row.T33.goals}/${row.T33.matches}=${row.T33.perMatch}, T35 ${row.T35.goals}/${row.T35.matches}=${row.T35.perMatch}, T34 ${row.T34.goals}/${row.T34.matches}=${row.T34.perMatch})`,
  row.T33.goals === 20 && row.T33.matches === 3 && row.T33.perMatch === 6.67 &&
  row.T35.goals === 6 && row.T35.matches === 2 && row.T35.perMatch === 3 &&
  row.T34.goals === 2 && row.T34.matches === 3 && row.T34.perMatch === 0.67);
ok(`the world line sums every scored goal everywhere against those counted (${board.goals}/${board.matches}=${board.global})`,
  board.matches === 8 && board.goals === 28 && board.global === 3.5);
ok(`an empty world reads no rows and a measured zero, while the same fold above reads three`,
  leagueOpenness([]).rows.length === 0 &&
  leagueOpenness([]).global === 0 &&
  leagueOpenness([]).matches === 0 &&
  leagueOpenness([]).goals === 0 &&
  board.rows.length === 3 &&
  JSON.stringify(board) === JSON.stringify(leagueOpenness(fx)));

// Seeded arm: over the world the seed ships, every fixture wins a row and every row's ratio closes on
// its own counters, the ordering holds.
const world = SVC.footballProvider.matches();
const comps = SVC.footballProvider.competitions();
const seeded = leagueOpenness(world);
const rates2dp = seeded.rows.every((r) => Math.round((r.goals / r.matches) * 100) / 100 === Math.round(r.perMatch * 100) / 100 || r.perMatch === r.goals / r.matches);
let ordered = true;
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
}
const matchedFixtures = world.filter((m) => m.status === "FINISHED" && typeof m.homeGoals === "number" && typeof m.awayGoals === "number").length;
ok(`over the shipped world every competition's row closes and the world's own rate survives (${seeded.rows.length} leagues, ${seeded.matches} fixtures, ${seeded.goals} goals), and the ordering holds (${ordered}, rates ${rates2dp})`,
  seeded.rows.length >= 3 && seeded.matches === matchedFixtures && ordered && rates2dp);

// The screen is a reader: it renders the folded table and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok(`the world screen renders the folded board (fold call ${SCREEN_SRC.includes("leagueOpenness(worldMatches)")}, rows ${SCREEN_SRC.includes("openness.rows.map")}, world line ${SCREEN_SRC.includes("world.opennessWorld")}, keys ${SCREEN_SRC.includes("world.opennessTitle")}/${SCREEN_SRC.includes("world.opennessPerMatch")})`,
  SCREEN_SRC.includes("leagueOpenness(worldMatches)") && SCREEN_SRC.includes("openness.rows.map") &&
  SCREEN_SRC.includes("world.opennessTitle") && SCREEN_SRC.includes("world.opennessHint") &&
  SCREEN_SRC.includes("world.opennessWorld") && SCREEN_SRC.includes("world.opennessLine") &&
  SCREEN_SRC.includes("world.opennessPerMatch") && SCREEN_SRC.includes("getCompetition(r.competitionId)"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
