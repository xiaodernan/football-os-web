import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M980: the xG table. Every seeded GOAL carries its xG in detail.vars; the fold sums it per club,
// keeps the conceded side, and lines both up against the scoreboard. A missing value is reported,
// not absorbed, so the numbers the screen prints stay honest about what they saw.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { xgTable, teamMetrics } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });
const goal = (minute, side, xg) =>
  xg === null
    ? { type: "GOAL", side, minute, player: "P" }
    : { type: "GOAL", side, minute, player: "P", detail: { key: "sim.ev.goal", vars: { xg: String(xg) } } };

const fx = [
  withEvents(match("f1", "T24", "A", "B", 2, 1, "2026-09-01"), [
    goal(20, "home", 0.8), goal(70, "home", 0.3), goal(85, "away", 0.5),
  ]),
  withEvents(match("f2", "T24", "C", "D", 1, 1, "2026-09-08"), [
    goal(30, "home", 0.9), goal(60, "away", 0.4),
  ]),
  withEvents(match("f3", "T24", "E", "A", 1, 3, "2026-09-15"), [
    goal(40, "home", 0.55), goal(50, "away", 0.6), goal(65, "away", 0.7), goal(75, "away", 0.2),
  ]),
  match("f4", "T24", "F", "E", 0, 0, "2026-09-22"),
  withEvents(match("f5", "T24", "B", "C", 1, 1, "2026-09-29"), [
    goal(35, "home", 0.45), goal(80, "away", 0.45),
  ]),
  // A goal with no xG attached — counted, never absorbed.
  withEvents(match("f6", "T24", "C", "D", 1, 0, "2026-10-06"), [
    goal(88, "home", null),
  ]),
  // f7: scheduled noise.
  match("f7", "T24", "A", "D", null, null, "2026-11-03", "SCHEDULED"),
];
const T24 = ["A", "B", "C", "D", "E", "F"].map((id) => club(id, "T24"));
const xg = xgTable("T24", fx, T24);
const row = Object.fromEntries(xg.rows.map((r) => [r.clubId, r]));
const gf = Object.fromEntries(teamMetrics("T24", fx, T24).map((m) => [m.clubId, m.gf]));

ok(`the fold reads every GOAL and reports the corrupt ones (${xg.scannedGoals} scanned, ${xg.missingXg} missing)`,
  xg.scannedGoals === 12 && xg.missingXg === 1);
ok(`the rows hand-counted: A 2.6/1.05 diff 1.55 outshine 2.4; C 1.35/0.85 outshine 1.65; F on ${row.F.played === undefined ? "board" : "board"} (${xg.rows.map((r) => r.clubId).join(",")})`,
  row.A.xgFor === 2.6 && row.A.xgAgainst === 1.05 && row.A.xgDiff === 1.55 && row.A.outshine === 2.4 &&
  row.C.xgFor === 1.35 && row.C.xgAgainst === 0.85 && row.C.xgDiff === 0.5 && row.C.outshine === 1.65 &&
  row.D.xgDiff === -0.5 && row.B.xgDiff === -0.6 && row.E.xgDiff === -0.95 && row.F.xgDiff === 0 &&
  gf.A === 5 && gf.C === 3);
ok(`the order is the xG difference and then the xG for (${xg.rows.map((r) => r.clubId).join(",")}), and the league figure is the whole fold's xG`,
  xg.rows.map((r) => r.clubId).join(",") === "A,C,F,D,B,E" && xg.leagueXg === 5.85);
ok(`an empty competition reads no rows and a measured zero, while the same fold above reads six`,
  xgTable("T99", [], [club("Q", "T99")]).rows.length === 0 &&
  xgTable("T99", [], [club("Q", "T99")]).leagueXg === 0 &&
  xg.rows.length === 6 &&
  JSON.stringify(xg) === JSON.stringify(xgTable("T24", fx, T24)));

// Seeded arm: over every seeded competition the world ships — outshine equals the scoreboard's
// goals minus xG for, scanned equals events with an xg plus missing, and the ordering holds.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
let closes = true, ordering = true, twoDp = true, scannedMatches = true;
for (const c of comps) {
  const t2 = xgTable(c.id, world, seededClubs);
  const metrics = new Map(teamMetrics(c.id, world, seededClubs).map((m) => [m.clubId, m]));
  for (const r of t2.rows) {
    if (Math.abs(r.outshine - (metrics.get(r.clubId).gf - r.xgFor)) > 0.005) closes = false;
    if (Math.abs(r.xgDiff - (r.xgFor - r.xgAgainst)) > 0.005) closes = false;
    for (const s of [r.xgFor, r.xgAgainst, r.xgDiff, r.outshine]) {
      if (Math.round(s * 100) !== Math.round(s * 100)) twoDp = false;
    }
  }
  for (let i = 1; i < t2.rows.length; i++) {
    if (t2.rows[i - 1].xgDiff < t2.rows[i].xgDiff) ordering = false;
  }
  let expectedScanned = 0, expectedMissing = 0;
  for (const m of world) {
    if (m.competitionId !== c.id || m.status !== "FINISHED") continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      expectedScanned++;
      const v = e.detail && typeof e.detail === "object" && !Array.isArray(e.detail) && "vars" in e.detail ? e.detail.vars?.xg : undefined;
      if (v === undefined || v === "") expectedMissing++;
    }
  }
  if (t2.scannedGoals !== expectedScanned || t2.missingXg !== expectedMissing) scannedMatches = false;
}
ok(`over all ${comps.length} seeded competitions the rows close on the scoreboard and the scan answers for its corrupts (counts ${closes}, ordering ${ordering}, 2dp ${twoDp}, scan ${scannedMatches})`,
  closes && ordering && twoDp && scannedMatches);

// The screen is a reader: the xG board renders the folded table and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/GoalTiming.tsx"), "utf8");
ok(`the timing screen reads the fold and its own board (fold call ${SCREEN_SRC.includes("xgTable(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("xg.rows.map")}, league ${SCREEN_SRC.includes("timing.xgLeague")}, keys ${SCREEN_SRC.includes("timing.xgTitle")}/${SCREEN_SRC.includes("timing.xgColFor")})`,
  SCREEN_SRC.includes("xgTable(compId, matches, clubs)") && SCREEN_SRC.includes("xg.rows.map") &&
  SCREEN_SRC.includes("xg.scannedGoals") && SCREEN_SRC.includes("xg.missingXg") &&
  SCREEN_SRC.includes("timing.xgTitle") && SCREEN_SRC.includes("timing.xgHint") &&
  SCREEN_SRC.includes("timing.xgColFor") && SCREEN_SRC.includes("timing.xgColAgainst") &&
  SCREEN_SRC.includes("timing.xgColDiff") && SCREEN_SRC.includes("timing.xgColOutshine") &&
  SCREEN_SRC.includes("DELTA_CLASS[deltaSign(r.xgDiff)]"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
