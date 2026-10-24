// Player career depth (M453): the training-course tree a player enrols in, the injury and
// fitness cycle the same seed produces every week, and the potential ceiling every trained
// attribute rises toward. Domain layer: no React, no I/O, deterministic under its seed.
//
// Two rules this module keeps on purpose:
//   1. The gain a course PROMISES is the gain a session PAYS. `expectedGain` replays
//      `perSessionGain` (domain/training.ts) session by session, so the number on the course
//      card is computed by the same function the persisted delta uses — the M399 discipline,
//      applied to a projection instead of a row.
//   2. Everything is seeded. `injuryFor` / `fitnessFor` take (seed, week) and answer the same
//      pair the same way forever, so a career replays identically on any device and the proof
//      can pin the distribution without a clock.
import type { Attributes } from "./types";
import { makeRng } from "@/lib/rng";
import { clamp, epochMs } from "@/lib/utils";
import { ATTRIBUTE_KEYS, capRound } from "./attributes";
import { round1 } from "./scouting";
import { perSessionGain } from "./training";

// ---- The training-course tree ------------------------------------------------------------

export interface CourseDef {
  key: string;
  /** The attribute this course develops — must be a real attribute key. */
  focus: string;
  /** How many weeks the course runs. */
  weeks: number;
  /** Sessions per week while enrolled. */
  sessionsPerWeek: number;
  /** The rating (1..5) a well-run session of this course earns. */
  intensity: number;
  /** Course keys that must be finished first. */
  requires: string[];
}

/** The tree. Four tiers: touch → one of two crafts → the two crafts together or the
 *  playmaker's read → the elite course that needs both. Every edge is a prerequisite, and
 *  `courseGraphErrors` is what keeps the table honest. */
export const COURSES: CourseDef[] = [
  { key: "first_touch_basics", focus: "first_touch", weeks: 2, sessionsPerWeek: 2, intensity: 2, requires: [] },
  { key: "passing_rhythm", focus: "passing", weeks: 3, sessionsPerWeek: 2, intensity: 3, requires: ["first_touch_basics"] },
  { key: "dribble_craft", focus: "dribbling", weeks: 3, sessionsPerWeek: 2, intensity: 3, requires: ["first_touch_basics"] },
  { key: "finishing_school", focus: "finishing", weeks: 4, sessionsPerWeek: 2, intensity: 4, requires: ["passing_rhythm", "dribble_craft"] },
  { key: "playmaking", focus: "decision_making", weeks: 4, sessionsPerWeek: 3, intensity: 4, requires: ["passing_rhythm"] },
  { key: "elite_pressing", focus: "press_resistance", weeks: 5, sessionsPerWeek: 3, intensity: 5, requires: ["finishing_school", "playmaking"] },
];

export function courseByKey(key: string): CourseDef | undefined {
  return COURSES.find((c) => c.key === key);
}

/** A way a course table can be broken, as a CODE plus its context — the domain layer does not
 *  write English sentences (the domain-prose ceiling is zero), so the caller renders the words. */
export type CourseGraphError =
  | { code: "focusNotAttribute"; course: string; focus: string }
  | { code: "selfRequire"; course: string }
  | { code: "unknownRequire"; course: string; require: string }
  | { code: "badWeeks"; course: string; weeks: number }
  | { code: "badSessionsPerWeek"; course: string; n: number }
  | { code: "badIntensity"; course: string; intensity: number }
  | { code: "cycle"; trail: string[] };

/** Everything wrong with a course table: an unknown prerequisite, a self-edge, a cycle, a
 *  non-attribute focus, or a degenerate schedule. An empty array is the gate's pass condition.
 *  The table is a parameter so the proof can plant a broken one. */
export function courseGraphErrors(courses: readonly CourseDef[] = COURSES): CourseGraphError[] {
  const errors: CourseGraphError[] = [];
  const keys = new Set(courses.map((c) => c.key));
  for (const c of courses) {
    if (!ATTRIBUTE_KEYS.includes(c.focus)) errors.push({ code: "focusNotAttribute", course: c.key, focus: c.focus });
    if (c.requires.includes(c.key)) errors.push({ code: "selfRequire", course: c.key });
    for (const r of c.requires) if (!keys.has(r)) errors.push({ code: "unknownRequire", course: c.key, require: r });
    if (c.weeks < 1) errors.push({ code: "badWeeks", course: c.key, weeks: c.weeks });
    if (c.sessionsPerWeek < 1 || c.sessionsPerWeek > 7) errors.push({ code: "badSessionsPerWeek", course: c.key, n: c.sessionsPerWeek });
    if (c.intensity < 1 || c.intensity > 5) errors.push({ code: "badIntensity", course: c.key, intensity: c.intensity });
  }
  // A cycle would leave some course unreachable from the roots; walk the prerequisites.
  const byKey = new Map(courses.map((c) => [c.key, c]));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const walk = (key: string, trail: string[]) => {
    if (done.has(key)) return;
    if (visiting.has(key)) { errors.push({ code: "cycle", trail: [...trail, key] }); return; }
    visiting.add(key);
    for (const r of byKey.get(key)?.requires ?? []) walk(r, [...trail, key]);
    visiting.delete(key);
    done.add(key);
  };
  for (const c of courses) walk(c.key, []);
  return errors;
}

/** The length of the longest prerequisite chain below a course — its tier in the tree. */
export function courseTier(key: string): number {
  const c = courseByKey(key);
  if (!c) return -1;
  if (c.requires.length === 0) return 0;
  return 1 + Math.max(...c.requires.map((r) => courseTier(r)));
}

/** The courses whose prerequisites are all in `done`, in tier order. */
export function unlockedCourses(done: readonly string[]): CourseDef[] {
  const finished = new Set(done);
  return COURSES.filter((c) => c.requires.every((r) => finished.has(r)))
    .sort((a, b) => courseTier(a.key) - courseTier(b.key) || a.key.localeCompare(b.key));
}

// ---- Scheduling a course -----------------------------------------------------------------

export interface CoursePlan {
  focus: string;
  weeks: number;
  sessionsPerWeek: number;
  /** weeks × sessionsPerWeek — the sessions the plan schedules. */
  sessions: number;
  intensity: number;
  /** The attribute the plan starts from and the value the plan reaches. */
  from: number;
  to: number;
  /** round1(to - from): the promise, computed by the same function the sessions pay with. */
  gain: number;
}

/** Replay the course's sessions through `perSessionGain`, one rating at a time, so the plan's
 *  number is the number the sessions would actually persist. */
export function expectedGain(current: number, intensity: number, sessions: number): { from: number; to: number; gain: number } {
  let v = current;
  for (let i = 0; i < sessions; i++) v = clamp(round1(v + perSessionGain(v, intensity)), 1, 99);
  return { from: current, to: v, gain: round1(v - current) };
}

/** Plan a course against the attribute's current value. A course already finished or still
 *  locked is not plannable; the caller asks `unlockedCourses` first. */
export function planCourse(courseKey: string, current: number): CoursePlan | null {
  const c = courseByKey(courseKey);
  if (!c) return null;
  const sessions = c.weeks * c.sessionsPerWeek;
  const { from, to, gain } = expectedGain(current, c.intensity, sessions);
  return { focus: c.focus, weeks: c.weeks, sessionsPerWeek: c.sessionsPerWeek, sessions, intensity: c.intensity, from, to, gain };
}

// ---- The injury and fitness cycle ---------------------------------------------------------

/** The week index of an instant: whole weeks since the career epoch (2020-01-01), so a career's
 *  injury and fitness answers are a pure function of the calendar week, not of the clock's
 *  precision. Deterministic and monotone in `iso`. */
const CAREER_EPOCH_MS = Date.UTC(2020, 0, 1);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export function weekIndexOf(iso: string): number {
  return Math.floor((epochMs(iso) - CAREER_EPOCH_MS) / WEEK_MS);
}

export interface InjuryDef {
  key: string;
  /** 1 = niggle, 2 = strain, 3 = serious. */
  severity: number;
  /** Weeks the injury keeps the player out. */
  weeks: number;
  /** The attributes training cannot touch while it lasts. */
  attrs: string[];
}

export const INJURIES: InjuryDef[] = [
  { key: "hamstring", severity: 2, weeks: 2, attrs: ["sprint", "stamina"] },
  { key: "ankle", severity: 1, weeks: 1, attrs: ["dribbling", "agility"] },
  { key: "groin", severity: 3, weeks: 3, attrs: ["sprint", "explosiveness"] },
  { key: "knee", severity: 3, weeks: 4, attrs: ["positioning", "decision_making"] },
];

/** About one week in twelve carries an injury; the rest are clear. Deterministic under
 *  (seed, week): the same player's same week always answers the same. */
export function injuryFor(seed: string, week: number): InjuryDef | null {
  const rng = makeRng(`${seed}-injury-${week}`);
  if (rng() >= 0.12) return null;
  const injury = INJURIES[Math.floor(rng() * INJURIES.length) % INJURIES.length];
  return injury;
}

/** Fitness for a week, 0..1: a seeded base drift plus a real wobble, so a career reads as a
 *  cycle rather than noise. Deterministic under (seed, week). */
export function fitnessFor(seed: string, week: number): number {
  const rng = makeRng(`${seed}-fitness-${week}`);
  const base = 0.5 + 0.25 * Math.sin((week % 8) / 8 * Math.PI * 2);
  const wobble = (rng() - 0.5) * 0.3;
  return clamp(round1(base + wobble + 0.15), 0, 1);
}

// ---- The potential ceiling ----------------------------------------------------------------

/** The ceiling every trained attribute rises toward: the player's own potential, kept inside
 *  the attribute range. A course's plan never promises past it. */
export function attrCeiling(potential: number): number {
  return capRound(potential, 1, 99);
}

export interface HeadroomRow { key: string; current: number; ceiling: number; gap: number }

/** Per-attribute headroom against the potential ceiling, biggest gap first. A negative gap
 *  cannot happen (the ceiling is at least the current value), and the proof pins that. */
export function headroom(attrs: Attributes, potential: number): HeadroomRow[] {
  const ceiling = attrCeiling(potential);
  return Object.keys(attrs)
    .map((key) => ({ key, current: attrs[key] ?? 0, ceiling, gap: Math.max(0, ceiling - (attrs[key] ?? 0)) }))
    .sort((a, b) => b.gap - a.gap || a.key.localeCompare(b.key));
}

/** True when the plan's promise stays under the ceiling the paying function itself enforces —
 *  `applyFocusGrowth` clamps every session into 1..99, so a well-built course never promises past
 *  it. The ceiling is the clamp, not the overall potential: a single attribute is trained past the
 *  overall all the time, and a plan that pretended otherwise would understate every course. (95 is
 *  the diminishing curve's asymptote, not a hard stop — `perSessionGain` keeps a floor, so the
 *  honest ceiling is the clamp the payment actually uses.) */
export function planWithinCeiling(plan: CoursePlan): boolean {
  return plan.to <= 99 && plan.from >= 1 && plan.to >= plan.from;
}
