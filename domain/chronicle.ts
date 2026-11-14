import type { Match } from "./types";

/**
 * M1117 · the seed's own epic — the fixture the world remembers, computed once per render.
 * A chronicle store does not guess what is dramatic: it awaits it. A fixture is epic when it
 * moves the scoreboard more than any other finished match in the whole population.
 *
 * The selection:
 *   1. `epic` themselves: margin >= 2 goals at final whistle, public-perception vintage.
 *   2. tied to the widest scoreline first (`goalCountTotal`).
 *   3. deterministic tie-break: kickoff, id.
 *
 * Nothing in this file invents an outcome; it only ranks what the seed already says.
 */
export interface EpicFixture {
  match: Match & { homeGoals: number; awayGoals: number };
  /** Absolute score margin, always positive. */
  margin: number;
  /** Total goals in the match. */
  total: number;
  /** The winning club's id — used for the card crest. */
  winnerClubId: string;
  /** The loser's id. */
  loserClubId: string;
}

const isFinished = (m: Match): m is Match & { homeGoals: number; awayGoals: number } =>
  m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null;

export function epicFixture(matches: readonly Match[]): EpicFixture | null {
  const candidates = matches.filter(isFinished).map((m) => ({
    match: m,
    margin: Math.abs(m.homeGoals - m.awayGoals),
    total: m.homeGoals + m.awayGoals,
    winnerClubId: m.homeGoals >= m.awayGoals ? m.homeClubId : m.awayClubId,
    loserClubId: m.homeGoals >= m.awayGoals ? m.awayClubId : m.homeClubId,
  }));
  candidates.sort((a, b) =>
    (b.total - a.total) ||
    (b.margin - a.margin) ||
    a.match.kickoff.localeCompare(b.match.kickoff) ||
    a.match.id.localeCompare(b.match.id),
  );
  return candidates[0] ?? null;
}

/** The closest epic neighbour in time — used for the "tales from adjacent weeks" strip. */
export function epicNeighbours(epic: EpicFixture, matches: readonly Match[], n: number): EpicFixture[] {
  const all = matches.filter(isFinished)
    .filter((m) => m.id !== epic.match.id)
    .map((m) => ({
      match: m,
      margin: Math.abs(m.homeGoals - m.awayGoals),
      total: m.homeGoals + m.awayGoals,
      winnerClubId: m.homeGoals >= m.awayGoals ? m.homeClubId : m.awayClubId,
      loserClubId: m.homeGoals >= m.awayGoals ? m.awayClubId : m.homeClubId,
    }))
    .sort((a, b) =>
      (b.total + b.margin) - (a.total + a.margin) ||
      a.match.kickoff.localeCompare(b.match.kickoff),
    );
  return all.slice(0, n);
}
