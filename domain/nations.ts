// M1237 · The Talent Map — the world by nation. Every board in this world ranks clubs and
// players; none has ever asked where the talent COMES FROM. The seed carries a nation on every
// player, so the fold reads the world's geography: who supplies the most, who supplies the best,
// and who the average side of a nation looks like. Pure, deterministic, over the roster the
// world already carries.
import type { PlayerRef } from "./types";
import { byOverall, meanOverall } from "./attributes";
import { round2 } from "@/lib/utils";

export interface NationRow {
  readonly nation: string;
  /** Players the world carries from this nation. */
  players: number;
  /** The nation's best overall — its headline act. */
  best: number;
  /** The name of that player, so the row can point at a person. */
  bestName: string;
  /** The nation's mean overall across everyone from it, 2dp. */
  avg: number;
}

export interface NationsFold {
  /** Nations with at least one player, ranked by the best overall desc, then the player count
   *  desc, then the nation name. */
  rows: NationRow[];
  /** The strongest nation by its best player, or null when the world carries none. */
  strongest: NationRow | null;
  /** The deepest nation by player count (ties: the better best, then the name), or null. */
  deepest: NationRow | null;
  /** The world's mean overall across every player, 2dp. */
  worldAvg: number;
  /** Nations represented. */
  nations: number;
  /** Players represented. */
  players: number;
}

export function talentMap(players: readonly PlayerRef[]): NationsFold {
  const byNation = new Map<string, PlayerRef[]>();
  for (const p of players) {
    if (!p.nation) continue;
    const list = byNation.get(p.nation);
    if (list) list.push(p); else byNation.set(p.nation, [p]);
  }

  const rows: NationRow[] = [...byNation.entries()].map(([nation, list]) => {
    const best = [...list].sort((a, b) => byOverall(a, b) || a.id.localeCompare(b.id))[0];
    return {
      nation,
      players: list.length,
      best: best.overall,
      bestName: best.name,
      avg: round2(meanOverall(list, 0)),
    };
  });
  rows.sort(
    (a, b) =>
      b.best - a.best ||
      b.players - a.players ||
      a.nation.localeCompare(b.nation),
  );
  const deepest = rows.length
    ? [...rows].sort((a, b) => b.players - a.players || b.best - a.best || a.nation.localeCompare(b.nation))[0]
    : null;
  const total = players.length;
  return {
    rows,
    strongest: rows[0] ?? null,
    deepest,
    worldAvg: round2(meanOverall(players, 0)),
    nations: rows.length,
    players: total,
  };
}
