import type { Match, PlayerRef, Club, Competition } from "./types";
import { legendsBoard } from "./legends";
import { isFinished } from "./analytics";

/**
 * M1120 · the world atlas — the frozen seed, measured once per render.
 *
 * Nothing here is a sample or a model: the population counts are folds over the world's own
 * arrays, and the two headline humans (the world's best, the world's striker-king) are the
 * exact rows the legends door already computes. Every figure on the screen is reproducible
 * from the same bytes the seed ships; nothing is estimated and nothing is rounded for drama.
 */
export interface AtlasBoard {
  players: number;
  clubs: number;
  competitions: number;
  fixtures: number;
  finished: number;
  live: number;
  scheduled: number;
  /** Finished fixtures as a percentage of all fixtures, 1dp; 0 when there are none. */
  finishedShare: number;
  goals: number;
  /** Goals per finished fixture, 2dp; 0 when none have finished. */
  goalsPerMatch: number;
  scorers: number;
  attributed: number;
  best: PlayerRef | null;
  goldenBoot: { name: string; clubId: string; goals: number } | null;
}

export function atlasBoard(
  matches: readonly Match[],
  players: readonly PlayerRef[],
  clubs: readonly Club[],
  competitions: readonly Competition[],
): AtlasBoard {
  const board = legendsBoard(matches as Match[], players as PlayerRef[], 1, 1);
  const finishedMatches = matches.filter(isFinished);
  const live = matches.filter((m) => m.status === "LIVE").length;
  const scheduled = matches.filter((m) => m.status === "SCHEDULED").length;
  const finished = finishedMatches.length;
  const fixtures = matches.length;
  const boot = board.goldenBoot[0];
  return {
    players: players.length,
    clubs: clubs.length,
    competitions: competitions.length,
    fixtures,
    finished,
    live,
    scheduled,
    finishedShare: fixtures === 0 ? 0 : Math.round((finished / fixtures) * 1000) / 10,
    goals: board.goals,
    goalsPerMatch: finished === 0 ? 0 : Math.round((board.goals / finished) * 100) / 100,
    scorers: board.scorers,
    attributed: board.attributed,
    best: board.immortals[0] ?? null,
    goldenBoot: boot ? { name: boot.player.name, clubId: boot.player.clubId, goals: boot.goals } : null,
  };
}
