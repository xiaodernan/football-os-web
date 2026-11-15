// M1142 · The Dossier — the one scout report the world owes itself.
// Every number here folds out of the frozen seed: the prospect is the best (overall, then
// value, then id asc) world player aged 23 or younger, and the caution-touch tape walked
// from the goal events of the fixtures he has genuinely played. Nothing invented.
import type { Club, Match, PlayerRef } from "./types";
import { isFinished } from "./analytics";
import { valueIndex } from "./scouting";
import { sum, byOverall } from "./attributes";

export interface ScoutDossier {
  player: PlayerRef;
  club: Club | undefined;
  /** goals scored in competitions actually played, per match event walk. */
  appearances: number;
  goals: number;
  /** goals per appearance, 2dp. */
  goalsPerApp: number;
  /** potential minus overall — the world's honest headroom measure for him. */
  gap: number;
  valueIndex: number;
}

const SCOUT_MAX_AGE = 23;

export function pickProspect(players: readonly PlayerRef[]): PlayerRef | null {
  const under = players.filter((p) => p.age <= SCOUT_MAX_AGE);
  if (under.length === 0) return null;
  return [...under].sort((a, b) => byOverall(b, a) || b.value - a.value || a.id.localeCompare(b.id))[0];
}

export function scoutDossier(matches: readonly Match[], clubs: readonly Club[], players: readonly PlayerRef[]): ScoutDossier | null {
  const prospect = pickProspect(players);
  if (!prospect) return null;
  const byId = new Map(clubs.map((c) => [c.id, c] as const));

  let appearances = 0;
  const goals = new Map<string, { name: string; clubId: string; goals: number }>();
  for (const m of matches) {
    if (!isFinished(m)) continue;
    const ours = m.homeClubId === prospect.clubId || m.awayClubId === prospect.clubId;
    if (!ours) continue;
    appearances++;
    for (const e of m.events ?? []) {
      if (e.type !== "GOAL" || e.player !== prospect.name) continue;
      const key = `${prospect.name}|${prospect.clubId}`;
      const cur = goals.get(key) ?? { name: prospect.name, clubId: prospect.clubId, goals: 0 };
      cur.goals++;
      goals.set(key, cur);
    }
  }
  const totalGoals = sum([...goals.values()], (v) => v.goals);
  return {
    player: prospect,
    club: byId.get(prospect.clubId),
    appearances,
    goals: totalGoals,
    goalsPerApp: appearances ? Math.round((totalGoals / appearances) * 100) / 100 : 0,
    gap: Math.max(0, prospect.potential - prospect.overall),
    valueIndex: valueIndex(prospect),
  };
}
