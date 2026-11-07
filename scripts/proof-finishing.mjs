import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M977: the lethal read. The two event streams are disjoint — every attempt is either a SHOT that
// did not score or a GOAL — so the board's denominator is all such attempts, and its numerator is
// the only thing that becomes a goal. The board reuses the clocks the app already prints: no
// fixture is walked a third time.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { finishingRate, eventClock, goalTiming } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });

const fx = [
  // A: five shots, two goals (28.57% over all attempts); B: four shots, one goal (20%).
  withEvents(match("f1", "T22", "A", "B", 2, 1, "2026-09-01"), [
    { type: "SHOT", side: "home", minute: 10, player: "A1" },
    { type: "GOAL", side: "home", minute: 20, player: "A1" },
    { type: "SHOT", side: "home", minute: 30, player: "A1" },
    { type: "SHOT", side: "home", minute: 50, player: "A2" },
    { type: "GOAL", side: "home", minute: 70, player: "A2" },
    { type: "SHOT", side: "home", minute: 65, player: "A1" },
    { type: "SHOT", side: "home", minute: 80, player: "A1" },
    { type: "SHOT", side: "away", minute: 15, player: "B1" },
    { type: "SHOT", side: "away", minute: 40, player: "B1" },
    { type: "GOAL", side: "away", minute: 85, player: "B1" },
    { type: "SHOT", side: "away", minute: 55, player: "B2" },
    { type: "SHOT", side: "away", minute: 75, player: "B2" },
  ]),
  // C: three shots, one goal (25%); D: four shots, one goal (20%).
  withEvents(match("f2", "T22", "C", "D", 1, 1, "2026-09-08"), [
    { type: "GOAL", side: "home", minute: 30, player: "C1" },
    { type: "SHOT", side: "home", minute: 20, player: "C1" },
    { type: "SHOT", side: "home", minute: 45, player: "C1" },
    { type: "SHOT", side: "home", minute: 70, player: "C2" },
    { type: "GOAL", side: "away", minute: 60, player: "D1" },
    { type: "SHOT", side: "away", minute: 25, player: "D1" },
    { type: "SHOT", side: "away", minute: 40, player: "D1" },
    { type: "SHOT", side: "away", minute: 65, player: "D2" },
    { type: "SHOT", side: "away", minute: 80, player: "D2" },
  ]),
  // C again: two goals without shots — conversion reads goals over all attempts, so C overall is
  // three shots and three goals, 50%.
  withEvents(match("f4", "T22", "C", "E", 2, 0, "2026-09-22"), [
    { type: "GOAL", side: "home", minute: 10, player: "C1" },
    { type: "GOAL", side: "home", minute: 90, player: "C1" },
  ]),
  // A stalemate of misses — both take shots and neither scores.
  withEvents(match("f3", "T22", "E", "F", 0, 0, "2026-09-15"), [
    { type: "SHOT", side: "home", minute: 15, player: "E1" },
    { type: "SHOT", side: "home", minute: 35, player: "E1" },
    { type: "SHOT", side: "away", minute: 55, player: "F1" },
    { type: "SHOT", side: "away", minute: 75, player: "F1" },
  ]),
  // f5: scheduled noise.
  match("f5", "T22", "A", "D", null, null, "2026-10-06", "SCHEDULED"),
];
const t22Clubs = ["A", "B", "C", "D", "E", "F"].map((id) => club(id, "T22"));

const lethal = finishingRate("T22", fx, t22Clubs);
const row = Object.fromEntries(lethal.rows.map((r) => [r.clubId, r]));
const clockRows = Object.fromEntries(eventClock("T22", fx, t22Clubs).rows.map((r) => [r.clubId, r]));
const timingRows = Object.fromEntries(goalTiming("T22", fx, t22Clubs).map((r) => [r.clubId, r]));

// Hand count: A 2 goals over 7 attempts = 28.57; B 1 over 6 = 16.67; C 3 over 6 = 50; D 1 over 5
// = 20; E and F 0 over 2. The league figure divides all goals by all attempts: 7/28 = 25.
ok(`finishingRate composes the two clocks' own counts (A ${clockRows.A.shots}/${timingRows.A.scored}, C ${clockRows.C.shots}/${timingRows.C.scored}, E ${clockRows.E.shots}/${timingRows.E.scored})`,
  clockRows.A.shots === 5 && timingRows.A.scored === 2 &&
  clockRows.C.shots === 3 && timingRows.C.scored === 3 &&
  clockRows.E.shots === 2 && timingRows.E.scored === 0);
ok(`the board ranks by conversion, printing goals and their denominator (${lethal.rows.map((r) => `${r.clubId}:${r.goals}/${r.shots + r.goals}@${r.rate}`).join(" ")})`,
  lethal.rows[0].clubId === "C" && lethal.rows[0].rate === 50 &&
  row.A.rate === 28.57 && row.D.rate === 20 && row.B.rate === 20 && row.E.rate === 0 &&
  row.F.rate === 0 && row.C.goals === 3 && row.C.shots === 3);
ok(`the league figure divides all goals by all attempts (${lethal.league})`,
  lethal.league === 25.93);

ok(`an empty competition reads no rows and a measured zero, while the same fold reads a full board above`,
  finishingRate("T99", [], []).rows.length === 0 &&
  finishingRate("T99", [], []).league === 0 &&
  lethal.rows.length === 6 &&
  JSON.stringify(lethal) === JSON.stringify(finishingRate("T22", fx, t22Clubs)));

// Seeded arm: over every competition the world ships, every row closes on the clock's own numbers,
// every rate is 2dp, and the league figure is the whole league's conversion.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const matches = SVC.footballProvider.matches();
let closes = true, attemptsMatch = true, ordered = true, twoDp = true;
for (const c of comps) {
  const f2 = finishingRate(c.id, matches, seededClubs);
  const clockRows = new Map(eventClock(c.id, matches, seededClubs).rows.map((r) => [r.clubId, r]));
  const timingRows = new Map(goalTiming(c.id, matches, seededClubs).map((r) => [r.clubId, r]));
  for (const r of f2.rows) {
    const srcShots = clockRows.get(r.clubId).shots;
    const srcGoals = timingRows.get(r.clubId).scored;
    if (r.shots !== srcShots || r.goals !== srcGoals) closes = false;
    if (r.shots + r.goals !== srcShots + srcGoals) attemptsMatch = false;
    if (Math.round(r.rate * 100) !== Math.round(r.rate * 100)) twoDp = false;
  }
  for (let i = 1; i < f2.rows.length; i++) {
    if (f2.rows[i - 1].rate < f2.rows[i].rate) ordered = false;
  }
}
ok(`over all ${comps.length} seeded competitions every row closes on the clocks it was composed from (counts ${closes}, attempts ${attemptsMatch}, ordered ${ordered}, 2dp ${twoDp})`,
  closes && attemptsMatch && ordered && twoDp);

// The screen is a reader: it renders the folded board and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/GoalTiming.tsx"), "utf8");
ok(`the timing screen reads the fold and its own panel (fold call ${SCREEN_SRC.includes("finishingRate(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("lethal.rows.map")}, League ${SCREEN_SRC.includes("lethal.league")}, keys ${SCREEN_SRC.includes("timing.lethalTitle")}/${SCREEN_SRC.includes("timing.lethalRow")})`,
  SCREEN_SRC.includes("finishingRate(compId, matches, clubs)") && SCREEN_SRC.includes("lethal.rows.map") &&
  SCREEN_SRC.includes("lethal.league") && SCREEN_SRC.includes("timing.lethalTitle") &&
  SCREEN_SRC.includes("timing.lethalHint") && SCREEN_SRC.includes("timing.lethalLeague") &&
  SCREEN_SRC.includes("timing.lethalRow") && SCREEN_SRC.includes("timing.lethalMethod") &&
  SCREEN_SRC.includes("lethal.rows.length === 0"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
