// M1031: the dynasties — every club that wore the crown in the simulated world, counted
// pair by pair: which comp, how many times. The world's own report tells the top arc; this
// is the ledger underneath it. Nothing here estimated; everything is refolded from the
// history the world engine already wrote.

import type { SeasonStep } from "./worldEngine";

export interface DynastyRow {
  clubId: string;
  clubName: string;
  compId: string;
  compName: string;
  /** Total times this (club, competition) pair was crowned. */
  titles: number;
}

export interface Dynasties {
  /** Ordered by titles desc, then clubId, then compId. */
  rows: DynastyRow[];
  /** Simulated seasons read from the history. */
  seasons: number;
  /** Every crown handed out across all read seasons. */
  titles: number;
}

export function dynastyTable(history: SeasonStep[]): Dynasties {
  const acc = new Map<string, DynastyRow>();
  let titles = 0;
  for (const step of history) {
    titles += step.champions.length;
    for (const c of step.champions) {
      const key = `${c.clubId}|${c.compId}`;
      const cur = acc.get(key) ?? { clubId: c.clubId, clubName: c.clubName, compId: c.compId, compName: c.compName, titles: 0 };
      cur.titles += 1;
      acc.set(key, cur);
    }
  }
  const rows = [...acc.values()].sort(
    (a, b) => b.titles - a.titles || a.clubId.localeCompare(b.clubId) || a.compId.localeCompare(b.compId),
  );
  return { rows, seasons: history.length, titles };
}
