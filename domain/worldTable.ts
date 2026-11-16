// M1165 · The World Table — one Elo ordering across the seven real leagues.
// The rating is a pure function of the committed CC0 fixtures: every league, every side,
// one chronological fold. No peer leagues' invented difficulty weight, no projections;
// the file is the evidence. K=24 · home edge 65 · start 1500 · margin factor capped at 1.25
// (Δ = 1 + 0.25·log10(gd + 1), so a single-goal win moves ~36% of what an eight-goal win does).
import type { LiveWireLeague, LiveWirePayload } from "@/data/liveWire";
import { creditRecord } from "./attributes";

export interface EloRow {
  club: string;
  leagueId: string;
  league: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  /** rating − 1500 — where this club stands relative to the seeded arc baseline */
  delta: number;
  /** the rating itself, rounded to a whole number for the table */
  elo: number;
}

export interface WorldTableFold {
  rows: EloRow[];
  clubs: number;
  fixtures: number;
  goals: number;
  /** the club that climbed most from its seeded start — computed, never picked by hand */
  rocket: { club: string; delta: number } | null;
  /** the club that fell most — the honest counterweight */
  slump: { club: string; delta: number } | null;
}

const HOME_EDGE = 65;
const K = 24;
const START = 1500;

// A fixture's sort key: date, then league, then round number (if readable), then home/away — total determinism.
const key = (f: { date: string; time: string | null; round: string }, leagueId: string): string =>
  `${f.date}|${f.time ?? ""}|${leagueId}|${f.round}`;

export function foldWorldTable(payload: LiveWirePayload): WorldTableFold {
  const order = payload.leagues.flatMap((l: LiveWireLeague) =>
    l.seasonFixtures
      .filter((f) => Array.isArray(f.ft))
      .map((f) => ({ f, leagueId: l.id, league: l.league })),
  );
  order.sort((a, b) => key(a.f, a.leagueId).localeCompare(key(b.f, b.leagueId)));

  const rating = new Map<string, number>();
  const ledger = new Map<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; leagueId: string; league: string }>();
  const ensure = (name: string, leagueId: string, league: string) => {
    if (!ledger.has(name)) {
      ledger.set(name, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, leagueId, league });
      rating.set(name, START);
    }
  };

  let goals = 0;
  for (const { f, leagueId, league } of order) {
    const hg = f.ft![0], ag = f.ft![1];
    goals += hg + ag;
    ensure(f.home, leagueId, league);
    ensure(f.away, leagueId, league);
    const H = ledger.get(f.home)!, A = ledger.get(f.away)!;
    creditRecord(H, hg, ag);
    creditRecord(A, ag, hg);

    const ra = rating.get(f.home)!;
    const rb = rating.get(f.away)!;
    const expected = 1 / (1 + Math.pow(10, -(ra + HOME_EDGE - rb) / 400));
    const outcome = hg > ag ? 1 : hg === ag ? 0.5 : 0;
    const gd = Math.abs(hg - ag);
    const margin = Math.min(1.25, 1 + 0.25 * Math.log10(gd + 1));
    const move = K * margin * (outcome - expected);
    rating.set(f.home, ra + move);
    rating.set(f.away, rb - move);
  }

  const rows: EloRow[] = [...ledger.entries()].map(([club, v]) => {
    const elo = rating.get(club) ?? START;
    return {
      club, leagueId: v.leagueId, league: v.league,
      played: v.played, won: v.won, drawn: v.drawn, lost: v.lost,
      gf: v.gf, ga: v.ga, gd: v.gf - v.ga,
      delta: Math.round(elo - START), elo: Math.round(elo),
    };
  });
  rows.sort((a, b) => b.elo - a.elo || b.gd - a.gd || b.gf - a.gf || a.club.localeCompare(b.club));

  const rocket = rows.reduce((best, r) => (r.delta > (best?.delta ?? -Infinity) ? { club: r.club, delta: r.delta } : best), null as { club: string; delta: number } | null);
  const slump = rows.reduce((best, r) => (r.delta < (best?.delta ?? Infinity) ? { club: r.club, delta: r.delta } : best), null as { club: string; delta: number } | null);

  return {
    rows,
    clubs: rows.length,
    fixtures: order.length,
    goals,
    rocket,
    slump,
  };
}
