// M573: one ordered answer to "what should I do now". The dashboard's module grid stays as the
// catalogue, but this ranks the things the state already knows — a fixture in play, the next
// kickoff, a missing training plan, an empty film library, a badge within reach, an empty
// watchlist — into at most three one-tap actions. A live fixture outranks the next one: you can
// only watch what is being played. The list falls back to the card ledger only when every one of
// those is already answered, which is an honest "nothing is waiting" rather than a dead panel.
// M624 gives the ranking a clock: the next kickoff is not always the same distance away, so a
// fixture inside the warning window jumps ahead of planning work that can wait.
export interface NextStepFacts {
  /** The first fixture in play, if any. */
  liveMatchId: string | null;
  /** The next fixture that has not kicked off, if any. */
  nextMatchId: string | null;
  /** Minutes from the demo anchor until that kickoff; null when none is scheduled. */
  nextMatchInMinutes: number | null;
  /** Training sessions still in the `planned` state; zero means nothing is scheduled. */
  plannedSessions: number;
  /** Clips saved in the film library; zero means the room is empty. */
  filmClips: number;
  /** True when a locked achievement is close enough for the page to name it. */
  badgeWaiting: boolean;
  /** Players on the scouting watchlist; zero means it has never been used. */
  watchlist: number;
}

export type NextStepKind = "live" | "fixture" | "training" | "film" | "badge" | "watchlist" | "explore";

/** How many actions the dashboard prints; the ranking past this point stays computed and hidden. */
export const NEXT_STEP_LIMIT = 3;

// M624: a kickoff inside this window is the most honest "now" the panel can name — the training
// plan can wait three hours, the match cannot. Outside it the checklist leads and the fixture
// follows it, so the page still opens the next match before it talks about the card ledger.
// The page measures the minutes from the demo anchor, never from the reader's clock.
export const NEXT_MATCH_SOON_MINUTES = 180;

export function nextSteps(facts: NextStepFacts): NextStepKind[] {
  const steps: NextStepKind[] = [];
  const soon = facts.nextMatchId !== null && facts.nextMatchInMinutes !== null
    && facts.nextMatchInMinutes <= NEXT_MATCH_SOON_MINUTES;
  if (facts.liveMatchId) steps.push("live");
  else if (soon) steps.push("fixture");
  if (facts.plannedSessions === 0) steps.push("training");
  if (facts.filmClips === 0) steps.push("film");
  if (!facts.liveMatchId && facts.nextMatchId && !soon) steps.push("fixture");
  if (facts.badgeWaiting) steps.push("badge");
  if (facts.watchlist === 0) steps.push("watchlist");
  if (steps.length === 0) steps.push("explore");
  return steps.slice(0, NEXT_STEP_LIMIT);
}
