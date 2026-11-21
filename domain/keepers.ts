// M1231 — the keepers' union: the world's goalkeepers, named. Every board on the leaders screen
// ranks what clubs and outfield players did; this one names who stood between the posts for the
// best defensive record in the world. The clean-sheet numbers are NOT recomputed here — they are
// read from the shared leagueWall fold, the same one the leaders' wall board prints, so the two
// screens can never disagree about a sheet. Pure, deterministic, no prose: the screen words
// everything through the dictionary.
import type { Club, Match, PlayerRef } from "./types";
import { leagueWall } from "./analytics";

export interface KeeperRow {
  playerId: string;
  name: string;
  clubId: string;
  nation: string;
  age: number;
  overall: number;
  potential: number;
  /** Market value in EUR — a keeper's price is part of his story the same as anyone's. */
  value: number;
  /** The club's own defensive record, read from the shared wall fold. Zero when the club has no
   *  finished fixture to have kept one in. */
  cleanSheets: number;
  played: number;
  /** Clean sheets as a share of the club's finished fixtures, 0–100, 2dp. */
  rate: number;
}

export interface KeepersFold {
  /** Each club's number one — its highest-rated goalkeeper — ranked by overall, then the club's
   *  clean-sheet rate, then the club id. */
  rows: KeeperRow[];
  /** The world's best-rated keeper, or null when the world carries none. */
  best: KeeperRow | null;
  /** The number one behind the best wall — the best clean-sheet rate among clubs with a keeper —
   *  or null when no club has kept a single sheet. */
  bestWall: KeeperRow | null;
  /** How many goalkeepers the world carries, and how many clubs have a named number one. */
  keepers: number;
  clubs: number;
}

/** The club's number one: highest overall, then potential, then the id — a fully specified
 *  comparator, so two keepers of equal rating never reorder between runs. */
const beats = (a: PlayerRef, b: PlayerRef): boolean =>
  a.overall > b.overall ||
  (a.overall === b.overall && (a.potential > b.potential || (a.potential === b.potential && a.id < b.id)));

export function keeperUnion(players: PlayerRef[], clubs: Club[], matches: Match[]): KeepersFold {
  const wall = leagueWall(matches, clubs);
  const byClub = new Map(wall.rows.map((r) => [r.clubId, r]));

  const gks = players.filter((p) => p.positionGroup === "GK");
  const best = new Map<string, PlayerRef>();
  for (const p of gks) {
    const cur = best.get(p.clubId);
    if (!cur || beats(p, cur)) best.set(p.clubId, p);
  }

  const rows: KeeperRow[] = [...best.entries()].map(([clubId, p]) => {
    const w = byClub.get(clubId);
    return {
      playerId: p.id, name: p.name, clubId, nation: p.nation, age: p.age,
      overall: p.overall, potential: p.potential, value: p.value,
      cleanSheets: w?.cleanSheets ?? 0, played: w?.played ?? 0, rate: w?.rate ?? 0,
    };
  });
  rows.sort((a, b) => b.overall - a.overall || b.rate - a.rate || a.clubId.localeCompare(b.clubId));

  // The best wall is a record, not a rating: a club that has never kept a sheet has no wall to
  // be best of, however highly its keeper is rated.
  const walled = rows.filter((r) => r.cleanSheets > 0);
  const bestWall = walled.length
    ? [...walled].sort((a, b) => b.rate - a.rate || b.cleanSheets - a.cleanSheets || a.clubId.localeCompare(b.clubId))[0]
    : null;

  return { rows, best: rows[0] ?? null, bestWall, keepers: gks.length, clubs: rows.length };
}
