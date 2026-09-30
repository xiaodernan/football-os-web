// Legacy English goal text → code mapping.
// Moved out of domain/onboarding.ts to clear its prose debt (M237).
// These keys are only used to recognize old stored profiles; they are never displayed.

import type { OnboardingGoalCode } from "../domain/types";

export const LEGACY_GOAL_TEXT: Record<string, OnboardingGoalCode> = {

  "Get faster": "getFaster",
  "Finish better": "finishBetter",
  "Play smarter (scanning/decisions)": "playSmarter",
  "Hold up play": "holdUpPlay",
  "Become a two-footed player": "twoFooted",
};