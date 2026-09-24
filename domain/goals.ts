// A goal row stores codes and numbers; every word shown beside it is resolved here,
// where a reader asks for it. The row used to carry a `unit` label written by the
// control that created it, so the profile page printed that label verbatim — "0/500
// XP" for an onboarding goal and the raw metric code ("12/20 xp") for one the visitor
// typed, in every locale.
import type { GoalMetric } from "./types";

// Mirrors the `GoalMetric` union in ./types; proof-timeline fails if the two drift,
// because both the compiler and the dictionary have to agree on this list.
export const GOAL_METRICS: readonly GoalMetric[] = ["xp", "sessions", "level", "attribute"];

// null for a metric the app does not name: a stored row from an older build could
// carry one, and showing no unit word is honest while showing `goal.unit.foo` is not.
export function goalUnitKey(metric: string): string | null {
  return (GOAL_METRICS as readonly string[]).includes(metric) ? `goal.unit.${metric}` : null;
}
