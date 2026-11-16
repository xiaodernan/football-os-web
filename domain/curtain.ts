// M1162 · Curtain Up — the next matchday across the seven real leagues, as committed.
// One deliberately honest view: what every league plays next, with no projection or prediction.
// The artifact is the truth; this fold just lays the next round flat so a first-time visitor
// can look once and know what the wire is about to show.
import type { LiveWireLeague } from "@/data/liveWire";
import { sum, roundNumber } from "./attributes";

export interface CurtainFixture {
  round: string;
  date: string;
  time: string | null;
  home: string;
  away: string;
  ft?: [number, number];
  played: boolean;
}

export interface CurtainCard {
  leagueId: string;
  league: string;
  round: string;
  totalFixtures: number;
  playedFixtures: number;
  fixtures: CurtainFixture[];
}

export interface CurtainFold {
  cards: CurtainCard[];
  nextFixtures: number;
  playedFixtures: number;
  totalFixtures: number;
}

export function foldCurtain(payload: { leagues: LiveWireLeague[] }): CurtainFold {
  const cards: CurtainCard[] = [];
  for (const l of payload.leagues) {
    // The next round is lexicographically first among rounds with at least one unplayed fixture.
    const rounds = new Map<string, CurtainFixture[]>();
    for (const f of l.seasonFixtures) {
      const played = Array.isArray(f.ft);
      const bag = rounds.get(f.round) ?? [];
      bag.push({ ...f, played });
      rounds.set(f.round, bag);
    }
    const nextRound = [...rounds.keys()]
      .filter((r) => (rounds.get(r) ?? []).some((f) => !f.played))
      .sort((a, b) => roundNumber(a) - roundNumber(b))[0];
    if (!nextRound) continue;
    const fixtures = rounds.get(nextRound) ?? [];
    cards.push({
      leagueId: l.id,
      league: l.league,
      round: nextRound,
      totalFixtures: l.totalFixtures,
      playedFixtures: l.playedFixtures,
      fixtures,
    });
  }
  const totalFixtures = sum(cards, (c) => c.fixtures.length);
  const playedFixtures = sum(cards, (c) => c.fixtures.filter((f) => f.played).length);
  return {
    cards,
    nextFixtures: totalFixtures,
    playedFixtures,
    totalFixtures: sum(payload.leagues, (l) => l.totalFixtures),
  };
}
