// A row's text is one of exactly two things: a dictionary key the producing module
// chose, or a value that came straight out of the record the row names.
//
// The union is the gate, not a style rule. A sentence composed in a domain module is
// English in every locale AND invisible to the raw-UI scan, which reads component
// source only — so a module that returns `string` can quietly become the app's worst
// untranslated surface, and no gate notices. Typing the row forces the producer to
// say which of the two it is, and `rowLine` is the only thing that turns one into
// words.

import { ATTRIBUTE_KEYS, CATEGORIES, POSITION_GROUPS } from "./attributes";
import { ARCHETYPE_KEYS } from "./playerDna";
import { TRAJECTORIES } from "./careerArc";
import { MODES, NEWS_KINDS, RECORD_FEELS, SEARCH_KINDS, SHOT_TYPES } from "./types";
import { isAgeGroupWord, isGoalCode } from "./onboarding";

// A variable normally holds a word or a number, but one row may also carry another whole
// row: the coach's remembered line names the session it completed, and that session's
// title is itself a keyed row (M236). Holding the title's *row* rather than its rendered
// words is what keeps a persisted memory line readable in whatever locale opens it later —
// storing the words would freeze the language at completion time, which is the defect
// ./memory exists to prevent.
export type RowVars = Record<string, string | number | RowText>;

export type RowText = { key: string; vars?: RowVars } | { value: string };

// The translate door keeps taking words only. `t` interpolates by converting to string, so
// a caller handing it a row object would print "[object Object]" — resolving a nested row is
// `fillRowVars`' job, never the dictionary's, and this signature is what makes that a type
// error rather than a rendering surprise.
export type Translate = (key: string, vars?: Record<string, string | number>) => string;

// The variable names the builders in this app are allowed to hold a CODE in. Matched
// by name rather than by value on purpose: a visitor's own goal text or session title
// could read "CM" or "Passing", and their words must never be re-interpreted as a
// lookup. `group` carries a PositionGroup id, `mode` a Mode, `a` and `b` one attribute
// key each (a row that compares two needs both), `focus` a comma-separated list of them,
// `arch` and `arch2` one archetype key each (the DNA evolution row names both ends of it),
// `kind` a retrieval entity kind, `traj` a career-arc trajectory, `cat`/`cat2` an attribute
// category (the scout headline names two), `goal`/`ageGroup` an onboarding choice, and `shot`
// the shot type the match engine scored a goal with. `drill` is one attribute key the
// game-realistic block trains, `stance` the article type a news story claims (a different
// family from `kind`, which names what a retrieval entity *is*), `foci` the film report's
// `key:count` list of recurring attributes, and `attrs`, `trained` and `last`/`new` are the
// comma-separated
// lists the coach's diagnosis and its continuity line name: before M230 the coach handed those
// rows the English *label* of each key, so a 简体中文 reader read "Ball Control, Weak Foot" inside a
// Chinese sentence, and the row contract could not put it back — the value was already a word.
const CODE_VARS: readonly string[] = ["mode", "group", "a", "b", "focus", "foci", "arch", "arch2", "kind", "stance", "feels", "traj", "cat", "cat2", "goal", "ageGroup", "shot", "drill", "attrs", "trained", "last", "new", "attr"];

function codeWord(code: string, t: Translate): string {
  // Two variables hold a LIST, and the shape of an item tells them apart. `focus` is a plain
  // comma-separated code list the coach line reads as "A + B". `foci` carries how many times
  // each attribute recurs — `passing:3,dribbling:1` — and reads as "Passing ×3, Dribbling ×1".
  // Both resolve part by part through this same function, so neither can put an English label
  // on a Chinese line, which is what `attributeLabel` did in the film report before M234.
  const parts = code.split(",").map((p) => p.trim());
  if (parts.length > 1 || /:\d+$/.test(code)) {
    if (parts.every((p) => /:\d+$/.test(p))) {
      return parts
        .map((p) => {
          const cut = p.lastIndexOf(":");
          return `${codeWord(p.slice(0, cut), t)} ×${p.slice(cut + 1)}`;
        })
        .join(", ");
    }
    return parts.map((p) => codeWord(p, t)).join(" + ");
  }
  if ((ATTRIBUTE_KEYS as readonly string[]).includes(code)) return t(`attr.name.${code}`);
  if ((POSITION_GROUPS.map((g) => g.id) as readonly string[]).includes(code)) return t(`group.${code}`);
  if ((MODES as readonly string[]).includes(code)) return t(`prof.mode.${code}`);
  if (ARCHETYPE_KEYS.includes(code)) return t(`dna.arch.${code}`);
  if ((SEARCH_KINDS as readonly string[]).includes(code)) return t(`ai.legend.${code}`);
  if ((NEWS_KINDS as readonly string[]).includes(code)) return t(`ni.kind.${code.toLowerCase()}`);
  if ((RECORD_FEELS as readonly string[]).includes(code)) return t(`comm.feels.${code}`);
  if ((TRAJECTORIES as readonly string[]).includes(code)) return t(`det.arc.${code}`);
  if ((CATEGORIES as readonly string[]).includes(code)) return t(`attr.${code}`);
  if ((SHOT_TYPES as readonly string[]).includes(code)) return t(`sim.shot.${code}`);
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

// The variable names that hold a KEY of the dictionary rather than a word: an answer's lead
// (`ai.lead.*`, chosen by the question), the coach's aim phrase, its "session shaped to your role"
// tail, and a load zone's name — built by `ZONE_LABEL`, the same door the /load banner reads. A var
// that holds a key is not a var that holds text, and printing it as written is how every Match
// Intelligence answer opened with `ai.lead.player` on screen. Resolution goes through the reader's
// column, or the English one for a provider reading; a value that is not a row at all stays exactly
// as written, the same rule an unknown code gets.
// `event` is one video-detection kind and `improvement` one of the Film Room's improvement rows:
// the film prompt names both, and a prompt is also a row a reader reads (M231).
const KEY_VARS: readonly string[] = ["lead", "target", "game", "zone", "event", "improvement"];

export function isKeyVar(name: string): boolean {
  return KEY_VARS.includes(name);
}

/** Resolve the code-holding variables in a row before the sentence is filled. A variable
 *  that carries a whole row is resolved through `rowLine` here, at the reader's column and
 *  only here, so a nested title is worded once by the screen that shows it. */
export function fillRowVars(vars: RowVars | undefined, t: Translate): Record<string, string | number> | undefined {
  if (!vars) return undefined;
  const out: Record<string, string | number> = {};
  for (const [name, raw] of Object.entries(vars)) {
    out[name] =
      typeof raw === "object" ? (rowLine(raw, t) ?? "")
        : typeof raw !== "string" ? raw
          : isCodeVar(name) ? codeWord(raw, t)
            : isKeyVar(name) ? (raw === "" ? "" : t(raw))
              : raw;
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
