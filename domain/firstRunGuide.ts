// M1230 — the first-run guide: six coach-marks that walk a brand-new visitor across the main
// board the first time they land on it. The world is wide on purpose; a reader who does not know
// what they are looking at leaves. This module is the pure half — the step table, the state
// arithmetic and the storage shape — so the screen (ui/FirstRunGuide.tsx) only draws. The proof
// (scripts/proof-firstrunguide.mjs) replays every claim here without a browser.

export interface TourStep {
  id: string;
  titleKey: string;
  bodyKey: string;
  /** The `data-tour` anchor the step points at, or null for a centred card (a step whose subject
   *  is the whole board, not one control). */
  target: string | null;
}

// Six steps, ordered the way the board reads: the welcome, the ranked actions, the module grid,
// the palette, the mode switch, and the manual as the way out into everything else.
export const TOUR_STEPS: readonly TourStep[] = [
  { id: "welcome", titleKey: "guide.welcome.title", bodyKey: "guide.welcome.body", target: null },
  { id: "next", titleKey: "guide.next.title", bodyKey: "guide.next.body", target: "next-steps" },
  { id: "modules", titleKey: "guide.modules.title", bodyKey: "guide.modules.body", target: "modules" },
  { id: "palette", titleKey: "guide.palette.title", bodyKey: "guide.palette.body", target: "palette" },
  { id: "modes", titleKey: "guide.modes.title", bodyKey: "guide.modes.body", target: "modes" },
  { id: "manual", titleKey: "guide.manual.title", bodyKey: "guide.manual.body", target: null },
];

/** The one device key the guide's progress lives under. A preference: a visitor who finished the
 *  tour keeps it finished across an activity reset, exactly like the theme. */
export const TOUR_KEY = "football-os.tour.v1";

export interface TourState {
  /** Index of the step on screen; TOUR_STEPS.length once finished. */
  step: number;
  done: boolean;
}

export const initialTour = (): TourState => ({ step: 0, done: false });

/** A guide is on screen exactly when it is unfinished and its step is inside the table — a state
 *  with done=false and step=6 (the table's length) is the finished one wearing a lie. */
export const tourVisible = (s: TourState): boolean =>
  !s.done && Number.isInteger(s.step) && s.step >= 0 && s.step < TOUR_STEPS.length;

export const currentStep = (s: TourState): TourStep | null => (tourVisible(s) ? TOUR_STEPS[s.step] : null);

/** Advance one step; stepping past the last finishes the tour rather than falling off the end. */
export function tourAdvance(s: TourState): TourState {
  if (s.done) return s;
  const next = s.step + 1;
  return next >= TOUR_STEPS.length ? { step: TOUR_STEPS.length, done: true } : { step: next, done: false };
}

/** Step back; at the first step or once finished the state is unchanged (there is nowhere back to). */
export function tourBack(s: TourState): TourState {
  if (s.done || s.step <= 0) return s;
  return { step: s.step - 1, done: false };
}

/** Dismiss for good: the step stays where it was, done flips, and the guide never auto-opens again. */
export const tourSkip = (s: TourState): TourState => ({ step: s.step, done: true });

/** What the "replay the quick tour" control writes. */
export const tourRestart = (): TourState => initialTour();

/** Read a stored value back into a state: a non-object, a non-integer step or a step outside the
 *  table degrades to the initial state, never to a crash or a stuck guide. */
export function parseTour(raw: unknown): TourState {
  if (typeof raw !== "object" || raw === null) return initialTour();
  const { step, done } = raw as { step?: unknown; done?: unknown };
  if (typeof done !== "boolean") return initialTour();
  if (done) return { step: TOUR_STEPS.length, done: true };
  if (typeof step !== "number" || !Number.isInteger(step) || step < 0 || step >= TOUR_STEPS.length) return initialTour();
  return { step, done: false };
}

/** The 1-based "step n of m" the card prints; null when nothing is on screen. */
export const tourProgress = (s: TourState): { n: number; of: number } | null =>
  tourVisible(s) ? { n: s.step + 1, of: TOUR_STEPS.length } : null;
