import type { Club, Match } from "./types";
import { isFinished, outcomeOdds, teamMetrics, type TeamMetrics } from "./analytics";
import { round2 } from "@/lib/utils";

/**
 * M1124 · the Upsets. The mirrored fold to the Prophet's Slate: the nights this (synthetic) world
 * outran its own prediction. For every finished fixture the same Poisson reader the Prophet uses
 * assigns probabilities to the three outcomes; the rows kept are the ones where the favourite did
 * not take the day. Ranked by the shock multiplier (1 / the probability assigned to the outcome
 * that actually happened), so the most scandalous night reads first. Counted only — nothing on
 * this screen is an accusation against anyone's judgment.
 */
export interface UpsetRow {
  match: Match;
  competitionId: string;
  homeLambda: number;
  awayLambda: number;
  home: number;
  draw: number;
  away: number;
  mostLikelyScore: string;
  expectedTotalGoals: number;
  /** The probability the model pinned to the outcome that actually happened. */
  happenedProb: number;
  /** 1 / happenedProb, rounded through the shared round2 door — the "shock multiplier". */
  shock: number;
  /** The outcome the model favoured. */
  favoured: "home" | "draw" | "away";
  /** The outcome that actually happened. */
  happened: "home" | "draw" | "away";
}

export function upsetsBoard(matches: readonly Match[], clubs: readonly Club[], limit = 10): UpsetRow[] {
  const cache = new Map<string, TeamMetrics[]>();
  const metricsFor = (compId: string): TeamMetrics[] => {
    if (!cache.has(compId)) cache.set(compId, teamMetrics(compId, matches as Match[], clubs as Club[]));
    return cache.get(compId)!;
  };
  const out: UpsetRow[] = [];
  for (const m of matches) {
    if (!isFinished(m)) continue;
    const metrics = metricsFor(m.competitionId);
    const homeMetrics = metrics.find((x) => x.clubId === m.homeClubId);
    const awayMetrics = metrics.find((x) => x.clubId === m.awayClubId);
    if (!homeMetrics || !awayMetrics) continue;
    if (homeMetrics.played === 0 || awayMetrics.played === 0) continue; // no rows from unmeasured sides
    const odds = outcomeOdds(homeMetrics, awayMetrics, homeMetrics.leagueAvg);
    const actual: "home" | "draw" | "away" =
      m.homeGoals > m.awayGoals ? "home" : m.homeGoals === m.awayGoals ? "draw" : "away";
    const favoured = (Object.entries({ home: odds.home, draw: odds.draw, away: odds.away })
      .sort(([, a], [, b]) => b - a)[0][0]) as "home" | "draw" | "away";
    if (favoured === actual) continue; // the favourite won — no anthology for the expected
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
      happenedProb: actual === "home" ? odds.home : actual === "draw" ? odds.draw : odds.away,
      shock: round2(1 / ((actual === "home" ? odds.home : actual === "draw" ? odds.draw : odds.away) || 0.001)),
      favoured,
      happened: actual,
    });
  }
  out.sort((a, b) =>
    (b.shock - a.shock) ||
    a.match.kickoff.localeCompare(b.match.kickoff) ||
    a.match.id.localeCompare(b.match.id),
  );
  return out.slice(0, limit);
}
