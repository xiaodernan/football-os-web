import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M983: the owed margins. The xG table settles a season; the xG clock shows its minutes; this one
// names the fixtures where the scoreboard and the chances tell opposite stories — the loser created
// more, and the winner won anyway.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { xgRobberies } = await server.ssrLoadModule("/domain/analytics.ts");
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
  // f1: A wins 2-1 despite banking only 0.2 against B's 1.7 — owed exactly 1.5, the qual floor.
  withEvents(match("f1", "T27", "A", "B", 2, 1, "2026-09-01"), [
    goal(10, "home", 0.1), goal(55, "home", 0.1), goal(80, "away", 0.8), goal(75, "away", 0.9),
  ]),
  // f2: A wins 1-0 — the loser banked no xG at all, so the margin is only 0.3. Not a robbery.
  withEvents(match("f2", "T27", "A", "B", 1, 0, "2026-09-08"), [
    goal(30, "home", 0.3),
  ]),
  // f3: D wins 1-0 at C — D's xG (0.1) beats C's (0.0); D won the xG battle too. No robbery.
  withEvents(match("f3", "T27", "C", "D", 0, 1, "2026-09-15"), [
    goal(20, "away", 0.1),
  ]),
  // f5: E wins 1-0 at C — C banked 1.8 against E's 0.05, owed 1.75.
  withEvents(match("f5", "T27", "C", "E", 0, 1, "2026-09-29"), [
    goal(25, "home", 0.1), goal(45, "home", 0.8), goal(60, "home", 0.9), goal(80, "away", 0.05),
  ]),
  // f7: C wins 2-0 at A — A banked 1.8 against C's 0.1, owed 1.7.
  withEvents(match("f7", "T27", "A", "C", 0, 2, "2026-10-13"), [
    goal(35, "home", 1.3), goal(70, "home", 0.5), goal(50, "away", 0.05), goal(65, "away", 0.05),
  ]),
  // f6: a stalemate to vanish, f8: a 1-1 rematch draws.
  match("f6", "T27", "B", "C", 1, 1, "2026-10-06"),
  match("f8", "T27", "A", "D", null, null, "2026-11-03", "SCHEDULED"),
];
const T27 = ["A", "B", "C", "D", "E"].map((id) => club(id, "T27"));
const rob = xgRobberies("T27", fx, T27);

ok(`exactly the fixtures with a winner where the loser outcreated the winner by at least 1.5 (${rob.rows.map((r) => r.matchId).join(",")})`,
  rob.rows.length === 3 && rob.count === 3 && rob.biggest === 1.75 &&
  rob.rows[0].matchId === "f5" && rob.rows[1].matchId === "f7" && rob.rows[2].matchId === "f1");
ok(`the margins are hand-counted (f5 ${rob.rows[0].margin}, f7 ${rob.rows[1].margin}, f1 ${rob.rows[2].margin}) and the winners are the scoreline winners (${rob.rows.map((r) => r.winnerId).join(",")})`,
  rob.rows[0].margin === 1.75 && rob.rows[1].margin === 1.7 && rob.rows[2].margin === 1.5 &&
  rob.rows[0].winnerId === "E" && rob.rows[1].winnerId === "C" && rob.rows[2].winnerId === "A" &&
  rob.rows.every((r) => (r.homeGoals > r.awayGoals ? r.winnerId === r.homeClubId : r.winnerId === r.awayClubId)) &&
  rob.matches === 6);
// The roster does its job and the seeded arm holds it over every real competition in the shipped world.
ok(`an empty competition reads no rows and a measured zero, while the same fold above reads three`,
  xgRobberies("T99", [], []).rows.length === 0 &&
  xgRobberies("T99", [], []).biggest === 0 &&
  rob.count === 3 &&
  JSON.stringify(rob) === JSON.stringify(xgRobberies("T27", fx, T27)));
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
let closes = true, ordered = true, thresholdOk = true;
for (const c of comps) {
  const r2 = xgRobberies(c.id, world, seededClubs);
  for (const r of r2.rows) {
    const loserXg = r.winnerId === r.homeClubId ? r.awayXg : r.homeXg;
    const winnerXg = r.winnerId === r.homeClubId ? r.homeXg : r.awayXg;
    if (Math.abs(loserXg - winnerXg - r.margin) > 1e-9) closes = false;
    if (r.margin < 1.5) thresholdOk = false;
    const result = r.homeGoals > r.awayGoals ? "home" : r.awayGoals > r.homeGoals ? "away" : null;
    if (!result) ordered = false;
  }
  for (let i = 1; i < r2.rows.length; i++) {
    if (r2.rows[i - 1].margin < r2.rows[i].margin) ordered = false;
  }
}
ok(`over all ${comps.length} seeded competitions every owed fixture starts from a margin of at least 1.5 (${thresholdOk}), the margin is the two xGs subtracted (${closes}), the winner won and the ordering holds (${ordered})`,
  closes && ordered && thresholdOk);

// The screen is a reader: it renders the folded board and nothing else computes the margin.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/GoalTiming.tsx"), "utf8");
ok(`the timing screen reads the fold and its own board (fold call ${SCREEN_SRC.includes("xgRobberies(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("robberies.rows.map")}, keys ${SCREEN_SRC.includes("timing.owedTitle")}/${SCREEN_SRC.includes("timing.owedLine")})`,
  SCREEN_SRC.includes("xgRobberies(compId, matches, clubs)") && SCREEN_SRC.includes("robberies.rows.map") &&
  SCREEN_SRC.includes("timing.owedTitle") && SCREEN_SRC.includes("timing.owedHint") &&
  SCREEN_SRC.includes("timing.owedLine") && SCREEN_SRC.includes("timing.owedMethod") &&
  SCREEN_SRC.includes("robberies.rows.length === 0"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
