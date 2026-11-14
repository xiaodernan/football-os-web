import type { Club, Match } from "./types";
import { competitionMetrics, isFinished, outcomeOdds } from "./analytics";
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
  /** 1 / happenedProb, rounded through the shared round2 door — the "shock multiplier". */
  shock: number;
}

type Outcome = "home" | "draw" | "away";

export function upsetsBoard(matches: readonly Match[], clubs: readonly Club[], limit = 10): UpsetRow[] {
  const read = competitionMetrics(matches, clubs);
  const out: UpsetRow[] = [];
  for (const m of matches) {
    if (!isFinished(m)) continue;
    const teamRows = read(m.competitionId);
    const homeMetrics = teamRows.find((x) => x.clubId === m.homeClubId);
    const awayMetrics = teamRows.find((x) => x.clubId === m.awayClubId);
    if (!homeMetrics || !awayMetrics) continue;
    if (homeMetrics.played === 0 || awayMetrics.played === 0) continue; // no rows from unmeasured sides
    const odds = outcomeOdds(homeMetrics, awayMetrics, homeMetrics.leagueAvg);
    const actual: Outcome =
      m.homeGoals > m.awayGoals ? "home" : m.homeGoals === m.awayGoals ? "draw" : "away";
    const favoured = (Object.entries({ home: odds.home, draw: odds.draw, away: odds.away })
      .sort(([, a], [, b]) => b - a)[0][0]) as Outcome;
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
      shock: round2(1 / ((actual === "home" ? odds.home : actual === "draw" ? odds.draw : odds.away) || 0.001)),
    });
  }
  out.sort((a, b) =>
    (b.shock - a.shock) ||
    a.match.kickoff.localeCompare(b.match.kickoff) ||
    a.match.id.localeCompare(b.match.id),
  );
  return out.slice(0, limit);
}
