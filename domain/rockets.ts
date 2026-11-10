// M1056: the breakthroughs — the biggest single-season leaps in the simulated world. The
// engine's own development lines already exist per season (PlayerChange); this fold picks the
// player's single best season out of the whole run and lists the top limit jumpers. The world
// tells the arc; this ledger names the ones who ripped it up.

import type { SeasonStep } from "./worldEngine";
import type { PositionCode } from "./types";

export interface RocketRow {
  id: string;
  name: string;
  clubId: string;
  position: PositionCode;
  age: number;
  /** The season the leap happened, 1-based. */
  season: number;
  from: number;
  to: number;
  delta: number;
}

export interface Rockets {
  /** Ordered by delta desc, then name, then id. */
  rows: RocketRow[];
  /** Simulated seasons read from the history. */
  seasons: number;
  /** Positive-delta developments found across the entire run. */
  built: number;
  /** The world's single biggest leap of the run (0 when nothing ran). */
  best: number;
}

export function rocketRises(history: SeasonStep[], limit = 6): Rockets {
  const best = new Map<string, RocketRow>();
  let built = 0;
  for (const step of history) {
    for (const d of step.developments) {
      if (!(d.delta > 0)) continue;
      built++;
      const row: RocketRow = {
        id: d.id, name: d.name, clubId: d.clubId, position: d.position, age: d.age,
        season: step.index + 1, from: d.from, to: d.to, delta: d.delta,
      };
      const cur = best.get(d.id);
      if (!cur || d.delta > cur.delta || (d.delta === cur.delta && row.season > cur.season)) {
        best.set(d.id, row);
      }
    }
  }
  const rows = [...best.values()].sort(
    (a, b) => b.delta - a.delta || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  ).slice(0, limit);
  return { rows, seasons: history.length, built, best: rows.length ? rows[0].delta : 0 };
}
