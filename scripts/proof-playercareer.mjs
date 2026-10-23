// Proof for the player-career doors (M453): the training-course tree, the injury/fitness cycle and
// the potential ceiling in domain/playerCareer.ts.
//
// The two claims that matter:
//   1. The course graph is sound — every prerequisite exists, nothing cycles, every focus is a real
//      attribute, every schedule is legal — and the checker is ARMED: a planted broken table (a
//      cycle, an unknown prerequisite, a self-edge, a bad focus) must be reported, so the empty
//      verdict on the real table is a measurement and not a blind checker.
//   2. The gain a course promises is the gain the sessions pay: `expectedGain` replays
//      `perSessionGain` session by session, and the proof replays the same replay independently and
//      pins equality — the M399 discipline (the number on the card is the number that persists),
//      applied to a projection.
// The cycle is seeded and deterministic, and the headroom is pinned to never go negative.
// Run: node scripts/proof-playercareer.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-playercareer-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const career = await server.ssrLoadModule("/domain/playerCareer.ts");
const { perSessionGain } = await server.ssrLoadModule("/domain/training.ts");
const { ATTRIBUTE_KEYS } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const {
  COURSES, INJURIES, courseByKey, courseGraphErrors, courseTier, unlockedCourses,
  expectedGain, planCourse, injuryFor, fitnessFor, attrCeiling, headroom, planWithinCeiling,
  weekIndexOf,
} = career;

// --- Plants: the graph checker must report every way a table can be broken. The domain layer
// --- answers with CODES, not sentences (its prose ceiling is zero), so the proof reads codes.
const codesOf = (errs) => errs.map((e) => e.code);
const GOOD = { key: "g", focus: "passing", weeks: 2, sessionsPerWeek: 2, intensity: 3, requires: [] };
const plantClean = courseGraphErrors([GOOD]).length;
const plantCycle = codesOf(courseGraphErrors([
  GOOD,
  { key: "a", focus: "passing", weeks: 2, sessionsPerWeek: 2, intensity: 3, requires: ["b"] },
  { key: "b", focus: "passing", weeks: 2, sessionsPerWeek: 2, intensity: 3, requires: ["a"] },
]));
const plantUnknown = codesOf(courseGraphErrors([{ ...GOOD, key: "x", requires: ["nope"] }]));
const plantSelf = codesOf(courseGraphErrors([{ ...GOOD, key: "s", requires: ["s"] }]));
const plantFocus = codesOf(courseGraphErrors([{ ...GOOD, key: "f", focus: "not_an_attribute" }]));
const plantSchedule = codesOf(courseGraphErrors([
  { ...GOOD, key: "w", weeks: 0 },
  { ...GOOD, key: "n", sessionsPerWeek: 9 },
  { ...GOOD, key: "i", intensity: 7 },
]));
const realErrors = courseGraphErrors();
ok(`the graph checker is armed on all five ways a table breaks and reads the real table clean — the domain answers with codes, not sentences (clean ${plantClean}, cycle ${plantCycle.join(",")}, unknown ${plantUnknown.join(",")}, self ${plantSelf.join(",")}, focus ${plantFocus.join(",")}, schedule ${plantSchedule.join(",")}, real ${realErrors.length})`,
  plantClean === 0 && plantCycle.length === 1 && plantCycle[0] === "cycle" &&
  plantUnknown.length === 1 && plantUnknown[0] === "unknownRequire" &&
  plantSelf.length === 2 && plantSelf.includes("selfRequire") && plantSelf.includes("cycle") &&
  plantFocus.length === 1 && plantFocus[0] === "focusNotAttribute" &&
  plantSchedule.length === 3 && plantSchedule.includes("badWeeks") && plantSchedule.includes("badSessionsPerWeek") && plantSchedule.includes("badIntensity") &&
  realErrors.length === 0);

// --- The tree's shape: tiers, roots and the unlock frontier. ------------------------------------
const tiers = Object.fromEntries(COURSES.map((c) => [c.key, courseTier(c.key)]));
const roots = COURSES.filter((c) => c.requires.length === 0).map((c) => c.key);
const frontier0 = unlockedCourses([]).map((c) => c.key);
const frontier1 = unlockedCourses(["first_touch_basics"]).map((c) => c.key);
const frontier2 = unlockedCourses(["first_touch_basics", "passing_rhythm", "dribble_craft"]).map((c) => c.key);
ok(`the tree has one root, three tiers below it, and the unlock frontier advances with the finished set (the frontier keeps finished courses — a completed course is never re-locked) (tiers ${JSON.stringify(tiers)}, roots ${roots.join(",")}, f0 ${frontier0.join(",")}, f1 ${frontier1.join(",")}, f2 ${frontier2.join(",")})`,
  roots.length === 1 && roots[0] === "first_touch_basics" &&
  tiers.first_touch_basics === 0 && tiers.passing_rhythm === 1 && tiers.finishing_school === 2 && tiers.playmaking === 2 && tiers.elite_pressing === 3 &&
  frontier0.length === 1 && frontier1.length === 3 && frontier1.includes("passing_rhythm") && frontier1.includes("dribble_craft") &&
  frontier2.includes("finishing_school") && frontier2.includes("playmaking") && !frontier2.includes("elite_pressing"));

// --- The promise is the payment: expectedGain replays perSessionGain, session by session. -------
const replay = (current, intensity, sessions) => {
  let v = current;
  for (let i = 0; i < sessions; i++) v = clampRound(v + perSessionGain(v, intensity));
  return v;
};
function clampRound(v) { return Math.min(99, Math.max(1, Math.round(v * 10) / 10)); }
const GAIN_CASES = [[62, 2, 4], [71, 3, 6], [80, 4, 8], [88, 5, 15], [50, 1, 3], [93, 5, 10]];
const gainOk = GAIN_CASES.every(([cur, inten, n]) => {
  const g = expectedGain(cur, inten, n);
  return g.to === replay(cur, inten, n) && g.gain === Math.round((g.to - g.from) * 10) / 10 && g.gain >= 0 && g.from === cur;
});
const diminishing = expectedGain(85, 4, 1).gain < expectedGain(60, 4, 1).gain;
ok(`the promise equals an independent replay of the paying function on every case, is never negative, and a single session pays less the closer the attribute is to the ceiling (cases ${GAIN_CASES.length}, per-session at 85 ${expectedGain(85, 4, 1).gain} < at 60 ${expectedGain(60, 4, 1).gain})`,
  gainOk && diminishing);

// --- planCourse: the schedule is weeks × sessionsPerWeek, and the plan stays under the ceiling
// --- the paying function itself enforces (95), not the overall potential. ----------------------
const planOk = COURSES.every((c) => {
  const p = planCourse(c.key, 66);
  return p.sessions === c.weeks * c.sessionsPerWeek && p.intensity === c.intensity &&
    p.focus === c.focus && p.gain === Math.round((p.to - p.from) * 10) / 10 &&
    planWithinCeiling(p) && planWithinCeiling(planCourse(c.key, 90));
});
const unknownPlan = planCourse("no_such_course", 66);
ok(`every course plans against a current value — sessions = weeks × sessionsPerWeek, gain consistent, and the plan never promises past the clamp the paying function enforces (unknown plan ${unknownPlan})`,
  planOk && unknownPlan === null);

// --- The cycle is deterministic under (seed, week) and has a real distribution. ----------------
const SEED = "player-42";
const sameWeek = injuryFor(SEED, 7) === injuryFor(SEED, 7);
const diffSeed = injuryFor(SEED, 7) !== injuryFor("player-43", 7) || injuryFor(SEED, 3) !== injuryFor(SEED, 7);
const weeks = Array.from({ length: 240 }, (_, w) => injuryFor(SEED, w));
const injuredWeeks = weeks.filter((i) => i !== null).length;
const rate = injuredWeeks / weeks.length;
const validInjury = weeks.filter(Boolean).every((i) => INJURIES.includes(i) && i.severity >= 1 && i.weeks >= 1);
const fitSame = fitnessFor(SEED, 5) === fitnessFor(SEED, 5);
const fitRange = Array.from({ length: 120 }, (_, w) => fitnessFor(SEED, w)).every((f) => f >= 0 && f <= 1);
const fitSpread = new Set(Array.from({ length: 120 }, (_, w) => fitnessFor(SEED, w))).size;
ok(`the cycle is deterministic under (seed, week) — the same week always answers the same, different seeds or weeks diverge — and the rate is a real cycle, not always-healthy (same ${sameWeek}, diverges ${diffSeed}, injured ${injuredWeeks}/240 = ${(rate * 100).toFixed(1)}%, valid ${validInjury}, fitness same ${fitSame}, in range ${fitRange}, distinct values ${fitSpread})`,
  sameWeek && diffSeed && rate > 0.02 && rate < 0.25 && validInjury && fitSame && fitRange && fitSpread >= 8);

// --- Headroom: the ceiling is at least every current value, and the rows are ordered. -----------
const attrs = { passing: 71, finishing: 63, sprint: 80, first_touch: 58 };
const rows = headroom(attrs, 84);
const noNegative = rows.every((r) => r.gap >= 0 && r.ceiling === 84 && r.ceiling >= r.current);
const ordered = rows.every((r, i) => i === 0 || rows[i - 1].gap >= r.gap);
const ceiling = attrCeiling(84) === 84 && attrCeiling(0) === 1 && attrCeiling(200) === 99;
ok(`headroom never goes negative (the ceiling is at least every current value), the rows are ordered by gap, and the ceiling is clamped into range (rows ${rows.length}, ordered ${ordered}, clamped ${ceiling})`,
  noNegative && ordered && ceiling && rows.length === 4);

// --- Integration: a full career week reads as the screens will show it. -------------------------
const week = 9;
const injury = injuryFor(SEED, week);
const fitness = fitnessFor(SEED, week);
const plan = planCourse("finishing_school", 63);
const out = injury ? `out: ${injury.key} (${injury.weeks}w)` : "available";
ok(`a career week reads end to end — the cycle's answer, the fitness, and the course plan's promise (week ${week}: ${out}, fitness ${fitness}, finishing_school ${plan.from}→${plan.to} over ${plan.sessions} sessions)`,
  plan.gain > 0 && fitness >= 0 && fitness <= 1 && (injury === null || INJURIES.includes(injury)));

// --- The week index is monotone in the calendar and lands on known weeks. ---------------------
const epoch = weekIndexOf("2020-01-01T00:00:00.000Z");
const later = weekIndexOf("2020-01-15T00:00:00.000Z");
const muchLater = weekIndexOf("2026-10-23T00:00:00.000Z");
const between = weekIndexOf("2020-01-08T00:00:00.000Z");
ok(`the week index is whole weeks since the career epoch — monotone, and the boundary week is the next one (epoch ${epoch}, +6d ${between}, +14d ${later}, 2026 ${muchLater})`,
  epoch === 0 && between === 1 && later === 2 && muchLater > 350 && muchLater === Math.floor((Date.parse("2026-10-23T00:00:00.000Z") - Date.UTC(2020, 0, 1)) / (7 * 24 * 3600 * 1000)));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
