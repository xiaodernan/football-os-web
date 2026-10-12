import type { RowText } from "./rowText";
import type { PlayerRef, PositionGroup } from "./types";
import { round1 } from "./scouting";
import { clamp } from "@/lib/utils";

// Career arc: how a squad player's level is expected to move with age.
//
// Only fields the dataset really provides are used — age, overall, potential and
// position group — and the result is a labelled model, never a claim about a
// named player's future. The shape is the football one everyone recognises:
// rise that flattens as the ceiling approaches, a peak that arrives earlier for
// explosive positions than for goalkeepers, then accelerating decline.

export type ArcPhase = "rise" | "peak" | "decline";

export interface ArcPoint {
  age: number;
  overall: number;
  phase: ArcPhase;
}

export type Trajectory = "rising" | "peak" | "declining";
/** The three shapes an arc can be in, as codes: `det.arc.*` holds the words, so a row that
 *  names a trajectory interpolates one of these instead of an English word. */
export const TRAJECTORIES: readonly Trajectory[] = ["rising", "peak", "declining"];

export interface CareerArc {
  playerId: string;
  name: string;
  positionGroup: PositionGroup;
  age: number;
  current: number;
  potential: number;
  peakAge: number;
  projectedPeak: number;
  yearsToPeak: number;
  declineFromAge: number;
  remainingPrimeYears: number;
  trajectory: Trajectory;
  points: ArcPoint[]; // current age → last modelled season
  evidence: RowText[];
  confidence: number; // 0..100
  sources: RowText[];
  hasData: boolean;
}

const PEAK_AGE: Record<PositionGroup, number> = {
  GK: 31,
  CB: 29,
  FB: 28,
  DM: 28,
  CM: 29,
  AM: 27,
  W: 26,
  ST: 28,
};

/** Last season still modelled — no one's curve is credible beyond that. */
const LAST_AGE = 38;

/**
 * Year-on-year change. Before the peak the gain is a share of the remaining
 * headroom, and that share shrinks as the player approaches peak age — so a
 * 19-year-old with a high ceiling moves fast and a 26-year-old near his ceiling
 * barely moves. After the peak losses grow with each year past it.
 */
export function annualChange(input: { age: number; overall: number; potential: number; peakAge: number }): number {
  const { age, overall, potential, peakAge } = input;
  if (age < peakAge) {
    const youth = clamp((peakAge - age) / (peakAge - 17), 0, 1);
    const share = 0.08 + 0.34 * youth; // 8% of headroom near the peak, 42% at 17
    const headroom = Math.max(0, potential - overall);
    return round1(headroom * share);
  }
  const past = age - peakAge;
  return -round1(clamp(0.4 + past * 0.4, 0.4, 4));
}

export function careerArc(p: PlayerRef): CareerArc {
  const group = p.positionGroup as PositionGroup;
  const peakAge = PEAK_AGE[group] ?? 28;
  const startAge = clamp(Math.round(p.age), 15, LAST_AGE);
  const current = p.overall;
  const potential = Math.max(p.potential, current); // potential below overall is treated as already realised

  const points: ArcPoint[] = [];
  let overall = current;
  let projPeak = current;
  for (let age = startAge; age <= LAST_AGE; age++) {
    const phase: ArcPhase = age < peakAge ? "rise" : age <= peakAge + 1 ? "peak" : "decline";
    points.push({ age, overall: round1(overall), phase });
    projPeak = Math.max(projPeak, overall);
    overall = clamp(overall + annualChange({ age, overall, potential, peakAge }), 35, 99);
  }

  const peakPoint = points.reduce((best, pt) => (pt.overall > best.overall ? pt : best), points[0]);
  const yearsToPeak = Math.max(0, peakPoint.age - startAge);
  const declineFromAge = points.find((pt) => pt.phase === "decline")?.age ?? LAST_AGE;
  const remainingPrimeYears = Math.max(0, Math.min(LAST_AGE, peakAge + 2) - startAge);
  const trajectory: Trajectory =
    yearsToPeak > 0 && peakPoint.overall > current + 0.4 ? "rising" : declineFromAge <= startAge + 1 ? "declining" : "peak";

  // Rows: two of these lines carry a countable, so those are One/Many pairs, and the
  // decline line phrases its second figure as a label and value rather than needing a
  // fourth arm of the key matrix.
  const evidence: RowText[] = [
    { key: "arc.ev.peak", vars: { group, peakAge, age: startAge } },
    potential > current
      ? { key: "arc.ev.headroom", vars: { current, potential: p.potential, gap: round1(potential - current) } }
      : { key: "arc.ev.ceiling", vars: { current, potential: p.potential } },
    yearsToPeak === 1
      ? { key: "arc.ev.modelledOne", vars: { peak: round1(projPeak), age: peakPoint.age } }
      : { key: "arc.ev.modelledMany", vars: { n: yearsToPeak, peak: round1(projPeak), age: peakPoint.age } },
    { key: "arc.ev.decline", vars: { age: declineFromAge, m: remainingPrimeYears } },
  ];

  // Younger players with real headroom are the easiest call; very late-career
  // arcs are also stable because there is little left to move. The middle, and
  // any player outside a normal age band, is where the model is weakest.
  let confidence = 55;
  if (startAge <= 23 && potential > current) confidence += 20;
  if (startAge >= 33) confidence += 10;
  if (potential <= current) confidence -= 8;
  if (startAge < 17 || startAge > 37) confidence -= 20;

  return {
    playerId: p.id,
    name: p.name,
    positionGroup: group,
    age: startAge,
    current,
    potential: p.potential,
    peakAge,
    projectedPeak: round1(projPeak),
    yearsToPeak,
    declineFromAge,
    remainingPrimeYears,
    trajectory,
    points,
    evidence,
    confidence: clamp(confidence, 20, 85),
    sources: [{ key: "arc.src.dataset" }, { key: "arc.src.model" }],
    hasData: current > 0 && p.age > 0,
  };
}
