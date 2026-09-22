import { footballProvider, getClub } from "@/data/footballService";
import { baselineAttributes, strongestAttributes, attributeLabel } from "./attributes";
import type { Attributes, PlayerRef, PositionGroup } from "./types";

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

export interface ModelledAttribute {
  key: string;
  label: string;
  value: number;
}

export interface ModelledProfile {
  attributes: ModelledAttribute[];
  skill: number;
  hasData: boolean;
  /** true when these are the dataset's own per-player values rather than a
   *  position-group estimate */
  measured: boolean;
  confidence: number;
  note: string;
  sources: string[];
}

// When the dataset carries the attribute vector the player's overall was built
// from, that vector is reported directly. Only when it is absent (a leaner
// provider) does this fall back to the demo baseline for the position, and the
// note and confidence say which of the two the reader is looking at.
export function modelPlayerProfile(p: PlayerRef, top = 6): ModelledProfile {
  const skill = Math.max(0, Math.min(1, (p.overall - 52) / 30));
  const real = p.attributes && Object.keys(p.attributes).length >= 8 ? p.attributes : null;
  const attrs: Attributes = real ?? baselineAttributes(p.positionGroup as PositionGroup, skill);
  const attributes: ModelledAttribute[] = strongestAttributes(attrs, top).map((a) => ({
    key: a.key,
    label: attributeLabel(a.key),
    value: a.value,
  }));
  return {
    attributes,
    skill: Math.round(skill * 100) / 100,
    hasData: p.overall > 0,
    measured: !!real,
    confidence: real ? 92 : Math.round(Math.max(35, Math.min(70, 40 + skill * 30))),
    note: real
      ? "These are the attribute values this player's overall rating is derived from in the world dataset."
      : "Modelled from overall rating + position using the demo attribute baseline — an estimate, not measured data.",
    sources: real
      ? ["World dataset (per-player attribute vector)", "Attribute model (labels and ranking)"]
      : ["World dataset (overall, position group)", "Demo attribute model (baselineAttributes)"],
  };
}
