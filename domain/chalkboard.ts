// M1138 · The Chalkboard Cup — the five-question eye-vs-model duel.
// Pure fold: this file never sees the provider (keeps the domain layer dependency-free),
// it only decides which finished fixtures the caller should serve the user, in a stable
// order the visitor replays exactly while exploring, and only with real pre-match data.

import type { Club, Match } from "./types";
import { isFinished, teamMetrics, outcomeOdds, oddsPercents, hasFormSample } from "./analytics";
import { clamp } from "@/lib/utils";

/** A stable homebrew FNV-1a-style hash. Same family as lib/rng.ts's hashString — the quiz
 *  order must never depend on iteration order, or the run replays differently each visit. */
const hash = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

export const CHALKBOARD_PICK_COUNT = 5;

/** Which finished fixtures the user will be quizzed on for run `run` (0-based). Stable for the
 *  same run index: two visits to one run replay the same five fixtures in the same order. */
export function selectChalkboardRun(matches: readonly Match[], run: number): Match[] {
  const played = matches.filter((m) => isFinished(m));
  const ranked = [...played].sort((a, b) => hash(`${a.id}:${run}`) - hash(`${b.id}:${run}`));
  return ranked.slice(0, clamp(CHALKBOARD_PICK_COUNT, 0, played.length));
}

export interface ChalkCall {
  homePct: number;
  drawPct: number;
  awayPct: number;
  lambdaHome: number;
  lambdaAway: number;
  expectedTotalGoals: number;
  mostLikelyScore: string;
  mostLikelyPct: number;
  sample: number;
}

/** The seed's odds read for one fixture AT THE WORLD'S CURRENT SHAPE: attack/defence rates
 *  folded from this competition's finished fixtures with league-average normalization, the same
 *  Poisson math fixtureForecast uses for live fixtures — except the quiz plays with the past,
 *  not the future, so it does not impose fixtureForecast's own "only scheduled" contract.
 *  The honest deal: the model's word on the past, always fresh to the world's present fold. */
export function chalkboardForecast(match: Match, matches: readonly Match[], clubs: readonly Club[]): ChalkCall | null {
  const metrics = teamMetrics(match.competitionId, matches as Match[], clubs as Club[]);
  const h = metrics.find((r) => r.clubId === match.homeClubId);
  const a = metrics.find((r) => r.clubId === match.awayClubId);
  if (!hasFormSample(h) || !hasFormSample(a)) return null;
  const odds = outcomeOdds(h, a);
  const pct = oddsPercents(odds);
  return {
    homePct: pct.home,
    drawPct: pct.draw,
    awayPct: pct.away,
    lambdaHome: odds.lambdaHome,
    lambdaAway: odds.lambdaAway,
    expectedTotalGoals: odds.expectedTotalGoals,
    mostLikelyScore: odds.mostLikelyScore,
    mostLikelyPct: odds.mostLikelyPct,
    sample: Math.min(h.played, a.played),
  };
}
