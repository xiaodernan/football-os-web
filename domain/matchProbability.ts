import { simulateMatch, type TeamInput } from "./matchEngine";
import { clamp, round3 } from "@/lib/utils";

// A fixture-level probabilistic outlook produced by running the SAME
// deterministic Match Engine many times with varied seeds. Nothing is guessed
// from an external feed — the distribution is an emergent property of the model
// plus the two sides' real inputs, and it is fully reproducible for a given
// seedBase + matchup.

export interface ScoreLikelihood {
  score: string; // "H-A" from the home side's perspective
  pct: number; // 0..1
}

export interface MatchProbability {
  runs: number;
  homeName: string;
  awayName: string;
  homeWinPct: number; // 0..1
  drawPct: number;
  awayWinPct: number;
  avgHomeGoals: number;
  avgAwayGoals: number;
  avgHomeXg: number;
  avgAwayXg: number;
  mostLikely: ScoreLikelihood[]; // top scorelines by frequency
  bttsPct: number; // both sides score
  over25Pct: number; // 3+ total goals
  seedBase: string;
}

export interface MatchProbabilityInput {
  seedBase: string;
  home: TeamInput;
  away: TeamInput;
  runs?: number;
}

export function matchProbability(input: MatchProbabilityInput): MatchProbability {
  const runs = clamp(Math.floor(input.runs ?? 250), 1, 1000);
  let hw = 0, dr = 0, aw = 0, hg = 0, ag = 0, hx = 0, ax = 0, btts = 0, over = 0;
  const scores = new Map<string, number>();
  for (let i = 0; i < runs; i++) {
    const r = simulateMatch({ seed: `${input.seedBase}:r${i}`, home: input.home, away: input.away });
    if (r.homeGoals > r.awayGoals) hw++;
    else if (r.homeGoals === r.awayGoals) dr++;
    else aw++;
    hg += r.homeGoals;
    ag += r.awayGoals;
    hx += r.stats.home.xg;
    ax += r.stats.away.xg;
    if (r.homeGoals > 0 && r.awayGoals > 0) btts++;
    if (r.homeGoals + r.awayGoals >= 3) over++;
    const key = `${r.homeGoals}-${r.awayGoals}`;
    scores.set(key, (scores.get(key) ?? 0) + 1);
  }
  const mostLikely: ScoreLikelihood[] = [...scores.entries()]
    .map(([score, n]) => ({ score, pct: n / runs }))
    .sort((a, b) => b.pct - a.pct || a.score.localeCompare(b.score))
    .slice(0, 5);

  return {
    runs,
    homeName: input.home.name,
    awayName: input.away.name,
    homeWinPct: round3(hw / runs),
    drawPct: round3(dr / runs),
    awayWinPct: round3(aw / runs),
    avgHomeGoals: round3(hg / runs),
    avgAwayGoals: round3(ag / runs),
    avgHomeXg: round3(hx / runs),
    avgAwayXg: round3(ax / runs),
    mostLikely,
    bttsPct: round3(btts / runs),
    over25Pct: round3(over / runs),
    seedBase: input.seedBase,
  };
}
