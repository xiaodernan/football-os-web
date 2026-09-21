import { footballProvider, getClub } from "@/data/footballService";
import type { PlayerRef, PositionGroup } from "./types";

// Scouting model (spec §28). Deliberately built only from fields the dataset
// actually provides (overall, potential, value, age, archetype, foot) — it never
// invents attribute vectors it does not have. All metrics are transparent formulas
// over real data, so a recommendation is explainable end to end.

export type PosBucket = "ALL" | "GK" | "DEF" | "MID" | "ATT";

export function bucketOf(g: PositionGroup): Exclude<PosBucket, "ALL"> {
  if (g === "GK") return "GK";
  if (g === "CB" || g === "FB") return "DEF";
  if (g === "CM" || g === "DM") return "MID";
  return "ATT"; // AM, W, ST
}

// Growth still available before the ceiling.
export const headroom = (p: PlayerRef) => Math.max(0, p.potential - p.overall);

// Overall rating purchased per €1M — higher is better value.
export const valueIndex = (p: PlayerRef) => (p.value > 0 ? p.overall / (p.value / 1_000_000) : p.overall);

// Rough prime window: younger + higher potential keeps value high for longer.
export const primeYears = (p: PlayerRef) => Math.max(0, Math.min(10, Math.round((p.potential - p.overall) / 2 + (27 - p.age))));

export interface ScoutFilters {
  bucket: PosBucket;
  minOverall: number;
  maxAge: number;
  maxValue: number; // EUR; Number.MAX_SAFE_INTEGER = no cap
  clubId?: string; // exclude this club's own players
}

export type ScoutSort = "value" | "potential" | "overall" | "age";

export function scoutCandidates(filters: ScoutFilters, sort: ScoutSort, limit = 60): PlayerRef[] {
  let list = footballProvider.players().filter((p) => {
    if (filters.bucket !== "ALL" && bucketOf(p.positionGroup) !== filters.bucket) return false;
    if (p.overall < filters.minOverall) return false;
    if (p.age > filters.maxAge) return false;
    if (p.value > filters.maxValue) return false;
    if (filters.clubId && p.clubId === filters.clubId) return false;
    return true;
  });
  const cmp: Record<ScoutSort, (a: PlayerRef, b: PlayerRef) => number> = {
    value: (a, b) => valueIndex(b) - valueIndex(a),
    potential: (a, b) => b.potential - a.potential || headroom(b) - headroom(a),
    overall: (a, b) => b.overall - a.overall,
    age: (a, b) => a.age - b.age || b.potential - a.potential,
  };
  list = [...list].sort(cmp[sort]);
  return list.slice(0, limit);
}

// Explainable "best value at a position" pick: highest value index among eligible,
// quality-gated so we do not recommend a cheap, poor player.
export function bestValueAt(bucket: Exclude<PosBucket, "ALL">, minOverall = 70): { player: PlayerRef; clubName: string } | null {
  const pool = footballProvider.players().filter((p) => bucketOf(p.positionGroup) === bucket && p.overall >= minOverall);
  if (!pool.length) return null;
  const p = pool.reduce((best, cur) => (valueIndex(cur) > valueIndex(best) ? cur : best));
  return { player: p, clubName: getClub(p.clubId)?.name ?? "—" };
}

// Squad profile of a club by position bucket — where it is thin vs. deep.
export function squadProfile(clubId: string): { bucket: Exclude<PosBucket, "ALL">; count: number; avg: number }[] {
  const squad = footballProvider.players().filter((p) => p.clubId === clubId);
  const buckets: Exclude<PosBucket, "ALL">[] = ["GK", "DEF", "MID", "ATT"];
  return buckets.map((b) => {
    const g = squad.filter((p) => bucketOf(p.positionGroup) === b);
    return { bucket: b, count: g.length, avg: g.length ? Math.round(g.reduce((s, p) => s + p.overall, 0) / g.length) : 0 };
  });
}
