// The choices onboarding offers, as codes.
//
// These lists used to be arrays of display sentences living in the component, and two of
// the fields they fill — profile.goal and profile.ageGroup — are PERSISTED and then read
// again on the profile header, the Player OS header and the coach's remembered line. So an
// English choice made during setup kept appearing in English to a reader who later switched
// to Chinese: the same defect M149–M152 removed from the rows that display these values,
// one layer down at the values themselves.
//
// The word for a code is composed in exactly one place — domain/rowText.ts, which already
// resolves attribute, group and mode codes the same way — and proof-i18n's domain-space
// check holds that template, the code tables here and the unions in ./types together.

import type { AgeGroupWord, OnboardingGoalCode } from "./types";
// The reverse lookup lives in `data/`, not here: its keys are old stored profile text that is
// never displayed, so it is a table of records rather than the model's own voice — and the
// prose audit counts sentences in `domain/`, which is what kept this module out of
// `PROSE_ZERO`. The module still owns the behaviour (`toGoalCode`, `normalizeGoalChoice`);
// only the words moved.
import { LEGACY_GOAL_TEXT } from "@/data/onboardingLegacy";

export const AGE_GROUPS = ["U15", "U17", "U19", "Amateur", "Semi-pro", "Pro", "Veteran"] as const;

export const TRANSLATED_AGE_GROUPS: readonly AgeGroupWord[] = ["Amateur", "Semi-pro", "Pro", "Veteran"];

export const GOAL_CODES: readonly OnboardingGoalCode[] = [
  "firstTouch",
  "getFaster",
  "finishBetter",
  "playSmarter",
  "holdUpPlay",
  "twoFooted",
];

export function isGoalCode(value: string): value is OnboardingGoalCode {
  return (GOAL_CODES as readonly string[]).includes(value);
}

export function isAgeGroupWord(value: string): value is AgeGroupWord {
  return (TRANSLATED_AGE_GROUPS as readonly string[]).includes(value as AgeGroupWord);
}

/** A stored goal read as a code: recognised legacy text becomes its code, anything else
 *  is left exactly as written rather than guessed at. */
export function toGoalCode(goal: string): OnboardingGoalCode | null {
  if (isGoalCode(goal)) return goal;
  return LEGACY_GOAL_TEXT[goal] ?? null;
}

/** The goal choice of a hydrated profile, so a row written while the field held a
 *  sentence starts resolving through the dictionary like a new one. */
export function normalizeGoalChoice(goal: string): string {
  return toGoalCode(goal) ?? goal;
}
