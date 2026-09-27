import type { AttributeDelta, Attributes, PositionGroup, TrainingExercise, TrainingSession } from "./types";
import { attributeLabel } from "./attributes";
import { makeRng, pick, rngInt } from "@/lib/rng";

// Training database: exercises keyed to the attributes they develop, organised by
// phase, so a session is a coherent Warm-up -> Technique -> Decision -> Game ->
// Cool-down -> Reflection structure at any supported duration.
export const SUPPORTED_MINUTES = [5, 10, 20, 30, 45, 60, 90];
const DRILLS: TrainingExercise[] = [
  { key: "dynamic_warmup", label: "Dynamic mobility + activation", focus: "stamina", minutes: 6, intensity: 1, phase: "warmup" },
  { key: "rondo", label: "Rondo press-resistance (3v1)", focus: "press_resistance", minutes: 8, intensity: 3, phase: "technique" },
  { key: "first_touch_wall", label: "Wall rebounds — oriented first touch", focus: "first_touch", minutes: 8, intensity: 2, phase: "technique" },
  { key: "weak_foot_receiving", label: "Weak-foot receiving circuits", focus: "weak_foot", minutes: 9, intensity: 2, phase: "technique" },
  { key: "passing_lanes", label: "Two-touch passing lanes", focus: "passing", minutes: 8, intensity: 2, phase: "technique" },
  { key: "long_pass_targets", label: "Switch-of-play long passing", focus: "long_passing", minutes: 7, intensity: 2, phase: "technique" },
  { key: "dribble_weave", label: "Close-control weave + body feints", focus: "dribbling", minutes: 7, intensity: 3, phase: "technique" },
  { key: "finishing_pattern", label: "Cut-back finishing pattern", focus: "finishing", minutes: 9, intensity: 3, phase: "technique" },
  { key: "shooting_box", label: "Box strikes under fatigue", focus: "shooting", minutes: 8, intensity: 3, phase: "technique" },
  { key: "crossing_run", label: "Overlapping cross + finish", focus: "crossing", minutes: 9, intensity: 3, phase: "game" },
  { key: "scanning_square", label: "Head-check grid (scanning)", focus: "scanning", minutes: 8, intensity: 2, phase: "decision" },
  { key: "possession_game", label: "Positional possession 4v4+3", focus: "decision_making", minutes: 12, intensity: 4, phase: "decision" },
  { key: "transition_sprint", label: "Transition sprints + recovery shape", focus: "transition_awareness", minutes: 9, intensity: 4, phase: "game" },
  { key: "def_1v1", label: "Defensive 1v1 jockey + recover", focus: "defensive_awareness", minutes: 8, intensity: 3, phase: "decision" },
  { key: "small_sided", label: "Small-sided game — free play", focus: "game_intelligence", minutes: 14, intensity: 4, phase: "game" },
  { key: "set_piece_reps", label: "Set-piece repetition block", focus: "set_pieces", minutes: 8, intensity: 2, phase: "technique" },
  { key: "sprint_intervals", label: "Speed endurance intervals", focus: "sprint", minutes: 10, intensity: 5, phase: "game" },
  { key: "cooldown_breathe", label: "Cool-down jog + breathing + reflection", focus: "composure", minutes: 6, intensity: 1, phase: "cooldown" },
];

function focusDrills(focus: string): TrainingExercise[] {
  const direct = DRILLS.filter((d) => d.focus === focus);
  return direct.length ? direct : DRILLS.filter((d) => d.phase === "technique");
}

const byPhase = (phase: TrainingExercise["phase"]): TrainingExercise[] =>
  DRILLS.filter((d) => d.phase === phase);

// ---- How a target budget is spent ----
// buildSession used to append whole drills while one still "fit", so a 5-minute
// session cost 12 and a 90-minute session cost 35-43: the number the player picked,
// the XP paid for and the weekly review counted were all different quantities. Now
// the budget is allocated, not consumed: every minute of `targetMinutes` is spent,
// and the phase list shrinks when the money runs out.
const BOOKEND_SHARE = 0.1; // warm-up and cool-down take a tenth of the session each…
const BOOKEND_MAX = 6; // …so a 90-minute session still cools down for 6, not 9.
const PHASE_MINUTES = 4; // a decision/game block shorter than this is not that drill;
const BLOCK_MINUTES = 7; // and a block of ~7 minutes is what one drill is worth.
const PHASE_WEIGHTS = [5, 2, 3]; // Technique / Decision / Game, over what is left.

/** Split `total` whole minutes over `weights` so the parts sum exactly to `total`. */
function splitMinutes(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const parts = raw.map((v) => Math.floor(v));
  let rest = total - parts.reduce((s, p) => s + p, 0);
  const byRemainder = raw
    .map((v, i) => i)
    .sort((a, b) => raw[b] - parts[b] - (raw[a] - parts[a]) || a - b);
  for (const i of byRemainder) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}

/** Same entries, starting at a seeded position so repeat sessions differ. */
function rotate<T>(rng: () => number, pool: readonly T[]): T[] {
  if (pool.length < 2) return pool.slice();
  const start = rngInt(rng, 0, pool.length - 1);
  return [...pool.slice(start), ...pool.slice(0, start)];
}

/** Spend exactly `budget` minutes on the front of an already-ordered drill pool. */
function phaseBlock(pool: TrainingExercise[], budget: number): TrainingExercise[] {
  if (budget <= 0 || pool.length === 0) return [];
  const count = Math.max(1, Math.min(pool.length, Math.round(budget / BLOCK_MINUTES)));
  const chosen = pool.slice(0, count);
  const minutes = splitMinutes(budget, chosen.map((d) => d.minutes));
  return chosen.map((d, i) => ({ ...d, minutes: minutes[i] }));
}

export interface BuildSessionInput {
  id: string;
  date: string;
  targetMinutes: number;
  focusAttributes: string[];
  group: PositionGroup;
  seed?: string;
  roleGameFocus?: string; // DNA signature; steers the game-realistic block to the role
}

/** Build a session whose exercises sum to exactly `targetMinutes` (rounded down, at
 *  least 1), keeping the Warm-up → Technique → Decision → Game → Cool-down order. */
export function buildSession(input: BuildSessionInput): TrainingSession {
  const rng = makeRng(input.seed ?? `${input.id}-${input.targetMinutes}`);
  const wanted = [...new Set(input.focusAttributes.length ? input.focusAttributes : ["first_touch"])];
  const target = Math.max(0, Math.floor(input.targetMinutes));

  // The bookends never eat the work in between: a 1-minute session gets its minute,
  // and the cool-down is dropped before the warm-up so the list still reads in order.
  const bookend = Math.min(BOOKEND_MAX, Math.max(1, Math.round(target * BOOKEND_SHARE)));
  const warmupM = Math.min(bookend, Math.max(0, target - 1));
  const cooldownM = Math.min(bookend, Math.max(0, target - warmupM - 1));
  const phaseM = splitMinutes(target - warmupM - cooldownM, PHASE_WEIGHTS);
  for (const i of [1, 2]) {
    if (phaseM[i] > 0 && phaseM[i] < PHASE_MINUTES) {
      phaseM[0] += phaseM[i];
      phaseM[i] = 0;
    }
  }

  // Technique leads with one drill per requested focus, in the order asked, so a
  // budget too small for all of them drops the later ones instead of training none.
  const leads: TrainingExercise[] = [];
  const leadFor = new Map<string, string>();
  for (const key of wanted) {
    const drill = pick(rng, focusDrills(key));
    leadFor.set(key, drill.key);
    if (!leads.some((d) => d.key === drill.key)) leads.push(drill);
  }
  const filler = byPhase("technique").filter((d) => !leads.some((l) => l.key === d.key));
  const role = input.roleGameFocus ? byPhase("game").filter((d) => d.focus === input.roleGameFocus) : [];
  const gameRest = byPhase("game").filter((d) => !role.some((r) => r.key === d.key));

  const exercises: TrainingExercise[] = [
    ...phaseBlock(byPhase("warmup"), warmupM),
    ...phaseBlock([...leads, ...rotate(rng, filler)], phaseM[0]),
    ...phaseBlock(rotate(rng, byPhase("decision")), phaseM[1]),
    ...phaseBlock([...role, ...rotate(rng, gameRest)], phaseM[2]),
    ...phaseBlock(byPhase("cooldown"), cooldownM),
  ];
  // What the session actually trains, so the growth the player is credited for
  // belongs to a block that exists.
  const trained = wanted.filter((key) => exercises.some((e) => e.key === leadFor.get(key)));

  return {
    id: input.id,
    date: input.date,
    title: `${trained.map(attributeLabel).join(" + ")} session`,
    focusAttributes: trained,
    exercises,
    targetMinutes: target,
    status: "planned",
  };
}

/** Flip planned sessions whose scheduled day has fully passed into `missed`.
 *  A session dated before the start of `nowMs`'s local day can no longer be done
 *  as planned, and the weekly review only reports missed sessions if some path
 *  actually produces that status — otherwise the count is permanently zero. */
export function sweepOverdueSessions(sessions: TrainingSession[], nowMs: number = Date.now()): TrainingSession[] {
  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return sessions.map((s) => {
    if (s.status !== "planned") return s;
    const t = new Date(s.date).getTime();
    if (Number.isNaN(t) || t >= startOfToday) return s;
    return { ...s, status: "missed" };
  });
}

export function sessionIntensity(session: TrainingSession): number {
  const load = session.exercises.reduce((s, e) => s + e.intensity * e.minutes, 0);
  const mins = session.exercises.reduce((s, e) => s + e.minutes, 0) || 1;
  return Math.max(1, Math.min(5, Math.round(load / mins)));
}

// ---- Attribute growth: single source of truth ----
// The COMPLETE reducer, the development projection and the completion feedback UI
// must all agree on how a trained focus attribute rises, so the number a player
// sees is exactly the number that gets persisted. Diminishing returns toward the
// 95 ceiling, hard-capped at +2 per session so gamification never fakes a jump.

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Gain a single focus attribute earns from one session rated `rating` (1..5). */
export function perSessionGain(current: number, rating: number): number {
  const room = (95 - current) / 45;
  return clamp(rating * 0.5 * Math.max(0.15, room), 0, 2);
}

export type GrowthDelta = AttributeDelta;

/** Apply one session's growth to every trained focus, returning new attributes
 *  plus the per-attribute deltas actually applied. */
export function applyFocusGrowth(
  attributes: Attributes,
  focusKeys: string[],
  rating: number,
): { attributes: Attributes; deltas: GrowthDelta[] } {
  const next: Attributes = { ...attributes };
  const deltas: GrowthDelta[] = [];
  for (const focus of focusKeys) {
    const cur = next[focus] ?? 50;
    const to = clamp(Math.round((cur + perSessionGain(cur, rating)) * 10) / 10, 1, 99);
    next[focus] = to;
    deltas.push({ key: focus, from: cur, to, delta: Math.round((to - cur) * 10) / 10 });
  }
  return { attributes: next, deltas };
}

