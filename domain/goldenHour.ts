// M1173 · The Golden Hour — the biggest real results of the season, honestly folded.
// Three boards per league (biggest win, most goals, biggest shock) and three overall highlights,
// each row drawn from the committed CC0 artifact. Nothing is projected; every number traces back.
import type { LiveWireLeague, LiveWirePayload } from "@/data/liveWire";

export interface HourRow {
  date: string;
  round: string;
  home: string;
  away: string;
  ft: [number, number];
  leagueId: string;
  league: string;
}

export interface ShockRow extends HourRow {
  /** positions apart — the further the favourite falls, the bigger the shock */
  delta: number;
}

export interface LeagueBlock {
  leagueId: string;
  league: string;
  biggestWin: HourRow | null;
  mostGoals: HourRow | null;
  biggestShock: ShockRow | null;
  biggestGoalMargin: number;
  goalsInBiggest: number;
}

export interface GoldenHourFold {
  byLeague: LeagueBlock[];
  highlights: {
    biggestWin: HourRow | null;
    mostGoals: HourRow | null;
    biggestShock: ShockRow | null;
  };
  fixtures: number;
  goals: number;
}

const tablePos = (league: LiveWireLeague): Map<string, number> => {
  const m = new Map<string, number>();
  for (const r of league.table) m.set(r.team, r.pos);
  return m;
};

function pickOverall<T extends { ft: [number, number] }>(rows: T[], score: (r: T) => number): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const r of rows) {
    const s = score(r);
    if (s > bestScore) { best = r; bestScore = s; }
  }
  return best;
}

export function foldGoldenHour(payload: LiveWirePayload): GoldenHourFold {
  const blocks: LeagueBlock[] = [];
  const allRows: HourRow[] = [];
  let playedCount = 0;
  let goalsTotal = 0;

  for (const l of payload.leagues) {
    const pos = tablePos(l);
    const rows: HourRow[] = [];
    const shockRows: ShockRow[] = [];
    for (const f of l.seasonFixtures) {
      if (!Array.isArray(f.ft)) continue;
      playedCount += 1;
      const hg = f.ft[0], ag = f.ft[1];
      goalsTotal += hg + ag;
      const row: HourRow = { date: f.date, round: f.round, home: f.home, away: f.away, ft: [hg, ag], leagueId: l.id, league: l.league };
      rows.push(row);
      allRows.push(row);
      const hp = pos.get(f.home), ap = pos.get(f.away);
      // An underdog shock: the team further down the table wins. delta = posDiff.
      if (hp && ap && hp !== ap) {
        const winnerPos = hg > ag ? hp : ag > hg ? ap : null;
        const loserPos = winnerPos === hp ? ap : hp;
        if (winnerPos && winnerPos > loserPos) {
          shockRows.push({ ...row, delta: winnerPos - loserPos });
        }
      }
    }

    const biggestWin = pickOverall(rows, (r) => Math.abs(r.ft[0] - r.ft[1]));
    const mostGoals = pickOverall(rows, (r) => r.ft[0] + r.ft[1]);
    const biggestShock = pickOverall(shockRows, (r) => r.delta);
    blocks.push({
      leagueId: l.id,
      league: l.league,
      biggestWin,
      mostGoals,
      biggestShock,
      biggestGoalMargin: biggestWin ? Math.abs(biggestWin.ft[0] - biggestWin.ft[1]) : 0,
      goalsInBiggest: mostGoals ? mostGoals.ft[0] + mostGoals.ft[1] : 0,
    });
  }

  // Overall highlights across all leagues.
  const hl_biggestWin = pickOverall(allRows, (r) => Math.abs(r.ft[0] - r.ft[1]));
  const hl_mostGoals = pickOverall(allRows, (r) => r.ft[0] + r.ft[1]);
  let hl_biggestShock: ShockRow | null = null;
  let hlShockDelta = -1;
  for (const b of blocks) {
    if (b.biggestShock && b.biggestShock.delta > hlShockDelta) {
      hl_biggestShock = b.biggestShock;
      hlShockDelta = b.biggestShock.delta;
    }
  }

  return {
    byLeague: blocks,
    highlights: {
      biggestWin: hl_biggestWin,
      mostGoals: hl_mostGoals,
      biggestShock: hl_biggestShock,
    },
    fixtures: playedCount,
    goals: goalsTotal,
  };
}
