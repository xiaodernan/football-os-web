// M1033: the coaching council — which clubs' squads grow the most across the simulated world,
// counted per season from the same PlayerChange records the report reads. Nothing invented:
// each club's up-tick summed across every simulated season; the board answers "whose youth
// actually improves" — the strongest claim a world built on aging attributes can honestly make.

import { round2 } from "@/lib/utils";
import type { SeasonStep } from "./worldEngine";

export interface CouncilRow {
  clubId: string;
  /** Sum of positive per-player deltas across every simulated season — the club's growth won. */
  upDelta: number;
  /** Players who gained overall at all (delta > 0) across the simulated run. */
  developed: number;
  /** upDelta per developed player, 2dp — quality per head, not just volume. */
  avgDelta: number;
  /** The single largest (to − from) leap in the whole run. */
  bestName: string;
  bestDelta: number;
}

export interface DevCouncil {
  /** Ordered by upDelta desc, then net desc, then clubId. */
  rows: CouncilRow[];
  /** Simulated seasons read from the history. */
  seasons: number;
  /** Every positive delta total, summed per club, across the population. */
  totalUp: number;
}

export function devCouncil(history: SeasonStep[]): DevCouncil {
  const acc = new Map<string, { up: number; developed: number; bestName: string; bestDelta: number }>();
  for (const step of history) {
    for (const c of step.developments) {
      const cur = acc.get(c.clubId) ?? { up: 0, developed: 0, bestName: "", bestDelta: 0 };
      cur.up += c.delta;
      cur.developed += 1;
      if (c.delta > cur.bestDelta) { cur.bestName = c.name; cur.bestDelta = c.delta; }
      acc.set(c.clubId, cur);
    }
  }
  const rows: CouncilRow[] = [];
  let totalUp = 0;
  for (const [clubId, v] of acc) {
    const upDelta = round2(v.up);
    totalUp = round2(totalUp + upDelta);
    rows.push({
      clubId,
      upDelta,
      developed: v.developed,
      avgDelta: v.developed ? round2(upDelta / v.developed) : 0,
      bestName: v.bestName,
      bestDelta: round2(v.bestDelta),
    });
  }
  rows.sort((a, b) => b.upDelta - a.upDelta || a.clubId.localeCompare(b.clubId));
  return { rows, seasons: history.length, totalUp };
}
