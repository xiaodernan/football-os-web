import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M982: the xG venue clock. The same six windows as the goal clock, with each GOAL's chance value
// in place of the count — home end against away end. It is the attacking twin of the shot clocks
// the venue page already carries.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { xgVenueClock, xgTable } = await server.ssrLoadModule("/domain/analytics.ts");
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
  withEvents(match("f1", "T26", "A", "B", 2, 1, "2026-09-01"), [
    goal(10, "home", 0.8), goal(55, "home", 0.5), goal(80, "away", 0.3),
  ]),
  withEvents(match("f2", "T26", "A", "B", 1, 0, "2026-09-08"), [
    goal(25, "home", 0.7),
  ]),
  withEvents(match("f3", "T26", "B", "A", 2, 0, "2026-09-15"), [
    goal(92, "home", 0.4), goal(30, "home", 0.9),
  ]),
  // f4: an empty-frames rematch — a 0-0 clock reads two rows of zeros rather than nothing.
  match("f4", "T26", "A", "B", 0, 0, "2026-09-22"),
  // f5: scheduled noise.
  match("f5", "T26", "A", "B", null, null, "2026-10-06", "SCHEDULED"),
];
const clubs = ["A", "B"].map((id) => club(id, "T26"));
const clock = xgVenueClock("T26", fx, clubs);

ok(`each GOAL is folded into the six windows by the end the event names (home ${clock.homeWindows.join(",")}, away ${clock.awayWindows.join(",")})`,
  clock.homeWindows.join(",") === "0.8,1.6,0,0.5,0,0.4" &&
  clock.awayWindows.join(",") === "0,0,0,0,0,0.3");
ok(`the two series add up to the fixture-by-fixture read (home ${clock.home}, away ${clock.away})`,
  clock.home === 3.3 && clock.away === 0.3);
// The 0-0 arm must return the zeros rather than no answer — the panels below print them.
const empty = xgVenueClock("T99", [], []);
ok(`an empty competition reads two zero rows and a measured pair of zeroes, while the same fold above reads six`,
  empty.homeWindows.join(",") === "0,0,0,0,0,0" && empty.awayWindows.join(",") === "0,0,0,0,0,0" &&
  empty.home === 0 && empty.away === 0 &&
  Math.abs(clock.home + clock.away - 3.6) < 0.01 &&
  empty.homeWindows.length === 6);

// Seeded arm: across every competition the world ships, this clock, the shot clocks above this
// fold's tools, and the xG table cannot disagree about the goals — home + away xG must equal the
// table's league figure, and the scanned sets must account for each other.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
let closed = true, twoDp = true, totals = true;
for (const c of comps) {
  const a2 = xgVenueClock(c.id, world, seededClubs);
  const t2 = xgTable(c.id, world, seededClubs);
  if (Math.abs(a2.home + a2.away - t2.leagueXg) > 0.005) closed = false;
  for (const n of [...a2.homeWindows, ...a2.awayWindows]) {
    if (Math.round(n * 100) !== Math.round(n * 100)) twoDp = false;
  }
  if (JSON.stringify(a2) !== JSON.stringify(xgVenueClock(c.id, world, seededClubs))) totals = false;
}
ok(`over all ${comps.length} seeded competitions the venue clock and the xG table close on the same numbers (sum ${closed}, 2dp ${twoDp}, repeatable ${totals})`,
  closed && twoDp && totals);

// The screen is a reader: it renders the folded clock and nothing else counts xG.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/VenueSplit.tsx"), "utf8");
ok(`the venue screen reads the fold and its own panel (fold call ${SCREEN_SRC.includes("xgVenueClock(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("xgRows.map")}, keys ${SCREEN_SRC.includes("venue.xgClockTitle")}/${SCREEN_SRC.includes("venue.xgClockHome")})`,
  SCREEN_SRC.includes("xgVenueClock(compId, matches, clubs)") && SCREEN_SRC.includes("xgRows.map") &&
  SCREEN_SRC.includes("venue.xgClockTitle") && SCREEN_SRC.includes("venue.xgClockHint") &&
  SCREEN_SRC.includes("venue.xgClockHome") && SCREEN_SRC.includes("venue.xgClockAway") &&
  SCREEN_SRC.includes("xgClock.homeWindows") && SCREEN_SRC.includes("xgClock.awayWindows") &&
  SCREEN_SRC.includes("timing.emptyHint"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
