// A row's text is one of exactly two things: a dictionary key the producing module
// chose, or a value that came straight out of the record the row names.
//
// The union is the gate, not a style rule. A sentence composed in a domain module is
// English in every locale AND invisible to the raw-UI scan, which reads component
// source only — so a module that returns `string` can quietly become the app's worst
// untranslated surface, and no gate notices. Typing the row forces the producer to
// say which of the two it is, and `rowLine` is the only thing that turns one into
// words.

import { ATTRIBUTE_KEYS, POSITION_GROUPS } from "./attributes";
import { MODES } from "./types";
import { isAgeGroupWord, isGoalCode } from "./onboarding";

export type RowVars = Record<string, string | number>;

export type RowText = { key: string; vars?: RowVars } | { value: string };

export type Translate = (key: string, vars?: RowVars) => string;

// The variable names the builders in this app are allowed to hold a CODE in. Matched
// by name rather than by value on purpose: a visitor's own goal text or session title
// could read "CM" or "Passing", and their words must never be re-interpreted as a
// lookup. `group` carries a PositionGroup id, `mode` a Mode, `a` and `b` one attribute
// key each (a row that compares two needs both), `focus` a comma-separated list of them,
// and `goal`/`ageGroup` an onboarding choice.
const CODE_VARS: readonly string[] = ["mode", "group", "a", "b", "focus", "goal", "ageGroup"];

function codeWord(code: string, t: Translate): string {
  // `focus` is the one variable that holds a list, so a comma-separated code list is
  // resolved part by part and rejoined the way the coach line always read.
  if (code.includes(",")) {
    return code.split(",").map((part) => codeWord(part.trim(), t)).join(" + ");
  }
  if ((ATTRIBUTE_KEYS as readonly string[]).includes(code)) return t(`attr.name.${code}`);
  if ((POSITION_GROUPS.map((g) => g.id) as readonly string[]).includes(code)) return t(`group.${code}`);
  if ((MODES as readonly string[]).includes(code)) return t(`prof.mode.${code}`);
  if (isGoalCode(code)) return t(`onb.goal.${code}`);
  if (isAgeGroupWord(code)) return t(`onb.age.${code}`);
  // An unknown code stays as written: printing `attr.name.foo` on screen would be a
  // worse lie than printing the code the record actually carried.
  return code;
}

/** The word for an onboarding choice rendered outside a row — the picker itself and the
 *  profile headers, which read profile.goal and profile.ageGroup straight off the
 *  stored profile. Both go through codeWord so this file stays the only place that
 *  composes these keys. */
export const goalLabel = (goal: string, t: Translate): string => codeWord(goal, t);
export const ageGroupLabel = (ageGroup: string, t: Translate): string => codeWord(ageGroup, t);

export function isCodeVar(name: string): boolean {
  return CODE_VARS.includes(name);
}

/** Resolve the code-holding variables in a row before the sentence is filled. */
export function fillRowVars(vars: RowVars | undefined, t: Translate): RowVars | undefined {
  if (!vars) return undefined;
  const out: RowVars = {};
  for (const [name, raw] of Object.entries(vars)) {
    out[name] = typeof raw === "string" && isCodeVar(name) ? codeWord(raw, t) : raw;
  }
  return out;
}

/** Resolve one row's text against the reader's own dictionary — the only place the
 *  union is interpreted, so a screen cannot half-do it and print a `{key}` string.
 *  A value stored by a record is shown exactly as it was written; nothing here
 *  translates a user's own session title, coach prompt or goal name. */
export function rowLine(row: RowText | undefined, t: Translate): string | undefined {
  if (!row) return undefined;
  return "key" in row ? t(row.key, fillRowVars(row.vars, t)) : row.value;
}

/** A row written before the union existed holds a plain string. Those words are the
 *  writer's, so they are kept verbatim as a value and never guessed at as a key.
 *  Called from the hydration boundary, like `sweepOverdueSessions`, so no read site
 *  has to defend itself. */
export function asRowText(text: string | RowText): RowText {
  return typeof text === "string" ? { value: text } : text;
}
