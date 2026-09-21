import type { PositionGroup, TrainingExercise, TrainingSession } from "./types";
import { ATTRIBUTE_KEYS, attributeLabel } from "./attributes";
import { makeRng, pick } from "@/lib/rng";

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
  { key: "def_1v1", label: "Defential 1v1 jockey + recover", focus: "defensive_awareness", minutes: 8, intensity: 3, phase: "decision" },
  { key: "small_sided", label: "Small-sided game — free play", focus: "game_intelligence", minutes: 14, intensity: 4, phase: "game" },
  { key: "set_piece_reps", label: "Set-piece repetition block", focus: "set_pieces", minutes: 8, intensity: 2, phase: "technique" },
  { key: "sprint_intervals", label: "Speed endurance intervals", focus: "sprint", minutes: 10, intensity: 5, phase: "game" },
  { key: "cooldown_breathe", label: "Cool-down jog + breathing + reflection", focus: "composure", minutes: 6, intensity: 1, phase: "cooldown" },
];

const PHASE_ORDER: TrainingExercise["phase"][] = ["warmup", "technique", "decision", "game", "cooldown"];

function focusDrills(focus: string): TrainingExercise[] {
  const direct = DRILLS.filter((d) => d.focus === focus);
  return direct.length ? direct : DRILLS.filter((d) => d.phase === "technique");
}

export interface BuildSessionInput {
  id: string;
  date: string;
  targetMinutes: number;
  focusAttributes: string[];
  group: PositionGroup;
  seed?: string;
}

/** Build a coherent session that fits (as closely as possible) the target minutes. */
export function buildSession(input: BuildSessionInput): TrainingSession {
  const rng = makeRng(input.seed ?? `${input.id}-${input.targetMinutes}`);
  const focus = input.focusAttributes.length ? input.focusAttributes : ["first_touch"];
  const exercises: TrainingExercise[] = [];
  const warmup = DRILLS.find((d) => d.phase === "warmup")!;
  exercises.push(warmup);
  let total = warmup.minutes;

  for (const f of focus) {
    const pool = focusDrills(f);
    const tech = pick(rng, pool);
    if (total + tech.minutes <= input.targetMinutes - 6) {
      exercises.push(tech);
      total += tech.minutes;
    }
  }
  const decision = DRILLS.find((d) => d.phase === "decision")!;
  if (total + decision.minutes <= input.targetMinutes - 5) {
    exercises.push(decision);
    total += decision.minutes;
  }
  const game = pick(rng, DRILLS.filter((d) => d.phase === "game"));
  if (total + game.minutes <= input.targetMinutes - 4) {
    exercises.push(game);
    total += game.minutes;
  }
  const cooldown = DRILLS.find((d) => d.phase === "cooldown")!;
  exercises.push(cooldown);

  return {
    id: input.id,
    date: input.date,
    title: `${focus.map(attributeLabel).join(" + ")} session`,
    focusAttributes: focus,
    exercises,
    targetMinutes: input.targetMinutes,
    status: "planned",
  };
}

export function sessionIntensity(session: TrainingSession): number {
  const load = session.exercises.reduce((s, e) => s + e.intensity * e.minutes, 0);
  const mins = session.exercises.reduce((s, e) => s + e.minutes, 0) || 1;
  return Math.max(1, Math.min(5, Math.round(load / mins)));
}

export function phaseSummary(session: TrainingSession): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PHASE_ORDER) out[p] = 0;
  for (const e of session.exercises) out[e.phase] = (out[e.phase] ?? 0) + e.minutes;
  return out;
}

export const ALL_FOCUS = ATTRIBUTE_KEYS;
