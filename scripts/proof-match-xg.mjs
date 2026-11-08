import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M981: this fixture's xG. The match page folds every GOAL the event list carries, week by week,
// the same parser the xG table drives — no second walk of detail.vars to keep in sync.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { matchXg, xgTable } = await server.ssrLoadModule("/domain/analytics.ts");
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

const f1 = withEvents(match("f1", "T25", "A", "B", 2, 1, "2026-09-01"), [
  goal(20, "home", 0.8), goal(70, "home", 0.3), goal(85, "away", 0.5),
]);
const f2 = withEvents(match("f2", "T25", "C", "D", 1, 1, "2026-09-08"), [
  goal(30, "home", 0.9), goal(60, "away", 0.4),
]);
const f3nothing = match("f3", "T25", "A", "D", 0, 0, "2026-09-15"); // no events at all
const f3shots = withEvents(match("f4", "T25", "A", "D", 0, 0, "2026-09-22"), [
  { type: "SHOT", side: "home", minute: 40, player: "A1" },
  { type: "SHOT", side: "away", minute: 60, player: "D1" },
]);
const f6 = withEvents(match("f6", "T25", "C", "A", 2, 1, "2026-10-06"), [
  goal(15, "home", 0.7), goal(88, "home", null), goal(75, "away", 0.2),
]);

const r1 = matchXg(f1);
ok(`each GOAL is split to its side (A ${r1.home} against B ${r1.away})`,
  r1.home === 1.1 && r1.away === 0.5 && r1.missing === 0);
const r6 = matchXg(f6);
ok(`a goal without an xG is counted as missing, never absorbed (C ${r6.home} against A ${r6.away}, missing ${r6.missing})`,
  r6.home === 0.7 && r6.away === 0.2 && r6.missing === 1 &&
  Math.abs(r6.home + r6.away - 0.9) < 1e-9);
// A 0-0 with events is real, its record is just empty — it must return a zero row rather than null.
const r4 = matchXg(f3shots);
ok(`a 0-0 with an event list exists and reads 0.00 / 0.00, not a missing read, and the values on the same fold above hand over their positive anchors`,
  r4.home === 0 && r4.away === 0 && r4.missing === 0 && r1.home === 1.1 && r1.away === 0.5);
// The fold returns null only when there is no event list to read.
ok(`no events means the null arm — the screen stays silent rather than printing invented zeros`,
  matchXg(f3nothing) === null && matchXg(match("f7", "T25", "A", "B", null, null, "2026-11-03", "SCHEDULED")) === null &&
  matchXg(f3shots) !== null);

// Seeded arm: over the whole shipped world, all the fixtures with events add up to what the xG
// table prints — the match pages and the league table cannot disagree about the event list.
const clubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const comps = SVC.footballProvider.competitions();
let matchesXgTotal = 0, matchesMissing = 0;
for (const m of world) {
  if (m.status !== "FINISHED") continue;
  const r = matchXg(m);
  if (!r) continue;
  matchesXgTotal += r.home + r.away;
  matchesMissing += r.missing;
}
let tableXgTotal = 0, tableMissing = 0;
for (const c of comps) {
  const t = xgTable(c.id, world, clubs);
  tableXgTotal += t.leagueXg;
  tableMissing += t.missingXg;
}
matchesXgTotal = Math.round(matchesXgTotal * 100) / 100;
tableXgTotal = Math.round(tableXgTotal * 100) / 100;
ok(`over the whole world the fixture-by-fixture read adds up to what the league xG table prints (matches ${matchesXgTotal}, league ${tableXgTotal}, missing ${matchesMissing}/${tableMissing})`,
  matchesXgTotal === tableXgTotal && matchesMissing === tableMissing);

// The screen is a reader: it renders the fold and the timeline appears in route.
const SCREEN_SRC = readFileSync(resolve(root, "features/football/Details.tsx"), "utf8");
ok(`the match page reads the fold and its own panel (fold call ${SCREEN_SRC.includes("matchXg(m)")}, tiles ${SCREEN_SRC.includes("det.xgSide")}, missing line ${SCREEN_SRC.includes("det.xgMissing")}, title ${SCREEN_SRC.includes("det.xgTitle")})`,
  SCREEN_SRC.includes("matchXg(m)") && SCREEN_SRC.includes("det.xgTitle") &&
  SCREEN_SRC.includes("det.xgHint") && SCREEN_SRC.includes("det.xgSide") &&
  SCREEN_SRC.includes("det.xgMissing") && SCREEN_SRC.includes("xg.missing > 0"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
