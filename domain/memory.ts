// What the coach "remembers" — the rows the Player OS memory panel lists and the
// activity timeline carries. They are PERSISTED, which is what makes their wording
// load-bearing: three reducer branches used to compose English sentences here at event
// time, so a remembered line kept the language it was written in no matter who later
// read it, and nothing in a component was ever the place the sentence was made.
//
// A memory row therefore stores codes and numbers through these builders and says its
// words at read time via rowLine. `repairMemoryTexts` handles rows stored before that
// was true: their English stays, verbatim, because it is what the app actually wrote.

import type { AiMemoryEntry } from "./types";
import type { RowText } from "./rowText";
import { asRowText } from "./rowText";

// `{goal}` is the visitor's own onboarding text and `{title}` a session name the coach
// provider produced — both are values, carried in as copy, not as codes to look up.
export function profileMemory(mode: string, group: string, goal: string): RowText {
  return { key: "mem.line.profile", vars: { mode, group, goal } };
}

export function coachMemory(focus: readonly string[], minutes: number): RowText {
  return { key: "mem.line.coach", vars: { focus: focus.join(","), minutes } };
}

export function trainingMemory(title: string, xp: number, rating: number, level: number): RowText {
  return { key: "mem.line.training", vars: { title, xp, rating, level } };
}

// A row that is already keyed is returned as the same object, and a library with
// nothing to repair is the same array: hydration runs on every load, and rebuilding
// rows that did not change would make every memory row look edited.
export function repairMemoryTexts(memory: AiMemoryEntry[]): AiMemoryEntry[] {
  if (!memory.some((m) => typeof (m.text as unknown) === "string")) return memory;
  return memory.map((m) =>
    typeof (m.text as unknown) === "string" ? { ...m, text: asRowText(m.text) } : m,
  );
}
