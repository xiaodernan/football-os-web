// A goal row stores codes and numbers; every word shown beside it is resolved here,
// where a reader asks for it. The row used to carry a `unit` label written by the
// control that created it, so the profile page printed that label verbatim — "0/500
// XP" for an onboarding goal and the raw metric code ("12/20 xp") for one the visitor
// typed, in every locale. Its `title` had the same defect one layer up, and is now a
// RowText for the same reason.
import type { Goal, GoalMetric } from "./types";
import type { RowText } from "./rowText";
import { asRowText } from "./rowText";
import { clamp, pct } from "@/lib/utils";

// Mirrors the `GoalMetric` union in ./types; proof-timeline fails if the two drift,
// because both the compiler and the dictionary have to agree on this list.
export const GOAL_METRICS: readonly GoalMetric[] = ["xp", "sessions", "level", "attribute"];

// null for a metric the app does not name: a stored row from an older build could
// carry one, and showing no unit word is honest while showing `goal.unit.foo` is not.
export function goalUnitKey(metric: string): string | null {
  return (GOAL_METRICS as readonly string[]).includes(metric) ? `goal.unit.${metric}` : null;
}

// Only the metrics a machine actually writes a counting goal for. A `level` goal is
// never created by the app, so naming a key for it here would be a key no reader
// reaches — the dictionary gate turns that red rather than letting it rot.
//
// Spelled as two row literals rather than a table of bare key strings, because the
// gate that audits these keys reads the RowText shape; a `Record` of loose strings
// would hand it nothing to check.
export type CountedGoalMetric = "xp" | "sessions";

export function countGoalTitle(metric: CountedGoalMetric, target: number): RowText {
  return metric === "xp"
    ? { key: "goal.title.earnXp", vars: { n: target } }
    : { key: "goal.title.trainSessions", vars: { n: target } };
}

// The attribute is stored as its code, never as its word: `goal.key` names it, and
// the reader looks the word up in its own locale.
export function attributeGoalTitle(attributeKey: string): RowText {
  return { key: "goal.title.attrTarget", vars: { a: attributeKey } };
}

// The one place a goal row becomes a sentence is rowLine, in ./rowText — the same
// interpreter the coach's memory rows use.
/** Rows written before titles were keyed hold a plain string; that string is the
 *  visitor's own words, so it becomes a value rather than a guess at a key. A keyed
 *  title is read with rowLine, the one interpreter every keyed row in the app shares. */
export function repairGoalTitles(goals: Goal[]): Goal[] {
  if (!goals.some((g) => typeof (g.title as unknown) === "string")) return goals;
  return goals.map((g) =>
    typeof (g.title as unknown) === "string" ? { ...g, title: asRowText(g.title) } : g,
  );
}

// A goal counts something, so zero is not a target: the completion rule
// `current >= target` would mark it finished the moment it exists, and the progress
// bar would divide by zero. The add form takes whatever its number field holds —
// `Number("")` is 0 — so the rule lives here, shared by every writer and readable by
// a proof, rather than being re-guessed at each call site.
export function isValidGoalTarget(target: number): boolean {
  return Number.isInteger(target) && target > 0;
}

// Percent complete, capped at 100. A row whose target is not a positive number — one
// stored before the add form checked, or a value parsed out of an empty field — reads
// as 0% rather than NaN, which is what the two goal lists disagreed about while each
// did the division itself.
export function goalProgressPct(goal: Goal): number {
  if (!(goal.target > 0)) return 0;
  return clamp(pct(Math.min(goal.current, goal.target) / goal.target), 0, 100);
}
