import type { Club, Match } from "./types";
import { byKickoff, outcomeOdds, teamMetrics, type TeamMetrics } from "./analytics";

/**
 * M1122 · the Prophet's Slate. The next fixtures in this world, told by the model's own Poisson
 * eye: for every scheduled fixture the model reads each club's xG against its own competition's
 * average, sums the full scoreline table, and renormalises the truncated tail — nothing more.
 * Deterministic: kickoff, with the seed's own frozen order breaking equal kickoffs — which cannot drift.
 * A fixture whose side has no finished games yet is flagged
 * `cold` — the odds say "this side is unmeasured", not "it is equal"; the honesty rule is the same
 * as every other fold in this tree: counts from the seed, nothing invented.
 */
export interface ProphetRow {
  match: Match;
  competitionId: string;
  homeLambda: number;
  awayLambda: number;
  home: number;
  draw: number;
  away: number;
  mostLikelyScore: string;
  expectedTotalGoals: number;
  /** True when either side has zero finished fixtures in this competition. */
  cold: boolean;
}

export function prophetSlate(matches: readonly Match[], clubs: readonly Club[], limit = 8): ProphetRow[] {
  const cache = new Map<string, TeamMetrics[]>();
  const metricsFor = (compId: string): TeamMetrics[] => {
    if (!cache.has(compId)) cache.set(compId, teamMetrics(compId, matches as Match[], clubs as Club[]));
    return cache.get(compId)!;
  };
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED")
    .slice()
    // M1122: rides the shared kickoff door; fixtures sharing a kickoff keep the seed's own frozen order, which is deterministic.
    .sort(byKickoff);
  const out: ProphetRow[] = [];
  for (const m of upcoming) {
    const metrics = metricsFor(m.competitionId);
    const homeMetrics = metrics.find((x) => x.clubId === m.homeClubId);
    const awayMetrics = metrics.find((x) => x.clubId === m.awayClubId);
    if (!homeMetrics || !awayMetrics) continue; // honest skip: this club is absent from the competition's own fold
    const cold = homeMetrics.played === 0 || awayMetrics.played === 0;
    const odds = outcomeOdds(homeMetrics, awayMetrics, homeMetrics.leagueAvg);
    out.push({
      match: m,
      competitionId: m.competitionId,
      homeLambda: odds.lambdaHome,
      awayLambda: odds.lambdaAway,
      home: odds.home,
      draw: odds.draw,
      away: odds.away,
      mostLikelyScore: odds.mostLikelyScore,
      expectedTotalGoals: odds.expectedTotalGoals,
      cold,
    });
    if (out.length >= limit) break;
  }
  return out;
}
