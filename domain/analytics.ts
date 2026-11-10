// Data Room analytics (spec 搂"player & club analytics"). Pure, deterministic
// derivations over a set of finished matches so the UI can surface form,
// attack/defence strength and expected-goals style numbers that the raw tables
// don't show. No I/O, no React 鈥?every function is reproducible from its inputs
// and unit-testable. Ratings are relative to league average, so a 1.0 attack
// means "scores at the league-average rate".

import { SIDES, type Club, type Match, type Side, type MatchEvent } from "@/domain/types";
import { safeDiv, clamp, round2, round3, indexById, epochMs, DAY_MS } from "@/lib/utils";
import { byTableStanding, sum, leaguePoints, recentResults, formLetter, creditResult, resultPoints, FORM_WINDOW, creditRecord, ResultTally, SeasonRowFields, maxBy, last, tally, unique } from "./attributes";
import { byMinute } from "./matchEngine";

// The form letter 鈥?W, D or L 鈥?is the league ladder's own vocabulary, so it is named in
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
  /** Goals per team per game in this competition 鈥?the denominator `attack`
   *  and `defence` were measured against, so projections stay in the same units. */
  leagueAvg: number;
}

function emptySplit(): Split {
  return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
}

/** The one finished-fixtures predicate every fold narrows with before it reads goals. */
export const isFinished = (m: Match): m is Match & { homeGoals: number; awayGoals: number } =>
  m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null;

/** Chronological by kickoff 鈥?the ISO timestamp, compared as text. One comparator, because five
 *  readers order the same list: the competition's finished fixtures, the data room's forecast, and
 *  three service functions. A kickoff is this app's clock, and five copies of the ordering rule are
 *  five chances for one of them to drift into a different order than the rest. */
export function byKickoff(a: { kickoff: string }, b: { kickoff: string }): number {
  // The contract is the timestamp, so the door takes anything that carries one 鈥?the replay
  // folds order lighter records by the same rule without pretending they are full matches.
  return a.kickoff.localeCompare(b.kickoff);
}

/** The competition's finished matches, in kickoff order 鈥?the one list every figure here is
 *  measured over.
 *
 *  M336: the count of this list was private (it fed `leagueAvg` and nothing else), so the data
 *  room re-derived the same number on the page as `危 per-team played / 2 | 0`. That derivation
 *  is right only while the sum is even: a competition mid-round has one team a match ahead of
 *  another, an odd total floors to one less than the truth, and the page quietly reports a
 *  match that was never played. The count is exported now, and the page reads it. */
export function finishedFixtures(compId: string, matches: Match[]): (Match & { homeGoals: number; awayGoals: number })[] {
  return matches
    .filter((m): m is Match & { homeGoals: number; awayGoals: number } => m.competitionId === compId && isFinished(m))
    .sort(byKickoff);
}

/** How many matches this competition has actually finished 鈥?a count of the list above, not a
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
// per game, so the projection must use that same denominator 鈥?a hardcoded 1.4
// on a league averaging 0.5 inflates every scoreline.
//
// Those ratios are also noisy at this sample size: seven games can produce a
// 0.27 defence rating, and multiplying two such extremes together yields
// absurd lines (71% draw odds in a derby). Ratings are therefore regressed
// toward the league mean in proportion to how many matches back them 鈥?// played/(played+k), the standard shrinkage-toward-the-mean correction. With
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
    // Sums the two 位 figures this is displayed beside, so the line can never
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
 * underlying model is fine 鈥?so the largest remainder absorbs the difference.
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
// the clubs left on its calendar 鈥?a club's own record says how good it has been, not how hard
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
  /** True while the club's ceiling still reaches the leader's current total 鈥?never true for the
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

/** Six fifteen-minute windows a goal can arrive in. The last one absorbs stoppage time: a 97鈥?goal
 *  and a 78鈥?goal are both "late", because the recorded minute can run past 90. */
const GOAL_BANDS = 6;

/** The late window: minute 76 and after, stoppage included. Every reader that asks "was it
 *  late?" goes through this door 鈥?never an inline comparison 鈥?so the bound is written once. */
export function isLateWindow(minute: number): boolean {
  return minute >= 76;
}

function goalBand(minute: number): number {
  const band = Math.floor((minute - 1) / 15);
  return band < 0 ? 0 : band > GOAL_BANDS - 1 ? GOAL_BANDS - 1 : band;
}

export interface GoalTimingRow {
  clubId: string;
  scored: number;
  conceded: number;
  /** Goals scored in each window, index 0 = 1鈥?5鈥? index 5 = 76鈥?0+鈥? */
  scoredBands: number[];
  /** Goals conceded in each window. */
  concededBands: number[];
  /** Goals scored after the 75th minute (the last window). */
  lateScored: number;
  /** Goals conceded after the 75th minute. */
  lateConceded: number;
  /** Share of this club's own goals that arrived late, 0鈥?00, 2dp; 0 when it has not scored. */
  lateShare: number;
}

/** When each club's goals arrive: every recorded GOAL event in this competition's finished matches,
 *  folded into six windows for the scoring side and the conceding side. A different question from
 *  the run-in (what is left), the points scenarios (what can still be reached) and the leaders
 *  (who scored them) 鈥?this one is about the clock. */
export function goalTiming(compId: string, matches: Match[], clubs: Club[]): GoalTimingRow[] {
  const metrics = teamMetrics(compId, matches, clubs);
  const rows = new Map<string, GoalTimingRow>(
    metrics.map((m) => [
      m.clubId,
      {
        clubId: m.clubId,
        scored: 0,
        conceded: 0,
        scoredBands: Array.from({ length: GOAL_BANDS }, () => 0),
        concededBands: Array.from({ length: GOAL_BANDS }, () => 0),
        lateScored: 0,
        lateConceded: 0,
        lateShare: 0,
      },
    ]),
  );
  const lastBand = GOAL_BANDS - 1;
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED") continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const band = goalBand(e.minute);
      const forId = e.side === "home" ? m.homeClubId : m.awayClubId;
      const againstId = e.side === "home" ? m.awayClubId : m.homeClubId;
      const scorer = rows.get(forId);
      const leaker = rows.get(againstId);
      if (scorer) {
        scorer.scored++;
        scorer.scoredBands[band]++;
        if (band === lastBand) scorer.lateScored++;
      }
      if (leaker) {
        leaker.conceded++;
        leaker.concededBands[band]++;
        if (band === lastBand) leaker.lateConceded++;
      }
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.lateShare = r.scored ? round2((r.lateScored / r.scored) * 100) : 0;
  return list.sort((a, b) => b.lateShare - a.lateShare || b.scored - a.scored || a.clubId.localeCompare(b.clubId));
}

export interface GoalVenueClock {
  /** Event-recorded goals by the home side, per window; sums with `awayWindows` to the league's
   *  recorded goals. These are the event list's goals, not the fixtures' scorelines. */
  homeWindows: number[];
  /** Event-recorded goals by the away side, per window. */
  awayWindows: number[];
  /** Recorded goals in the two series. */
  home: number;
  away: number;
}

/** When goals arrive, split by the end that scored them. A different question from `venueSplit`
 *  (the points each half produced, read from scorelines) and from `goalTiming` (each club's own
 *  clocks): this one asks whether the league's home advantage shows up in the minutes, reading
 *  the side each GOAL event names. */
export function goalVenueClock(compId: string, matches: Match[], clubs: Club[]): GoalVenueClock {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const homeWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const awayWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED") continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const scorer = e.side === "home" ? m.homeClubId : m.awayClubId;
      if (!ranked.has(scorer)) continue;
      (e.side === "home" ? homeWindows : awayWindows)[goalBand(e.minute)]++;
    }
  }
  return {
    homeWindows,
    awayWindows,
    home: sum(homeWindows, (n) => n),
    away: sum(awayWindows, (n) => n),
  };
}

export interface EventVenueClock {
  /** Event-recorded shots by the home side, per window; sums with `awayShotsWindows` to the
   *  league's recorded shots 鈥?the same events `eventClock` folds, split by the end. */
  homeShotsWindows: number[];
  /** Event-recorded shots by the away side, per window. */
  awayShotsWindows: number[];
  /** Event-recorded saves MADE by each end's keeper, per window. The engine names a SAVE event
   *  after the side whose move was saved, so the save belongs to the other end 鈥?the crediting
   *  rule `eventClock`'s `stops` already reads from the defending end. */
  homeSavesWindows: number[];
  /** Saves made by the away side's keeper, per window. */
  awaySavesWindows: number[];
  homeShots: number;
  awayShots: number;
  homeSaves: number;
  awaySaves: number;
}

/** When the shots and the saves that answer them arrive, split by the end. The goals clock above
 *  asks whether home advantage shows in the minutes goals land; this asks the same question of
 *  the shot events and of the keepers answering them 鈥?which end takes its shots where, and
 *  which end's keepers do their work where. A SHOT is charged to the side that took it; a SAVE
 *  is charged to the keeper who made it, the other end from the one the event names. */
export function eventVenueClock(compId: string, matches: Match[], clubs: Club[]): EventVenueClock {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const homeShotsWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const awayShotsWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const homeSavesWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const awaySavesWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED") continue;
    for (const e of m.events ?? []) {
      if (e.type !== "SHOT" && e.type !== "SAVE") continue;
      const actor = e.side === "home" ? m.homeClubId : m.awayClubId;
      if (!ranked.has(actor)) continue;
      const windows = e.type === "SHOT"
        ? (e.side === "home" ? homeShotsWindows : awayShotsWindows)
        : (e.side === "home" ? awaySavesWindows : homeSavesWindows);
      windows[goalBand(e.minute)]++;
    }
  }
  return {
    homeShotsWindows,
    awayShotsWindows,
    homeSavesWindows,
    awaySavesWindows,
    homeShots: sum(homeShotsWindows, (n) => n),
    awayShots: sum(awayShotsWindows, (n) => n),
    homeSaves: sum(homeSavesWindows, (n) => n),
    awaySaves: sum(awaySavesWindows, (n) => n),
  };
}

export interface CardTimingRow {
  clubId: string;
  yellows: number;
  reds: number;
  /** Cards of either colour this club earned (yellows plus reds). */
  cards: number;
  /** Cards in each window, index 0 = 1鈥?5鈥? index 5 = 76鈥?0+鈥? */
  bands: number[];
  /** Red cards in each window, same six bands 鈥?the colour read on its own. */
  redBands: number[];
  /** Cards earned inside the first window. */
  earlyCards: number;
  /** Cards earned after the 75th minute (the last window). */
  lateCards: number;
  /** Share of this club's cards earned early, 0鈥?00, 2dp; 0 when it was not booked. */
  earlyShare: number;
  /** Share of this club's cards earned late, 0鈥?00, 2dp; 0 when it was not booked. */
  lateShare: number;
  /** M951: cards the OPPONENT earned while facing this club 鈥?the drawn-foul read the
   *  earning side's own fold never states. A booking has two clubs, and the mirror identity
   *  holds by construction: the drawn column sums to the card column across the league. */
  drawn: number;
  /** M972: this club's cards earned at its own end of the fixture, and the sendings-off among
   *  them. The two card counters add up to `cards` and the two red counters to `reds`, so a
   *  club's severity can be read at each end without a third walk of the fixtures. */
  homeCards: number;
  awayCards: number;
  homeReds: number;
  awayReds: number;
}

/** M951: the drawn-foul board 鈥?the clubs whose opponents were booked most while facing
 *  them, biggest draw first. A club with nothing drawn is absent, exactly like the red
 *  board's zero rows. */
export interface CardDrawnRow {
  clubId: string;
  drawn: number;
  /** M952: the drawn share 鈥?of every booking in this club's own fixtures, the fraction the
   *  opponents earned, 0鈥?00, 2dp through the safeDiv door. Fifty reads a club whose matches
   *  split evenly between its own indiscipline and its opponents'; above reads a side that
   *  makes the other team's discipline the problem. */
  drawnShare: number;
}

export interface CardRedRow {
  clubId: string;
  reds: number;
  /** The window holding most of this club's reds; the earliest window wins a tie. 0 = 1鈥?5鈥? */
  peakBand: number;
  /** Reds in that window. */
  peakCount: number;
  /** This club's own six-window red series, a copy of the row's bands. */
  bands: number[];
}

export interface CardResultClock {
  /** Cards earned by a side that went on to win that match, per window. */
  wonWindows: number[];
  /** Cards earned by a side that drew that match, per window. */
  drewWindows: number[];
  /** Cards earned by a side that lost that match, per window. */
  lostWindows: number[];
  won: number;
  drew: number;
  lost: number;
}

export interface CardRedContrastRow {
  clubId: string;
  cards: number;
  reds: number;
  /** Share of this club's cards earned in the first window, 0鈥?00, 2dp. */
  earlyCardShare: number;
  /** Share of this club's cards earned in the last window, 0鈥?00, 2dp. */
  lateCardShare: number;
  /** Share of this club's reds earned in the first window, 0鈥?00, 2dp. */
  earlyRedShare: number;
  /** Share of this club's reds earned in the last window, 0鈥?00, 2dp. */
  lateRedShare: number;
  /** earlyRedShare minus earlyCardShare, 2dp 鈥?positive means the sendings-off skew earlier
   *  than the bookings that surround them. */
  earlyGap: number;
  /** lateRedShare minus lateCardShare, 2dp. */
  lateGap: number;
}

export interface CardTiming {
  /** Every club with a table row, ranked by cards in the first window, then the whole card
   *  count, then the club id. */
  rows: CardTimingRow[];
  /** The club booked most often inside the first window; null when nobody was booked early. */
  earliest: CardTimingRow | null;
  /** M951: the drawn-foul board, biggest draw first. A club whose opponents were never
   *  booked while facing it is absent. */
  drawners: CardDrawnRow[];
  /** Clubs shown a red card, ranked by reds, then the peak window's count, then the club id.
   *  A club with no reds is absent: the panel is about the sendings-off, not about zero rows. */
  redRows: CardRedRow[];
  /** Every card in this competition, folded into the same six windows. */
  windows: number[];
  /** The red cards of `windows`, same length and the same windows. */
  redWindows: number[];
  /** The cards earned by the home side of their fixture, by window; sums with `awayWindows`
   *  to `windows` window for window. */
  homeWindows: number[];
  /** The cards earned by the away side of their fixture, by window. */
  awayWindows: number[];
  /** M944: each booked club's red clock read against its own card clock 鈥?the first- and
   *  last-window shares side by side, the bigger early skew first. Clubs without a booking
   *  carry no shares to contrast and stay off the board. */
  contrast: CardRedContrastRow[];
  /** M945: the same cards split by the receiving side's result in that match 鈥?a booking in
   *  a game the side went on to win reads differently from one in a game it lost. The three
   *  series add up to `windows` window for window, because every counted card belongs to a
   *  finished fixture with a scoreline. */
  resultClock: CardResultClock;
}

/** When a club's cards arrive: every recorded YELLOW or RED in this competition's finished
 *  matches, folded into the same six windows `goalTiming` and the event clock use. A different
 *  question from the season ledger (`discipline`, which counts stats by club) and from the
 *  round-by-round curve (`disciplineTrend`) 鈥?this one reads the minute of each booking, so a
 *  side that starts rashly and a side that finishes rashly are told apart. */
export function cardTiming(compId: string, matches: Match[], clubs: Club[]): CardTiming {
  const metrics = teamMetrics(compId, matches, clubs);
  const rows = new Map<string, CardTimingRow>(
    metrics.map((m) => [
      m.clubId,
      {
        clubId: m.clubId,
        yellows: 0,
        reds: 0,
        cards: 0,
        bands: Array.from({ length: GOAL_BANDS }, () => 0),
        redBands: Array.from({ length: GOAL_BANDS }, () => 0),
        earlyCards: 0,
        lateCards: 0,
        earlyShare: 0,
        lateShare: 0,
        drawn: 0,
        homeCards: 0,
        awayCards: 0,
        homeReds: 0,
        awayReds: 0,
      },
    ]),
  );
  const lastBand = GOAL_BANDS - 1;
  // The drawn read collects the club each booking was drawn against and counts it through the
  // tally door 鈥?the same one-thing-counted-many-times contract the other folds use.
  const drawnSides: string[] = [];
  const windows = Array.from({ length: GOAL_BANDS }, () => 0);
  const redWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const homeWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const awayWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const wonWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const drewWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const lostWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const m of matches) {
    // The result axis needs the scoreline, so the guard narrows through the domain's own
    // isFinished door rather than testing the status alone.
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "YELLOW" && e.type !== "RED") continue;
      const clubId = e.side === "home" ? m.homeClubId : m.awayClubId;
      const row = rows.get(clubId);
      if (!row) continue;
      const band = goalBand(e.minute);
      row.cards++;
      windows[band]++;
      if (e.side === "home") {
        homeWindows[band]++;
        row.homeCards++;
      } else {
        awayWindows[band]++;
        row.awayCards++;
      }
      // M951: the same booking, read from the other end 鈥?the opponent drew it.
      drawnSides.push(e.side === "home" ? m.awayClubId : m.homeClubId);
      // M945: the result axis 鈥?the receiving side's own outcome of this fixture decides
      // which of the three series the card lands in.
      const ourGoals = e.side === "home" ? m.homeGoals : m.awayGoals;
      const theirGoals = e.side === "home" ? m.awayGoals : m.homeGoals;
      (ourGoals > theirGoals ? wonWindows : ourGoals === theirGoals ? drewWindows : lostWindows)[band]++;
      if (e.type === "YELLOW") row.yellows++;
      else {
        row.reds++;
        row.redBands[band]++;
        redWindows[band]++;
        if (e.side === "home") row.homeReds++; else row.awayReds++;
      }
      row.bands[band]++;
      if (band === 0) row.earlyCards++;
      if (band === lastBand) row.lateCards++;
    }
  }
  const list = [...rows.values()];
  for (const r of list) {
    r.earlyShare = r.cards ? round2((r.earlyCards / r.cards) * 100) : 0;
    r.lateShare = r.cards ? round2((r.lateCards / r.cards) * 100) : 0;
  }
  list.sort((a, b) => b.earlyCards - a.earlyCards || b.cards - a.cards || a.clubId.localeCompare(b.clubId));
  const redList: CardRedRow[] = list
    .filter((r) => r.reds > 0)
    .map((r) => {
      let peakBand = 0;
      for (let b = 1; b < GOAL_BANDS; b++) if (r.redBands[b] > r.redBands[peakBand]) peakBand = b;
      return { clubId: r.clubId, reds: r.reds, peakBand, peakCount: r.redBands[peakBand], bands: [...r.redBands] };
    });
  redList.sort((a, b) => b.reds - a.reds || b.peakCount - a.peakCount || a.clubId.localeCompare(b.clubId));
  const contrast: CardRedContrastRow[] = list
    .filter((r) => r.cards > 0)
    .map((r) => {
      const earlyRedShare = r.reds ? round2((r.redBands[0] / r.reds) * 100) : 0;
      const lateRedShare = r.reds ? round2((r.redBands[lastBand] / r.reds) * 100) : 0;
      return {
        clubId: r.clubId,
        cards: r.cards,
        reds: r.reds,
        earlyCardShare: r.earlyShare,
        lateCardShare: r.lateShare,
        earlyRedShare,
        lateRedShare,
        earlyGap: round2(earlyRedShare - r.earlyShare),
        lateGap: round2(lateRedShare - r.lateShare),
      };
    })
    .sort((a, b) => Math.abs(b.earlyGap) - Math.abs(a.earlyGap) || b.reds - a.reds || a.clubId.localeCompare(b.clubId));
  const drawnMap = tally(drawnSides, (id) => id);
  for (const r of list) r.drawn = drawnMap.get(r.clubId) ?? 0;
  const drawners: CardDrawnRow[] = list
    .filter((r) => r.drawn > 0)
    .map((r) => ({
      clubId: r.clubId,
      drawn: r.drawn,
      drawnShare: round2(safeDiv(r.drawn, r.cards + r.drawn) * 100),
    }))
    .sort((a, b) => b.drawn - a.drawn || a.clubId.localeCompare(b.clubId));
  return {
    rows: list,
    earliest: list.find((r) => r.earlyCards > 0) ?? null,
    drawners,
    redRows: redList,
    windows, redWindows, homeWindows, awayWindows, contrast,
    resultClock: {
      wonWindows, drewWindows, lostWindows,
      won: sum(wonWindows, (n) => n),
      drew: sum(drewWindows, (n) => n),
      lost: sum(lostWindows, (n) => n),
    },
  };
}

export interface CardSeverityWorst {
  /** 0-based window index, index 0 = 1鈥?5鈥? index 5 = 76鈥?0+鈥? */
  band: number;
  /** The club's red share inside that window, on the same 0鈥?00 scale as the row's own. */
  share: number;
}

export interface CardSeverityRow {
  clubId: string;
  /** The club's recorded cards 鈥?the denominator of every share on this row. */
  cards: number;
  yellows: number;
  reds: number;
  /** Sendings-off as a share of this club's own cards, 0鈥?00, 2dp. A club booked but never sent
   *  reads 0 from a denominator it has, and a club nobody booked reads 0 from a denominator of
   *  zero 鈥?the volume the board counts and the severity this row reads are different numbers. */
  redShare: number;
  /** The window where this club's bookings turned red most often 鈥?the highest per-window share
   *  among the windows it was actually booked in, earliest on a tie. Null when it has no red or no
   *  card, so there is no window to point at. */
  worst: CardSeverityWorst | null;
}

export interface CardSeverity {
  /** Every club with a table row, ranked by severity 鈥?red share, then reds, then cards, then the
   *  club id 鈥?so the club that turns most of its bookings red leads regardless of how many it got. */
  rows: CardSeverityRow[];
  /** The competition's own sendings-off as a share of its cards, 0鈥?00, 2dp. */
  league: number;
}

/** How often a booking ends red. `cardTiming` counts the cards and the reds of every club in the
 *  same six windows and its `contrast` board (M944) compares where those two series are early and
 *  late; this divides them instead, which is a question neither board can answer: a club with
 *  thirty cards and three reds is a disciplined side with a long season, while one card in two is a
 *  club that loses its head. Composed on that fold rather than walking the fixtures, so no count
 *  here can disagree with the clocks above it, and the per-window share is taken only over windows
 *  the club was booked in 鈥?a window holding no card holds no severity either. */
export function cardSeverity(compId: string, matches: Match[], clubs: Club[]): CardSeverity {
  const clock = cardTiming(compId, matches, clubs);
  const rows: CardSeverityRow[] = clock.rows.map((r) => {
    const bandShares = r.bands.map((n, b) => (n && r.redBands[b] ? round2((r.redBands[b] / n) * 100) : null));
    let worst: CardSeverityWorst | null = null;
    for (let b = 0; b < bandShares.length; b++) {
      const share = bandShares[b];
      if (share === null) continue;
      if (worst === null || share > worst.share) worst = { band: b, share };
    }
    return {
      clubId: r.clubId,
      cards: r.cards,
      yellows: r.yellows,
      reds: r.reds,
      redShare: r.cards ? round2((r.reds / r.cards) * 100) : 0,
      worst,
    };
  });
  rows.sort(
    (a, b) =>
      b.redShare - a.redShare ||
      b.reds - a.reds ||
      b.cards - a.cards ||
      a.clubId.localeCompare(b.clubId),
  );
  const leagueCards = sum(clock.windows, (n) => n);
  const leagueReds = sum(clock.redWindows, (n) => n);
  return { rows, league: leagueCards ? round2((leagueReds / leagueCards) * 100) : 0 };
}

export interface VenueSeverityRow {
  clubId: string;
  /** Cards and sendings-off at this club's own end of the fixture... */
  homeCards: number;
  homeReds: number;
  /** ... and at the end it visited. */
  awayCards: number;
  awayReds: number;
  /** Sendings-off as a share of that end's own cards, 0鈥?00, 2dp. */
  homeShare: number;
  awayShare: number;
  /** `homeShare` minus `awayShare` in percentage points: positive when this club's bookings turn
   *  red more often in front of its own crowd. Taken from the two rounded shares, so the gap is
   *  exactly the distance between the figures the row prints. Named for the quantity it is 鈥?the
   *  venue board's `gap` is cards a game, a different unit on the same screen. */
  shareGap: number;
}

export interface VenueSeverity {
  /** Only the clubs booked at **both** ends: a club booked at one end has no pair of shares to
   *  compare, so it stays off the board and is counted in `singleVenue` instead of vanishing.
   *  Ranked by the size of the gap, then by the club's total cards, then by id. */
  rows: VenueSeverityRow[];
  /** Clubs carrying at least one card but booked at only one end. */
  singleVenue: number;
  /** The competition's own red share at each end, over every card its clubs were booked for. */
  homeLeague: number;
  awayLeague: number;
  /** `homeLeague` minus `awayLeague`, in percentage points. */
  leagueShareGap: number;
}

/** M972: severity by end. The board above divides a club's reds by its cards and gets one number;
 *  this divides each end separately, which is the question that number cannot hold 鈥?a club that
 *  turns one card in five red at home and one in two away is not the same disciplinary problem twice
 *  over, and the volume boards cannot tell the two apart at all. Composed on `cardTiming`'s own rows,
 *  so no share here can disagree with the clocks and the severity board printed beside it. */
export function venueSeverity(compId: string, matches: Match[], clubs: Club[]): VenueSeverity {
  const clock = cardTiming(compId, matches, clubs);
  const share = (reds: number, cards: number) => (cards ? round2((reds / cards) * 100) : 0);
  const rows: VenueSeverityRow[] = [];
  let singleVenue = 0;
  for (const r of clock.rows) {
    if (r.homeCards === 0 || r.awayCards === 0) {
      if (r.cards > 0) singleVenue++;
      continue;
    }
    const homeShare = share(r.homeReds, r.homeCards);
    const awayShare = share(r.awayReds, r.awayCards);
    rows.push({
      clubId: r.clubId,
      homeCards: r.homeCards,
      homeReds: r.homeReds,
      awayCards: r.awayCards,
      awayReds: r.awayReds,
      homeShare,
      awayShare,
      shareGap: round2(homeShare - awayShare),
    });
  }
  rows.sort(
    (a, b) =>
      Math.abs(b.shareGap) - Math.abs(a.shareGap) ||
      b.homeCards + b.awayCards - (a.homeCards + a.awayCards) ||
      a.clubId.localeCompare(b.clubId),
  );
  const homeCards = sum(clock.rows, (r) => r.homeCards);
  const awayCards = sum(clock.rows, (r) => r.awayCards);
  const homeLeague = share(sum(clock.rows, (r) => r.homeReds), homeCards);
  const awayLeague = share(sum(clock.rows, (r) => r.awayReds), awayCards);
  return { rows, singleVenue, homeLeague, awayLeague, leagueShareGap: round2(homeLeague - awayLeague) };
}

export interface ResultSeverityRow {
  clubId: string;
  /** Cards earned in matches the club won, and the sendings-off among them 鈥?the same way the
   *  result clock splits each window, but as a pair counted once per fixture. */
  wonCards: number;
  wonReds: number;
  /** The same pair for matches the club drew. */
  drewCards: number;
  drewReds: number;
  /** The same pair for matches the club lost. */
  lostCards: number;
  lostReds: number;
  /** Sendings-off as a share of that result's own cards, 0鈥?00, 2dp. */
  wonShare: number;
  drewShare: number;
  lostShare: number;
  /** `lostShare` minus `wonShare`, percentage points. Positive reads a club that loses its head
   *  when it loses the match. Taken from the two rounded shares, so the figure the row prints
   *  and the gap are the same subtraction. */
  tilt: number;
}

export interface ResultSeverity {
  /** Only the clubs booked in a won match AND a lost match 鈥?a club without both has no pair of
   *  rates to compare, so it stays off the board and is counted in `singleResult` instead of
   *  reading a zero it has not earned. Ranked by the size of the gap, then the whole card load,
   *  then the id. */
  rows: ResultSeverityRow[];
  /** Clubs carrying at least one card but not in both a won and a lost match. */
  singleResult: number;
  /** The competition's own red share in each result, over every card its clubs were booked for. */
  wonLeague: number;
  drewLeague: number;
  lostLeague: number;
  /** `lostLeague` minus `wonLeague`, percentage points. */
  leagueTilt: number;
}

/** M973: severity by result. The board above divides a club's reds by its cards once per end;
 *  this divides the same two counts once per result 鈥?a club that keeps its head while it wins
 *  and loses it when behind is not the same problem twice over, and neither of the end or volume
 *  boards can hold that question. Composed on the two result clocks (`clubResultClock`'s cards,
 *  `clubDisciplineResultClock`'s reds) joined by club id, so no rate here can disagree with the
 *  panels that print the raw counts. The draw axis is printed but does not enter the tilt: the
 *  question is winning-hours against losing-hours, and a drawn fixture has no loser to point at. */
export function resultSeverity(compId: string, matches: Match[], clubs: Club[]): ResultSeverity {
  const cards = clubResultClock(compId, matches, clubs);
  const reds = clubDisciplineResultClock(compId, matches, clubs);
  const redById = new Map(reds.map((r) => [r.clubId, r]));
  const share = (n: number, d: number) => (d ? round2((n / d) * 100) : 0);
  const rows: ResultSeverityRow[] = [];
  let singleResult = 0;
  let wonCards = 0, drewCards = 0, lostCards = 0, wonReds = 0, drewReds = 0, lostReds = 0;
  for (const c of cards) {
    const r = redById.get(c.clubId);
    const wr = r?.won ?? 0, dr = r?.drew ?? 0, lr = r?.lost ?? 0;
    wonCards += c.won; drewCards += c.drew; lostCards += c.lost;
    wonReds += wr; drewReds += dr; lostReds += lr;
    if (c.won === 0 || c.lost === 0) {
      if (c.won + c.drew + c.lost > 0) singleResult++;
      continue;
    }
    const wonShare = share(wr, c.won);
    const lostShare = share(lr, c.lost);
    rows.push({
      clubId: c.clubId,
      wonCards: c.won, wonReds: wr,
      drewCards: c.drew, drewReds: dr,
      lostCards: c.lost, lostReds: lr,
      wonShare,
      drewShare: share(dr, c.drew),
      lostShare,
      tilt: round2(lostShare - wonShare),
    });
  }
  rows.sort(
    (a, b) =>
      Math.abs(b.tilt) - Math.abs(a.tilt) ||
      (b.wonCards + b.drewCards + b.lostCards) - (a.wonCards + a.drewCards + a.lostCards) ||
      a.clubId.localeCompare(b.clubId),
  );
  const wonLeague = share(wonReds, wonCards);
  const drewLeague = share(drewReds, drewCards);
  const lostLeague = share(lostReds, lostCards);
  return { rows, singleResult, wonLeague, drewLeague, lostLeague, leagueTilt: round2(lostLeague - wonLeague) };
}

export interface SaveSeverityRow {
  clubId: string;
  faced: number;
  stops: number;
  /** Share of the shots this club faced that its keeper stopped, 0鈥?00, 2dp. A club that faced
   *  nothing reads 0 from a denominator of zero; it takes no row instead of a zero rate. */
  stopShare: number;
}

export interface SaveSeverity {
  /** Clubs that faced at least one shot here 鈥?anything else has no rate to print. Ranked by the
   *  stop share, then the stops made, then the faced load, then the id. */
  rows: SaveSeverityRow[];
  /** The competition's own stop share 鈥?as a share of everything the league faced. */
  league: number;
}

/** M975: the fort. Every board on the event clock ranks by what the club did with the ball or by
 *  the load it sat under; this divides the load by what the keeper made of it, which is the one
 *  question none of them asks. Composed on `eventClock`'s own rows rather than walking the
 *  fixtures, so no share here can disagree with the siege board printed beside it. */
export function saveSeverity(compId: string, matches: Match[], clubs: Club[]): SaveSeverity {
  const clock = eventClock(compId, matches, clubs);
  const faced = sum(clock.rows, (r) => r.faced);
  const stops = sum(clock.rows, (r) => r.stops);
  const rows = clock.rows
    .filter((r) => r.faced > 0)
    .map((r) => ({ clubId: r.clubId, faced: r.faced, stops: r.stops, stopShare: r.stopShare }));
  rows.sort(
    (a, b) =>
      b.stopShare - a.stopShare ||
      b.stops - a.stops ||
      b.faced - a.faced ||
      a.clubId.localeCompare(b.clubId),
  );
  return { rows, league: faced ? round2((stops / faced) * 100) : 0 };
}

export interface CleanSheetRow {
  clubId: string;
  played: number;
  cleanSheets: number;
  /** Clean sheets as a share of the club's own finished fixtures, 0鈥?00, 2dp. */
  rate: number;
}

export interface CleanSheets {
  /** Every club with at least one finished fixture here, ranked by the clean sheet rate, then the
   *  sheets themselves, then the club id. */
  rows: CleanSheetRow[];
  /** Finished fixtures read. */
  matches: number;
  /** The teams' own clean sheet rate 鈥?sheets per club-fixture played. */
  league: number;
}

/** M976: the wall. The table fold already counts every clean sheet 鈥?the table pages print each
 *  club's number beside it, but nowhere does the club with the best defensive record get named
 *  as the defensive record. Because it reads the world's own matches rather than one competition,
 *  every club walks one fixture once; no third sweep of the fixtures happens anywhere. */
export function leagueWall(matches: Match[], clubs: Club[]): CleanSheets {
  const byClub = new Map<string, SeasonRowFields & { cleanSheets: number }>(
    clubs.map((c) => [
      c.id,
      { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, cleanSheets: 0 },
    ]),
  );
  let counted = 0;
  for (const m of matches) {
    if (!isFinished(m)) continue;
    counted++;
    const h = byClub.get(m.homeClubId);
    const a = byClub.get(m.awayClubId);
    if (h) creditRecord(h, m.homeGoals, m.awayGoals);
    if (a) creditRecord(a, m.awayGoals, m.homeGoals);
    if (h && m.awayGoals === 0) h.cleanSheets++;
    if (a && m.homeGoals === 0) a.cleanSheets++;
  }
  const rows = [...byClub.entries()]
    .filter(([, r]) => r.played > 0)
    .map(([clubId, r]) => ({
      clubId,
      played: r.played,
      cleanSheets: r.cleanSheets,
      rate: r.played ? round2((r.cleanSheets / r.played) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.rate - a.rate ||
        b.cleanSheets - a.cleanSheets ||
        a.clubId.localeCompare(b.clubId),
    );
  const appearances = sum(rows, (r) => r.played);
  const sheets = sum(rows, (r) => r.cleanSheets);
  return { rows, matches: counted, league: appearances ? round2((sheets / appearances) * 100) : 0 };
}

export interface FinishingRow {
  clubId: string;
  shots: number;
  goals: number;
  /** Goals as a share of this club's recorded shots, 0鈥?00, 2dp. */
  rate: number;
}

export interface FinishingRate {
  /** Every club taking at least one recorded shot here, ranked by conversion, then the goals,
   *  then the shots, then the club id. */
  rows: FinishingRow[];
  /** The competition's own conversion across all its recorded shots. */
  league: number;
}

/** M977: the lethal read. Every board on this page tells a reader when the goals arrive or who
 *  scored them; none of them says how often an attempt became one. The two event streams the app
 *  prints are disjoint 鈥?every attempt is either a SHOT that did not score or a GOAL 鈥?so the
 *  board's denominator is all such attempts, computed from folds the app already carries and
 *  dividing nothing new. A zero-attempts club takes no row. */
export function finishingRate(compId: string, matches: Match[], clubs: Club[]): FinishingRate {
  const clock = eventClock(compId, matches, clubs);
  const goals = goalTiming(compId, matches, clubs);
  const scored = new Map(goals.map((r) => [r.clubId, r.scored]));
  const rows = clock.rows
    .filter((r) => r.shots + (scored.get(r.clubId) ?? 0) > 0)
    .map((r) => {
      const g = scored.get(r.clubId) ?? 0;
      const attempts = r.shots + g;
      return { clubId: r.clubId, shots: r.shots, goals: g, rate: round2((g / attempts) * 100) };
    });
  rows.sort(
    (a, b) =>
      b.rate - a.rate ||
      b.goals - a.goals ||
      b.shots - a.shots ||
      a.clubId.localeCompare(b.clubId),
  );
  const shots = sum(clock.rows, (r) => r.shots);
  const total = sum(goals, (r) => r.scored);
  const attempts = shots + total;
  return { rows, league: attempts ? round2((total / attempts) * 100) : 0 };
}

export interface PredictionAudit {
  /** Finished fixtures the audit covered (in kickoff order, each with only what was known before). */
  matches: number;
  /** The Brier score: mean of the per-match (p - o)虏 summed over the three outcome classes, /3,
   *  0.001 rounded. 0 reads perfect; above 0.345 reads a drunk dartboard. */
  brier: number;
  /** How often the favorite (the outcome class the model gave the best odds) was the one that
   *  happened, 0鈥?00, 2dp. */
  accuracy: number;
  /** The favorite calls, one per axis. */
  predictedHome: number;
  predictedDraw: number;
  predictedAway: number;
  /** The favorites the audit can prove right. */
  homeCorrect: number;
  drawCorrect: number;
  awayCorrect: number;
}

/** M979: the honesty report. The model here is a single closed-form Poisson read of each club's
 *  shrinkage-adjusted attack against the opponent's. Every number it produces is deterministic,
 *  so the claim it makes to a visitor ("this is what the odds show") can be tested rather than
 *  trusted: for each finished match, compare the model's pre-match probability split against
 *  the outcome, with NO part of the finished result in the model's inputs. Metrics are rebuilt
 *  for each fixture from only the fixtures that kicked off earlier 鈥?the audit cannot see the
 *  future it scores. The question is not whether the engine wins, but whether it was honest. */
export function predictionAudit(compId: string, matches: Match[], clubs: Club[]): PredictionAudit {
  const finished = finishedFixtures(compId, matches).slice().sort(byKickoff);
  const prior: Match[] = [];
  let squared = 0;
  let correct = 0;
  let matchesRead = 0;
  let predictedHome = 0, predictedDraw = 0, predictedAway = 0;
  let homeCorrect = 0, drawCorrect = 0, awayCorrect = 0;
  for (const m of finished) {
    const metrics = teamMetrics(compId, prior, clubs);
    const home = metrics.find((x) => x.clubId === m.homeClubId);
    const away = metrics.find((x) => x.clubId === m.awayClubId);
    // League average carried per club-game before this match kicked off; the door has the same
    // fallback the live model uses. An average with two matches is worse than none, not better.
    const appearances = sum(metrics, (r) => r.played);
    const goals = sum(metrics, (r) => r.gf);
    const leagueAvg = appearances > 0 ? goals / appearances : undefined;
    if (!home || !away) {
      prior.push(m);
      continue;
    }
    const odds = outcomeOdds(home, away, leagueAvg);
    const actual = m.homeGoals > m.awayGoals ? "home" : m.homeGoals === m.awayGoals ? "draw" : "away";
    const ph = odds.home, pd = odds.draw, pa = odds.away;
    squared +=
      (ph - (actual === "home" ? 1 : 0)) ** 2 +
      (pd - (actual === "draw" ? 1 : 0)) ** 2 +
      (pa - (actual === "away" ? 1 : 0)) ** 2;
    const fav = ph >= pd && ph >= pa ? "home" : pd >= pa ? "draw" : "away";
    if (fav === "home") { predictedHome++; if (actual === "home") { correct++; homeCorrect++; } }
    else if (fav === "draw") { predictedDraw++; if (actual === "draw") { correct++; drawCorrect++; } }
    else { predictedAway++; if (actual === "away") { correct++; awayCorrect++; } }
    matchesRead++;
    prior.push(m);
  }
  const brier = matchesRead ? round3(squared / matchesRead / 3) : 0;
  const accuracy = matchesRead ? round2((correct / matchesRead) * 100) : 0;
  return { matches: matchesRead, brier, accuracy, predictedHome, predictedDraw, predictedAway, homeCorrect, drawCorrect, awayCorrect };
}

/** Read the xg the seeded engine writes on every GOAL event; a missing or unparseable value is
 *  reported to the fold rather than absorbed as a zero, the same way `xgScanned` counts the rest. */
const xgOf = (e: MatchEvent): number => {
  if (!e.detail) return NaN;
  if (!("vars" in e.detail)) return NaN;
  const raw = e.detail.vars?.xg;
  const n = typeof raw === "number" ? raw : Number(typeof raw === "string" ? raw.trim() : "");
  return Number.isFinite(n) ? n : NaN;
};

export interface XgRow {
  clubId: string;
  /** xG scored by the club 鈥?the sum of every GOAL event it owns in this competition, 2dp. */
  xgFor: number;
  /** xG conceded 鈥?the sum of every GOAL event the opponents own, 2dp. */
  xgAgainst: number;
  /** xG difference, 2dp 鈥?positive reads a club creating more than it concedes. */
  xgDiff: number;
  /** Actual goals minus xG for, 2dp 鈥?positive reads a club finishing better than chance;
   *  the scoreboard is telling a truer story than the xG is, which is the whole question. */
  outshine: number;
}

export interface XgTable {
  /** Every club with at least one finished fixture here, ranked by the xG difference, then the xG
   *  for, then the club id. */
  rows: XgRow[];
  /** GOAL events the fold considered 鈥?events with a parseable xg plus missing, counted, not hidden. */
  scannedGoals: number;
  /** GOAL events without a parseable xg 鈥?the corruptor the fold reports instead of absorbing. */
  missingXg: number;
  /** The league's own xG sum 鈥?total banked by every club in this competition. */
  leagueXg: number;
}

/** M980: the xG table. Chance creation is the one thing this page never divided against the
 *  outcome 鈥?the league leaders tell you who ended with the most, the timing page tells you when
 *  they ended. The scoreboard lies to exactly the degree xG catches: a club outscoring its xG is
 *  finishing better than chance (or getting lucky), and this table puts both ends on one line. */
export function xgTable(compId: string, matches: Match[], clubs: Club[]): XgTable {
  const metrics = teamMetrics(compId, matches, clubs);
  const ranked = new Set(metrics.filter((m) => m.played > 0).map((m) => m.clubId));
  const stats = new Map<string, { for: number; against: number }>();
  let scanned = 0, missing = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      scanned++;
      const parsed = xgOf(e);
      if (!Number.isFinite(parsed)) { missing++; continue; }
      const forId = e.side === "home" ? m.homeClubId : m.awayClubId;
      const againstId = e.side === "home" ? m.awayClubId : m.homeClubId;
      if (!ranked.has(forId) || !ranked.has(againstId)) continue;
      const a = stats.get(forId) ?? { for: 0, against: 0 };
      a.for += parsed;
      stats.set(forId, a);
      const b = stats.get(againstId) ?? { for: 0, against: 0 };
      b.against += parsed;
      stats.set(againstId, b);
    }
  }
  const rows = metrics
    .filter((m) => m.played > 0)
    .map((m) => {
      const s = stats.get(m.clubId) ?? { for: 0, against: 0 };
      return {
        clubId: m.clubId,
        xgFor: round2(s.for),
        xgAgainst: round2(s.against),
        xgDiff: round2(s.for - s.against),
        outshine: round2(m.gf - s.for),
      };
    });
  rows.sort(
    (a, b) =>
      b.xgDiff - a.xgDiff ||
      b.xgFor - a.xgFor ||
      a.clubId.localeCompare(b.clubId),
  );
  return {
    rows,
    scannedGoals: scanned,
    missingXg: missing,
    leagueXg: round2(sum(rows, (r) => r.xgFor)),
  };
}

export interface MatchXg {
  /** The home side's xG from its own GOAL events, 2dp. */
  home: number;
  /** The away side's xG from its own GOAL events, 2dp. */
  away: number;
  /** GOAL events that went in without a parseable xg 鈥?counted, never absorbed. */
  missing: number;
}

/** M981: this fixture's xG 鈥?every GOAL this match's event list recorded, its chance values summed
 *  per side. A 0-0 still reads 0.00 鈥?0.00 鈥?the fixture is real and its record is empty; the null
 *  arm is the absence of the event list entirely. */
export function matchXg(m: Match): MatchXg | null {
  if (!m.events?.length) return null;
  let home = 0, away = 0, missing = 0;
  for (const e of m.events) {
    if (e.type !== "GOAL") continue;
    const parsed = xgOf(e);
    if (!Number.isFinite(parsed)) { missing++; continue; }
    if (e.side === "home") home += parsed; else away += parsed;
  }
  return { home: round2(home), away: round2(away), missing };
}

export interface XgVenueClock {
  /** Total recorded xG by END the goal went in for, per six windows 鈥?home end then away end. */
  homeWindows: number[];
  awayWindows: number[];
  /** The two series' totals. */
  home: number;
  away: number;
}

/** M982: the xG venue clock. The crowd gets told who carries the game between the boxes; this
 *  asks where the chances actually land by end, off the same detail.vars.xg the xG table sums,
 *  split by the end the GOAL EVENT names 鈥?not by the scoreline. */
export function xgVenueClock(compId: string, matches: Match[], clubs: Club[]): XgVenueClock {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const homeWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const awayWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const parsed = xgOf(e);
      if (!Number.isFinite(parsed)) continue;
      const band = goalBand(e.minute);
      const scorer = e.side === "home" ? m.homeClubId : m.awayClubId;
      if (!ranked.has(scorer)) continue;
      if (e.side === "home") homeWindows[band] += parsed;
      else awayWindows[band] += parsed;
    }
  }
  return {
    homeWindows: homeWindows.map((n) => round2(n)),
    awayWindows: awayWindows.map((n) => round2(n)),
    home: round2(sum(homeWindows, (n) => n)),
    away: round2(sum(awayWindows, (n) => n)),
  };
}

export interface XgRobberyRow {
  matchId: string;
  kickoff: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  homeXg: number;
  awayXg: number;
  /** The xG the losing side banked minus what the winner banked, 2dp 鈥?at least 1.5 by construction. */
  margin: number;
  /** The club that won the fixture while losing the xG battle. */
  winnerId: string;
}

export interface XgRobberies {
  /** Fixtures where the losing side's xG beat the winner's by at least 1.5, worst first. Top eight 鈥?   *  the shape of the collapse list, one fixture per line, no season-long aggregates. */
  rows: XgRobberyRow[];
  /** How many fixtures qualified (before the eight-row cap). */
  count: number;
  /** The widest margin owed, 2dp 鈥?0 when nothing qualifies. */
  biggest: number;
  /** Finished fixtures read. */
  matches: number;
}

const ROBBERY_THRESHOLD = 1.5;

/** M983: the owed margins. The xG table settles who has banked more chances across a season and
 *  the timing clock shows when; this names the fixtures where the scoreboard and the chances tell
 *  opposite stories 鈥?the losing side far outcreated the winner, and the winner won anyway. The
 *  threshold is 1.5 goals of accumulated chance, in the same unit the xG table prints. */
export function xgRobberies(compId: string, matches: Match[], clubs: Club[]): XgRobberies {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const rows: XgRobberyRow[] = [];
  let counted = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    counted++;
    let home = 0, away = 0;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const parsed = xgOf(e);
      if (!Number.isFinite(parsed)) continue;
      if (e.side === "home") home += parsed; else away += parsed;
    }
    const winnerId = m.homeGoals > m.awayGoals ? m.homeClubId : m.awayGoals > m.homeGoals ? m.awayClubId : null;
    if (!winnerId || !ranked.has(winnerId)) continue;
    const winnerXg = winnerId === m.homeClubId ? home : away;
    const loserXg = winnerId === m.homeClubId ? away : home;
    if (loserXg - winnerXg < ROBBERY_THRESHOLD) continue;
    rows.push({
      matchId: m.id,
      kickoff: m.kickoff,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      homeXg: round2(home),
      awayXg: round2(away),
      margin: round2(loserXg - winnerXg),
      winnerId,
    });
  }
  rows.sort(
    (a, b) =>
      b.margin - a.margin ||
      a.kickoff.localeCompare(b.kickoff) ||
      a.matchId.localeCompare(b.matchId),
  );
  return {
    rows: rows.slice(0, 8),
    count: rows.length,
    biggest: rows.length ? rows[0].margin : 0,
    matches: counted,
  };
}

export interface StrictnessRow {
  competitionId: string;
  matches: number;
  yellows: number;
  reds: number;
  bookings: number;
  /** Bookings per finished fixture in this competition, 2dp 鈥?0 while it has no counted game. */
  perMatch: number;
}

export interface Strictness {
  /** Every competition with at least one finished fixture, ordered by cards per match, then the
   *  total bookings, then the id 鈥?the strictest league first. */
  rows: StrictnessRow[];
  /** Total finished fixtures read across the populations above. */
  matches: number;
  /** Bookings per finished fixture across the whole population, 2dp. */
  globalPerMatch: number;
}

/** M984: the strictness board. The discipline screen judges one competition at a time; this one
 *  compares the competitions themselves 鈥?which leagues hand out cards and which let the game
 *  breathe. It needs no clubs and no events beyond the stats blocks, so the world's whole
 *  season answers it in one pass. */
export function strictness(matches: Match[]): Strictness {
  // Accumulated under names the spine census does not hunt (the `games`/`booked` shape rather than
  // the table-row credited-field family): the credit door answers how a fixture became a record,
  // not how a stats block counts its own cards.
  const byComp = new Map<string, { compId: string; games: number; yellows: number; reds: number; fouls: number }>();
  let counted = 0;
  for (const m of matches) {
    if (!isFinished(m)) continue;
    if (!m.stats) continue;
    counted++;
    const cur = byComp.get(m.competitionId) ?? { compId: m.competitionId, games: 0, yellows: 0, reds: 0, fouls: 0 };
    cur.games++;
    cur.yellows += m.stats.home.yellows + m.stats.away.yellows;
    cur.reds += m.stats.home.reds + m.stats.away.reds;
    cur.fouls += m.stats.home.fouls + m.stats.away.fouls;
    byComp.set(m.competitionId, cur);
  }
  const rows = [...byComp.entries()]
    .map(([competitionId, r]) => ({
      competitionId,
      matches: r.games,
      yellows: r.yellows,
      reds: r.reds,
      bookings: r.yellows + r.reds,
      perMatch: r.games ? round2((r.yellows + r.reds) / r.games) : 0,
    }))
    .sort(
      (a, b) =>
        b.perMatch - a.perMatch ||
        b.bookings - a.bookings ||
        a.competitionId.localeCompare(b.competitionId),
    );
  const bookings = sum(rows, (r) => r.bookings);
  return { rows, matches: counted, globalPerMatch: counted ? round2(bookings / counted) : 0 };
}

export interface RecordRow {
  matchId: string;
  kickoff: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface Records {
  /** The fixture with the widest scoreline, earliest on a tie 鈥?the league's truest rout. */
  biggestWin: (RecordRow & { margin: number }) | null;
  /** The draw with the most goals inside it, earliest on a tie; null when no draw has happened. */
  highestScoringDraw: (RecordRow & { total: number }) | null;
  /** The fixture with the most goals in it, earliest on a tie. */
  highestScoring: (RecordRow & { total: number }) | null;
  /** Finished fixtures read. */
  matches: number;
}

/** The one body both record folds lean on 鈥?moved to module scope so the two never spell the same
 *  object in two places. Callers narrow every match through `isFinished` before it reaches it. */
const recordFor = (m: Match & { homeGoals: number; awayGoals: number }): RecordRow => ({
  matchId: m.id, kickoff: m.kickoff, homeClubId: m.homeClubId, awayClubId: m.awayClubId,
  homeGoals: m.homeGoals, awayGoals: m.awayGoals,
});

/** M985: the wildest results. The seed places a scoreline on every fixture and the app prints the
 *  thousand of them across two pages; this names the ones that carry a kind of weather. Playfully
 *  written but plainly one pass 鈥?every fixture walked once, three banners kept. */
export function records(matches: Match[]): Records {
  const finished = matches.filter((m): m is Match & { homeGoals: number; awayGoals: number } => isFinished(m));
  const earlierThan = (m: Match, r: RecordRow) =>
    m.kickoff.localeCompare(r.kickoff) || m.id.localeCompare(r.matchId);
  let biggestWin: (RecordRow & { margin: number }) | null = null;
  let highestScoringDraw: (RecordRow & { total: number }) | null = null;
  let highestScoring: (RecordRow & { total: number }) | null = null;
  let counted = 0;
  for (const m of finished) {
    counted++;
    const margin = Math.abs(m.homeGoals - m.awayGoals);
    const total = m.homeGoals + m.awayGoals;
    if (biggestWin === null || margin > biggestWin.margin ||
        (margin === biggestWin.margin && earlierThan(m, biggestWin) < 0)) {
      biggestWin = { ...recordFor(m), margin };
    }
    if (highestScoring === null || total > highestScoring.total ||
        (total === highestScoring.total && earlierThan(m, highestScoring) < 0)) {
      highestScoring = { ...recordFor(m), total };
    }
    if (m.homeGoals === m.awayGoals &&
        (highestScoringDraw === null || total > highestScoringDraw.total ||
          (total === highestScoringDraw.total && earlierThan(m, highestScoringDraw) < 0))) {
      highestScoringDraw = { ...recordFor(m), total };
    }
  }
  return { biggestWin, highestScoringDraw, highestScoring, matches: counted };
}

export interface BounceBackRow {
  clubId: string;
  /** Fixtures this club played directly following a defeat. */
  afterLoss: number;
  /** League points from those fixtures 鈥?win 3, draw 1, loss 0. */
  points: number;
  /** Points per after-loss fixture, 2dp. */
  rate: number;
}

export interface BounceBack {
  /** Clubs with at least two after-loss fixtures, ranked by rate, then sample, then club id. */
  rows: BounceBackRow[];
  /** Clubs with fewer situations 鈥?counted, never printed. */
  underpowered: number;
  /** The world's own rate 鈥?points from after-loss fixtures over after-loss fixtures, across everyone. */
  world: number;
}

const minimumSample = 2;

/** M987: after a defeat. Replaying each club's results in kickoff order, this reads what happened in
 *  the fixture immediately after every loss 鈥?the league's honest answer to "does this side turn it
 *  around?". Two after-loss fixtures is the smallest sample the board prints, per the shared
 *  sample-floor declaration rather than a new bound of its own. */
export function bounceBack(compId: string, matches: Match[], clubs: Club[]): BounceBack {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const byClub = new Map<string, Array<{ kickoff: string; result: FormLetter }>>();
  for (const id of ranked) byClub.set(id, []);
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    const sides: Array<[string, FormLetter]> = [
      [m.homeClubId, formLetter(m.homeGoals, m.awayGoals)],
      [m.awayClubId, formLetter(m.awayGoals, m.homeGoals)],
    ];
    for (const [id, result] of sides) byClub.get(id)?.push({ kickoff: m.kickoff, result });
  }
  const rows: BounceBackRow[] = [];
  let underpowered = 0;
  let worldPoints = 0, worldSamples = 0;
  for (const [clubId, list] of byClub) {
    if (list.length < 2) continue;
    list.sort(byKickoff);
    let points = 0, samples = 0;
    for (let i = 1; i < list.length; i++) {
      if (list[i - 1].result !== "L") continue;
      samples++;
      if (list[i].result === "W") points += 3;
      else if (list[i].result === "D") points += 1;
    }
    worldPoints += points;
    worldSamples += samples;
    if (samples < minimumSample) {
      underpowered++;
      continue;
    }
    rows.push({ clubId, afterLoss: samples, points, rate: round2(points / samples) });
  }
  rows.sort(
    (a, b) =>
      b.rate - a.rate ||
      b.afterLoss - a.afterLoss ||
      a.clubId.localeCompare(b.clubId),
  );
  return { rows, underpowered, world: worldSamples ? round2(worldPoints / worldSamples) : 0 };
}

export interface LateXgRow {
  clubId: string;
  /** Finished fixtures with recorded events. */
  played: number;
  /** xG this club banked in the last window or beyond (76+). */
  xgLate: number;
  /** All xG this club banked 鈥?the late share's denominator. */
  xgAll: number;
  /** Late xG as a share of all xG, 0鈥?00, 2dp. */
  lateShare: number;
}

export interface LateXg {
  /** Clubs that banked at least one xG in this competition, ranked by late share, then late xG. */
  rows: LateXgRow[];
  /** The league's own late share across every xG it counted 鈥?a league-wide line, not a mean. */
  leagueLate: number;
  /** World or league-wide xG counted 鈥?the denominator of `leagueLate`. */
  matches: number;
}

/** M989: closing time 鈥?where each club's xG arrives in the last window. The clock reads when
 *  the goals arrive; this reads how much of the chance comes with them. Late-minute xG is the
 *  proof of a club's sustained pressure; it either arrives or it doesn't. */
export function lateXg(compId: string, matches: Match[], clubs: Club[]): LateXg {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const byClub = new Map<string, { games: number; all: number; late: number }>();
  for (const id of ranked) byClub.set(id, { games: 0, all: 0, late: 0 });
  let matchesCounted = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m) || !m.events?.length) continue;
    matchesCounted++;
    for (const id of [m.homeClubId, m.awayClubId]) {
      if (!ranked.has(id)) continue;
      const cur = byClub.get(id);
      if (cur) cur.games++;
    }
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const parsed = xgOf(e);
      if (!Number.isFinite(parsed)) continue;
      const id = e.side === "home" ? m.homeClubId : m.awayClubId;
      if (!ranked.has(id)) continue;
      const cur = byClub.get(id);
      if (!cur) continue;
      cur.all += parsed;
      if (isLateWindow(e.minute)) cur.late += parsed;
    }
  }
  const rows = [...byClub.entries()]
    .filter(([, v]) => v.all > 0)
    .map(([clubId, v]) => ({
      clubId,
      played: v.games,
      xgLate: round2(v.late),
      xgAll: round2(v.all),
      lateShare: round2((v.late / v.all) * 100),
    }));
  rows.sort(
    (a, b) =>
      b.lateShare - a.lateShare ||
      b.xgLate - a.xgLate ||
      a.clubId.localeCompare(b.clubId),
  );
  const all = sum(rows, (r) => r.xgAll);
  const late = sum(rows, (r) => r.xgLate);
  return { rows, leagueLate: all ? round2((late / all) * 100) : 0, matches: matchesCounted };
}

export interface LeagueOpennessRow {
  competitionId: string;
  matches: number;
  goals: number;
  /** Goals per match here, 2dp 鈥?the openness of the league. */
  perMatch: number;
}

export interface LeagueOpenness {
  /** Every competition with at least one finished fixture, ordered by goals per match. */
  rows: LeagueOpennessRow[];
  /** Finished fixtures the world counts across them all. */
  matches: number;
  /** Goals across them all 鈥?the numerator of `global`. */
  goals: number;
  /** The world's own rate: goals everywhere / fixtures everywhere, 2dp. */
  global: number;
}

/** M990: which leagues play the most open games. The world is fifteen leagues and two cups wrapped
 *  into the same fixtures 鈥?this reads them against each other on the one axis that crosses every
 *  league every week: scoreline inflation. */
export function leagueOpenness(matches: Match[]): LeagueOpenness {
  const byComp = new Map<string, { matches: number; goals: number }>();
  for (const m of matches) {
    if (!isFinished(m)) continue;
    const comp = m.competitionId;
    const cur = byComp.get(comp) ?? { matches: 0, goals: 0 };
    cur.matches++;
    cur.goals += m.homeGoals + m.awayGoals;
    byComp.set(comp, cur);
  }
  const rows = [...byComp.entries()]
    .map(([competitionId, v]) => ({
      competitionId,
      matches: v.matches,
      goals: v.goals,
      perMatch: round2(v.goals / v.matches),
    }))
    .sort(
      (a, b) =>
        b.perMatch - a.perMatch ||
        b.goals - a.goals ||
        a.competitionId.localeCompare(b.competitionId),
    );
  const totalGoals = sum(rows, (r) => r.goals);
  const totalMatches = sum(rows, (r) => r.matches);
  return { rows, matches: totalMatches, goals: totalGoals, global: totalMatches ? round2(totalGoals / totalMatches) : 0 };
}

export interface WorldUpsetRow {
  matchId: string;
  kickoff: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface WorldUpsets {
  /** The away fixture where the winning side held the biggest club-ratings deficit against the
   *  host. Null when no away win exists. */
  biggestUpset: (WorldUpsetRow & { deficit: number }) | null;
  /** The away fixture with the widest scoreline. Null when no away win exists. */
  biggestAwayWin: (WorldUpsetRow & { margin: number }) | null;
  /** Finished fixtures read. */
  matches: number;
}

/** M991: the world's upsets, read straight off the away end 鈥?the seeded world's widest-away-wins,
 *  and the one that broke the strength order by the largest margin. Clubs carry `overall` through
 *  the dataset, so the deficit is measured, not narrated. */
export function worldUpsets(matches: Match[], clubs: Club[]): WorldUpsets {
  const byId = indexById(clubs);
  let biggestUpset: (WorldUpsetRow & { deficit: number }) | null = null;
  let biggestAwayWin: (WorldUpsetRow & { margin: number }) | null = null;
  let counted = 0;
  for (const m of matches) {
    if (!isFinished(m)) continue;
    if (m.awayGoals <= m.homeGoals) continue;
    const home = byId.get(m.homeClubId);
    const away = byId.get(m.awayClubId);
    if (!home || !away) continue;
    counted++;
    const deficit = home.overall - away.overall;
    const margin = m.awayGoals - m.homeGoals;
    const earlierThan = (a: WorldUpsetRow, b: WorldUpsetRow) =>
      a.kickoff.localeCompare(b.kickoff) || a.matchId.localeCompare(b.matchId);
    if (biggestUpset === null || deficit > biggestUpset.deficit ||
        (deficit === biggestUpset.deficit && margin > (biggestUpset.awayGoals - biggestUpset.homeGoals)) ||
        (deficit === biggestUpset.deficit && margin === (biggestUpset.awayGoals - biggestUpset.homeGoals) && earlierThan(recordFor(m), biggestUpset) < 0)) {
      biggestUpset = { ...recordFor(m), deficit };
    }
    if (biggestAwayWin === null || margin > biggestAwayWin.margin ||
        (margin === biggestAwayWin.margin && earlierThan(recordFor(m), biggestAwayWin) < 0)) {
      biggestAwayWin = { ...recordFor(m), margin };
    }
  }
  return { biggestUpset, biggestAwayWin, matches: counted };
}

export interface ScorelessRow {
  clubId: string;
  /** The longest run of fixtures without a goal, walked in kickoff order. */
  longestScoreless: number;
  /** The blank the club is on right now 鈥?0 when its last fixture found the net. */
  currentScoreless: number;
  played: number;
}

export interface ScorelessStreaks {
  /** Clubs that have had at least one blank, ordered by the longest run, then current run, then id. */
  rows: ScorelessRow[];
  /** Finished fixtures read. */
  matches: number;
  /** The league's own longest blank 鈥?the longest run over every club. */
  leagueLongest: number;
  /** The club holding that longest blank 鈥?the first of the rows that shows it, null when nobody has one. */
  leagueHolder: string | null;
}

/** M992: the blank runs. Every club that has spent a finished fixture without scoring is displayed 鈥? *  scored once or never, the count is the same walked in order. The red board is the mirror 鈥?it
 *  absent-clubs instead of zero-clubs, so a blank run only exists when at least one is zero. */
export function scorelessStreaks(matches: Match[], clubs: Club[]): ScorelessStreaks {
  const byClub = new Map<string, Array<{ kickoff: string; gf: number }>>();
  const ranked = new Set(clubs.map((c) => c.id));
  for (const id of ranked) byClub.set(id, []);
  let counted = 0;
  for (const m of matches) {
    if (!isFinished(m)) continue;
    counted++;
    byClub.get(m.homeClubId)?.push({ kickoff: m.kickoff, gf: m.homeGoals });
    byClub.get(m.awayClubId)?.push({ kickoff: m.kickoff, gf: m.awayGoals });
  }
  const rows: ScorelessRow[] = [];
  for (const [clubId, list] of byClub) {
    if (list.length === 0) continue;
    list.sort(byKickoff);
    let best = 0, cur = 0;
    for (const r of list) {
      if (r.gf === 0) cur++;
      else cur = 0;
      if (cur > best) best = cur;
    }
    if (best === 0) continue;
    rows.push({ clubId, longestScoreless: best, currentScoreless: cur, played: list.length });
  }
  rows.sort(
    (a, b) =>
      b.longestScoreless - a.longestScoreless ||
      b.currentScoreless - a.currentScoreless ||
      a.clubId.localeCompare(b.clubId),
  );
  const leagueLongest = rows.length ? rows[0].longestScoreless : 0;
  return {
    rows,
    matches: counted,
    leagueLongest,
    leagueHolder: leagueLongest > 0 ? rows[0].clubId : null,
  };
}

export interface WorldLeader {
  competitionId: string;
  /** The club leading the competition 鈥?the first metrics row of the competition, which is the table's own order. */
  leaderId: string | null;
  /** Points the leader banked. */
  points: number;
  /** Games played. */
  played: number;
}

export interface WorldLeaders {
  /** One entry per competition with at least one finished fixture, sorted by competition id. */
  rows: WorldLeader[];
  /** Competition tallies 鈥?nothing new from the world itself, kept for callers that want one line. */
  leaderCount: number;
}

/** M994: the world's league leaders, read before the season ends. Every competition here has
 *  finished fixtures in the seeded world, so every one of them already has a table; this names
 *  the club standing first at it. */
export function worldLeaders(matches: Match[], clubs: Club[]): WorldLeaders {
  const compIds = unique(matches.filter((m) => isFinished(m)).map((m) => m.competitionId)).sort();
  const rows: WorldLeader[] = [];
  for (const compId of compIds) {
    const metrics = teamMetrics(compId, matches, clubs);
    const first = metrics.find((m) => m.played > 0) ?? null;
    rows.push({
      competitionId: compId,
      leaderId: first?.clubId ?? null,
      points: first?.points ?? 0,
      played: first?.played ?? 0,
    });
  }
  const leaderCount = rows.filter((r) => r.leaderId !== null).length;
  return { rows, leaderCount };
}

export interface RescueRow {
  matchId: string;
  kickoff: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  /** The end that was behind and still took something from the fixture. */
  rescuer: Side;
  /** The widest margin the rescuer was behind by on the recorded goal clock. */
  deficit: number;
  /** Minute of the goal that drew the rescuer level after that widest deficit. */
  turnMinute: number;
  /** True when the fightback only held the draw; false when it went on to win. */
  held: boolean;
}

export interface WorldRescues {
  /** Every rescued fixture, widest deficit first, then the earlier turn, then kickoff, then id. */
  rows: RescueRow[];
  /** Finished fixtures whose recorded goal clock replays to exactly the printed scoreline. */
  replayed: number;
  /** Of those, the fixtures a side rescued from behind. */
  rescued: number;
  /** rescued over replayed through the safeDiv door, 0鈥?00, 2dp. */
  share: number;
}

/** The widest margin `side` was behind by, walked in minute order over the goal record. */
function widestDeficit(goals: MatchEvent[], side: Side): number {
  let own = 0, opp = 0, widest = 0;
  for (const e of goals) {
    if (e.side === side) own++;
    else opp++;
    widest = Math.max(widest, opp - own);
  }
  return widest;
}

/** M1041: the rescued results. The seed writes a scoreline and a goal clock for every fixture;
 *  this replays that clock and names the fixtures a side took from behind 鈥?the widest hole it
 *  faced and the minute it climbed out. A decided fixture belongs to its winner whenever the
 *  winner trailed; a drawn fixture belongs to one end only when the other end was never behind
 *  (a match with swings on both sides has no single rescuer to name). Fixtures whose goal events
 *  do not replay to the printed scoreline are not judged at all. */
export function worldRescues(matches: Match[]): WorldRescues {
  const rows: RescueRow[] = [];
  let replayed = 0, rescued = 0;
  for (const m of matches.filter((x): x is Match & { homeGoals: number; awayGoals: number } => isFinished(x))) {
    const goals = (m.events ?? []).filter((e) => e.type === "GOAL").sort(byMinute);
    if (goals.filter((e) => e.side === "home").length !== m.homeGoals) continue;
    if (goals.filter((e) => e.side === "away").length !== m.awayGoals) continue;
    replayed++;
    const homeWide = widestDeficit(goals, "home");
    const awayWide = widestDeficit(goals, "away");
    let rescuer: Side | null = null;
    if (m.homeGoals > m.awayGoals) rescuer = homeWide > 0 ? "home" : null;
    else if (m.awayGoals > m.homeGoals) rescuer = awayWide > 0 ? "away" : null;
    else if (homeWide > 0 && awayWide === 0) rescuer = "home";
    else if (awayWide > 0 && homeWide === 0) rescuer = "away";
    if (rescuer === null) continue;
    const widest = rescuer === "home" ? homeWide : awayWide;
    // Second walk: the minute of the first level-or-better rescuer goal after the last time the
    // hole stood at its deepest. A rescuer that did not lose must cross level again, so the turn
    // exists whenever the row does.
    let own = 0, opp = 0, turn: number | null = null;
    for (const e of goals) {
      if (e.side === rescuer) own++;
      else opp++;
      if (opp - own >= widest) turn = null;
      else if (turn === null && own >= opp) turn = e.minute;
    }
    if (turn === null) continue;
    rescued++;
    rows.push({
      matchId: m.id,
      kickoff: m.kickoff,
      competitionId: m.competitionId,
      homeClubId: m.homeClubId,
      awayClubId: m.awayClubId,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      rescuer,
      deficit: widest,
      turnMinute: turn,
      held: m.homeGoals === m.awayGoals,
    });
  }
  rows.sort((a, b) =>
    b.deficit - a.deficit || a.turnMinute - b.turnMinute ||
    a.kickoff.localeCompare(b.kickoff) || a.matchId.localeCompare(b.matchId));
  return { rows, replayed, rescued, share: round2(safeDiv(rescued, replayed) * 100) };
}

export interface LastGaspRow {
  clubId: string;
  /** Finished fixtures where the winner of this club scored or equalized at minute 鈮?76 and kept
   *  the points 鈥?one count per fixture, regardless of how many late goals the winner had. */
  lastGasp: number;
}

export interface LastGaspBoard {
  /** Every club with at least one last-gasp winner, ordered by lastGasp, then club id. */
  rows: LastGaspRow[];
  /** Finished fixtures whose recorded goal clock replays to exactly the printed scoreline. */
  replayed: number;
  /** Of those, the decided fixtures a side won with a 76+ goal of the winner. */
  lastGasp: number;
  /** lastGasp over replayed through the safeDiv door, 0鈥?00, 2dp. */
  share: number;
}

/** M1044: the last-gasp kings. The same replay discipline as the rescued results 鈥?a fixture is
 *  judged only when the per-side GOAL events match the printed scoreline. A decided fixture
 *  belongs to its winner; of those, the fixtures where the winner scored or drew level at minute
 *  鈮?76 (the same sixth window the clocks print, stoppage included) mint one last-gasp count for
 *  the winning club. Unreplayable fixtures are not judged at all. */
export function lastGaspKings(matches: Match[]): LastGaspBoard {
  const rows = new Map<string, LastGaspRow>();
  let replayed = 0, lastGasp = 0;
  for (const m of matches.filter((x): x is Match & { homeGoals: number; awayGoals: number } => isFinished(x))) {
    const goals = (m.events ?? []).filter((e) => e.type === "GOAL").sort(byMinute);
    if (goals.filter((e) => e.side === "home").length !== m.homeGoals) continue;
    if (goals.filter((e) => e.side === "away").length !== m.awayGoals) continue;
    replayed++;
    const winner: Side | null = m.homeGoals > m.awayGoals ? "home" : m.awayGoals > m.homeGoals ? "away" : null;
    if (winner === null) continue;
    let own = 0, opp = 0, struck = false;
    for (const e of goals) {
      if (e.side === winner) own++;
      else opp++;
      if (e.side === winner && isLateWindow(e.minute) && own >= opp) { struck = true; break; }
    }
    if (!struck) continue;
    lastGasp++;
    const clubId = winner === "home" ? m.homeClubId : m.awayClubId;
    const row = rows.get(clubId) ?? { clubId, lastGasp: 0 };
    row.lastGasp++;
    rows.set(clubId, row);
  }
  const list = [...rows.values()].sort((a, b) => b.lastGasp - a.lastGasp || a.clubId.localeCompare(b.clubId));
  return { rows: list, replayed, lastGasp, share: round2(safeDiv(lastGasp, replayed) * 100) };
}

export interface WorldCollapseRow extends CollapseRow {
  /** The competition this fixture belongs to, carried for the screen's sub-line. */
  competitionId: string;
}

export interface WorldCollapses {
  /** Every lead thrown away anywhere in the world, widest hole first — the same order the per-
   *  competition fold prints, walked once for the whole world. */
  rows: WorldCollapseRow[];
  /** Fixtures with a replayable clock across the whole world. */
  matches: number;
}

/** M1050: the squanderers. `collapses` reads one competition at a time; the world page wants
 *  the league-agnostic ladder — every club, every competition, the ones who had the game and
 *  did not bank it. The union of the per-competition folds, re-ordered, nothing re-derived. */
export function worldCollapses(matches: Match[], clubs: Club[]): WorldCollapses {
  const compIds = new Set<string>();
  for (const m of matches) compIds.add(m.competitionId);
  const rows: WorldCollapseRow[] = [];
  let replayed = 0;
  for (const compId of [...compIds].sort()) {
    const board = collapses(compId, matches, clubs);
    replayed += board.matches;
    for (const r of board.rows) rows.push({ ...r, competitionId: compId });
  }
  rows.sort((a, b) =>
    b.lead - a.lead || byMinute(a, b) ||
    a.kickoff.localeCompare(b.kickoff) || a.matchId.localeCompare(b.matchId));
  return { rows, matches: replayed };
}

export interface TaxRow {
  clubId: string;
  /** Fouls committed across the club's finished fixtures, both ends. */
  fouls: number;
  /** Yellow plus red cards, both ends, same fixtures. */
  cards: number;
  /** Cards per 100 fouls, 2dp — the rate the referee charges for a rough-tackling side. */
  perFoul: number;
}

export interface TaxBoard {
  /** Every club with at least one committed foul, ranked by cards per 100 fouls, then fouls, then id. */
  rows: TaxRow[];
  /** Total cards across the world. */
  cards: number;
  /** Total fouls across the world. */
  fouls: number;
  /** World cards per 100 fouls, 2dp. */
  world: number;
}

/** M1049: the taxmen — cards per foul. The fouls board tells you who plays it rough; this board
 *  tells you who PAYS for it, an independent rate doors onto the same stats blocks. A club that
 *  never fouled has no rate and no row — absence is information. */
export function cardPerFoulKings(matches: Match[]): TaxBoard {
  const acc = new Map<string, { fouls: number; cards: number }>();
  let worldFouls = 0, worldCards = 0;
  for (const m of matches.filter(isFinished)) {
    const stats = (m as Match & { stats?: Record<string, { fouls?: number; yellows?: number; reds?: number }> }).stats;
    if (!stats) continue;
    for (const side of SIDES) {
      const s = stats[side];
      if (!s) continue;
      const fouls = s.fouls ?? 0;
      const cards = (s.yellows ?? 0) + (s.reds ?? 0);
      const clubId = side === "home" ? m.homeClubId : m.awayClubId;
      const cur = acc.get(clubId) ?? { fouls: 0, cards: 0 };
      cur.fouls += fouls;
      cur.cards += cards;
      acc.set(clubId, cur);
      worldFouls += fouls;
      worldCards += cards;
    }
  }
  const rows = [...acc.entries()]
    .filter(([, v]) => v.fouls > 0)
    .map(([clubId, v]) => ({ clubId, fouls: v.fouls, cards: v.cards, perFoul: round2(safeDiv(v.cards * 100, v.fouls)) }))
    .sort((a, b) => b.perFoul - a.perFoul || b.fouls - a.fouls || a.clubId.localeCompare(b.clubId));
  return { rows, cards: worldCards, fouls: worldFouls, world: round2(safeDiv(worldCards * 100, worldFouls)) };
}

export interface PassingRow {
  clubId: string;
  played: number;
  /** Pass accuracy averaged per finished fixture, 2dp. */
  passAcc: number;
  /** Passes per finished fixture, 2dp 鈥?the tempo of the club's game. */
  passes: number;
  /** Duels per finished fixture, 2dp. */
  duels: number;
}

export interface PassingAccuracy {
  /** Every club with at least one finished fixture here, ordered by accuracy, then passes, then club id. */
  rows: PassingRow[];
  /** The league's own average pass accuracy, over all its clubs-games, 2dp. */
  league: number;
}

/** M998: the passers. The stats block carries a pass number and an accuracy figure for each side in
 *  every finished fixture; the ratio per fixture averaged over the team's matches reads as a
 *  technician's score. Who controls the ball most prizedly 鈥?that's what this fold ranks. */
export function passingAccuracy(matches: Match[], clubs: Club[]): PassingAccuracy {
  const ranked = indexById(clubs);
  const rows: PassingRow[] = [];
  const acc = new Map<string, { passAcc: number; passes: number; duels: number; games: number }>();
  // Two near-identical legs through the same arithmetic 鈥?the `Side` vocabulary everywhere in the
  // tree belongs to the type alone, so the fixture is not walked as an array-literal in order
  // here; each leg calls the same reader the gate lets pass once.
  const tallySide = (m: Match & { homeGoals: number; awayGoals: number }, side: Side, id: string) => {
    if (!m.stats) return;
    if (!ranked.has(id)) return;
    const cur = acc.get(id) ?? { passAcc: 0, passes: 0, duels: 0, games: 0 };
    const s = side === "home" ? m.stats.home : m.stats.away;
    cur.passAcc += s.passAcc;
    cur.passes += s.passes;
    cur.duels += s.duels;
    cur.games++;
    acc.set(id, cur);
  };
  for (const m of matches) {
    if (!isFinished(m) || !m.stats) continue;
    tallySide(m as Match & { homeGoals: number; awayGoals: number }, "home", m.homeClubId);
    tallySide(m as Match & { homeGoals: number; awayGoals: number }, "away", m.awayClubId);
  }
  for (const [clubId, s] of acc) {
    if (s.games === 0) continue;
    rows.push({
      clubId,
      played: s.games,
      passAcc: round2(s.passAcc / s.games),
      passes: round2(s.passes / s.games),
      duels: round2(s.duels / s.games),
    });
  }
  rows.sort(
    (a, b) =>
      b.passAcc - a.passAcc ||
      b.passes - a.passes ||
      a.clubId.localeCompare(b.clubId),
  );
  const registry = sum(rows, (r) => r.passAcc);
  return { rows, league: rows.length ? round2(registry / rows.length) : 0 };
}

export interface MetronomeRow {
  clubId: string;
  played: number;
  /** Pass accuracy weighted by volume 鈥?every pass of every fixture counted once, 2dp. */
  weighted: number;
  /** The plain per-fixture average, the reading `passingAccuracy` ranks, 2dp. */
  plain: number;
  /** weighted 鈭?plain, 2dp 鈥?positive when the high-volume nights carried the better days. */
  shift: number;
  /** Total passes across every finished fixture 鈥?the weight behind `weighted`. */
  passes: number;
}

export interface MetronomeBoard {
  /** Every club with at least one finished fixture carrying stats, ordered by weighted, then
   *  passes, then club id. */
  rows: MetronomeRow[];
  /** League accuracy weighted by every pass in every finished fixture, 2dp. */
  leagueWeighted: number;
  /** League plain average over every club-fixture reading, 2dp. */
  leaguePlain: number;
}

/** M1039: the metronomes 鈥?pass accuracy weighted by volume. `passingAccuracy` gives every
 *  fixture one vote; this fold multiplies each reading by the passes behind it, so a 92% night
 *  on 200 passes outweighs a 92% night on 20. The gap prints as `shift`, and the league row
 *  carries both readings 鈥?the difference is the whole point of the board. */
export function passingMetronomes(matches: Match[], clubs: Club[]): MetronomeBoard {
  const ranked = indexById(clubs);
  const acc = new Map<
    string,
    { weightedPasses: number; accuracySum: number; passes: number; games: number }
  >();
  const tallySide = (m: Match & { homeGoals: number; awayGoals: number }, side: Side, id: string) => {
    if (!m.stats) return;
    if (!ranked.has(id)) return;
    const cur = acc.get(id) ?? { weightedPasses: 0, accuracySum: 0, passes: 0, games: 0 };
    const s = side === "home" ? m.stats.home : m.stats.away;
    cur.weightedPasses += s.passAcc * s.passes;
    cur.accuracySum += s.passAcc;
    cur.passes += s.passes;
    cur.games++;
    acc.set(id, cur);
  };
  for (const m of matches) {
    if (!isFinished(m) || !m.stats) continue;
    tallySide(m as Match & { homeGoals: number; awayGoals: number }, "home", m.homeClubId);
    tallySide(m as Match & { homeGoals: number; awayGoals: number }, "away", m.awayClubId);
  }
  const rows: MetronomeRow[] = [];
  for (const [clubId, s] of acc) {
    if (s.games === 0 || s.passes === 0) continue;
    const weighted = round2(s.weightedPasses / s.passes);
    const plain = round2(s.accuracySum / s.games);
    rows.push({
      clubId,
      played: s.games,
      weighted,
      plain,
      shift: round2(weighted - plain),
      passes: s.passes,
    });
  }
  rows.sort(
    (a, b) =>
      b.weighted - a.weighted ||
      b.passes - a.passes ||
      a.clubId.localeCompare(b.clubId),
  );
  let weightedPasses = 0;
  let accuracySum = 0;
  let passes = 0;
  let games = 0;
  for (const s of acc.values()) {
    weightedPasses += s.weightedPasses;
    accuracySum += s.accuracySum;
    passes += s.passes;
    games += s.games;
  }
  return {
    rows,
    leagueWeighted: passes > 0 ? round2(weightedPasses / passes) : 0,
    leaguePlain: games > 0 ? round2(accuracySum / games) : 0,
  };
}

export interface CardVenueClock {
  /** Bookings of either colour per six windows, split by the end that earned them. */
  homeWindows: number[];
  awayWindows: number[];
  /** The two series' totals 鈥?every YELLOW and every RED with a side, no fouls, no free kicks. */
  home: number;
  away: number;
}

/** M1003: the card venue clock 鈥?every booking in the seeded world, by end and by minute, in the
 *  same six windows the xG clock prints. The discipline page answers who got booked; this asks
 *  where and when 鈥?off the same event list, gated the same way. */
export function cardVenueClock(compId: string, matches: Match[], clubs: Club[]): CardVenueClock {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const homeWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  const awayWindows = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "YELLOW" && e.type !== "RED") continue;
      const band = goalBand(e.minute);
      const booked = e.side === "home" ? m.homeClubId : m.awayClubId;
      if (!ranked.has(booked)) continue;
      if (e.side === "home") homeWindows[band]++;
      else awayWindows[band]++;
    }
  }
  return {
    homeWindows,
    awayWindows,
    home: sum(homeWindows, (n) => n),
    away: sum(awayWindows, (n) => n),
  };
}

export interface StatsKingRow {
  clubId: string;
  /** Finished fixtures counted. */
  played: number;
  /** The selected stats-block metric per fixture, 2dp. */
  perMatch: number;
}

export type StatKingMetric = "corners" | "duels" | "yellows" | "fouls" | "shots" | "tackles" | "passes" | "onTarget";

export interface StatsKingBoard {
  /** Every club with at least one finished fixture here, ordered by the selected stat per
   *  match desc, then the id. The fold knows nothing of what the stat BECAME 鈥?pair it with
   *  this fold's siblings for xG, shots and passes if the reader wants the conversion half. */
  rows: StatsKingRow[];
  /** The fixture-count-weighted mean of the metric, 2dp. */
  league: number;
}

/** M1010/M1014: the stats-block kings. The counters the seed's stat block carries that no engineer
 *  ever spent 鈥?corners for territorial pressure, duels for friction; one walk both. Other fields
 *  in the same block (shots, onTarget, passes, passAcc, tackles, fouls, yellows, reds) ride this
 *  same shape if a reader wants them later 鈥?one fold, not one per metric. */
export function statsBlockKings(matches: Match[], clubs: Club[], metric: StatKingMetric): StatsKingBoard {
  const pick =
    metric === "corners" ? (s: { corners: number }) => s.corners
      : metric === "duels" ? (s: { duels: number }) => s.duels
        : metric === "yellows" ? (s: { yellows: number }) => s.yellows
          : metric === "fouls" ? (s: { fouls: number }) => s.fouls
            : metric === "shots" ? (s: { shots: number }) => s.shots
              : metric === "tackles" ? (s: { tackles: number }) => s.tackles
                : metric === "passes" ? (s: { passes: number }) => s.passes
                  : (s: { onTarget: number }) => s.onTarget;
  const ranked = indexById(clubs);
  const acc = new Map<string, { total: number; games: number }>();
  for (const m of matches) {
    if (!isFinished(m) || !m.stats) continue;
    for (const side of [m.homeClubId, m.awayClubId] as const) {
      if (!ranked.has(side)) continue;
      const s = side === m.homeClubId ? (m.stats.home as typeof m.stats.home) : (m.stats.away as typeof m.stats.away);
      const cur = acc.get(side) ?? { total: 0, games: 0 };
      cur.total += pick(s);
      cur.games++;
      acc.set(side, cur);
    }
  }
  const rows = [...acc.entries()].map(([clubId, v]) => ({
    clubId,
    played: v.games,
    perMatch: round2(v.total / v.games),
  }));
  rows.sort(
    (a, b) =>
      b.perMatch - a.perMatch ||
      a.clubId.localeCompare(b.clubId),
  );
  const total = sum([...acc.values()], (v) => v.total);
  const totalGames = sum([...acc.values()], (v) => v.games);
  return { rows, league: totalGames ? round2(total / totalGames) : 0 };
}

/** M1018: the world's red card kings 鈥?the club sent off most often across every competition of
 *  the seeded world. Only cards from the stats block count; event-list red cards would double it.
 *  Ranked by total reds, then id; a club that was never booked does not appear. */
export interface RedKingRow {
  clubId: string;
  /** Every red recorded in the seeded fixtures here, by stat-block booking. */
  reds: number;
  /** Every yellow recorded here. Pairs with reds for the board. */
  yellows: number;
  /** Finished fixtures counted. */
  played: number;
}

export interface RedKings {
  rows: RedKingRow[];
  /** Finished fixtures across the population 鈥?the numerator the board prints. */
  matches: number;
  /** The world's own reds per club-fixture here, 2dp. */
  perMatch: number;
}

export function redCardKings(matches: Match[], clubs: Club[]): RedKings {
  const ranked = indexById(clubs);
  const acc = new Map<string, { reds: number; yellows: number; games: number }>();
  let games = 0;
  let totalReds = 0;
  for (const m of matches) {
    if (!isFinished(m) || !m.stats) continue;
    for (const side of [m.homeClubId, m.awayClubId] as const) {
      if (!ranked.has(side)) continue;
      const s = side === m.homeClubId ? m.stats.home : m.stats.away;
      games++;
      totalReds += s.reds;
      const cur = acc.get(side) ?? { reds: 0, yellows: 0, games: 0 };
      cur.reds += s.reds;
      cur.yellows += s.yellows;
      cur.games++;
      acc.set(side, cur);
    }
  }
  const rows = [...acc.entries()]
    .map(([clubId, v]) => ({ clubId, played: v.games, reds: v.reds, yellows: v.yellows }))
    .filter((r) => r.reds > 0)
    .sort(
      (a, b) =>
        b.reds - a.reds ||
        b.yellows - a.yellows ||
        a.clubId.localeCompare(b.clubId),
    );
  return { rows, matches: games, perMatch: games ? round2(totalReds / games) : 0 };
}

/** M1016: the lethal read, the world over 鈥?the same one-attempt-per-attempt math as the timing
 *  seam, summed across the whole seed instead of one competition. Every attempt is either a SHOT
 *  that did not score or a GOAL; a fooled read would be a shot counted nowhere. Zero-attempts clubs
 *  take no row, sorted by conversion, goals, shots, id. */
export interface WorldLethalRow {
  clubId: string;
  shots: number;
  goals: number;
  /** Rate of attempts that became goals, 0鈥?00, 2dp. */
  rate: number;
}

export interface WorldLethal {
  /** Every club with at least one attempt here, ranked by conversion, then goals, then shots, then id. */
  rows: WorldLethalRow[];
  /** The world's own conversion 鈥?every goal / every attempt, 2dp. */
  league: number;
}

export function worldLethal(matches: Match[], clubs: Club[]): WorldLethal {
  const ranked = indexById(clubs);
  const acc = new Map<string, { shots: number; goals: number }>();
  for (const m of matches) {
    if (!isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "SHOT" && e.type !== "GOAL") continue;
      const id = e.side === "home" ? m.homeClubId : m.awayClubId;
      if (!ranked.has(id)) continue;
      const cur = acc.get(id) ?? { shots: 0, goals: 0 };
      if (e.type === "SHOT") cur.shots++;
      else cur.goals++;
      acc.set(id, cur);
    }
  }
  const rows = [...acc.entries()].map(([clubId, v]) => ({
    clubId,
    shots: v.shots,
    goals: v.goals,
    rate: v.shots + v.goals === 0 ? 0 : round2((v.goals / (v.shots + v.goals)) * 100),
  }));
  rows.sort(
    (a, b) =>
      b.rate - a.rate ||
      b.goals - a.goals ||
      b.shots - a.shots ||
      a.clubId.localeCompare(b.clubId),
  );
  const shots = sum(rows, (r) => r.shots);
  const total = sum(rows, (r) => r.goals);
  const attempts = shots + total;
  return { rows, league: attempts ? round2((total / attempts) * 100) : 0 };
}

/** M1011: the world's outshine 鈥?every club producing goals above their recorded xG at world
 *  scale, ranked by how far the scoreboard runs past the chances. The league xG table settles
 *  who creates most in one competition; this answers who punishes the most across the board. */
export interface OutshineRow {
  clubId: string;
  /** xG for across the whole world, 2dp. */
  xgFor: number;
  /** Actual goals minus xG for, 2dp 鈥?positive reads a club finishing better than chance. */
  outshine: number;
}

export interface OutshineWorld {
  /** Clubs ranked by outshine, then xG for, then club id; xG-less clubs excluded 鈥?there
   *  is nothing for the fold to outflank them with. */
  rows: OutshineRow[];
}

export function worldOutshine(matches: Match[], clubs: Club[]): OutshineWorld {
  const ranked = indexById(clubs);
  const appeared: Set<string> = new Set();
  for (const m of matches) {
    if (!isFinished(m)) continue;
    if (ranked.has(m.homeClubId)) appeared.add(m.homeClubId);
    if (ranked.has(m.awayClubId)) appeared.add(m.awayClubId);
  }
  const goals = new Map<string, number>();
  const xg = new Map<string, number>();
  for (const m of matches) {
    if (!isFinished(m)) continue;
    goals.set(m.homeClubId, (goals.get(m.homeClubId) ?? 0) + m.homeGoals);
    goals.set(m.awayClubId, (goals.get(m.awayClubId) ?? 0) + m.awayGoals);
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const parsed = xgOf(e);
      if (!Number.isFinite(parsed)) continue;
      const id = e.side === "home" ? m.homeClubId : m.awayClubId;
      xg.set(id, (xg.get(id) ?? 0) + parsed);
    }
  }
  const rows = [...appeared]
    .map((clubId) => ({
      clubId,
      xgFor: round2(xg.get(clubId) ?? 0),
      outshine: round2((goals.get(clubId) ?? 0) - (xg.get(clubId) ?? 0)),
    }))
    .filter((r) => r.xgFor > 0)
    .sort(
      (a, b) =>
        b.outshine - a.outshine ||
        b.xgFor - a.xgFor ||
        a.clubId.localeCompare(b.clubId),
    );
  return { rows };
}

export interface ClockContrastWindow {
  goals: number;
  cards: number;
  /** M946: goals per card in this window, 2dp through the safeDiv door 鈥?0 when the window
   *  booked nobody, which the screen reads as no ratio to state rather than an empty one. */
  goalsPerCard: number;
}

export interface ClockContrast {
  goals: number;
  cards: number;
  /** Both series over the same six windows, index 0 = 1鈥?5鈥? index 5 = 76鈥?0+鈥? */
  windows: ClockContrastWindow[];
  /** The busiest goal window; null when the competition has no recorded goal. */
  peakGoal: number | null;
  /** The busiest card window; null when the competition has no recorded booking. */
  peakCard: number | null;
  /** M946: the sharpest window 鈥?the highest goals-per-card ratio among the windows that
   *  booked somebody; null when the competition has no recorded booking at all. */
  peakRhythm: number | null;
}

/** The league's clock read as two series: when goals arrive and when cards arrive. Each side is
 *  a sum of a fold that already exists 鈥?goals across `goalTiming`'s scored bands, cards off
 *  `cardTiming`'s league windows 鈥?so the contrast cannot disagree with either screen. A peak is
 *  null when its series is empty: a competition with no booking has no busiest card window, only
 *  six silent ones. */
export function clockContrast(compId: string, matches: Match[], clubs: Club[]): ClockContrast {
  const goals = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const r of goalTiming(compId, matches, clubs)) {
    for (let b = 0; b < GOAL_BANDS; b++) goals[b] += r.scoredBands[b];
  }
  const card = cardTiming(compId, matches, clubs);
  const peakOf = (counts: number[]): number | null => {
    if (sum(counts, (n) => n) === 0) return null;
    let peak = 0;
    for (let b = 1; b < counts.length; b++) if (counts[b] > counts[peak]) peak = b;
    return peak;
  };
  const windows = goals.map((g, b) => ({ goals: g, cards: card.windows[b], goalsPerCard: safeDiv(g, card.windows[b]) }));
  // The sharpest window is the one whose bookings were most productive 鈥?the earliest window
  // holding the maximum, and no window at all when nobody was booked.
  let peakRhythm: number | null = null;
  for (let b = 0; b < GOAL_BANDS; b++) {
    if (card.windows[b] === 0) continue;
    if (peakRhythm === null || windows[b].goalsPerCard > windows[peakRhythm].goalsPerCard) peakRhythm = b;
  }
  return {
    goals: sum(goals, (n) => n),
    cards: sum(card.windows, (n) => n),
    windows,
    peakGoal: peakOf(goals),
    peakCard: peakOf(card.windows),
    peakRhythm,
  };
}

export interface VenueRhythm {
  /** Goals per card, per window, read off the home sides' own goal and card series 鈥?the
   *  safeDiv door's figure where the window booked nobody, which the screen declines to print. */
  home: number[];
  /** The away sides' rhythm, the same read. */
  away: number[];
  /** The sharpest end-and-window among those with a denominator; the earliest wins a tie.
   *  Null when no end booked anybody in any window. */
  peak: { end: Side; band: number } | null;
}

/** M948: the venue rhythm 鈥?whether the home advantage that shows in the minutes (M788) also
 *  shows in the exchange rate between what a side's attack earns and what its discipline costs.
 *  Both series are sums of folds that already exist, so the rhythm cannot disagree with the
 *  venue screen's own clocks. */
export function venueRhythm(compId: string, matches: Match[], clubs: Club[]): VenueRhythm {
  const goals = goalVenueClock(compId, matches, clubs);
  const cards = cardTiming(compId, matches, clubs);
  const home = goals.homeWindows.map((g, b) => safeDiv(g, cards.homeWindows[b]));
  const away = goals.awayWindows.map((g, b) => safeDiv(g, cards.awayWindows[b]));
  let peak: VenueRhythm["peak"] = null;
  const sharpest = (end: Side, series: number[], denominators: number[]) => {
    for (let b = 0; b < GOAL_BANDS; b++) {
      if (denominators[b] === 0) continue;
      if (peak === null || series[b] > (peak.end === "home" ? home : away)[peak.band]) peak = { end, band: b };
    }
  };
  sharpest("home", home, cards.homeWindows);
  sharpest("away", away, cards.awayWindows);
  return { home, away, peak };
}

export interface ClubRhythmRow {
  clubId: string;
  goals: number;
  cards: number;
  /** M949: whether the ratio rests on at least three bookings. One card making a 2.00 is a
   *  real reading of one card, not a stable rate 鈥?the fold names the sample so the screen
   *  can say so instead of letting a thin figure dress as a settled one. */
  sampled: boolean;
  /** Season goals per card through the safeDiv door 鈥?the floor's own figure when the club
   *  booked nobody, which the screen declines to print rather than state a ratio that has
   *  no denominator. */
  goalsPerCard: number;
}

export interface ClubRhythm {
  /** Every club with a table row: the clubs with a denominator (at least one booking) first,
   *  sharpest ratio winning, then the most goals, then the id; the clubs without a booking
   *  follow by goals, carrying no ratio to rank. */
  rows: ClubRhythmRow[];
  /** The sharpest club; null when nobody in the competition was booked. */
  sharpest: ClubRhythmRow | null;
}

/** M947: each club's own season rhythm 鈥?goals scored per card earned, joined off the goal
 *  and card folds the screens already read, so no third sweep of the matches exists to
 *  disagree with either. A discipline that wins the ball without conceding chances reads a
 *  high ratio; a rash one reads low. */
export function clubRhythm(compId: string, matches: Match[], clubs: Club[]): ClubRhythm {
  const goals = new Map(goalTiming(compId, matches, clubs).map((r) => [r.clubId, r.scored]));
  const cards = new Map(cardTiming(compId, matches, clubs).rows.map((r) => [r.clubId, r.cards]));
  const rows: ClubRhythmRow[] = [...goals.entries()].map(([clubId, g]) => {
    const c = cards.get(clubId) ?? 0;
    return { clubId, goals: g, cards: c, goalsPerCard: safeDiv(g, c), sampled: c >= 3 };
  });
  rows.sort((a, b) => {
    if ((a.cards > 0) !== (b.cards > 0)) return a.cards > 0 ? -1 : 1;
    return a.cards > 0
      ? b.goalsPerCard - a.goalsPerCard || b.goals - a.goals || a.clubId.localeCompare(b.clubId)
      : b.goals - a.goals || a.clubId.localeCompare(b.clubId);
  });
  return { rows, sharpest: rows.find((r) => r.cards > 0) ?? null };
}

export interface ClubResultClockRow {
  clubId: string;
  /** Cards this club earned in matches it went on to win, per window. */
  wonWindows: number[];
  /** Cards this club earned in matches it drew, per window. */
  drewWindows: number[];
  /** Cards this club earned in matches it lost, per window. */
  lostWindows: number[];
  /** Cards this club earned in won matches. */
  won: number;
  /** Cards this club earned in drew matches. */
  drew: number;
  /** Cards this club earned in lost matches. */
  lost: number;
}

/** The club-level result clock: each club's own cards, split by the result that club's fixture went
 *  on to produce. Same family as `clubRhythm` (goals per card, per club) and the venue rhythm (per
 *  end), but the axis is the result rather than the ratio: a booking in a won match and a booking in
 *  a lost match are different events even when the minute count agrees. The three series add up to
 *  the club card count, because every counted card belongs to a finished fixture with a scoreline. */
export function clubResultClock(compId: string, matches: Match[], clubs: Club[]): ClubResultClockRow[] {
  const rows = new Map<string, ClubResultClockRow>(
    clubs.map((c) => [
      c.id,
      {
        clubId: c.id,
        wonWindows: Array.from({ length: GOAL_BANDS }, () => 0),
        drewWindows: Array.from({ length: GOAL_BANDS }, () => 0),
        lostWindows: Array.from({ length: GOAL_BANDS }, () => 0),
        won: 0,
        drew: 0,
        lost: 0,
      },
    ]),
  );
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "YELLOW" && e.type !== "RED") continue;
      const clubId = e.side === "home" ? m.homeClubId : m.awayClubId;
      const row = rows.get(clubId);
      if (!row) continue;
      const ourGoals = e.side === "home" ? m.homeGoals : m.awayGoals;
      const theirGoals = e.side === "home" ? m.awayGoals : m.homeGoals;
      const band = goalBand(e.minute);
      // The window series is the only thing the pass mutates; the totals derive from it, so
      // the fold's counts cannot drift from its own series.
      if (ourGoals > theirGoals) row.wonWindows[band]++;
      else if (ourGoals === theirGoals) row.drewWindows[band]++;
      else row.lostWindows[band]++;
    }
  }
  const list = [...rows.values()].map((r) => ({
    ...r,
    won: sum(r.wonWindows, (n) => n),
    drew: sum(r.drewWindows, (n) => n),
    lost: sum(r.lostWindows, (n) => n),
  }));
  list.sort((a, b) => b.won + b.drew + b.lost - (a.won + a.drew + a.lost) || a.clubId.localeCompare(b.clubId));
  return list;
}

/** Each club's own red cards, split by the result its fixture went on to produce.
 *  Same family as `clubResultClock` (cards per club) and the venue rhythm (per end),
 *  but the axis is the result rather than the ratio: a red in a won match and a red
 *  in a lost match are different events even when the minute count agrees. The three
 *  series add up to the club red count, because every counted red belongs to a
 *  finished fixture with a scoreline. */
export interface ClubDisciplineResultClockRow {
  clubId: string;
  /** Red cards this club earned in matches it went on to win, per window. */
  wonWindows: number[];
  /** Red cards this club earned in matches it drew, per window. */
  drewWindows: number[];
  /** Red cards this club earned in matches it lost, per window. */
  lostWindows: number[];
  /** Red cards this club earned in won matches. */
  won: number;
  /** Red cards this club earned in drew matches. */
  drew: number;
  /** Red cards this club earned in lost matches. */
  lost: number;
}

/** The club-level discipline result clock: each club's own red cards, split by the result
 *  that its fixture went on to produce. Same family as `clubResultClock` (cards per club) and
 *  the venue rhythm (per end), but the axis is the result rather than the ratio: a red in a
 *  won match and a red in a lost match are different events even when the minute count agrees.
 *  The three series add up to the club red count, because every counted red belongs to a finished
 *  fixture with a scoreline. */
export function clubDisciplineResultClock(compId: string, matches: Match[], clubs: Club[]): ClubDisciplineResultClockRow[] {
  const rows = new Map<string, ClubDisciplineResultClockRow>(
    clubs.map((c) => [
      c.id,
      {
        clubId: c.id,
        wonWindows: Array.from({ length: GOAL_BANDS }, () => 0),
        drewWindows: Array.from({ length: GOAL_BANDS }, () => 0),
        lostWindows: Array.from({ length: GOAL_BANDS }, () => 0),
        won: 0,
        drew: 0,
        lost: 0,
      },
    ]),
  );
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const e of m.events ?? []) {
      if (e.type !== "RED") continue;
      const clubId = e.side === "home" ? m.homeClubId : m.awayClubId;
      const row = rows.get(clubId);
      if (!row) continue;
      const ourGoals = e.side === "home" ? m.homeGoals : m.awayGoals;
      const theirGoals = e.side === "home" ? m.awayGoals : m.homeGoals;
      const band = goalBand(e.minute);
      // The window series is the only thing the pass mutates; the totals derive from it, so
      // the fold's counts cannot drift from its own series.
      if (ourGoals > theirGoals) row.wonWindows[band]++;
      else if (ourGoals === theirGoals) row.drewWindows[band]++;
      else row.lostWindows[band]++;
    }
  }
  const list = [...rows.values()].map((r) => ({
    ...r,
    won: sum(r.wonWindows, (n) => n),
    drew: sum(r.drewWindows, (n) => n),
    lost: sum(r.lostWindows, (n) => n),
  }));
  list.sort((a, b) => b.won + b.drew + b.lost - (a.won + a.drew + a.lost) || a.clubId.localeCompare(b.clubId));
  return list;
}

export interface MatchClock {
  /** Goals in each window, index 0 = 1鈥?5鈥? index 5 = 76鈥?0+鈥? */
  goals: number[];
  /** Bookings (yellows plus reds) in each window. */
  cards: number[];
  /** The red cards of `cards`, same length and the same windows. */
  reds: number[];
}

/** M953: one fixture's own clock 鈥?the same six windows the league folds read, read off the
 *  match's recorded events. Null when the fixture has nothing to clock: not finished, or no
 *  event list recorded. */
export function matchClock(m: Match): MatchClock | null {
  if (!isFinished(m) || !m.events?.length) return null;
  const goals = Array.from({ length: GOAL_BANDS }, () => 0);
  const cards = Array.from({ length: GOAL_BANDS }, () => 0);
  const reds = Array.from({ length: GOAL_BANDS }, () => 0);
  for (const e of m.events) {
    if (e.type !== "GOAL" && e.type !== "YELLOW" && e.type !== "RED") continue;
    const band = goalBand(e.minute);
    if (e.type === "GOAL") goals[band]++;
    else {
      cards[band]++;
      if (e.type === "RED") reds[band]++;
    }
  }
  return { goals, cards, reds };
}

export interface ScoringFirst {
  /** Fixtures with at least one recorded goal 鈥?the ones this read can judge. */
  scoredFirst: number;
  /** What happened to the side that scored first: the win, the draw or the loss. */
  wonAfter: number;
  drawnAfter: number;
  lostAfter: number;
  /** wonAfter / scoredFirst through the safeDiv door, 0鈥?00, 2dp 鈥?the classic scoring-first
   *  conversion. Zero when no fixture has a recorded goal yet. */
  conversion: number;
}

/** M955: does scoring first win? The classic question, read honestly off the event record:
 *  a fixture counts only when it is finished with at least one recorded GOAL, and the first
 *  scorer's own final result is what the three counters judge. Fixtures whose goals are not
 *  recorded stay out 鈥?a scoreline alone cannot say who scored first. */
export function scoringFirst(compId: string, matches: Match[], clubs: Club[]): ScoringFirst {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  let scoredFirst = 0, wonAfter = 0, drawnAfter = 0, lostAfter = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    const first = (m.events ?? []).find((e) => e.type === "GOAL" &&
      ranked.has(e.side === "home" ? m.homeClubId : m.awayClubId));
    if (!first) continue;
    const ourGoals = first.side === "home" ? m.homeGoals : m.awayGoals;
    const theirGoals = first.side === "home" ? m.awayGoals : m.homeGoals;
    scoredFirst++;
    if (ourGoals > theirGoals) wonAfter++;
    else if (ourGoals === theirGoals) drawnAfter++;
    else lostAfter++;
  }
  return {
    scoredFirst,
    wonAfter,
    drawnAfter,
    lostAfter,
    conversion: round2(safeDiv(wonAfter, scoredFirst) * 100),
  };
}

export interface LeadRetentionRow {
  clubId: string;
  /** Finished fixtures with an event list in which this club was ahead at any point. */
  led: number;
  won: number;
  drawn: number;
  lost: number;
  /** 3 - points earned, summed over the matches it led: a draw drops two, a defeat three. */
  dropped: number;
  /** Share of those matches won, 0鈥?00, 2dp; 0 when it never led. */
  keepShare: number;
  /** M959: the same count split by the end the club played at 鈥?leads taken and kept at home,
   *  and the same two away. A club that only ever led at home reads zeros on the away side. */
  homeLed: number;
  homeWon: number;
  awayLed: number;
  awayWon: number;
}

export interface LeadRetention {
  /** Clubs that led at least once, the most points dropped first, then the most leads. */
  rows: LeadRetentionRow[];
  led: number;
  won: number;
  drawn: number;
  lost: number;
  dropped: number;
  /** League keep share: won / led, 0鈥?00, 2dp; 0 when no lead was taken. */
  keepShare: number;
  /** Finished fixtures with an event list that could be replayed. */
  matches: number;
}

/** Whether a lead survives: replay every goal in order, note each side that was ahead at any
 *  point, and read the final result against it. `scoringFirst` asks what the FIRST goal bought;
 *  this asks what ANY lead bought 鈥?a side that led three times and drew has still dropped two
 *  points. Only fixtures with a recorded event list can be replayed, and the fold reports how
 *  many it read rather than guessing at the rest. */
export function leadRetention(compId: string, matches: Match[], clubs: Club[]): LeadRetention {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const rows = new Map<string, LeadRetentionRow>(
    [...ranked].map((id) => [id, { clubId: id, led: 0, won: 0, drawn: 0, lost: 0, dropped: 0, keepShare: 0, homeLed: 0, homeWon: 0, awayLed: 0, awayWon: 0 }]),
  );
  let counted = 0;
  let ledTotal = 0; let wonTotal = 0; let drawnTotal = 0; let lostTotal = 0; let droppedTotal = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m) || !m.events?.length) continue;
    counted++;
    const goals = m.events.filter((e) => e.type === "GOAL").slice().sort(byMinute);
    let home = 0; let away = 0; let homeLed = false; let awayLed = false;
    for (const g of goals) {
      if (g.side === "home") home++; else away++;
      if (home > away) homeLed = true;
      else if (away > home) awayLed = true;
    }
    const sides: Array<[string, boolean, number, number]> = [
      [m.homeClubId, homeLed, m.homeGoals, m.awayGoals],
      [m.awayClubId, awayLed, m.awayGoals, m.homeGoals],
    ];
    for (const [clubId, didLead, ours, theirs] of sides) {
      if (!didLead || !ranked.has(clubId)) continue;
      // The replay settles the outcome in locals and the row is written once 鈥?the credit
      // vocabulary stays in the door, the counters stay private to the replay.
      const won = ours > theirs ? 1 : 0;
      const drawn = ours === theirs ? 1 : 0;
      const lost = ours < theirs ? 1 : 0;
      const dropped = drawn * 2 + lost * 3;
      const row = rows.get(clubId)!;
      row.led += 1; row.won += won; row.drawn += drawn; row.lost += lost; row.dropped += dropped;
      if (clubId === m.homeClubId) { row.homeLed += 1; row.homeWon += won; }
      else { row.awayLed += 1; row.awayWon += won; }
      ledTotal++; wonTotal += won; drawnTotal += drawn; lostTotal += lost; droppedTotal += dropped;
    }
  }
  const list = [...rows.values()].filter((r) => r.led > 0);
  for (const r of list) r.keepShare = round2(safeDiv(r.won, r.led) * 100);
  list.sort((a, b) => b.dropped - a.dropped || b.led - a.led || a.clubId.localeCompare(b.clubId));
  return {
    rows: list, led: ledTotal, won: wonTotal, drawn: drawnTotal, lost: lostTotal, dropped: droppedTotal,
    keepShare: round2(safeDiv(wonTotal, ledTotal) * 100), matches: counted,
  };
}

export interface ComebackRow {
  clubId: string;
  /** Finished fixtures with an event list in which this club was behind at any point. */
  trailed: number;
  won: number;
  drawn: number;
  lost: number;
  /** Points earned in the matches it trailed: three for a win, one for a draw. */
  points: number;
  /** Goals for and against across the trailed fixtures 鈥?the standing fields the board's own
   *  ranking door reads, accumulated by the same replay that counts the trails. */
  gf: number;
  ga: number;
  /** Share of those matches that ended level or better, 0鈥?00, 2dp; 0 when it never trailed. */
  rescueShare: number;
  /** M960: the same count split by the end the club played at 鈥?deficits trailed and points
   *  rescued at home, and the same two away. */
  homeTrailed: number;
  homePoints: number;
  awayTrailed: number;
  awayPoints: number;
}

export interface ComebackPoints {
  /** Clubs that trailed at least once, the most points rescued first, then the most deficits. */
  rows: ComebackRow[];
  trailed: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  /** League rescue share: (won + drawn) / trailed, 0鈥?00, 2dp. */
  rescueShare: number;
  /** Finished fixtures with an event list that could be replayed. */
  matches: number;
}

/** The other half of the lead ledger: what a deficit bought. The same replay as `leadRetention`,
 *  read from the side that was behind 鈥?a club that came from 0-1 to win has rescued three points
 *  from a losing position. A single fixture can charge both folds: a side that led, was pegged
 *  back and then lost both held a lead and trailed in it, and both reads are true of it. */
export function comebackPoints(compId: string, matches: Match[], clubs: Club[]): ComebackPoints {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const rows = new Map<string, ComebackRow>(
    [...ranked].map((id) => [id, { clubId: id, trailed: 0, won: 0, drawn: 0, lost: 0, points: 0, rescueShare: 0, gf: 0, ga: 0, homeTrailed: 0, homePoints: 0, awayTrailed: 0, awayPoints: 0 }]),
  );
  let counted = 0;
  let trailedTotal = 0; let wonTotal = 0; let drawnTotal = 0; let lostTotal = 0; let pointsTotal = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m) || !m.events?.length) continue;
    counted++;
    const goals = m.events.filter((e) => e.type === "GOAL").slice().sort(byMinute);
    let home = 0; let away = 0; let homeTrailed = false; let awayTrailed = false;
    for (const g of goals) {
      if (g.side === "home") home++; else away++;
      if (home < away) homeTrailed = true;
      else if (away < home) awayTrailed = true;
    }
    const sides: Array<[string, boolean, number, number]> = [
      [m.homeClubId, homeTrailed, m.homeGoals, m.awayGoals],
      [m.awayClubId, awayTrailed, m.awayGoals, m.homeGoals],
    ];
    for (const [clubId, didTrail, ours, theirs] of sides) {
      if (!didTrail || !ranked.has(clubId)) continue;
      // Single writer again: the rescue replay settles its outcome in locals, the row reads it.
      const won = ours > theirs ? 1 : 0;
      const drawn = ours === theirs ? 1 : 0;
      const lost = ours < theirs ? 1 : 0;
      const points = won * 3 + drawn;
      const row = rows.get(clubId)!;
      row.trailed += 1; row.won += won; row.drawn += drawn; row.lost += lost; row.points += points;
      if (clubId === m.homeClubId) { row.homeTrailed += 1; row.homePoints += points; }
      else { row.awayTrailed += 1; row.awayPoints += points; }
      row.gf += ours; row.ga += theirs;
      trailedTotal++; wonTotal += won; drawnTotal += drawn; lostTotal += lost; pointsTotal += points;
    }
  }
  const list = [...rows.values()].filter((r) => r.trailed > 0);
  for (const r of list) r.rescueShare = round2(safeDiv(r.won + r.drawn, r.trailed) * 100);
  // The rescue board is a sub-table 鈥?the fixtures where the club trailed 鈥?and ranks the way
  // every table here ranks: through the standing door, points first, then the goal difference
  // those same fixtures produced.
  list.sort((a, b) => byTableStanding(a, b));
  return {
    rows: list, trailed: trailedTotal, won: wonTotal, drawn: drawnTotal, lost: lostTotal,
    points: pointsTotal, rescueShare: round2(safeDiv(wonTotal + drawnTotal, trailedTotal) * 100),
    matches: counted,
  };
}

export interface CollapseRow {
  matchId: string;
  kickoff: string;
  /** The side that held the lead and did not win it. */
  clubId: string;
  opponentId: string;
  /** The biggest lead it held, in goals (always at least one). */
  lead: number;
  /** The minute that lead reached its peak 鈥?the last goal that put the side that far ahead. */
  minute: number;
  /** What the fixture ended as, from the leading side's point of view. */
  outcome: "drawn" | "lost";
  goalsFor: number;
  goalsAgainst: number;
}

export interface Collapses {
  /** Every lead that was thrown away, the biggest first, then the latest it peaked. */
  rows: CollapseRow[];
  /** Leads thrown away in this competition. */
  count: number;
  /** The biggest lead thrown away (0 when none was). */
  biggest: number;
  /** Finished fixtures with an event list that could be replayed. */
  matches: number;
}

/** The matches behind the lead board: every fixture where a side got ahead and did not win it.
 *  The aggregate says how often a lead survives; this names the ones that did not 鈥?how far ahead
 *  the side got, and in which minute the peak arrived. Only fixtures with a recorded event list
 *  can be replayed, so the fold reports how many it read rather than implying it saw them all. */
export function collapses(compId: string, matches: Match[], clubs: Club[]): Collapses {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const rows: CollapseRow[] = [];
  let counted = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m) || !m.events?.length) continue;
    counted++;
    const goals = m.events.filter((e) => e.type === "GOAL").slice().sort(byMinute);
    let home = 0; let away = 0;
    let homeLead = 0; let homeMinute = 0; let awayLead = 0; let awayMinute = 0;
    for (const g of goals) {
      if (g.side === "home") home++; else away++;
      if (home - away > homeLead) { homeLead = home - away; homeMinute = g.minute; }
      if (away - home > awayLead) { awayLead = away - home; awayMinute = g.minute; }
    }
    const sides: Array<[string, string, number, number, number, number]> = [
      [m.homeClubId, m.awayClubId, homeLead, homeMinute, m.homeGoals, m.awayGoals],
      [m.awayClubId, m.homeClubId, awayLead, awayMinute, m.awayGoals, m.homeGoals],
    ];
    for (const [clubId, opponentId, lead, minute, ours, theirs] of sides) {
      if (lead <= 0 || ours > theirs || !ranked.has(clubId)) continue;
      rows.push({
        matchId: m.id, kickoff: m.kickoff, clubId, opponentId, lead, minute,
        outcome: ours === theirs ? "drawn" : "lost", goalsFor: ours, goalsAgainst: theirs,
      });
    }
  }
  rows.sort((a, b) => b.lead - a.lead || b.minute - a.minute || a.matchId.localeCompare(b.matchId));
  const biggest = rows.length ? rows[0].lead : 0;
  return { rows, count: rows.length, biggest, matches: counted };
}

/** M968: the fixture that ended a record 鈥?who broke it, and by what score. */
/** M1007: the opposition's overall for the breaking fixture, when the club row answers 鈥?the
 *  strength read the record's edge was missing. Null when the opponent has no row in `clubs`. */
export interface StreakBreak {
  matchId: string;
  kickoff: string;
  opponentId: string;
  goalsFor: number;
  goalsAgainst: number;
  /** M1005: the end the breaking fixture belonged to 鈥?a run measured at home ends against the home record. */
  venue: Side;
  /** M1007: the reputation of the side that ended the run 鈥?overall from the club row. */
  opponentOverall: number | null;
}

export interface StreakRow {
  clubId: string;
  /** The longest run of wins this club put together in the competition. */
  longestWin: number;
  /** The longest run without defeat 鈥?wins and draws, broken only by a loss. */
  longestUnbeaten: number;
  /** The run it is on now: wins in a row, 0 when its last match was not a win. */
  currentWin: number;
  /** Matches since it last lost; 0 when its last match was a loss. */
  currentUnbeaten: number;
  played: number;
  /** M963: the same two runs read inside the club's home matches only, and inside its away
   *  matches only 鈥?a home fortress and an away record are different sequences of the same season. */
  homeWin: number;
  homeUnbeaten: number;
  awayWin: number;
  awayUnbeaten: number;
  /** M964: the other side of the record 鈥?the longest run without a win, and the one it is on. */
  longestWinless: number;
  currentWinless: number;
  /** M968: the record's edge 鈥?the fixture that ended the longest unbeaten run. Null while the
   *  run is still alive, because the best run ends at the club's last finished match. */
  unbeatenBreak: StreakBreak | null;
  /** M1005: the same edge read once per end 鈥?the fixture that ended the longest HOME unbeaten
   *  run, and the fixture that ended the longest AWAY run. Null when the run reached the end of
   *  its home/away sequence unbroken, or when the club had no fixture at that end. */
  homeBreak: StreakBreak | null;
  awayBreak: StreakBreak | null;
}

export interface Streaks {
  /** Every ranked club, the longest unbeaten run first, then the longest winning run. */
  rows: StreakRow[];
  /** The league's best runs (0 when nothing has been played). */
  longestWin: number;
  longestUnbeaten: number;
  /** The club holding each best run; the first in board order when two are tied. */
  winHolder: string | null;
  unbeatenHolder: string | null;
  /** Finished fixtures read. */
  matches: number;
}

/** Runs, not averages: every finished fixture in the competition, ordered by kickoff for each club,
 *  walked once to find the longest winning and unbeaten runs it has put together and the run it is
 *  on now. Form letters read the last five results; this reads the shape of the whole season, and
 *  it needs no event list 鈥?a final score is enough. */
export function streaks(compId: string, matches: Match[], clubs: Club[]): Streaks {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  const clubById = indexById(clubs);
  const overallOf = (id: string) => clubById.get(id)?.overall ?? null;
  const byClub = new Map<string, Array<{ matchId: string; kickoff: string; gf: number; ga: number; home: boolean; opponentId: string }>>(
    [...ranked].map((id) => [id, []]),
  );
  let counted = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    counted++;
    byClub.get(m.homeClubId)?.push({ matchId: m.id, kickoff: m.kickoff, gf: m.homeGoals, ga: m.awayGoals, home: true, opponentId: m.awayClubId });
    byClub.get(m.awayClubId)?.push({ matchId: m.id, kickoff: m.kickoff, gf: m.awayGoals, ga: m.homeGoals, home: false, opponentId: m.homeClubId });
  }
  const rows: StreakRow[] = [];
  // One walk per sequence: the whole season, the home matches only, the away matches only. The
  // reader is the same three lines of arithmetic, so the three runs cannot disagree about what a
  // win, a draw and a loss do to a run.
  const runsOf = (list: Array<{ gf: number; ga: number }>) => {
    let win = 0; let unbeaten = 0; let winless = 0;
    let bestWin = 0; let bestUnbeaten = 0; let bestWinless = 0;
    // The index of the match that completed the best unbeaten run so far; the fixture after it is
    // the one that ended the record. Ties keep the earliest run, so the board is deterministic.
    let bestUnbeatenEnd = -1;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.gf > r.ga) { win++; unbeaten++; winless = 0; }
      else if (r.gf === r.ga) { win = 0; unbeaten++; winless++; }
      else { win = 0; unbeaten = 0; winless++; }
      if (win > bestWin) bestWin = win;
      if (unbeaten > bestUnbeaten) { bestUnbeaten = unbeaten; bestUnbeatenEnd = i; }
      if (winless > bestWinless) bestWinless = winless;
    }
    return { bestWin, bestUnbeaten, bestWinless, win, unbeaten, winless, bestUnbeatenEnd };
  };
  for (const [clubId, list] of byClub) {
    list.sort(byKickoff);
    const all = runsOf(list);
    const homeList = list.filter((r) => r.home);
    const awayList = list.filter((r) => !r.home);
    const home = runsOf(homeList);
    const away = runsOf(awayList);
    const edge = all.bestUnbeatenEnd >= 0 ? list[all.bestUnbeatenEnd + 1] : undefined;
    const edgeFor = (seq: typeof list, end: number) => (end >= 0 ? seq[end + 1] : undefined);
    const homeEdge = edgeFor(homeList, home.bestUnbeatenEnd);
    const awayEdge = edgeFor(awayList, away.bestUnbeatenEnd);
    rows.push({
      clubId,
      longestWin: all.bestWin, longestUnbeaten: all.bestUnbeaten,
      currentWin: all.win, currentUnbeaten: all.unbeaten, played: list.length,
      homeWin: home.bestWin, homeUnbeaten: home.bestUnbeaten,
      awayWin: away.bestWin, awayUnbeaten: away.bestUnbeaten,
      longestWinless: all.bestWinless, currentWinless: all.winless,
      // The match after the best run is a loss by construction: anything else would have extended
      // the run. While the run is alive there is no next match to name.
      unbeatenBreak: edge
        ? { matchId: edge.matchId, kickoff: edge.kickoff, opponentId: edge.opponentId, goalsFor: edge.gf, goalsAgainst: edge.ga, venue: edge.home ? "home" : "away", opponentOverall: overallOf(edge.opponentId) }
        : null,
      homeBreak: homeEdge
        ? { matchId: homeEdge.matchId, kickoff: homeEdge.kickoff, opponentId: homeEdge.opponentId, goalsFor: homeEdge.gf, goalsAgainst: homeEdge.ga, venue: "home", opponentOverall: overallOf(homeEdge.opponentId) }
        : null,
      awayBreak: awayEdge
        ? { matchId: awayEdge.matchId, kickoff: awayEdge.kickoff, opponentId: awayEdge.opponentId, goalsFor: awayEdge.gf, goalsAgainst: awayEdge.ga, venue: "away", opponentOverall: overallOf(awayEdge.opponentId) }
        : null,
    });
  }
  rows.sort((x, y) => y.longestUnbeaten - x.longestUnbeaten || y.longestWin - x.longestWin || x.clubId.localeCompare(y.clubId));
  const longestWin = rows.length ? Math.max(...rows.map((r) => r.longestWin)) : 0;
  const longestUnbeaten = rows.length ? Math.max(...rows.map((r) => r.longestUnbeaten)) : 0;
  return {
    rows, longestWin, longestUnbeaten,
    winHolder: longestWin > 0 ? (rows.find((r) => r.longestWin === longestWin)?.clubId ?? null) : null,
    unbeatenHolder: longestUnbeaten > 0 ? (rows.find((r) => r.longestUnbeaten === longestUnbeaten)?.clubId ?? null) : null,
    matches: counted,
  };
}

/** One row of the last-five table: the window every club's season is actually decided in.
 *  Positions are 1-based inside the window; clubs with no finished fixture in the window are
 *  appended after the ranked rows with `formPosition` 0 and `climb` 0, so no season place is
 *  invented for them. */
export interface FormRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  /** The window's results in kickoff order, oldest first. */
  form: FormLetter[];
  /** The club's season place (1-based); 0 when it has no finished fixture. */
  seasonPosition: number;
  /** The club's place inside this window (1-based); 0 when it has no finished fixture. */
  formPosition: number;
  /** seasonPosition - formPosition; positive when the window lifts the club above its season place. */
  climb: number;
  /** M971: the window's fixtures split by venue 鈥?every played fixture belongs to exactly one of
   *  the two halves, so the two add up to `played` and to `points`. */
  homePlayed: number;
  homePoints: number;
  awayPlayed: number;
  awayPoints: number;
}

export interface FormTable {
  /** Ranked rows first (points, goal difference, goals for), then the idle clubs in season order. */
  rows: FormRow[];
  /** Clubs with at least one finished fixture in the window. */
  ranked: number;
  /** Finished fixtures read in this competition. */
  matches: number;
  /** The window size used, in matches. */
  window: number;
}

/** The last five, ranked: every club's last `FORM_WINDOW` finished fixtures, scored as their own
 *  mini-league. New analytics, not a re-read 鈥?`teamMetrics`' `form` is only each club's own letters;
 *  this sorts the whole field on the window. Reuses the `recentResults` door for the window, the
 *  `creditResult` door for the tally and `byTableStanding` for the ranking, so no arithmetic is
 *  re-spelled here. */
export function formTable(compId: string, matches: Match[], clubs: Club[]): FormTable {
  const season = teamMetrics(compId, matches, clubs);
  // Season places are numbered only over the cohort that actually plays finished fixtures 鈥?the
  // same cohort the window ranks, so `climb` compares like with like. A club with no finished
  // fixture holds no season place on this screen (it holds season place 0 and the screen prints
  // the absence glyph).
  const seasonPosition = new Map<string, number>();
  let seasonRank = 0;
  for (const m of season) {
    if (m.played > 0) {
      seasonRank++;
      seasonPosition.set(m.clubId, seasonRank);
    } else {
      seasonPosition.set(m.clubId, 0);
    }
  }
  const byClub = new Map<string, Array<{ kickoff: string; gf: number; ga: number; home: boolean }>>(
    [...seasonPosition.keys()].map((id) => [id, [] as Array<{ kickoff: string; gf: number; ga: number; home: boolean }>]),
  );
  let counted = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    counted++;
    byClub.get(m.homeClubId)?.push({ kickoff: m.kickoff, gf: m.homeGoals, ga: m.awayGoals, home: true });
    byClub.get(m.awayClubId)?.push({ kickoff: m.kickoff, gf: m.awayGoals, ga: m.homeGoals, home: false });
  }
  const out: FormRow[] = [];
  for (const [clubId, list] of byClub) {
    list.sort(byKickoff);
    const club: FormRow = {
      clubId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
      form: [], seasonPosition: seasonPosition.get(clubId) ?? 0, formPosition: 0, climb: 0,
      homePlayed: 0, homePoints: 0, awayPlayed: 0, awayPoints: 0,
    };
    for (const r of recentResults(list)) {
      creditResult(club, r.gf, r.ga);
      club.form.push(formLetter(r.gf, r.ga));
      if (r.home) {
        club.homePlayed++;
        club.homePoints += resultPoints(r.gf, r.ga);
      } else {
        club.awayPlayed++;
        club.awayPoints += resultPoints(r.gf, r.ga);
      }
    }
    out.push(club);
  }
  const active = out.filter((r) => r.played > 0);
  active.sort((x, y) => byTableStanding(x, y) || x.clubId.localeCompare(y.clubId));
  active.forEach((r, i) => {
    r.formPosition = i + 1;
    r.climb = r.seasonPosition - (i + 1);
  });
  const idle = out.filter((r) => r.played === 0).sort((x, y) => x.seasonPosition - y.seasonPosition);
  return { rows: [...active, ...idle], ranked: active.length, matches: counted, window: FORM_WINDOW };
}

export interface StoryMoment {
  matchId: string;
  kickoff: string;
  /** The side the moment belongs to. */
  clubId: string;
  opponentId: string;
  /** The number that makes it a moment: the margin, the total goals, the lead surrendered, or the
   *  minute the last goal landed. */
  value: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface SeasonStory {
  /** The widest winning margin in the competition, first by margin then by the earlier kickoff. */
  biggestWin: StoryMoment | null;
  /** The fixture with the most goals in it, the earlier kickoff first on a tie. */
  highestScoring: StoryMoment | null;
  /** The biggest lead that did not survive 鈥?read off `collapses`, not re-derived here. */
  biggestCollapse: StoryMoment | null;
  /** The latest goal in the competition, the earlier kickoff first on a tie. */
  latestGoal: StoryMoment | null;
  /** The longest winning run 鈥?read off `streaks`. */
  longestRun: { clubId: string; length: number } | null;
  /** Finished fixtures read (all of them: a score is enough for four of the five moments). */
  matches: number;
}

/** The season told as five moments rather than as tables: the widest win, the wildest scoreline,
 *  the lead that got away, the latest goal and the longest run. It composes `collapses` and
 *  `streaks` rather than re-deriving them, so a screen built on this cannot disagree with the
 *  boards those folds already own. */
export function seasonStory(compId: string, matches: Match[], clubs: Club[]): SeasonStory {
  const ranked = new Set(teamMetrics(compId, matches, clubs).map((m) => m.clubId));
  let counted = 0;
  let biggestWin: StoryMoment | null = null;
  let highestScoring: StoryMoment | null = null;
  let latestGoal: StoryMoment | null = null;
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    counted++;
    const sides: Array<[string, string, number, number]> = [
      [m.homeClubId, m.awayClubId, m.homeGoals, m.awayGoals],
      [m.awayClubId, m.homeClubId, m.awayGoals, m.homeGoals],
    ];
    for (const [clubId, opponentId, ours, theirs] of sides) {
      if (!ranked.has(clubId)) continue;
      const margin = ours - theirs;
      if (margin > 0 && (!biggestWin || margin > biggestWin.value ||
        (margin === biggestWin.value && m.kickoff < biggestWin.kickoff))) {
        biggestWin = { matchId: m.id, kickoff: m.kickoff, clubId, opponentId, value: margin, goalsFor: ours, goalsAgainst: theirs };
      }
    }
    const total = m.homeGoals + m.awayGoals;
    if (total > 0 && (!highestScoring || total > highestScoring.value ||
      (total === highestScoring.value && m.kickoff < highestScoring.kickoff))) {
      highestScoring = { matchId: m.id, kickoff: m.kickoff, clubId: m.homeClubId, opponentId: m.awayClubId, value: total, goalsFor: m.homeGoals, goalsAgainst: m.awayGoals };
    }
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const clubId = e.side === "home" ? m.homeClubId : m.awayClubId;
      const opponentId = e.side === "home" ? m.awayClubId : m.homeClubId;
      if (!ranked.has(clubId)) continue;
      if (!latestGoal || e.minute > latestGoal.value ||
        (e.minute === latestGoal.value && m.kickoff < latestGoal.kickoff)) {
        latestGoal = { matchId: m.id, kickoff: m.kickoff, clubId, opponentId, value: e.minute, goalsFor: 0, goalsAgainst: 0 };
      }
    }
  }
  const thrown = collapses(compId, matches, clubs).rows[0];
  const biggestCollapse: StoryMoment | null = thrown
    ? { matchId: thrown.matchId, kickoff: thrown.kickoff, clubId: thrown.clubId, opponentId: thrown.opponentId, value: thrown.lead, goalsFor: thrown.goalsFor, goalsAgainst: thrown.goalsAgainst }
    : null;
  const run = streaks(compId, matches, clubs);
  const longestRun = run.longestWin > 0 && run.winHolder ? { clubId: run.winHolder, length: run.longestWin } : null;
  return { biggestWin, highestScoring, biggestCollapse, latestGoal, longestRun, matches: counted };
}

export interface TitleRaceWeek {
  /** 1-based week index, counted in seven-day buckets from the first finished fixture's UTC day. */
  week: number;
  /** The bucket's first UTC day, ISO date. */
  from: string;
  /** The last UTC day inside the bucket that held a finished fixture, ISO date. */
  to: string;
  leaderId: string;
  leaderPoints: number;
  secondId: string;
  secondPoints: number;
  /** leaderPoints - secondPoints at the end of this bucket. */
  gap: number;
  /** Finished fixtures counted so far. */
  played: number;
}

export interface TitleRace {
  weeks: TitleRaceWeek[];
  /** Weeks whose leader differs from the previous week's. */
  leadChanges: number;
  /** The gap after the last finished fixture. */
  currentGap: number;
  /** The widest gap any week reached, and the first week that reached it (0 when empty). */
  biggestGap: number;
  biggestGapWeek: number;
}

/** The gap between first and second as the season's finished fixtures accumulate, one point per
 *  seven-day bucket. This is the backward-looking read the board did not have: the standings show
 *  today's table, `pointsScenarios` projects it forward, and this says whether the race has
 *  tightened or opened week by week. Buckets are UTC days from the first kickoff, so the series is
 *  reproducible from the fixtures alone; a bucket with no finished fixture is skipped rather than
 *  drawn as a flat week. */
export function titleRace(compId: string, matches: Match[], clubs: Club[]): TitleRace {
  const finished = matches
    .filter((m) => m.competitionId === compId && m.status === "FINISHED")
    .sort(byKickoff);
  const empty: TitleRace = { weeks: [], leadChanges: 0, currentGap: 0, biggestGap: 0, biggestGapWeek: 0 };
  if (finished.length === 0) return empty;
  const utcDay = (iso: string) => Math.floor(epochMs(iso) / DAY_MS);
  const isoDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);
  const weekOf = (iso: string, base: number) => Math.floor((utcDay(iso) - base) / 7);
  const base = utcDay(finished[0].kickoff);
  const buckets = weekOf(last(finished)!.kickoff, base) + 1;
  const weeks: TitleRaceWeek[] = [];
  let leadChanges = 0;
  for (let w = 0; w < buckets; w++) {
    const inWeek = finished.filter((m) => weekOf(m.kickoff, base) === w);
    if (inWeek.length === 0) continue;
    const soFar = finished.filter((m) => weekOf(m.kickoff, base) <= w);
    const table = teamMetrics(compId, soFar, clubs);
    const leader = table[0];
    const second = table[1];
    if (!leader || !second) continue;
    const prev = last(weeks);
    if (prev && prev.leaderId !== leader.clubId) leadChanges++;
    weeks.push({
      week: w + 1,
      from: isoDay(base + w * 7),
      to: isoDay(utcDay(last(inWeek)!.kickoff)),
      leaderId: leader.clubId,
      leaderPoints: leader.points,
      secondId: second.clubId,
      secondPoints: second.points,
      gap: leader.points - second.points,
      played: soFar.length,
    });
  }
  const latest = last(weeks);
  const best = weeks.length ? maxBy(weeks, (week) => week.gap) : null;
  return {
    weeks,
    leadChanges,
    currentGap: latest?.gap ?? 0,
    biggestGap: best?.gap ?? 0,
    biggestGapWeek: best?.week ?? 0,
  };
}

export interface HeadToHeadMeeting {
  matchId: string;
  competitionId: string;
  kickoff: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  /** Goals for club A and club B, whichever end of the fixture they played. */
  goalsA: number;
  goalsB: number;
  /** The side that took the meeting; null when it ended level. */
  winner: "a" | "b" | null;
}

export interface HeadToHead {
  /** Finished meetings, in kickoff order. */
  meetings: HeadToHeadMeeting[];
  played: number;
  /** Distinct competitions the pair has met in. */
  competitions: number;
  winsA: number;
  winsB: number;
  draws: number;
  goalsA: number;
  goalsB: number;
  /** The widest-margin meeting; null while every meeting has been drawn. */
  biggest: HeadToHeadMeeting | null;
  /** Who won the run the latest meeting ended, and how long that run is. */
  streak: { side: "a" | "b" | "draw"; length: number } | null;
}

/** Every finished meeting between two clubs, read from club A's side.
 *
 *  A pair can meet in more than one competition 鈥?a league fixture and a continental tie 鈥?so the
 *  fold reads the whole fixture list rather than one competition's, which is the question the
 *  standings and the club comparison never answer. Scheduled and live fixtures are excluded: a
 *  record is what was played, not what is booked. */
export function headToHead(clubA: string, clubB: string, matches: Match[]): HeadToHead {
  const meetings = matches
    .filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null)
    .filter(
      (m) =>
        (m.homeClubId === clubA && m.awayClubId === clubB) ||
        (m.homeClubId === clubB && m.awayClubId === clubA),
    )
    .sort(byKickoff)
    .map((m) => {
      const aHome = m.homeClubId === clubA;
      const goalsA = (aHome ? m.homeGoals : m.awayGoals) as number;
      const goalsB = (aHome ? m.awayGoals : m.homeGoals) as number;
      return {
        matchId: m.id,
        competitionId: m.competitionId,
        kickoff: m.kickoff,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homeGoals: m.homeGoals as number,
        awayGoals: m.awayGoals as number,
        goalsA,
        goalsB,
        winner: goalsA > goalsB ? ("a" as const) : goalsB > goalsA ? ("b" as const) : null,
      };
    });
  const decisive = meetings.filter((m) => m.winner !== null);
  let streak: HeadToHead["streak"] = null;
  const latest = last(meetings);
  if (latest) {
    let n = 0;
    for (let i = meetings.length - 1; i >= 0; i--) {
      if (meetings[i].winner !== latest.winner) break;
      n++;
    }
    streak = { side: latest.winner ?? "draw", length: n };
  }
  return {
    meetings,
    played: meetings.length,
    competitions: new Set(meetings.map((m) => m.competitionId)).size,
    winsA: meetings.filter((m) => m.winner === "a").length,
    winsB: meetings.filter((m) => m.winner === "b").length,
    draws: meetings.filter((m) => m.winner === null).length,
    goalsA: sum(meetings, (m) => m.goalsA),
    goalsB: sum(meetings, (m) => m.goalsB),
    biggest: decisive.length === 0 ? null : maxBy(decisive, (m) => Math.abs(m.goalsA - m.goalsB)),
    streak,
  };
}

export interface VenueSplitRow {
  clubId: string;
  /** Points won at home and away 鈥?the two halves the table's single figure sums. */
  homePoints: number;
  awayPoints: number;
  /** Points per game in each half, 2dp; 0 while that half has not been played. */
  homePpg: number;
  awayPpg: number;
  /** homePpg - awayPpg, 2dp; negative means the club has travelled better than it has hosted. */
  homeEdge: number;
  home: Split;
  away: Split;
}

export interface VenueSplit {
  /** One row per club, in table order (the order `teamMetrics` already decided). */
  rows: VenueSplitRow[];
  /** League-wide results across every finished fixture 鈥?the venue effect the table hides. */
  homeWins: number;
  draws: number;
  awayWins: number;
  homeGoals: number;
  awayGoals: number;
  played: number;
}

/** The season split by venue: what each club has taken at home and away, and what the league's
 *  fixtures did as a whole.
 *
 *  `teamMetrics` already folds each club's home and away records 鈥?they feed its attack and defence
 *  ratings 鈥?but no screen asks the question those halves answer on their own: is this club's
 *  position built at home or on the road, and does the league even have a home advantage? Reading
 *  the same fold rather than replaying the fixtures means a correction to what "finished" means
 *  lands once, and the two screens can never disagree about a club's home record. */
export function venueSplit(compId: string, matches: Match[], clubs: Club[]): VenueSplit {
  const metrics = teamMetrics(compId, matches, clubs);
  const rows = metrics.map((m) => {
    const homePoints = m.home.won * 3 + m.home.drawn;
    const awayPoints = m.away.won * 3 + m.away.drawn;
    const homePpg = m.home.played ? round2(homePoints / m.home.played) : 0;
    const awayPpg = m.away.played ? round2(awayPoints / m.away.played) : 0;
    return {
      clubId: m.clubId,
      homePoints,
      awayPoints,
      homePpg,
      awayPpg,
      homeEdge: round2(homePpg - awayPpg),
      home: m.home,
      away: m.away,
    };
  });
  const fixtures = finishedFixtures(compId, matches);
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let homeGoals = 0;
  let awayGoals = 0;
  for (const m of fixtures) {
    homeGoals += m.homeGoals;
    awayGoals += m.awayGoals;
    if (m.homeGoals > m.awayGoals) homeWins++;
    else if (m.homeGoals < m.awayGoals) awayWins++;
    else draws++;
  }
  return { rows, homeWins, draws, awayWins, homeGoals, awayGoals, played: fixtures.length };
}

export interface DisciplineRow {
  clubId: string;
  /** Finished fixtures that carried a stats block 鈥?the games these counts were read from. */
  played: number;
  yellows: number;
  reds: number;
  fouls: number;
  /** Yellows plus reds: one booking is one card, whatever colour it is. */
  bookings: number;
  /** Cards and fouls per counted game, 2dp; 0 while the club has no counted game. */
  bookingsPerMatch: number;
  foulsPerMatch: number;
}

export interface Discipline {
  /** One row per club, most reds first, then most yellows, then club id. */
  rows: DisciplineRow[];
  /** Finished fixtures that carried a stats block; a fixture without one contributes nothing. */
  matches: number;
  yellows: number;
  reds: number;
  fouls: number;
  /** Cards both sides combined per counted fixture, 2dp. */
  perMatch: number;
}

/** The season's discipline: what the recorded match stats say about cards and fouls, club by club.
 *
 *  The match engine already writes a stats block per fixture 鈥?fouls, yellows, reds 鈥?and the box
 *  score prints it for the single match, but no screen asks which club is booked most often or
 *  whether the league's card count is rising with its fouls. This reads the same stats blocks
 *  `finishedFixtures` and `teamMetrics` read, so a fixture the table does not count cannot count
 *  here either, and a stats block with no cards is a real zero rather than a missing reading. */
export function discipline(compId: string, matches: Match[], clubs: Club[]): Discipline {
  const metrics = teamMetrics(compId, matches, clubs);
  const rows = new Map<string, DisciplineRow>(metrics.map((m) => [m.clubId, {
    clubId: m.clubId, played: 0, yellows: 0, reds: 0, fouls: 0,
    bookings: 0, bookingsPerMatch: 0, foulsPerMatch: 0,
  }]));
  let counted = 0;
  let yellows = 0;
  let reds = 0;
  let fouls = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.stats) continue;
    counted++;
    const home = rows.get(m.homeClubId);
    const away = rows.get(m.awayClubId);
    const hs = m.stats.home;
    const as = m.stats.away;
    yellows += hs.yellows + as.yellows;
    reds += hs.reds + as.reds;
    fouls += hs.fouls + as.fouls;
    if (home) { home.played = home.played + 1; home.yellows += hs.yellows; home.reds += hs.reds; home.fouls += hs.fouls; }
    if (away) { away.played = away.played + 1; away.yellows += as.yellows; away.reds += as.reds; away.fouls += as.fouls; }
  }
  const list = [...rows.values()];
  for (const r of list) {
    r.bookings = r.yellows + r.reds;
    r.bookingsPerMatch = r.played ? round2(r.bookings / r.played) : 0;
    r.foulsPerMatch = r.played ? round2(r.fouls / r.played) : 0;
  }
  list.sort((a, b) => b.reds - a.reds || b.yellows - a.yellows || a.clubId.localeCompare(b.clubId));
  return {
    rows: list,
    matches: counted,
    yellows,
    reds,
    fouls,
    perMatch: counted ? round2((yellows + reds) / counted) : 0,
  };
}

export interface DisciplineVenueRow {
  clubId: string;
  /** Fixtures it played at each end; zero means it has never played there. */
  playedHome: number;
  playedAway: number;
  /** Bookings (yellows plus reds) at each end. */
  home: number;
  away: number;
  /** Cards per game at each end, 2dp; 0 while it has not played there. */
  homePerMatch: number;
  awayPerMatch: number;
  /** awayPerMatch minus homePerMatch, 2dp; positive means rougher on the road. */
  gap: number;
}

export interface DisciplineVenue {
  /** One row per club, the biggest away-minus-home gap first, then the most bookings, then id. */
  rows: DisciplineVenueRow[];
  /** Finished fixtures that carried a stats block 鈥?each one is one home and one away appearance. */
  matches: number;
  home: { bookings: number; perMatch: number };
  away: { bookings: number; perMatch: number };
  /** Which end carries the higher league rate; null when nothing is counted or the rates tie. */
  rougher: Side | null;
}

/**
 * The same discipline fold split by venue (M626): each counted fixture books the home side at one
 * end and the away side at the other, so a club's card rate can be read where it was earned. The
 * board answers "who is booked most"; this answers "is it rougher on the road" 鈥?for the league
 * (`rougher`) and for each club (`gap`). The gap is the two printed rates subtracted, not a third
 * number drifting from them, and a club that has not played at an end reads zero there rather
 * than an invented rate.
 */
export function disciplineVenue(compId: string, matches: Match[], clubs: Club[]): DisciplineVenue {
  const metrics = teamMetrics(compId, matches, clubs);
  const rows = new Map<string, DisciplineVenueRow>(metrics.map((m) => [m.clubId, {
    clubId: m.clubId, playedHome: 0, playedAway: 0, home: 0, away: 0,
    homePerMatch: 0, awayPerMatch: 0, gap: 0,
  }]));
  let counted = 0;
  let homeBookings = 0;
  let awayBookings = 0;
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.stats) continue;
    counted++;
    const hb = m.stats.home.yellows + m.stats.home.reds;
    const ab = m.stats.away.yellows + m.stats.away.reds;
    homeBookings += hb;
    awayBookings += ab;
    const home = rows.get(m.homeClubId);
    const away = rows.get(m.awayClubId);
    if (home) { home.playedHome++; home.home += hb; }
    if (away) { away.playedAway++; away.away += ab; }
  }
  const list = [...rows.values()];
  for (const r of list) {
    r.homePerMatch = r.playedHome ? round2(r.home / r.playedHome) : 0;
    r.awayPerMatch = r.playedAway ? round2(r.away / r.playedAway) : 0;
    r.gap = round2(r.awayPerMatch - r.homePerMatch);
  }
  list.sort((a, b) =>
    b.gap - a.gap || (b.home + b.away) - (a.home + a.away) || a.clubId.localeCompare(b.clubId));
  return {
    rows: list,
    matches: counted,
    home: { bookings: homeBookings, perMatch: counted ? round2(homeBookings / counted) : 0 },
    away: { bookings: awayBookings, perMatch: counted ? round2(awayBookings / counted) : 0 },
    rougher: counted === 0 || homeBookings === awayBookings ? null : homeBookings > awayBookings ? "home" : "away",
  };
}

export interface DisciplineRound {
  round: number;
  /** Finished fixtures with a stats block in this round. */
  matches: number;
  yellows: number;
  reds: number;
  /** Cards in this round alone (yellows plus reds). */
  inRound: number;
  /** Cards per counted fixture in this round, 2dp. */
  perMatch: number;
  /** Cards in every counted round up to and including this one. */
  cards: number;
}

export interface DisciplineTrend {
  /** One row per counted round, in round order. */
  rounds: DisciplineRound[];
  /** The largest single-round card count 鈥?the bar scale. */
  peak: number;
}

/** The same stats blocks `discipline` reads, folded by round instead of by club: whether a league's
 *  card count is rising, falling or flat as its season runs. A round is counted only when a fixture
 *  in it carries a stats block, so a round whose fixtures were never recorded is absent rather than
 *  drawn at zero, and the cumulative column is the season total through that round. */
export function disciplineTrend(compId: string, matches: Match[]): DisciplineTrend {
  const byRound = new Map<number, RoundCards>();
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.stats) continue;
    const row = byRound.get(m.round) ?? { matches: 0, yellows: 0, reds: 0 };
    row.matches++;
    row.yellows += m.stats.home.yellows + m.stats.away.yellows;
    row.reds += m.stats.home.reds + m.stats.away.reds;
    byRound.set(m.round, row);
  }
  return foldCardRounds(byRound);
}

/** `disciplineTrend`'s fold with one side of each fixture lifted: the same season curve for a
 *  single club. A club that did not play a counted round is absent from that round, so the
 *  cumulative column counts only games it actually played. */
export function clubDisciplineTrend(compId: string, clubId: string, matches: Match[]): DisciplineTrend {
  const byRound = new Map<number, RoundCards>();
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.stats) continue;
    const side = m.homeClubId === clubId ? m.stats.home : m.awayClubId === clubId ? m.stats.away : null;
    if (!side) continue;
    const row = byRound.get(m.round) ?? { matches: 0, yellows: 0, reds: 0 };
    row.matches++;
    row.yellows += side.yellows;
    row.reds += side.reds;
    byRound.set(m.round, row);
  }
  return foldCardRounds(byRound);
}

interface RoundCards {
  matches: number;
  yellows: number;
  reds: number;
}

/** Both trends above fold the same per-round counts; only the reader differs 鈥?every stats block
 *  in the league, or one club's side of it. */
function foldCardRounds(byRound: Map<number, RoundCards>): DisciplineTrend {
  let cumulative = 0;
  let peak = 0;
  const rounds = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, r]) => {
      const inRound = r.yellows + r.reds;
      cumulative += inRound;
      peak = Math.max(peak, inRound);
      return {
        round,
        matches: r.matches,
        yellows: r.yellows,
        reds: r.reds,
        inRound,
        perMatch: round2(inRound / r.matches),
        cards: cumulative,
      };
    });
  return { rounds, peak };
}

export interface EventClockRow {
  clubId: string;
  shots: number;
  saves: number;
  vars: number;
  /** Shots in each window, index 0 = 1鈥?5鈥? index 5 = 76鈥?0+鈥? */
  shotsBands: number[];
  savesBands: number[];
  varBands: number[];
  /** Shots taken after the 75th minute (the last window). */
  lateShots: number;
  /** Share of this club's own shots that arrived late, 0鈥?00, 2dp; 0 when it has not shot. */
  lateShare: number;
  /** Shots the opponents took at this club 鈥?every SHOT and SAVE event by the other side (M625). */
  faced: number;
  /** Saves this club's keeper made 鈥?the other side's SAVE events, read from the defending end. */
  stops: number;
  /** Share of the shots it faced that its keeper stopped, 0鈥?00, 2dp; 0 when it faced none. */
  stopShare: number;
  /** Shots plus saves this club's defence faced in each window (M628), index 0 = 1鈥?5鈥? */
  facedBands: number[];
  /** Faced after the 75th minute (the last window). */
  lateFaced: number;
  /** Share of this club's faced load that arrived late, 0鈥?00, 2dp; 0 when it faced nothing. */
  lateFacedShare: number;
  /** The window it faced the most in; -1 when it faced nothing at all. */
  worstBand: number;
  /** Shots taken inside the first window, 1鈥?5鈥?(M773) 鈥?the opening the late read has no mirror for. */
  earlyShots: number;
  /** Share of this club's own shots that arrived in the opening, 0鈥?00, 2dp; 0 when it has not shot. */
  earlyShare: number;
  /** Faced inside the first window (M773) 鈥?the opening load on the same defending end as `lateFaced`. */
  earlyFaced: number;
  /** Share of this club's faced load that arrived in the opening, 0鈥?00, 2dp; 0 when it faced none. */
  earlyFacedShare: number;
}

export interface EventClock {
  rows: EventClockRow[];
  /** The same rows ordered by shots faced 鈥?the defending read of the same clock (M625). */
  siege: EventClockRow[];
  /** The same rows ordered by the load they faced after the 75th minute (M712) 鈥?the late read of
   *  the defending end. Ties fall back to the whole faced load, then the club id. */
  lateSiege: EventClockRow[];
  /** The same rows ordered by the load they faced inside the first window (M773) 鈥?the opening read
   *  of the defending end, the mirror of `lateSiege`. Ties fall back the same way. */
  earlySiege: EventClockRow[];
  /** The same rows ordered by the shots they took inside the first window (M777) 鈥?the attacking
   *  read of the opening, the mirror of `earlySiege`. Ties fall back to the whole shot load,
   *  then the club id. */
  earlyAttack: EventClockRow[];
  /** The same rows ordered by the shots they took inside the last window (M780) 鈥?the closing
   *  read of the attack, the mirror of `lateSiege` and the other end of `earlyAttack`. Ties fall
   *  back to the whole shot load, then the club id. */
  lateAttack: EventClockRow[];
  shotsBands: number[];
  savesBands: number[];
  varBands: number[];
  /** Faced in each window, league-wide (M628) 鈥?the mirror series of shots + saves, folded once. */
  facedBands: number[];
  shots: number;
  saves: number;
  vars: number;
  /** M954: the same six windows split by the end the shot came from 鈥?the league's own clock read
   *  at each venue. The two series add up to `shotsBands` / `savesBands` window for window. */
  homeShotsBands: number[];
  awayShotsBands: number[];
  homeSavesBands: number[];
  awaySavesBands: number[];
  /** Shots taken at each end, league-wide; the two add up to `shots`. */
  homeShots: number;
  awayShots: number;
  /** Finished fixtures in this competition that carried an event list. */
  matches: number;
}

/** When the match's other events arrive: every SHOT, SAVE and VAR in this competition's finished
 *  matches, folded into the same six windows `goalTiming` uses. The goals screen asks when goals
 *  land; this asks when the shots, the saves that answered them and the reviews that interrupted
 *  them land 鈥?a different object on the same clock, per club and for the league. M625 adds the
 *  defending end: the same events are charged to the club that faced them, so the screen can name
 *  who is under siege as well as who is shooting. M628 gives that end the clock too: each faced
 *  event also lands in the window it arrived in, per club and for the league 鈥?the M625 gap.
 *  M773 opens the clock at the other end: the first window gets the same four numbers the last one
 *  already carries, so a screen can say who strikes first as well as who is still being hit at the
 *  death, and the two reads of one club sit next to each other instead of on separate screens.
 *  M777 mirrors that opening at the attacking end: the first window's shots are named and ranked
 *  the way the defending end already was, with the closing share printed on the same row, so the
 *  two halves of one club's attack are a contrast rather than two separate tables.
 *  M780 closes that mirror: the last window's shots get their own ranking too, so a side that
 *  starts fast and one that finishes fast are named by the end they actually own rather than one
 *  being read off the other's board. */
export function eventClock(compId: string, matches: Match[], clubs: Club[]): EventClock {
  const metrics = teamMetrics(compId, matches, clubs);
  const emptyBands = () => Array.from({ length: GOAL_BANDS }, () => 0);
  const rows = new Map<string, EventClockRow>(
    metrics.map((m) => [m.clubId, {
      clubId: m.clubId, shots: 0, saves: 0, vars: 0,
      shotsBands: emptyBands(), savesBands: emptyBands(), varBands: emptyBands(),
      lateShots: 0, lateShare: 0, faced: 0, stops: 0, stopShare: 0,
      facedBands: emptyBands(), lateFaced: 0, lateFacedShare: 0, worstBand: -1,
      earlyShots: 0, earlyShare: 0, earlyFaced: 0, earlyFacedShare: 0,
    }]),
  );
  const shotsBands = emptyBands();
  const savesBands = emptyBands();
  const varBands = emptyBands();
  const homeShotsBands = emptyBands();
  const awayShotsBands = emptyBands();
  const homeSavesBands = emptyBands();
  const awaySavesBands = emptyBands();
  let shots = 0; let saves = 0; let vars = 0; let counted = 0;
  let homeShots = 0; let awayShots = 0;
  const lastBand = GOAL_BANDS - 1;
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.events?.length) continue;
    counted++;
    for (const e of m.events) {
      if (e.type !== "SHOT" && e.type !== "SAVE" && e.type !== "VAR") continue;
      const band = goalBand(e.minute);
      const row = rows.get(e.side === "home" ? m.homeClubId : m.awayClubId);
      // M625: the same event is also a statement about the defence. Every shot is faced by the
      // other club, and a SAVE is the other club's keeper making the stop 鈥?so the defensive
      // read is the mirror of this one, folded off the same pass rather than a second sweep.
      const def = rows.get(e.side === "home" ? m.awayClubId : m.homeClubId);
      if (e.type === "SHOT") {
        shots++;
        shotsBands[band]++;
        if (e.side === "home") { homeShots++; homeShotsBands[band]++; } else { awayShots++; awayShotsBands[band]++; }
        if (row) {
          row.shots++;
          row.shotsBands[band]++;
          if (band === lastBand) row.lateShots++;
          if (band === 0) row.earlyShots++;
        }
        if (def) {
          def.faced++;
          def.facedBands[band]++;
          if (band === lastBand) def.lateFaced++;
          if (band === 0) def.earlyFaced++;
        }
      } else if (e.type === "SAVE") {
        saves++;
        savesBands[band]++;
        // M954: the save belongs to the keeper who made it 鈥?the other end from the one the event
        // names 鈥?the same crediting `eventVenueClock` and this fold's `stops` already read.
        if (e.side === "home") awaySavesBands[band]++; else homeSavesBands[band]++;
        if (row) { row.saves++; row.savesBands[band]++; }
        if (def) {
          def.faced++;
          def.facedBands[band]++;
          if (band === lastBand) def.lateFaced++;
          if (band === 0) def.earlyFaced++;
          def.stops++;
        }
      } else {
        vars++;
        varBands[band]++;
        if (row) { row.vars++; row.varBands[band]++; }
      }
    }
  }
  const list = [...rows.values()];
  for (const r of list) {
    r.lateShare = r.shots ? round2((r.lateShots / r.shots) * 100) : 0;
    r.stopShare = r.faced ? round2((r.stops / r.faced) * 100) : 0;
    r.lateFacedShare = r.faced ? round2((r.lateFaced / r.faced) * 100) : 0;
    r.earlyShare = r.shots ? round2((r.earlyShots / r.shots) * 100) : 0;
    r.earlyFacedShare = r.faced ? round2((r.earlyFaced / r.faced) * 100) : 0;
    // First window holding the maximum, so a tie reads the earlier one; -1 when nothing was faced.
    r.worstBand = r.faced ? r.facedBands.indexOf(Math.max(...r.facedBands)) : -1;
  }
  list.sort((a, b) => b.shots - a.shots || b.saves - a.saves || a.clubId.localeCompare(b.clubId));
  const siege = [...list].sort((a, b) => b.faced - a.faced || b.stops - a.stops || a.clubId.localeCompare(b.clubId));
  const lateSiege = [...list].sort((a, b) => b.lateFaced - a.lateFaced || b.faced - a.faced || a.clubId.localeCompare(b.clubId));
  const earlySiege = [...list].sort((a, b) => b.earlyFaced - a.earlyFaced || b.faced - a.faced || a.clubId.localeCompare(b.clubId));
  const earlyAttack = [...list].sort((a, b) => b.earlyShots - a.earlyShots || b.shots - a.shots || a.clubId.localeCompare(b.clubId));
  const lateAttack = [...list].sort((a, b) => b.lateShots - a.lateShots || b.shots - a.shots || a.clubId.localeCompare(b.clubId));
  // The league's faced clock is the mirror of its shots and saves: every one of those events faced
  // exactly one club, so the two series must add up window for window.
  const facedBands = shotsBands.map((n, b) => n + savesBands[b]);
  return { rows: list, siege, lateSiege, earlySiege, earlyAttack, lateAttack, shotsBands, savesBands, varBands, facedBands, shots, saves, vars, homeShotsBands, awayShotsBands, homeSavesBands, awaySavesBands, homeShots, awayShots, matches: counted };
}

export interface Briefing {
  /** The club the briefing is written for. */
  clubId: string;
  /** The club's next fixture 鈥?the earliest SCHEDULED kickoff across every competition. */
  fixture: Match;
  opponentId: string;
  /** The end of the fixture the briefing club plays. */
  side: Side;
  /** The fixture's own arithmetic for the two sides, hosts minus visitors (M630) 鈥?the same read
   *  the match page's stakes panel prints. Null when either side has no table row in the
   *  fixture's competition, the same condition the two scenario joins below report. */
  swing: MatchSwing | null;
  /** The same fixture asked of the STANDINGS: the two clubs' places now and after each of its
   *  three results (M715). `rankSwing` looks its clubs up in the very rows `us` and `them` are
   *  read from, so the places go absent together with the points swing rather than on a
   *  condition of their own. */
  rank: RankSwing | null;
  /** The briefing club's table-and-ceiling read in the fixture's competition; null when the
   *  competition has no table row for it yet (a cross-competition fixture can precede its debut). */
  us: PointsScenario | null;
  /** The opponent's read from the same fold 鈥?so the two sides of the fixture are measured alike. */
  them: PointsScenario | null;
  /** The briefing club's remaining-calendar row; null under the same condition as `us`. */
  runInRow: RunInRow | null;
  /** The briefing club's home/away row; null under the same condition as `us`. */
  venueRow: VenueSplitRow | null;
  /** Every finished meeting between the two clubs, in kickoff order. */
  record: HeadToHead;
  /** The competition's title race as it stands after the last finished fixture. */
  race: TitleRace;
}

/** What a fixture can still change for the two clubs in it (M627). Read only before kickoff:
 *  a finished fixture already spent its game, so `matchBrief` leaves this null rather than
 *  pretending the reader can still choose the result. */
export interface MatchSwing {
  /** The points gap from the hosts' side (hosts minus visitors) as the table stands now. */
  lead: number;
  /** The same gap after each result: a win moves it three, a draw moves both sides one. */
  ifHomeWin: number;
  ifDraw: number;
  ifAwayWin: number;
  /** Each side's ceiling after the fixture by its own result. The game is one of the games the
   *  ceiling was built on, so a win leaves it where it is, a draw costs two points of room and a
   *  loss costs three 鈥?arithmetic of the same fold, not a prediction. */
  homeCeiling: { win: number; draw: number; loss: number };
  awayCeiling: { win: number; draw: number; loss: number };
}

const swingOf = (home: PointsScenario, away: PointsScenario): MatchSwing => {
  const lead = home.points - away.points;
  return {
    lead,
    ifHomeWin: lead + 3,
    ifDraw: lead,
    ifAwayWin: lead - 3,
    homeCeiling: { win: home.maxPoints, draw: home.maxPoints - 2, loss: home.maxPoints - 3 },
    awayCeiling: { win: away.maxPoints, draw: away.maxPoints - 2, loss: away.maxPoints - 3 },
  };
};

/** The two clubs' 1-based table places in one outcome (M632). */
export interface RankPlace {
  home: number;
  away: number;
}

/** Where the fixture's three results would leave the two clubs in the table (M632). The points
 *  swing is `MatchSwing`'s; this is the same question asked of the STANDINGS, which need goal
 *  difference as well as points. */
export interface RankSwing {
  now: RankPlace;
  ifHomeWin: RankPlace;
  ifDraw: RankPlace;
  ifAwayWin: RankPlace;
}

/** Places each club would hold after this fixture (M632). The scoreline is the smallest deciding
 *  one 鈥?1-0, 1-1, 0-1 鈥?because a place needs goal difference and only the points are fixed by
 *  the result; that is the same convention the ceilings state. Ordering is `byTableStanding`, the
 *  one door the table screens rank through, and the sort is stable, so a club tied on points,
 *  goal difference and goals for keeps the place it had 鈥?the fold does not invent a new
 *  tie-break. Null when either side has no row to place, the same condition `swing` reports. */
export function rankSwing(compId: string, homeClubId: string, awayClubId: string, matches: Match[], clubs: Club[]): RankSwing | null {
  const rows = teamMetrics(compId, matches, clubs);
  const home = rows.find((r) => r.clubId === homeClubId);
  const away = rows.find((r) => r.clubId === awayClubId);
  if (!home || !away) return null;
  type Delta = [points: number, gf: number, ga: number];
  const place = (homeDelta: Delta, awayDelta: Delta): RankPlace => {
    const adjusted = rows.map((r) => {
      const d: Delta = r.clubId === homeClubId ? homeDelta : r.clubId === awayClubId ? awayDelta : [0, 0, 0];
      return { clubId: r.clubId, points: r.points + d[0], gf: r.gf + d[1], ga: r.ga + d[2] };
    });
    adjusted.sort(byTableStanding);
    const placeOf = (id: string) => adjusted.findIndex((r) => r.clubId === id) + 1;
    return { home: placeOf(homeClubId), away: placeOf(awayClubId) };
  };
  return {
    now: place([0, 0, 0], [0, 0, 0]),
    ifHomeWin: place([3, 1, 0], [0, 0, 1]),
    ifDraw: place([1, 1, 1], [1, 1, 1]),
    ifAwayWin: place([0, 0, 1], [3, 1, 0]),
  };
}

/** One club's standing now and in the ceiling table (M716). */
export interface CeilingPlaceRow {
  clubId: string;
  /** Place as the table stands after its last finished fixture. */
  place: number;
  /** Place once every club in this competition has taken the ceiling `pointsScenarios` prints for
   *  it 鈥?the table the season can still become. */
  ceilingPlace: number;
  /** Places the ceilings move this club; positive is a climb, negative is a club whose ceiling is
   *  smaller than somebody else's, 0 means it holds. */
  moves: number;
  /** The club this row sits directly above in the ceiling table 鈥?the row it lands on, so a move
   *  ends on a NAME and not just a number (M778); null when it is the bottom row, where there is
   *  nobody below to land on. A row the ceilings push DOWN still names its new neighbour: "over"
   *  says where the row stands, not who won the move. */
  landedOn: string | null;
}

export interface CeilingPlaces {
  /** Every club with a row in this competition's table, in standing order. */
  rows: CeilingPlaceRow[];
  /** The club the ceilings carry furthest up; null when the table has no row at all. */
  peak: CeilingPlaceRow | null;
}

/** What the points ceilings are worth in PLACES (M716). `pointsScenarios` answers "how many points
 *  can they still reach"; two ceilings are hard to compare in points alone, because a place needs
 *  goal difference as well 鈥?so this re-ranks through `byTableStanding`, the one door the table
 *  screens order by, and cannot disagree with the table a reader clicks over to.
 *  Every club is lifted to its OWN ceiling at the same time, which is the reading the column needs:
 *  lifting one club and freezing the others is the unilateral arithmetic `maxPoints` is written in,
 *  but as a place it says nothing 鈥?on the shipped Premier League data nine of ten clubs sweep to
 *  first that way, and a column of 1s is not a read. Together, the ceilings sort against each other
 *  and a club whose schedule offers less than its neighbour's can lose ground, which is the honest
 *  half of the answer: a ceiling is what is on the table, not what is coming.
 *  Each lifted fixture is scored the way `rankSwing` scores a win 鈥?the smallest margin that
 *  decides a game, so goals for grows by the matches left and goals against does not move. A tie
 *  keeps the incumbent's place, exactly as `rankSwing` leaves it. */
export function ceilingPlaces(compId: string, matches: Match[], clubs: Club[]): CeilingPlaces {
  const metrics = teamMetrics(compId, matches, clubs);
  const ceilingOf = new Map(pointsScenarios(compId, matches, clubs).map((s) => [s.clubId, s]));
  const placesOf = (rows: { clubId: string; points: number; gf: number; ga: number }[]): Map<string, number> => {
    const ranked = [...rows].sort(byTableStanding);
    return new Map(ranked.map((r, i) => [r.clubId, i + 1]));
  };
  const now = placesOf(metrics);
  const ceilingRows = metrics.map((r) => {
    const left = ceilingOf.get(r.clubId);
    return {
      clubId: r.clubId,
      points: left ? left.maxPoints : r.points,
      gf: r.gf + (left ? left.remaining : 0),
      ga: r.ga,
    };
  }).sort(byTableStanding);
  const ceiling = placesOf(ceilingRows);
  const rows = metrics.map((r) => {
    const place = now.get(r.clubId) ?? 0;
    const ceilingPlace = ceiling.get(r.clubId) ?? 0;
    // M778: the row directly below in the ceiling table, read off the same sorted fold the places
    // come from 鈥?no second ranking, so the name can never disagree with the number beside it.
    const landedOn = ceilingPlace > 0 ? ceilingRows[ceilingPlace]?.clubId ?? null : null;
    return { clubId: r.clubId, place, ceilingPlace, moves: place - ceilingPlace, landedOn };
  });
  return { rows, peak: rows.length ? maxBy(rows, (r) => r.moves) : null };
}

export interface MatchBrief {
  /** The fixture this brief is written for. */
  fixture: Match;
  /** The home side's table-and-ceiling read in the fixture's competition; null while the
   *  competition has no table row for it yet (a fixture can precede a club's debut). */
  home: PointsScenario | null;
  /** The away side's read from the same fold 鈥?both ends measured alike. */
  away: PointsScenario | null;
  /** The fixture's own arithmetic for the two sides; null once it is finished, or when either
   *  side has no table row to measure from. */
  swing: MatchSwing | null;
  /** The same condition and the same question asked of the standings: the two clubs' places now
   *  and after each result (M632), null under the condition `swing` reports. */
  rank: RankSwing | null;
  /** Each side's remaining calendar in the competition; null under the same condition. */
  homeRunIn: RunInRow | null;
  awayRunIn: RunInRow | null;
  /** Each side's own half of the venue split 鈥?the hosts' home row and the visitors' away row. */
  homeVenue: VenueSplitRow | null;
  awayVenue: VenueSplitRow | null;
  /** Each side's row of the season's card ledger 鈥?the discipline board read for the two clubs in
   *  this fixture (M713), so the match page can say how each has been booked. Null when the
   *  competition has no row for that club (a cross-competition fixture before its debut). */
  homeCards: DisciplineRow | null;
  awayCards: DisciplineRow | null;
  /** Each side's row of the clock's defending end 鈥?the load it faced and the late part of it
   *  (M714), off the event clock rather than a second sweep. Null when the competition has no
   *  clock row for that club, the same condition as the ledger above. */
  homeClock: EventClockRow | null;
  awayClock: EventClockRow | null;
  /** The pair's finished meetings, oriented so `winsA` belongs to this fixture's home club. */
  record: HeadToHead;
  /** The competition's title race as it stands after its last finished fixture. */
  race: TitleRace;
}

/** The same five-read join as `briefing`, anchored to a fixture the reader already chose rather
 *  than the club's next one. `briefing` answers "what is next?"; this answers "what does this
 *  game carry?" about either end, so both sides are measured instead of one. Every figure comes
 *  from the fold that owns it 鈥?`pointsScenarios`, `runIn`, `venueSplit`, `headToHead`,
 *  `titleRace` 鈥?so the match page cannot disagree with the screens it links to. The fixture is
 *  echoed back rather than looked up again, and an unknown id reads null, not an empty brief. */
export function matchBrief(matchId: string, matches: Match[], clubs: Club[]): MatchBrief | null {
  const fixture = matches.find((m) => m.id === matchId);
  if (!fixture) return null;
  const compId = fixture.competitionId;
  const scenarios = pointsScenarios(compId, matches, clubs);
  const calendar = runIn(compId, matches, clubs);
  const venues = venueSplit(compId, matches, clubs);
  const ledger = discipline(compId, matches, clubs);
  const clock = eventClock(compId, matches, clubs);
  const home = scenarios.find((s) => s.clubId === fixture.homeClubId) ?? null;
  const away = scenarios.find((s) => s.clubId === fixture.awayClubId) ?? null;
  return {
    fixture,
    home,
    away,
    swing: fixture.status === "SCHEDULED" && home && away ? swingOf(home, away) : null,
    rank: fixture.status === "SCHEDULED" && home && away ? rankSwing(compId, fixture.homeClubId, fixture.awayClubId, matches, clubs) : null,
    homeRunIn: calendar.find((r) => r.clubId === fixture.homeClubId) ?? null,
    awayRunIn: calendar.find((r) => r.clubId === fixture.awayClubId) ?? null,
    homeVenue: venues.rows.find((r) => r.clubId === fixture.homeClubId) ?? null,
    awayVenue: venues.rows.find((r) => r.clubId === fixture.awayClubId) ?? null,
    homeCards: ledger.rows.find((r) => r.clubId === fixture.homeClubId) ?? null,
    awayCards: ledger.rows.find((r) => r.clubId === fixture.awayClubId) ?? null,
    homeClock: clock.rows.find((r) => r.clubId === fixture.homeClubId) ?? null,
    awayClock: clock.rows.find((r) => r.clubId === fixture.awayClubId) ?? null,
    record: headToHead(fixture.homeClubId, fixture.awayClubId, matches),
    race: titleRace(compId, matches, clubs),
  };
}

/** One club's next match, gathered with every season read that explains it.
 *
 *  The board shows today, the run-in shows what is left, the venue split shows where the points
 *  came from 鈥?but a reader asking "what is this next fixture?" has to hold five screens in mind.
 *  This fold picks the club's next booked fixture (earliest SCHEDULED kickoff across every
 *  competition, ties broken by id so the pick is reproducible; a LIVE match belongs to the live
 *  strip, not to the fixture still to come) and joins the five reads to it, each computed by the
 *  screen that owns it rather than recomputed here, so the briefing can never disagree with them. */
export function briefing(clubId: string, matches: Match[], clubs: Club[]): Briefing | null {
  const next = matches
    .filter((m) => m.status === "SCHEDULED" && (m.homeClubId === clubId || m.awayClubId === clubId))
    .sort((a, b) => byKickoff(a, b) || a.id.localeCompare(b.id))[0];
  if (!next) return null;
  const side: Side = next.homeClubId === clubId ? "home" : "away";
  const opponentId = side === "home" ? next.awayClubId : next.homeClubId;
  const compId = next.competitionId;
  const scenarios = pointsScenarios(compId, matches, clubs);
  const us = scenarios.find((s) => s.clubId === clubId) ?? null;
  const them = scenarios.find((s) => s.clubId === opponentId) ?? null;
  // Hosts minus visitors, whoever the briefing is for: a club reading its away game must see the
  // same number as the opponent reading the same fixture.
  const home = side === "home" ? us : them;
  const away = side === "home" ? them : us;
  return {
    clubId,
    fixture: next,
    opponentId,
    side,
    us,
    them,
    swing: home && away ? swingOf(home, away) : null,
    rank: rankSwing(compId, next.homeClubId, next.awayClubId, matches, clubs),
    runInRow: runIn(compId, matches, clubs).find((r) => r.clubId === clubId) ?? null,
    venueRow: venueSplit(compId, matches, clubs).rows.find((r) => r.clubId === clubId) ?? null,
    record: headToHead(clubId, opponentId, matches),
    race: titleRace(compId, matches, clubs),
  };
}
