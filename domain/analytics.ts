// Data Room analytics (spec §"player & club analytics"). Pure, deterministic
// derivations over a set of finished matches so the UI can surface form,
// attack/defence strength and expected-goals style numbers that the raw tables
// don't show. No I/O, no React — every function is reproducible from its inputs
// and unit-testable. Ratings are relative to league average, so a 1.0 attack
// means "scores at the league-average rate".

import type { Club, Match } from "@/domain/types";
import { clamp, round2, round3, indexById } from "@/lib/utils";
import { byTableStanding, sum, leaguePoints, recentResults, formLetter, creditRecord, ResultTally } from "./attributes";

// The form letter — W, D or L — is the league ladder's own vocabulary, so it is named in
// domain/attributes.ts (where the letter door and the points ladder live) and re-exported here
// for the callers that already import this module's types.
export type { FormLetter } from "./attributes";
import type { FormLetter } from "./attributes";

export interface Split extends ResultTally {}

export interface TeamMetrics {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  ppg: number;
  gfAvg: number;
  cleanSheets: number;
  form: FormLetter[];
  home: Split;
  away: Split;
  attack: number;
  defence: number;
  /** Goals per team per game in this competition — the denominator `attack`
   *  and `defence` were measured against, so projections stay in the same units. */
  leagueAvg: number;
}

function emptySplit(): Split {
  return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
}

const isFinished = (m: Match): m is Match & { homeGoals: number; awayGoals: number } =>
  m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null;

/** Chronological by kickoff — the ISO timestamp, compared as text. One comparator, because five
 *  readers order the same list: the competition's finished fixtures, the data room's forecast, and
 *  three service functions. A kickoff is this app's clock, and five copies of the ordering rule are
 *  five chances for one of them to drift into a different order than the rest. */
export function byKickoff(a: Match, b: Match): number {
  return a.kickoff.localeCompare(b.kickoff);
}

/** The competition's finished matches, in kickoff order — the one list every figure here is
 *  measured over.
 *
 *  M336: the count of this list was private (it fed `leagueAvg` and nothing else), so the data
 *  room re-derived the same number on the page as `Σ per-team played / 2 | 0`. That derivation
 *  is right only while the sum is even: a competition mid-round has one team a match ahead of
 *  another, an odd total floors to one less than the truth, and the page quietly reports a
 *  match that was never played. The count is exported now, and the page reads it. */
export function finishedFixtures(compId: string, matches: Match[]): (Match & { homeGoals: number; awayGoals: number })[] {
  return matches
    .filter((m): m is Match & { homeGoals: number; awayGoals: number } => m.competitionId === compId && isFinished(m))
    .sort(byKickoff);
}

/** How many matches this competition has actually finished — a count of the list above, not a
 *  sum the caller has to halve. */
export function finishedCount(compId: string, matches: Match[]): number {
  return finishedFixtures(compId, matches).length;
}

/** Compute per-club metrics for a competition from its finished matches. */
export function teamMetrics(compId: string, matches: Match[], clubs: Club[]): TeamMetrics[] {
  const byId = indexById(clubs);
  // M336: the same list `finishedCount` counts, so a correction to what "finished" means lands
  // in one place instead of in the metrics and in the page's count separately.
  const fixtures = finishedFixtures(compId, matches);

  let totalGoals = 0;
  let games = 0;
  for (const m of fixtures) {
    totalGoals += m.homeGoals + m.awayGoals;
    games++;
  }
  const leagueAvg = games ? totalGoals / (games * 2) : 1.5; // goals per team per game

  interface Acc {
    home: Split;
    away: Split;
    results: { kickoff: string; g: number; c: number }[];
  }
  const acc = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) {
      a = { home: emptySplit(), away: emptySplit(), results: [] };
      acc.set(id, a);
    }
    return a;
  };
  for (const club of clubs) if (compId === club.competitionId) ensure(club.id);

  for (const m of fixtures) {
    const h = ensure(m.homeClubId);
    const a = ensure(m.awayClubId);
    creditRecord(h.home, m.homeGoals, m.awayGoals);
    creditRecord(a.away, m.awayGoals, m.homeGoals);
    h.results.push({ kickoff: m.kickoff, g: m.homeGoals, c: m.awayGoals });
    a.results.push({ kickoff: m.kickoff, g: m.awayGoals, c: m.homeGoals });
  }

  const out: TeamMetrics[] = [];
  for (const [clubId, a] of acc) {
    if (!byId.has(clubId)) continue;
    const played = a.home.played + a.away.played;
    const won = a.home.won + a.away.won;
    const drawn = a.home.drawn + a.away.drawn;
    const lost = a.home.lost + a.away.lost;
    const gf = a.home.gf + a.away.gf;
    const ga = a.home.ga + a.away.ga;
    const form: FormLetter[] = recentResults(a.results).map((r) => formLetter(r.g, r.c));
    const cleanSheets = a.results.filter((r) => r.c === 0).length;
    const gfAvg = played ? gf / played : 0;
    const gaAvg = played ? ga / played : 0;
    out.push({
      clubId,
      played,
      won,
      drawn,
      lost,
      gf,
      ga,
      gd: gf - ga,
      points: won * 3 + drawn,
      ppg: played ? round2(((won * 3 + drawn) / played)) : 0,
      gfAvg: round2(gfAvg),
      cleanSheets,
      form,
      home: a.home,
      away: a.away,
      attack: leagueAvg ? round2(gfAvg / leagueAvg) : 0,
      defence: leagueAvg ? round2(gaAvg / leagueAvg) : 0,
      leagueAvg: round2(leagueAvg),
    });
  }
  return out.sort((x, y) => byTableStanding(x, y));
}

// Attack/defence are ratios against THIS competition's average goals per team
// per game, so the projection must use that same denominator — a hardcoded 1.4
// on a league averaging 0.5 inflates every scoreline.
//
// Those ratios are also noisy at this sample size: seven games can produce a
// 0.27 defence rating, and multiplying two such extremes together yields
// absurd lines (71% draw odds in a derby). Ratings are therefore regressed
// toward the league mean in proportion to how many matches back them —
// played/(played+k), the standard shrinkage-toward-the-mean correction. With
// k=6 a 7-game sample keeps 54% of its deviation and a 38-game sample 86%.
const SHRINK_K = 6;
const LAMBDA_MIN = 0.15;
const LAMBDA_MAX = 3.5;

const shrink = (value: number, played: number) => {
  const weight = played / (played + SHRINK_K);
  return 1 + (value - 1) * weight;
};

const clampLambda = (v: number) => clamp(v, LAMBDA_MIN, LAMBDA_MAX);

/** Modelled expected goals for a single fixture from the two sides' ratings. */
export function expectedGoals(home: TeamMetrics, away: TeamMetrics, leagueAvg?: number): { home: number; away: number } {
  const base = leagueAvg ?? Math.min(home.leagueAvg || 1.4, away.leagueAvg || 1.4);
  const h = clampLambda(base * shrink(home.attack, home.played) * shrink(away.defence, away.played) * 1.12);
  const a = clampLambda(base * shrink(away.attack, away.played) * shrink(home.defence, home.played) * 0.92);
  return { home: round2(h), away: round2(a) };
}

// Goals in a football match are close enough to Poisson-distributed for a
// pre-match read, and unlike the Match Engine simulation this is a closed-form
// model: same inputs, same answer, no sampling. Kept deliberately separate from
// the engine so the two approaches can be compared rather than confused.
const MAX_GOALS = 8;

function poisson(k: number, lambda: number): number {
  let p = 1;
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p * Math.exp(-lambda);
}

export interface OutcomeOdds {
  home: number; // 0..1
  draw: number;
  away: number;
  mostLikelyScore: string;
  mostLikelyPct: number;
  expectedTotalGoals: number; // lambdaHome + lambdaAway, on the same 2-dp grid
  lambdaHome: number;
  lambdaAway: number;
}

export function outcomeOdds(home: TeamMetrics, away: TeamMetrics, leagueAvg?: number): OutcomeOdds {
  const xg = expectedGoals(home, away, leagueAvg);
  const lH = Math.max(0.05, xg.home);
  const lA = Math.max(0.05, xg.away);

  let ph = 0, pd = 0, pa = 0, best = 0, bestScore = "0-0";
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poisson(h, lH) * poisson(a, lA);
      if (h > a) ph += p;
      else if (h === a) pd += p;
      else pa += p;
      if (p > best) {
        best = p;
        bestScore = `${h}-${a}`;
      }
    }
  }
  const total = ph + pd + pa || 1; // renormalise the truncated tail
  const lambdaHome = round2(lH);
  const lambdaAway = round2(lA);
  return {
    home: round3(ph / total),
    draw: round3(pd / total),
    away: round3(pa / total),
    mostLikelyScore: bestScore,
    mostLikelyPct: round3(best / total),
    // Sums the two λ figures this is displayed beside, so the line can never
    // contradict the arithmetic a visitor does on screen. expectedGoals already
    // hands back 2-dp lambdas today; this keeps that true if it ever stops.
    expectedTotalGoals: round2(lambdaHome + lambdaAway),
    lambdaHome,
    lambdaAway,
  };
}

/**
 * Whole-number percentages that always total 100. Rounding each outcome
 * independently can leave 99% or 101% rows, which reads as a bug even when the
 * underlying model is fine — so the largest remainder absorbs the difference.
 */
export function oddsPercents(odds: { home: number; draw: number; away: number }): { home: number; draw: number; away: number } {
  const raw: [number, number, number] = [odds.home * 100, odds.draw * 100, odds.away * 100];
  const floor = raw.map(Math.floor) as [number, number, number];
  let left = 100 - (floor[0] + floor[1] + floor[2]);
  const order = [0, 1, 2].sort((a, b) => (raw[b] - floor[b]) - (raw[a] - floor[a]));
  for (let i = 0; left > 0; i = (i + 1) % order.length) {
    floor[order[i]]++;
    left--;
  }
  return { home: floor[0], draw: floor[1], away: floor[2] };
}

export interface Leaders {
  bestForm: TeamMetrics | null;
  strongestAttack: TeamMetrics | null;
  bestDefence: TeamMetrics | null;
  highestScoring: TeamMetrics | null;
}

/** Named leaders for a league's metrics set. */
export function leaders(metrics: TeamMetrics[]): Leaders {
  const withGames = metrics.filter((m) => m.played >= 2);
  const by = (arr: TeamMetrics[], f: (m: TeamMetrics) => number, dir: 1 | -1) =>
    arr.length ? [...arr].sort((a, b) => dir * (f(b) - f(a)))[0] : null;
  const formPts = (m: TeamMetrics) => sum(m.form, leaguePoints);
  return {
    bestForm: by(withGames, formPts, 1),
    strongestAttack: by(withGames, (m) => m.attack, 1),
    bestDefence: by(withGames, (m) => m.defence, -1),
    highestScoring: by(withGames, (m) => m.gfAvg, 1),
  };
}

export function formPoints(m: TeamMetrics): number {
  return sum(m.form, leaguePoints);
}

// The run-in: what each club still has to face. Difficulty is the average points-per-game of
// the clubs left on its calendar — a club's own record says how good it has been, not how hard
// the fixtures in front of it are. A club with nothing left reads zero and sorts last, so an
// idle calendar cannot masquerade as the easiest run.
export interface RunInRow {
  clubId: string;
  remaining: number;
  /** Average points-per-game of the clubs still to play, 2dp; 0 when nothing is left. */
  avgOppPpg: number;
  /** The opponents left, in kickoff order. */
  opponents: string[];
  /** The club's own record, carried so a row can be read without a second lookup. */
  points: number;
  played: number;
}

export function runIn(compId: string, matches: Match[], clubs: Club[]): RunInRow[] {
  const metrics = teamMetrics(compId, matches, clubs);
  const ppg = new Map(metrics.map((m) => [m.clubId, m.ppg]));
  const remaining = remainingOpponents(compId, matches, metrics.map((m) => m.clubId));
  return metrics
    .map((m) => {
      const opponents = remaining.get(m.clubId) ?? [];
      const avg = opponents.length
        ? round2(sum(opponents, (id) => ppg.get(id) ?? 0) / opponents.length)
        : 0;
      return {
        clubId: m.clubId,
        remaining: opponents.length,
        avgOppPpg: avg,
        opponents,
        points: m.points,
        played: m.played,
      };
    })
    .sort((a, b) => b.avgOppPpg - a.avgOppPpg || a.clubId.localeCompare(b.clubId));
}

/** The competition's scheduled fixtures, folded into each club's list of opponents still to play,
 *  in kickoff order. One fold feeds both reads that need "what is left": the run-in's difficulty
 *  (it reads the names) and the points scenarios (they read the count), so the two can never
 *  disagree about how many fixtures remain. */
function remainingOpponents(compId: string, matches: Match[], clubIds: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>(clubIds.map((id) => [id, []]));
  const upcoming = matches
    .filter((m) => m.competitionId === compId && m.status === "SCHEDULED")
    .sort(byKickoff);
  for (const m of upcoming) {
    out.get(m.homeClubId)?.push(m.awayClubId);
    out.get(m.awayClubId)?.push(m.homeClubId);
  }
  return out;
}

export interface PointsScenario {
  clubId: string;
  played: number;
  points: number;
  /** Fixtures still to play in this competition. */
  remaining: number;
  /** Points if every fixture left is won. */
  maxPoints: number;
  /** Points if the club keeps its current points-per-game over what is left, 2dp. */
  ratePoints: number;
  /** Points behind the table's current leader; 0 for the leader itself. */
  behindLeader: number;
  /** True while the club's ceiling still reaches the leader's current total — never true for the
   *  leader itself, which is already there. */
  canCatchLeader: boolean;
}

/** What each club can still reach: the ceiling if it wins out, the projection at today's rate, and
 *  the gap to the leader. A scenario about POINTS, not about the difficulty of the fixtures left
 *  (that is `runIn`) and not about a player's growth (that is the projection screen). */
export function pointsScenarios(compId: string, matches: Match[], clubs: Club[]): PointsScenario[] {
  const metrics = teamMetrics(compId, matches, clubs);
  const remaining = remainingOpponents(compId, matches, metrics.map((m) => m.clubId));
  const leader = metrics[0] ?? null;
  const leaderPoints = leader?.points ?? 0;
  return metrics.map((m) => {
    const left = remaining.get(m.clubId)?.length ?? 0;
    const maxPoints = m.points + left * 3;
    return {
      clubId: m.clubId,
      played: m.played,
      points: m.points,
      remaining: left,
      maxPoints,
      ratePoints: round2(m.points + m.ppg * left),
      behindLeader: leaderPoints - m.points,
      canCatchLeader: m.clubId !== leader?.clubId && maxPoints >= leaderPoints,
    };
  });
}
