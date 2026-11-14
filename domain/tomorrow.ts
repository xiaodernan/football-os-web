import type { Club, Match } from "./types";
import { competitionMetrics, outcomeOdds } from "./analytics";
import { indexById } from "@/lib/utils";

/**
 * M1125 · the chapter the world is waiting for. The scheduled fixture the seed's own club ratings
 * single out as the headline of the week — the pair of sides the world rated highest — re-told
 * with the same Poisson fold the Prophet uses, under one ceremonial roof. Deterministic:
 * combined club overall desc, then kickoff asc, then id asc — the same seed prints the same chapter.
 */
export interface Chapter {
  match: Match;
  competitionId: string;
  homeLambda: number;
  awayLambda: number;
  home: number;
  draw: number;
  away: number;
  mostLikelyScore: string;
  expectedTotalGoals: number;
  combinedOverall: number;
  homeOverall: number;
  awayOverall: number;
  /** True when neither side in the fold has played at least one finished fixture in this comp. */
  cold: boolean;
}

export function tomorrowChapter(matches: readonly Match[], clubs: readonly Club[]): Chapter | null {
  const byId = indexById(clubs);
  const read = competitionMetrics(matches, clubs);
  let best: Chapter | null = null;
  for (const m of matches) {
    if (m.status !== "SCHEDULED") continue;
    const hc = byId.get(m.homeClubId);
    const ac = byId.get(m.awayClubId);
    if (!hc || !ac) continue;
    const combinedOverall = hc.overall + ac.overall;
    const better = best == null
      || combinedOverall > best.combinedOverall
      || (combinedOverall === best.combinedOverall && m.kickoff < best.match.kickoff)
      || (combinedOverall === best.combinedOverall && m.kickoff === best.match.kickoff && m.id < best.match.id);
    if (!better) continue;
    const teamRows = read(m.competitionId);
    const homeM = teamRows.find((x) => x.clubId === m.homeClubId);
    const awayM = teamRows.find((x) => x.clubId === m.awayClubId);
    if (!homeM || !awayM) continue;
    const cold = homeM.played === 0 || awayM.played === 0;
    const odds = outcomeOdds(homeM, awayM, homeM.leagueAvg);
    best = {
      match: m,
      competitionId: m.competitionId,
      homeLambda: odds.lambdaHome,
      awayLambda: odds.lambdaAway,
      home: odds.home,
      draw: odds.draw,
      away: odds.away,
      mostLikelyScore: odds.mostLikelyScore,
      expectedTotalGoals: odds.expectedTotalGoals,
      combinedOverall,
      homeOverall: hc.overall,
      awayOverall: ac.overall,
      cold,
    };
  }
  return best;
}
