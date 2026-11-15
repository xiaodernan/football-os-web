// M1160 · The Long Season — the committed fixture window, rendered as one calendar.
// Zero network at runtime; every fixture here is public-domain OpenFootball CC0 data folded
// deterministically by CI — no LLM, no invention, no renaming of clubs.
import type { LiveWirePayload } from "@/data/liveWire";
import { sum } from "./attributes";

export const SACRED_FILTERS = ["all", "played", "upcoming"] as const;
export type SacredFilter = (typeof SACRED_FILTERS)[number];

export interface SacredFixture {
  round: string;
  date: string;
  time: string | null;
  home: string;
  away: string;
  ft?: [number, number];
  played: boolean;
}

export interface SacredRound {
  round: string;
  fixtures: SacredFixture[];
  played: number;
  total: number;
}

export interface SacredLeague {
  id: string;
  league: string;
  season: string;
  totalFixtures: number;
  playedFixtures: number;
  rounds: SacredRound[];
}

export interface SacredFold {
  leagues: SacredLeague[];
  totalFixtures: number;
  playedFixtures: number;
}

export interface SacredBigWin {
  league: string;
  round: string;
  date: string;
  home: string;
  away: string;
  ft: [number, number];
  margin: number;
}

const roundOf = (round: string) => Number(/(\d+)\s*$/.exec(round)?.[1] ?? 0);

export function foldSacredCalendar(p: LiveWirePayload, filter: SacredFilter = "all"): SacredFold {
  const leagues: SacredLeague[] = p.leagues.map((l) => {
    const byRound = new Map<string, SacredFixture[]>();
    for (const f of l.seasonFixtures) {
      const s: SacredFixture = { ...f, played: Array.isArray(f.ft) };
      if (filter === "played" && !s.played) continue;
      if (filter === "upcoming" && s.played) continue;
      const arr = byRound.get(s.round) ?? [];
      arr.push(s);
      byRound.set(s.round, arr);
    }
    const rounds: SacredRound[] = [...byRound.entries()]
      .map(([round, fixtures]) => ({
        round,
        fixtures,
        played: fixtures.filter((f) => f.played).length,
        total: fixtures.length,
      }))
      .sort((a, b) => roundOf(a.round) - roundOf(b.round) || a.round.localeCompare(b.round));
    return {
      id: l.id, league: l.league, season: l.season,
      totalFixtures: l.totalFixtures, playedFixtures: l.playedFixtures,
      rounds,
    };
  });
  return {
    leagues,
    totalFixtures: sum(leagues, (l) => l.totalFixtures),
    playedFixtures: sum(leagues, (l) => l.playedFixtures),
  };
}

/** The loudest committed results across the whole window, sorted margin → goals → date. */
export function foldSacredBigWins(p: LiveWirePayload, limit = 5): SacredBigWin[] {
  const wins: SacredBigWin[] = [];
  for (const l of p.leagues) {
    for (const f of l.seasonFixtures) {
      if (!Array.isArray(f.ft)) continue;
      const [h, a] = f.ft;
      wins.push({ league: l.league, round: f.round, date: f.date, home: f.home, away: f.away, ft: [h, a], margin: Math.abs(h - a) });
    }
  }
  return wins.sort((a, b) => b.margin - a.margin || (b.ft[0] + b.ft[1]) - (a.ft[0] + a.ft[1]) || b.date.localeCompare(a.date)).slice(0, limit);
}
