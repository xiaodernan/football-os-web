import type { Match, MatchEvent, PlayerRef } from "./types";
import { byOverall } from "./attributes";

/**
 * M1116 · the Hall of Legends. The one board that reads every finished fixture in the seed
 * and names the world's greats — the Golden Boot counts each scorer by the fixture they
 * fired in, the Immortals are the highest overalls the world produces. Nothing here is invented:
 * goals are counted from the finished matches' own events, and the immortals are those players
 * sorted by the exact attribute vector the seed already computed.
 *
 * The seed embeds its own copies of the real world's icons in the world (Erling Haaland &
 * friends play for the world's clubs), and the count below resolves them on (name, clubId).
 */

export interface GoldenBootRow {
  player: PlayerRef;
  goals: number;
}

export interface LegendsBoard {
  /** Ranked scorers across every finished match in the seed. Deterministic tie-break by player id. */
  goldenBoot: GoldenBootRow[];
  /** The highest-overalls the world produces. Deterministic tie-break by player id. */
  immortals: PlayerRef[];
  /** How many unique players scored across the finished fixtures. */
  scorers: number;
  /** Total goals in the seed's finished fixtures. */
  goals: number;
  /** How many of those goals were attributable to a known player id (match by player name + side's club). */
  attributed: number;
}

/** The scorer's (name, clubId) pair is the exact string the seed embedded on the event. */
const sideClub = (e: MatchEvent, m: Match) => (e.side === "home" ? m.homeClubId : m.awayClubId);

export function legendsGoldenBoot(matches: readonly Match[], players: readonly PlayerRef[], limit = 5): GoldenBootRow[] {
  const byNameClub = new Map<string, PlayerRef>();
  for (const p of players) {
    const k = `${p.name}|${p.clubId}`;
    if (!byNameClub.has(k)) byNameClub.set(k, p);
  }
  const goals = new Map<string, number>();
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      const p = byNameClub.get(`${e.player}|${sideClub(e, m)}`);
      if (p) goals.set(p.id, (goals.get(p.id) ?? 0) + 1);
    }
  }
  return [...goals.entries()]
    .map(([id, count]) => {
      const player = players.find((p) => p.id === id);
      return player ? { player, goals: count } : null;
    })
    .filter((x): x is GoldenBootRow => x !== null)
    .sort((a, b) => (b.goals !== a.goals ? b.goals - a.goals : a.player.id.localeCompare(b.player.id)))
    .slice(0, limit);
}

export function legendsImmortals(players: readonly PlayerRef[], limit = 12): PlayerRef[] {
  return [...players].sort((a, b) => byOverall(a, b) || a.id.localeCompare(b.id)).slice(0, limit);
}

export function legendsBoard(matches: readonly Match[], players: readonly PlayerRef[], bootLimit = 5, immortalLimit = 12): LegendsBoard {
  const goldenBoot = legendsGoldenBoot(matches, players, bootLimit);
  const immortals = legendsImmortals(players, immortalLimit);
  const byNameClub = new Map<string, PlayerRef>();
  for (const p of players) {
    const k = `${p.name}|${p.clubId}`;
    if (!byNameClub.has(k)) byNameClub.set(k, p);
  }
  let goals = 0, attributed = 0;
  const uniqueScorers = new Set<string>();
  for (const m of matches) {
    if (m.status !== "FINISHED") continue;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL") continue;
      goals++;
      const p = byNameClub.get(`${e.player}|${sideClub(e, m)}`);
      if (p) { attributed++; uniqueScorers.add(p.id); }
    }
  }
  return { goldenBoot, immortals, scorers: uniqueScorers.size, goals, attributed };
}
