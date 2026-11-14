import type { Competition, Match } from "./types";

/**
 * M1121 · the Derby Codex. The clubs this world has been made to meet the most, computed
 * straight from the fixture list — nothing on this page is rivalry by fiat. Every number is a
 * fold over the finished matches; the ordering is fully deterministic (meetings desc, goals
 * desc, widest margin desc, pairing id asc) so the same seed always prints the same table.
 */
export interface DerbyRivalry {
  /** The higher-sorted club id in the pairing. */
  homeId: string;
  /** The lower-sorted club id in the pairing. */
  awayId: string;
  /** Finished meetings between the two clubs in this world. */
  meetings: number;
  goals: number;
  /** The widest positive margin either club produced in these meetings. */
  widest: number;
  homeGoals: number;
  awayGoals: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  /** The competitions they shared — every finished meeting is attributed to exactly one. */
  competitionIds: string[];
  /** Last finished meeting's kickoff ISO plus the goals attributed to each side (id-sorted). */
  lastKickoff: string;
  lastHomeGoals: number;
  lastAwayGoals: number;
  /** The match id of that last meeting — the screen links to it. */
  lastMatchId: string;
}

/** The authoritative fold. One pass over the finished population; O(n) after the status filter. */
export function derbyRivalries(matches: readonly Match[], limit = 8): DerbyRivalry[] {
  const buckets = new Map<string, DerbyRivalry>();
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeGoals == null || m.awayGoals == null) continue;
    const [a, b] = [m.homeClubId, m.awayClubId].sort();
    const key = `${a}|${b}`;
    const row = buckets.get(key) ?? {
      homeId: a, awayId: b,
      meetings: 0, goals: 0, widest: 0,
      homeGoals: 0, awayGoals: 0,
      homeWins: 0, awayWins: 0, draws: 0,
      competitionIds: [],
      lastKickoff: "", lastHomeGoals: 0, lastAwayGoals: 0,
      lastMatchId: "",
    };
    row.meetings += 1;
    row.goals += m.homeGoals + m.awayGoals;
    const margin = Math.abs(m.homeGoals - m.awayGoals);
    row.widest = Math.max(row.widest, margin);
    if (a === m.homeClubId) {
      row.homeGoals += m.homeGoals; row.awayGoals += m.awayGoals;
      if (m.homeGoals > m.awayGoals) row.homeWins += 1; else if (m.homeGoals < m.awayGoals) row.awayWins += 1; else row.draws += 1;
    } else {
      row.homeGoals += m.awayGoals; row.awayGoals += m.homeGoals;
      if (m.awayGoals > m.homeGoals) row.homeWins += 1; else if (m.awayGoals < m.homeGoals) row.awayWins += 1; else row.draws += 1;
    }
    if (!row.competitionIds.includes(m.competitionId)) row.competitionIds.push(m.competitionId);
    if (m.kickoff > row.lastKickoff) {
      row.lastKickoff = m.kickoff;
      row.lastMatchId = m.id;
      row.lastHomeGoals = a === m.homeClubId ? m.homeGoals : m.awayGoals;
      row.lastAwayGoals = a === m.homeClubId ? m.awayGoals : m.homeGoals;
    }
    buckets.set(key, row);
  }
  const out = [...buckets.values()];
  out.sort((a, b) =>
    (b.meetings - a.meetings) ||
    (b.goals - a.goals) ||
    (b.widest - a.widest) ||
    a.homeId.localeCompare(b.homeId) ||
    a.awayId.localeCompare(b.awayId),
  );
  return out.slice(0, limit);
}

/** The shared-competitions chips resolve through the provider's own names at the screen boundary. */
export function competitionNames(competitionIds: readonly string[], known: readonly Competition[]): string[] {
  const byId = new Map(known.map((c) => [c.id, c.name]));
  return competitionIds.map((id) => byId.get(id) ?? id);
}
