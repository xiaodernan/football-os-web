// M1147 · The Dream XI — the user's fantasy eleven, built on the frozen seed.
// Formation constraints, the €200M salary cap, chemistry by shared club / shared nation —
// every number is folded from the seed; nothing here invents.

import type { PlayerRef, PositionGroup } from "./types";
import { byOverall, sum } from "./attributes";

export type Formation = "4-3-3" | "4-4-2" | "3-5-2" | "4-2-3-1" | "5-3-2";

export interface FormationSlots {
  label: string;
  slots: PositionGroup[];
}
export const FORMATIONS: Record<Formation, FormationSlots> = {
  "4-3-3": { label: "4-3-3", slots: ["GK", "FB", "CB", "CB", "FB", "CM", "CM", "CM", "W", "ST", "W"] },
  "4-4-2": { label: "4-4-2", slots: ["GK", "FB", "CB", "CB", "FB", "CM", "CM", "CM", "CM", "ST", "ST"] },
  "3-5-2": { label: "3-5-2", slots: ["GK", "CB", "CB", "CB", "W", "DM", "CM", "CM", "W", "ST", "ST"] },
  "4-2-3-1": { label: "4-2-3-1", slots: ["GK", "FB", "CB", "CB", "FB", "DM", "DM", "AM", "W", "AM", "ST"] },
  "5-3-2": { label: "5-3-2", slots: ["GK", "CB", "FB", "CB", "CB", "FB", "CM", "CM", "CM", "ST", "ST"] },
};

export const SALARY_CAP_EUR = 200_000_000;

export interface DreamXI {
  formation: Formation;
  picked: string[];
  savedAt: string;
}

export interface TeamStats {
  avgOverall: number;
  totalValue: number;
  chemistry: number;
  underCap: boolean;
  picks: number;
  slots: number;
}

export function teamStats(players: readonly PlayerRef[], picked: string[], formation: Formation): TeamStats {
  const slots = FORMATIONS[formation].slots.length;
  const pickedPlayers = picked.map((id) => players.find((p) => p.id === id)).filter((p): p is PlayerRef => p != null);
  const picks = pickedPlayers.length;
  const avgOverall = picks ? sum(pickedPlayers, (p) => p.overall) / picks : 0;
  const totalValue = sum(pickedPlayers, (p) => p.value);
  // chemistry from shared-club and shared-nation pairs, scaled so two club-mates are a real signal
  let sharedClub = 0, sharedNation = 0;
  for (let i = 0; i < pickedPlayers.length; i++) {
    for (let j = i + 1; j < pickedPlayers.length; j++) {
      if (pickedPlayers[i].clubId === pickedPlayers[j].clubId) sharedClub++;
      if (pickedPlayers[i].nation === pickedPlayers[j].nation) sharedNation++;
    }
  }
  const chemistry = Math.min(10, Math.round((sharedClub * 2 + sharedNation * 0.5) * 1.0));
  return {
    avgOverall,
    totalValue,
    chemistry,
    underCap: totalValue <= SALARY_CAP_EUR,
    picks: picked.length,
    slots,
  };
}

/** The best remaining XI for this formation from the untouched seed by (overall desc, id asc). */
export function autoFill(players: readonly PlayerRef[], formation: Formation, taken: readonly string[]): string[] {
  const takenSet = new Set(taken);
  const out: string[] = [];
  const remainingBySlot = [...FORMATIONS[formation].slots];
  for (const slot of remainingBySlot) {
    const candidates = players.filter((p) => p.positionGroup === slot && !takenSet.has(p.id));
    if (candidates.length === 0) continue;
    const best = [...candidates].sort(byOverall)[0];
    out.push(best.id);
    takenSet.add(best.id);
  }
  return out;
}
