// M1234 · The Cliff — the squad depth fold. A table position is won by the best eleven a club
// can field; a season is lost by what happens when two of them go missing. Every board in this
// world ranks the top; this one measures the DROP — the overall distance from a club's best
// player to its eleventh, the average of the rest, and the bench that has to carry the season
// when the starters cannot. Pure, deterministic, over the roster the world already carries.
import type { Club, PlayerRef } from "./types";
import { round2 } from "@/lib/utils";

export interface DepthRow {
  clubId: string;
  /** Players the club carries in the world's roster. */
  squad: number;
  /** The club's best overall — the headline act. */
  best: number;
  /** The mean overall of the club's best eleven, 2dp. */
  xiAvg: number;
  /** The mean overall of everyone past the eleventh, 2dp; 0 when the squad IS the eleven. */
  benchAvg: number;
  /** best − the eleventh's overall: the cliff a club walks to when injuries come. */
  cliff: number;
}

export interface DepthFold {
  /** Clubs with at least two players, ranked by the cliff desc — the most top-heavy first —
   *  then the XI average desc, then the id. */
  rows: DepthRow[];
  /** The steepest cliff in the world, or null when no club has two players. */
  steepest: DepthRow | null;
  /** The shallowest cliff in the world, or null likewise. */
  shallowest: DepthRow | null;
  /** The world's mean cliff across the rows, 2dp. */
  leagueAvg: number;
}

/** The eleven a club would field, and the mean of whoever is left. */
const ELEVEN = 11;

export function squadDepth(players: readonly PlayerRef[], clubs: readonly Club[]): DepthFold {
  const byId = new Set(clubs.map((c) => c.id));
  const byClub = new Map<string, PlayerRef[]>();
  for (const p of players) {
    if (!byId.has(p.clubId)) continue;
    const list = byClub.get(p.clubId);
    if (list) list.push(p); else byClub.set(p.clubId, [p]);
  }

  const rows: DepthRow[] = [];
  for (const [clubId, list] of byClub) {
    if (list.length < 2) continue; // one player is a name, not a depth
    const ranked = [...list].sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id));
    const xi = ranked.slice(0, ELEVEN);
    const bench = ranked.slice(ELEVEN);
    rows.push({
      clubId,
      squad: list.length,
      best: ranked[0].overall,
      xiAvg: round2(xi.reduce((s, p) => s + p.overall, 0) / xi.length),
      benchAvg: bench.length ? round2(bench.reduce((s, p) => s + p.overall, 0) / bench.length) : 0,
      cliff: ranked[0].overall - xi[xi.length - 1].overall,
    });
  }
  rows.sort(
    (a, b) =>
      b.cliff - a.cliff ||
      b.xiAvg - a.xiAvg ||
      a.clubId.localeCompare(b.clubId),
  );
  // The shallowest: the smallest cliff; a tie goes to the thinner bench (equal cliff, less
  // behind it is the shallower side), then the id — so the two headline tiles name different
  // clubs whenever the world allows it.
  const shallowest = rows.length ? [...rows].sort((a, b) => a.cliff - b.cliff || a.benchAvg - b.benchAvg || a.clubId.localeCompare(b.clubId))[0] : null;
  return {
    rows,
    steepest: rows[0] ?? null,
    shallowest,
    leagueAvg: rows.length ? round2(rows.reduce((s, r) => s + r.cliff, 0) / rows.length) : 0,
  };
}
