// M1155 · The Grand Tour — the seven wires told as one epic.
// Every number below is folded from the committed public-domain fixture files (CC0, OpenFootball).
// The fold invents nothing: when a window carries no result, the panel says exactly that.
import type { LiveWirePayload } from "@/data/liveWire";
import { round2 } from "@/lib/utils";

/** The crown vocabulary — spelled once, by the door. */
export type Crown = "alive" | "locked";

export interface LeagueTour {
  id: string;
  league: string;
  season: string;
  played: number;
  total: number;
  remaining: number;
  leader: string;
  second: string;
  leaderPts: number;
  secondPts: number;
  gap: number;
  crown: Crown;
  /** drama density: gap per remaining round — the smaller, the tighter the race */
  dramaPerRound: number;
  leaderForm: string;
}

export interface ChaseRow extends LeagueTour {
  tone: Crown;
}

export interface BigResult {
  league: string;
  round: string;
  date: string;
  home: string;
  away: string;
  ft: [number, number];
  margin: number;
  goals: number;
}

export interface GrandTourFold {
  leagues: LeagueTour[];
  /** tightest races first */
  chase: ChaseRow[];
  /** the widest crown is the dullest — tools to read it */
  widestCrown: LeagueTour | null;
  biggestWins: BigResult[];
}

const roundsPerSeason = (teams: number) => 2 * (teams - 1);

export function foldGrandTour(payload: LiveWirePayload): GrandTourFold {
  const leagues: LeagueTour[] = payload.leagues.map((l) => {
    const [first, second] = l.table;
    const size = l.table.length;
    const remaining = first != null ? Math.max(0, roundsPerSeason(size) - first.played) : 0;
    const gap = first && second ? first.pts - second.pts : 0;
    const secondCeiling = second ? second.pts + remaining * 3 : 0;
    const crown: Crown = first != null && second != null && secondCeiling < first.pts ? "locked" : "alive";
    return {
      id: l.id,
      league: l.league,
      season: l.season,
      played: l.playedFixtures,
      total: l.totalFixtures,
      remaining,
      leader: first?.team ?? "",
      second: second?.team ?? "",
      leaderPts: first?.pts ?? 0,
      secondPts: second?.pts ?? 0,
      gap,
      crown,
      dramaPerRound: remaining > 0 ? round2(gap / remaining) : 99,
      leaderForm: first?.form.join("") ?? "",
    };
  });

  const chase: ChaseRow[] = [...leagues]
    .sort((a, b) => a.dramaPerRound - b.dramaPerRound || a.gap - b.gap)
    .map((l) => ({ ...l, tone: l.crown }));

  const widestCrown = [...leagues].sort((a, b) => b.gap - a.gap)[0] ?? null;

  const biggestWins: BigResult[] = payload.leagues
    .flatMap((l) => l.recent.map((m) => ({ league: l.league, round: m.round, date: m.date, home: m.home, away: m.away, ft: m.ft, margin: Math.abs(m.ft[0] - m.ft[1]), goals: m.ft[0] + m.ft[1] })))
    .sort((a, b) => b.margin - a.margin || b.goals - a.goals || a.date.localeCompare(b.date))
    .slice(0, 4);

  return { leagues, chase, widestCrown, biggestWins };
}
