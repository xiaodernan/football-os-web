// Data Room analytics (spec §"player & club analytics"). Pure, deterministic
// derivations over a set of finished matches so the UI can surface form,
// attack/defence strength and expected-goals style numbers that the raw tables
// don't show. No I/O, no React — every function is reproducible from its inputs
// and unit-testable. Ratings are relative to league average, so a 1.0 attack
// means "scores at the league-average rate".

import type { Club, Match } from "@/domain/types";

export type FormLetter = "W" | "D" | "L";

export interface Split {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
}

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
  gaAvg: number;
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

function finish(s: Split, g: number, c: number) {
  s.played++;
  s.gf += g;
  s.ga += c;
  if (g > c) s.won++;
  else if (g < c) s.lost++;
  else s.drawn++;
}

const isFinished = (m: Match): m is Match & { homeGoals: number; awayGoals: number } =>
  m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null;

/** Compute per-club metrics for a competition from its finished matches. */
export function teamMetrics(compId: string, matches: Match[], clubs: Club[]): TeamMetrics[] {
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const fixtures = matches.filter(
    (m): m is Match & { homeGoals: number; awayGoals: number } => m.competitionId === compId && isFinished(m),
  ).sort((a, b) => a.kickoff.localeCompare(b.kickoff));

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
    finish(h.home, m.homeGoals, m.awayGoals);
    finish(a.away, m.awayGoals, m.homeGoals);
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
    const form: FormLetter[] = a.results.slice(-5).map((r) => (r.g > r.c ? "W" : r.g < r.c ? "L" : "D"));
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
      ppg: played ? Math.round(((won * 3 + drawn) / played) * 100) / 100 : 0,
      gfAvg: Math.round(gfAvg * 100) / 100,
      gaAvg: Math.round(gaAvg * 100) / 100,
      cleanSheets,
      form,
      home: a.home,
      away: a.away,
      attack: leagueAvg ? Math.round((gfAvg / leagueAvg) * 100) / 100 : 0,
      defence: leagueAvg ? Math.round((gaAvg / leagueAvg) * 100) / 100 : 0,
      leagueAvg: Math.round(leagueAvg * 100) / 100,
    });
  }
  return out.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
}

// Attack/defence are ratios against THIS competition's average goals per team
// per game, so the projection must use that same denominator — a hardcoded 1.4
// on a league averaging 0.5 inflates every scoreline. Small samples also let a
// ratio blow up (a 7-game defence figure), so λ is clamped to a believable band.
const LAMBDA_MIN = 0.15;
const LAMBDA_MAX = 3.5;

const clampLambda = (v: number) => Math.max(LAMBDA_MIN, Math.min(LAMBDA_MAX, v));

/** Modelled expected goals for a single fixture from the two sides' ratings. */
export function expectedGoals(home: TeamMetrics, away: TeamMetrics, leagueAvg?: number): { home: number; away: number } {
  const base = leagueAvg ?? Math.min(home.leagueAvg || 1.4, away.leagueAvg || 1.4);
  const h = clampLambda(base * home.attack * away.defence * 1.12);
  const a = clampLambda(base * away.attack * home.defence * 0.92);
  return { home: Math.round(h * 100) / 100, away: Math.round(a * 100) / 100 };
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
  expectedTotalGoals: number;
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
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    home: r3(ph / total),
    draw: r3(pd / total),
    away: r3(pa / total),
    mostLikelyScore: bestScore,
    mostLikelyPct: r3(best / total),
    expectedTotalGoals: Math.round((lH + lA) * 100) / 100,
    lambdaHome: Math.round(lH * 100) / 100,
    lambdaAway: Math.round(lA * 100) / 100,
  };
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
  const formPts = (m: TeamMetrics) => m.form.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
  return {
    bestForm: by(withGames, formPts, 1),
    strongestAttack: by(withGames, (m) => m.attack, 1),
    bestDefence: by(withGames, (m) => m.defence, -1),
    highestScoring: by(withGames, (m) => m.gfAvg, 1),
  };
}

export function formPoints(m: TeamMetrics): number {
  return m.form.reduce((s, r) => s + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);
}
