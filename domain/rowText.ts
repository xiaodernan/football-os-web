// A row's text is one of exactly two things: a dictionary key the producing module
// chose, or a value that came straight out of the record the row names.
//
// The union is the gate, not a style rule. A sentence composed in a domain module is
// English in every locale AND invisible to the raw-UI scan, which reads component
// source only — so a module that returns `string` can quietly become the app's worst
// untranslated surface, and no gate notices. Typing the row forces the producer to
// say which of the two it is, and `rowLine` is the only thing that turns one into
// words.

export type RowVars = Record<string, string | number>;

export type RowText = { key: string; vars?: RowVars } | { value: string };

export type Translate = (key: string, vars?: RowVars) => string;

/** Resolve one row's text against the reader's own dictionary — the only place the
 *  union is interpreted, so a screen cannot half-do it and print a `{key}` string.
 *  A value stored by a record is shown exactly as it was written; nothing here
 *  translates a user's own session title or coach prompt. */
export function rowLine(row: RowText | undefined, t: Translate): string | undefined {
  if (!row) return undefined;
  return "key" in row ? t(row.key, row.vars) : row.value;
}
