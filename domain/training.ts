import type { AttributeDelta, Attributes, PositionGroup, TrainingExercise, TrainingSession } from "./types";
import { asRowText, type RowText } from "./rowText";
import { makeRng, pick, rngInt } from "@/lib/rng";
import { clamp, isRealInstant } from "@/lib/utils";
import { capRound, sum, unique } from "./attributes";
import { round1 } from "./scouting";

// Training database: exercises keyed to the attributes they develop, organised by
// phase, so a session is a coherent Warm-up -> Technique -> Decision -> Game ->
// Cool-down -> Reflection structure at any supported duration.
export const SUPPORTED_MINUTES = [5, 10, 20, 30, 45, 60, 90];
const DRILLS: TrainingExercise[] = [
  { key: "dynamic_warmup", focus: "stamina", minutes: 6, intensity: 1, phase: "warmup" },
  { key: "rondo", focus: "press_resistance", minutes: 8, intensity: 3, phase: "technique" },
  { key: "first_touch_wall", focus: "first_touch", minutes: 8, intensity: 2, phase: "technique" },
  { key: "weak_foot_receiving", focus: "weak_foot", minutes: 9, intensity: 2, phase: "technique" },
  { key: "passing_lanes", focus: "passing", minutes: 8, intensity: 2, phase: "technique" },
  { key: "long_pass_targets", focus: "long_passing", minutes: 7, intensity: 2, phase: "technique" },
  { key: "dribble_weave", focus: "dribbling", minutes: 7, intensity: 3, phase: "technique" },
  { key: "finishing_pattern", focus: "finishing", minutes: 9, intensity: 3, phase: "technique" },
  { key: "shooting_box", focus: "shooting", minutes: 8, intensity: 3, phase: "technique" },
  { key: "crossing_run", focus: "crossing", minutes: 9, intensity: 3, phase: "game" },
  { key: "scanning_square", focus: "scanning", minutes: 8, intensity: 2, phase: "decision" },
  { key: "possession_game", focus: "decision_making", minutes: 12, intensity: 4, phase: "decision" },
  { key: "transition_sprint", focus: "transition_awareness", minutes: 9, intensity: 4, phase: "game" },
  { key: "def_1v1", focus: "defensive_awareness", minutes: 8, intensity: 3, phase: "decision" },
  { key: "small_sided", focus: "game_intelligence", minutes: 14, intensity: 4, phase: "game" },
  { key: "set_piece_reps", focus: "set_pieces", minutes: 8, intensity: 2, phase: "technique" },
  { key: "sprint_intervals", focus: "sprint", minutes: 10, intensity: 5, phase: "game" },
  { key: "cooldown_breathe", focus: "composure", minutes: 6, intensity: 1, phase: "cooldown" },
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
  const weightTotal = sum(weights, (w) => w) || 1;
  const raw = weights.map((w) => (total * w) / weightTotal);
  const parts = raw.map((v) => Math.floor(v));
  let rest = total - sum(parts, (p) => p);
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
  const count = capRound(budget / BLOCK_MINUTES, 1, pool.length);
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
  const wanted = unique(input.focusAttributes.length ? input.focusAttributes : ["first_touch"]);
  const target = Math.max(0, Math.floor(input.targetMinutes));

  // The bookends never eat the work in between: a 1-minute session gets its minute,
  // and the cool-down is dropped before the warm-up so the list still reads in order.
  const bookend = capRound(target * BOOKEND_SHARE, 1, BOOKEND_MAX);
  const warmupM = clamp(target - 1, 0, bookend);
  const cooldownM = clamp(target - warmupM - 1, 0, bookend);
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

  const title: RowText = trained.length
    ? { key: "trn.title.focus", vars: { attrs: trained.join(",") } }
    : { key: "trn.title.none" };

  return {
    id: input.id,
    date: input.date,
    title,
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
    if (!isRealInstant(t) || t >= startOfToday) return s;
    return { ...s, status: "missed" };
  });
}

/** Sessions stored before a title was a row hold the English sentence the builder composed
 *  at the time ("Passing + Dribbling session"). Those words are what the app actually wrote,
 *  so they are kept verbatim as a value and never re-read as a key — the same repair a goal
 *  title, a coach prompt and a remembered line get, called from the store's hydration
 *  boundary. A session already carrying a row is returned as the same object, because
 *  hydration runs on every load and rebuilding unchanged sessions would make every one of
 *  them look edited. */
export function repairSessionTitles(sessions: TrainingSession[]): TrainingSession[] {
  if (!sessions.some((s) => typeof (s.title as unknown) === "string")) return sessions;
  return sessions.map((s) =>
    typeof (s.title as unknown) === "string" ? { ...s, title: asRowText(s.title as unknown as string) } : s,
  );
}

// ---- "Completed" is decided once, and its minutes are counted once ----
// Three readers publish the same two numbers — how many sessions are done, and how many
// minutes they were budgeted for — and each decided for itself what "done" meant and summed
// for itself: the weekly review, the community starters and the profile footprint. The sum is
// byte-identical in all three, which is exactly the state M332-M340 charged elsewhere: not a
// wrong number yet, but three chances for one of them to drift. `completedSessions` is the
// filter and `completedMinutes` is the sum, so a fourth reader calls these rather than writing
// a fourth filter and a fourth reduce.

/** The sessions in `sessions` whose status is `completed`, in the order given. */
export function completedSessions(sessions: TrainingSession[]): TrainingSession[] {
  return sessions.filter((s) => s.status === "completed");
}

/** The minutes the completed sessions were budgeted for — the number the weekly review, the
 *  community starters and the profile footprint all publish. Planned and missed sessions are
 *  not counted: they were never spent. */
export function completedMinutes(sessions: TrainingSession[]): number {
  let total = 0;
  for (const s of sessions) if (s.status === "completed") total += s.targetMinutes;
  return total;
}

// ---- "Planned" is decided once, and its list is read once ----
// `buildReview` in domain/review.ts, the dashboard's "next session" and the player
// OS's training panel each reached for the same "planned"-status predicate and each
// wrote it again: a `.filter` for the planned list and a `.find` for the next one.
// Byte-identical predicate, so the same drift risk M347 retired for "completed". `plannedSessions`
// is the filter; the two `.find` sites read `plannedSessions(x)[0]`, which is exactly the first
// planned session the `.find` returned. The literal still appears once in this file — the door's
// own definition — and nowhere else a reader spells it.
/** The sessions in `sessions` whose status is `planned`, in the order given. */
export function plannedSessions(sessions: TrainingSession[]): TrainingSession[] {
  return sessions.filter((s) => s.status === "planned");
}

export function sessionIntensity(session: TrainingSession): number {
  const load = sum(session.exercises, (e) => e.intensity * e.minutes);
  const mins = sum(session.exercises, (e) => e.minutes) || 1;
  return capRound(load / mins, 1, 5);
}

// ---- Attribute growth: single source of truth ----
// The COMPLETE reducer, the development projection and the completion feedback UI
// must all agree on how a trained focus attribute rises, so the number a player
// sees is exactly the number that gets persisted. Diminishing returns toward the
// 95 ceiling, hard-capped at +2 per session so gamification never fakes a jump.

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
    const to = clamp(round1(cur + perSessionGain(cur, rating)), 1, 99);
    next[focus] = to;
    deltas.push({ key: focus, from: cur, to, delta: round1(to - cur) });
  }
  return { attributes: next, deltas };
}

