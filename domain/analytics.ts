// Data Room analytics (spec §"player & club analytics"). Pure, deterministic
// derivations over a set of finished matches so the UI can surface form,
// attack/defence strength and expected-goals style numbers that the raw tables
// don't show. No I/O, no React — every function is reproducible from its inputs
// and unit-testable. Ratings are relative to league average, so a 1.0 attack
// means "scores at the league-average rate".

import type { Club, Match, Side } from "@/domain/types";
import { clamp, round2, round3, indexById, epochMs, DAY_MS } from "@/lib/utils";
import { byTableStanding, sum, leaguePoints, recentResults, formLetter, creditRecord, ResultTally, maxBy, last } from "./attributes";

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

/** Six fifteen-minute windows a goal can arrive in. The last one absorbs stoppage time: a 97′ goal
 *  and a 78′ goal are both "late", because the recorded minute can run past 90. */
const GOAL_BANDS = 6;

function goalBand(minute: number): number {
  const band = Math.floor((minute - 1) / 15);
  return band < 0 ? 0 : band > GOAL_BANDS - 1 ? GOAL_BANDS - 1 : band;
}

export interface GoalTimingRow {
  clubId: string;
  scored: number;
  conceded: number;
  /** Goals scored in each window, index 0 = 1–15′, index 5 = 76–90+′. */
  scoredBands: number[];
  /** Goals conceded in each window. */
  concededBands: number[];
  /** Goals scored after the 75th minute (the last window). */
  lateScored: number;
  /** Goals conceded after the 75th minute. */
  lateConceded: number;
  /** Share of this club's own goals that arrived late, 0–100, 2dp; 0 when it has not scored. */
  lateShare: number;
}

/** When each club's goals arrive: every recorded GOAL event in this competition's finished matches,
 *  folded into six windows for the scoring side and the conceding side. A different question from
 *  the run-in (what is left), the points scenarios (what can still be reached) and the leaders
 *  (who scored them) — this one is about the clock. */
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
 *  A pair can meet in more than one competition — a league fixture and a continental tie — so the
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
  /** Points won at home and away — the two halves the table's single figure sums. */
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
  /** League-wide results across every finished fixture — the venue effect the table hides. */
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
 *  `teamMetrics` already folds each club's home and away records — they feed its attack and defence
 *  ratings — but no screen asks the question those halves answer on their own: is this club's
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
  /** Finished fixtures that carried a stats block — the games these counts were read from. */
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
 *  The match engine already writes a stats block per fixture — fouls, yellows, reds — and the box
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
  /** Finished fixtures that carried a stats block — each one is one home and one away appearance. */
  matches: number;
  home: { bookings: number; perMatch: number };
  away: { bookings: number; perMatch: number };
  /** Which end carries the higher league rate; null when nothing is counted or the rates tie. */
  rougher: Side | null;
}

/**
 * The same discipline fold split by venue (M626): each counted fixture books the home side at one
 * end and the away side at the other, so a club's card rate can be read where it was earned. The
 * board answers "who is booked most"; this answers "is it rougher on the road" — for the league
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
  /** The largest single-round card count — the bar scale. */
  peak: number;
}

/** The same stats blocks `discipline` reads, folded by round instead of by club: whether a league's
 *  card count is rising, falling or flat as its season runs. A round is counted only when a fixture
 *  in it carries a stats block, so a round whose fixtures were never recorded is absent rather than
 *  drawn at zero, and the cumulative column is the season total through that round. */
export function disciplineTrend(compId: string, matches: Match[]): DisciplineTrend {
  const byRound = new Map<number, { matches: number; yellows: number; reds: number }>();
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.stats) continue;
    const row = byRound.get(m.round) ?? { matches: 0, yellows: 0, reds: 0 };
    row.matches++;
    row.yellows += m.stats.home.yellows + m.stats.away.yellows;
    row.reds += m.stats.home.reds + m.stats.away.reds;
    byRound.set(m.round, row);
  }
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
  /** Shots in each window, index 0 = 1–15′, index 5 = 76–90+′. */
  shotsBands: number[];
  savesBands: number[];
  varBands: number[];
  /** Shots taken after the 75th minute (the last window). */
  lateShots: number;
  /** Share of this club's own shots that arrived late, 0–100, 2dp; 0 when it has not shot. */
  lateShare: number;
  /** Shots the opponents took at this club — every SHOT and SAVE event by the other side (M625). */
  faced: number;
  /** Saves this club's keeper made — the other side's SAVE events, read from the defending end. */
  stops: number;
  /** Share of the shots it faced that its keeper stopped, 0–100, 2dp; 0 when it faced none. */
  stopShare: number;
  /** Shots plus saves this club's defence faced in each window (M628), index 0 = 1–15′. */
  facedBands: number[];
  /** Faced after the 75th minute (the last window). */
  lateFaced: number;
  /** Share of this club's faced load that arrived late, 0–100, 2dp; 0 when it faced nothing. */
  lateFacedShare: number;
  /** The window it faced the most in; -1 when it faced nothing at all. */
  worstBand: number;
}

export interface EventClock {
  rows: EventClockRow[];
  /** The same rows ordered by shots faced — the defending read of the same clock (M625). */
  siege: EventClockRow[];
  shotsBands: number[];
  savesBands: number[];
  varBands: number[];
  /** Faced in each window, league-wide (M628) — the mirror series of shots + saves, folded once. */
  facedBands: number[];
  shots: number;
  saves: number;
  vars: number;
  /** Finished fixtures in this competition that carried an event list. */
  matches: number;
}

/** When the match's other events arrive: every SHOT, SAVE and VAR in this competition's finished
 *  matches, folded into the same six windows `goalTiming` uses. The goals screen asks when goals
 *  land; this asks when the shots, the saves that answered them and the reviews that interrupted
 *  them land — a different object on the same clock, per club and for the league. M625 adds the
 *  defending end: the same events are charged to the club that faced them, so the screen can name
 *  who is under siege as well as who is shooting. M628 gives that end the clock too: each faced
 *  event also lands in the window it arrived in, per club and for the league — the M625 gap. */
export function eventClock(compId: string, matches: Match[], clubs: Club[]): EventClock {
  const metrics = teamMetrics(compId, matches, clubs);
  const emptyBands = () => Array.from({ length: GOAL_BANDS }, () => 0);
  const rows = new Map<string, EventClockRow>(
    metrics.map((m) => [m.clubId, {
      clubId: m.clubId, shots: 0, saves: 0, vars: 0,
      shotsBands: emptyBands(), savesBands: emptyBands(), varBands: emptyBands(),
      lateShots: 0, lateShare: 0, faced: 0, stops: 0, stopShare: 0,
      facedBands: emptyBands(), lateFaced: 0, lateFacedShare: 0, worstBand: -1,
    }]),
  );
  const shotsBands = emptyBands();
  const savesBands = emptyBands();
  const varBands = emptyBands();
  let shots = 0; let saves = 0; let vars = 0; let counted = 0;
  const lastBand = GOAL_BANDS - 1;
  for (const m of matches) {
    if (m.competitionId !== compId || m.status !== "FINISHED" || !m.events?.length) continue;
    counted++;
    for (const e of m.events) {
      if (e.type !== "SHOT" && e.type !== "SAVE" && e.type !== "VAR") continue;
      const band = goalBand(e.minute);
      const row = rows.get(e.side === "home" ? m.homeClubId : m.awayClubId);
      // M625: the same event is also a statement about the defence. Every shot is faced by the
      // other club, and a SAVE is the other club's keeper making the stop — so the defensive
      // read is the mirror of this one, folded off the same pass rather than a second sweep.
      const def = rows.get(e.side === "home" ? m.awayClubId : m.homeClubId);
      if (e.type === "SHOT") {
        shots++;
        shotsBands[band]++;
        if (row) {
          row.shots++;
          row.shotsBands[band]++;
          if (band === lastBand) row.lateShots++;
        }
        if (def) {
          def.faced++;
          def.facedBands[band]++;
          if (band === lastBand) def.lateFaced++;
        }
      } else if (e.type === "SAVE") {
        saves++;
        savesBands[band]++;
        if (row) { row.saves++; row.savesBands[band]++; }
        if (def) {
          def.faced++;
          def.facedBands[band]++;
          if (band === lastBand) def.lateFaced++;
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
    // First window holding the maximum, so a tie reads the earlier one; -1 when nothing was faced.
    r.worstBand = r.faced ? r.facedBands.indexOf(Math.max(...r.facedBands)) : -1;
  }
  list.sort((a, b) => b.shots - a.shots || b.saves - a.saves || a.clubId.localeCompare(b.clubId));
  const siege = [...list].sort((a, b) => b.faced - a.faced || b.stops - a.stops || a.clubId.localeCompare(b.clubId));
  // The league's faced clock is the mirror of its shots and saves: every one of those events faced
  // exactly one club, so the two series must add up window for window.
  const facedBands = shotsBands.map((n, b) => n + savesBands[b]);
  return { rows: list, siege, shotsBands, savesBands, varBands, facedBands, shots, saves, vars, matches: counted };
}

export interface Briefing {
  /** The club the briefing is written for. */
  clubId: string;
  /** The club's next fixture — the earliest SCHEDULED kickoff across every competition. */
  fixture: Match;
  opponentId: string;
  /** The end of the fixture the briefing club plays. */
  side: Side;
  /** The fixture's own arithmetic for the two sides, hosts minus visitors (M630) — the same read
   *  the match page's stakes panel prints. Null when either side has no table row in the
   *  fixture's competition, the same condition the two scenario joins below report. */
  swing: MatchSwing | null;
  /** The briefing club's table-and-ceiling read in the fixture's competition; null when the
   *  competition has no table row for it yet (a cross-competition fixture can precede its debut). */
  us: PointsScenario | null;
  /** The opponent's read from the same fold — so the two sides of the fixture are measured alike. */
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
   *  loss costs three — arithmetic of the same fold, not a prediction. */
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

export interface MatchBrief {
  /** The fixture this brief is written for. */
  fixture: Match;
  /** The home side's table-and-ceiling read in the fixture's competition; null while the
   *  competition has no table row for it yet (a fixture can precede a club's debut). */
  home: PointsScenario | null;
  /** The away side's read from the same fold — both ends measured alike. */
  away: PointsScenario | null;
  /** The fixture's own arithmetic for the two sides; null once it is finished, or when either
   *  side has no table row to measure from. */
  swing: MatchSwing | null;
  /** Each side's remaining calendar in the competition; null under the same condition. */
  homeRunIn: RunInRow | null;
  awayRunIn: RunInRow | null;
  /** Each side's own half of the venue split — the hosts' home row and the visitors' away row. */
  homeVenue: VenueSplitRow | null;
  awayVenue: VenueSplitRow | null;
  /** The pair's finished meetings, oriented so `winsA` belongs to this fixture's home club. */
  record: HeadToHead;
  /** The competition's title race as it stands after its last finished fixture. */
  race: TitleRace;
}

/** The same five-read join as `briefing`, anchored to a fixture the reader already chose rather
 *  than the club's next one. `briefing` answers "what is next?"; this answers "what does this
 *  game carry?" about either end, so both sides are measured instead of one. Every figure comes
 *  from the fold that owns it — `pointsScenarios`, `runIn`, `venueSplit`, `headToHead`,
 *  `titleRace` — so the match page cannot disagree with the screens it links to. The fixture is
 *  echoed back rather than looked up again, and an unknown id reads null, not an empty brief. */
export function matchBrief(matchId: string, matches: Match[], clubs: Club[]): MatchBrief | null {
  const fixture = matches.find((m) => m.id === matchId);
  if (!fixture) return null;
  const compId = fixture.competitionId;
  const scenarios = pointsScenarios(compId, matches, clubs);
  const calendar = runIn(compId, matches, clubs);
  const venues = venueSplit(compId, matches, clubs);
  const home = scenarios.find((s) => s.clubId === fixture.homeClubId) ?? null;
  const away = scenarios.find((s) => s.clubId === fixture.awayClubId) ?? null;
  return {
    fixture,
    home,
    away,
    swing: fixture.status === "SCHEDULED" && home && away ? swingOf(home, away) : null,
    homeRunIn: calendar.find((r) => r.clubId === fixture.homeClubId) ?? null,
    awayRunIn: calendar.find((r) => r.clubId === fixture.awayClubId) ?? null,
    homeVenue: venues.rows.find((r) => r.clubId === fixture.homeClubId) ?? null,
    awayVenue: venues.rows.find((r) => r.clubId === fixture.awayClubId) ?? null,
    record: headToHead(fixture.homeClubId, fixture.awayClubId, matches),
    race: titleRace(compId, matches, clubs),
  };
}

/** One club's next match, gathered with every season read that explains it.
 *
 *  The board shows today, the run-in shows what is left, the venue split shows where the points
 *  came from — but a reader asking "what is this next fixture?" has to hold five screens in mind.
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
    runInRow: runIn(compId, matches, clubs).find((r) => r.clubId === clubId) ?? null,
    venueRow: venueSplit(compId, matches, clubs).rows.find((r) => r.clubId === clubId) ?? null,
    record: headToHead(clubId, opponentId, matches),
    race: titleRace(compId, matches, clubs),
  };
}
