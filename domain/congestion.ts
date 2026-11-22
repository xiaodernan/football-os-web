// M1232 — the congested calendar: the fixture spacing fold. Every other board reads what happened
// inside a match; this one reads the DISTANCE BETWEEN them — the turnaround a club's legs actually
// get. A side that plays Tuesday and Friday lives a different season from one that plays Tuesday
// and the following Monday, and no screen in this world has ever said so. Pure, deterministic:
// the gaps are whole days between kickoff instants, and an unparseable kickoff is a record skipped
// rather than a date at the epoch.
import type { Club, Match } from "./types";
import { sum } from "./attributes";
import { epochMs, DAY_MS, round2 } from "@/lib/utils";

export interface CongestionRow {
  clubId: string;
  /** Fixtures the club has in the calendar walked here. */
  fixtures: number;
  /** The tightest turnaround in whole days; a club with one fixture has no gap and takes no row. */
  minRest: number;
  /** The club's mean turnaround in whole days, 2dp. */
  avgRest: number;
  /** Gaps of THREE_CROWDED_DAYS or fewer — the stretches where legs go heavy. */
  crowded: number;
}

export interface CongestionFold {
  /** Clubs with at least two fixtures, ranked tightest-first: minRest asc, then the crowded count
   *  desc, then the mean asc, then the id. */
  rows: CongestionRow[];
  /** The tightest turnaround in the world, or null when no club has two fixtures. */
  tightest: CongestionRow | null;
  /** The world's mean turnaround across every club's every gap, 2dp. */
  leagueAvg: number;
  /** Every gap walked, world-wide. */
  gaps: number;
}

/** A turnaround of three days or fewer is a crowded one. */
export const THREE_CROWDED_DAYS = 3;

const wholeDays = (a: number, b: number): number => Math.floor(Math.abs(b - a) / DAY_MS);

export function fixtureCongestion(matches: readonly Match[], clubs: readonly Club[]): CongestionFold {
  const byId = new Set(clubs.map((c) => c.id));
  const times = new Map<string, number[]>();
  for (const m of matches) {
    if (!byId.has(m.homeClubId) || !byId.has(m.awayClubId)) continue;
    const at = epochMs(m.kickoff);
    if (at === 0) continue; // an unreadable kickoff is skipped, never read as the epoch
    for (const id of [m.homeClubId, m.awayClubId]) {
      const list = times.get(id);
      if (list) list.push(at); else times.set(id, [at]);
    }
  }

  const rows: CongestionRow[] = [];
  let gapSum = 0;
  for (const [clubId, list] of times) {
    if (list.length < 2) continue; // one fixture is a date, not a spacing
    const sorted = [...list].sort((a, b) => a - b);
    const gaps = sorted.slice(1).map((t, i) => wholeDays(sorted[i], t));
    gapSum += sum(gaps, (g) => g);
    rows.push({
      clubId,
      fixtures: list.length,
      minRest: Math.min(...gaps),
      avgRest: round2(sum(gaps, (g) => g) / gaps.length),
      crowded: gaps.filter((g) => g <= THREE_CROWDED_DAYS).length,
    });
  }
  const gaps = sum(rows, (r) => r.fixtures - 1);
  rows.sort(
    (a, b) =>
      a.minRest - b.minRest ||
      b.crowded - a.crowded ||
      a.avgRest - b.avgRest ||
      a.clubId.localeCompare(b.clubId),
  );
  return {
    rows,
    tightest: rows[0] ?? null,
    leagueAvg: gaps ? round2(gapSum / gaps) : 0,
    gaps,
  };
}
