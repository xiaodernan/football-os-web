import type { PlayerRef } from "./types";

/**
 * M1126 · the Moonshots. The young ceilings this world rolled: players under 21 ranked by the
 * gap between the overall they carry and the potential star overhead as the seed wrote it.
 * Counted only — nothing on this screen means destiny, only capacity; every number is a field
 * the seed already carries. Deterministic tie-break: gap desc, then age asc, then id asc.
 */
export interface MoonshotRow {
  player: PlayerRef;
  /** potential − overall */
  gap: number;
}

export function moonshots(players: readonly PlayerRef[], limit = 12): MoonshotRow[] {
  return players
    .filter((p) => p.age <= 21)
    .map((p) => ({ player: p, gap: p.potential - p.overall }))
    .sort((a, b) =>
      (b.gap - a.gap) ||
      (a.player.age - b.player.age) ||
      a.player.id.localeCompare(b.player.id),
    )
    .slice(0, limit);
}
