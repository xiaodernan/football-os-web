import { footballProvider, getClub } from "@/data/footballService";
import { baselineAttributes, strongestAttributes, attributeLabel, categoryAverages, CATEGORY_LABEL } from "./attributes";
import type { CategoryAverage } from "./attributes";
import { playerVector } from "./playerDna";
import type { Attributes, PlayerRef, PositionGroup } from "./types";
import type { RowText } from "./rowText";

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
//
// The window is measured on a scale that runs from about -7 to +16 across the seeded
// world, and the DISPLAY bound is 0..10 — so 65% of players sit on one of the bound's
// two edges (measured: 127 at 0, 78 at 10 of 318). `capped` is what lets a screen say
// "10+" instead of presenting the bound as if it had been measured.
export interface PrimeWindow {
  years: number;
  raw: number;
  capped: boolean;
}

export const primeWindow = (p: PlayerRef): PrimeWindow => {
  const raw = (p.potential - p.overall) / 2 + (27 - p.age);
  return { years: Math.max(0, Math.min(10, Math.round(raw))), raw, capped: raw > 10 };
};

export const primeYears = (p: PlayerRef) => primeWindow(p).years;

// The window as a model input: floored at zero, but NOT capped at the display bound.
// Feeding the comparison the clamped figure made a quarter of all players tie on the
// term that is supposed to separate them; a presentation limit is not a model limit.
export const primeHold = (p: PlayerRef) => Math.max(0, primeWindow(p).raw);

// How the window is shown. Never a bare number at the ceiling.
export const primeYearsLabel = (p: PlayerRef) => (primeWindow(p).capped ? "10+" : `${primeYears(p)}`);

export interface ScoutFilters {
  bucket: PosBucket;
  minOverall: number;
  maxAge: number;
  maxValue: number; // EUR; Number.MAX_SAFE_INTEGER = no cap
  clubId?: string; // exclude this club's own players
}

export type ScoutSort = "value" | "potential" | "overall" | "age";

// The four scout orderings, one door. The watchlist board used to retype this object
// verbatim beside its own SORTS array, so an edit to the scout rule (tie-break by
// headroom, sign on the age sort) silently diverged from what a reader sees on the
// other screen. Both now import this table; ScoutSort and SORTS name the same four.
export const scoutComparators: Record<ScoutSort, (a: PlayerRef, b: PlayerRef) => number> = {
  value: (a, b) => valueIndex(b) - valueIndex(a),
  potential: (a, b) => b.potential - a.potential || headroom(b) - headroom(a),
  overall: (a, b) => b.overall - a.overall,
  age: (a, b) => a.age - b.age || b.potential - a.potential,
};

export function scoutCandidates(filters: ScoutFilters, sort: ScoutSort, limit = 60): PlayerRef[] {
  let list = footballProvider.players().filter((p) => {
    if (filters.bucket !== "ALL" && bucketOf(p.positionGroup) !== filters.bucket) return false;
    if (p.overall < filters.minOverall) return false;
    if (p.age > filters.maxAge) return false;
    if (p.value > filters.maxValue) return false;
    if (filters.clubId && p.clubId === filters.clubId) return false;
    return true;
  });
  list = [...list].sort(scoutComparators[sort]);
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

export interface TemplateEdge {
  key: string;
  value: number;
  template: number;
  delta: number;
}

export interface CategoryEdgeRow {
  category: CategoryAverage["category"];
  value: number;
  template: number;
  delta: number;
}

export interface ScoutReport {
  /** true when the dataset ships this player's own attribute vector */
  hasVector: boolean;
  categories: CategoryEdgeRow[];
  strengths: TemplateEdge[];
  concerns: TemplateEdge[];
  /** The verdict, the ledger lines and the provenance are rows: this module computes
   *  them from two real vectors, but the words it publishes are the app's, and the app
   *  has three locales. `attributeLabel`/`CATEGORY_LABEL` stay in the file only as the
   *  English fallbacks the prose layer uses. */
  headline: RowText;
  evidence: RowText[];
  confidence: number;
  sources: RowText[];
}

// The reference point is the positional template implied by the player's own
// rating: what baselineAttributes() produces for his position group at his
// skill level. Differences therefore describe what makes this player
// *different from a same-rated archetype peer*, computed from two real vectors
// rather than an opinion. Without a vector this reports that plainly.
export function scoutReport(p: PlayerRef, top = 5): ScoutReport {
  const skill = Math.max(0, Math.min(1, (p.overall - 52) / 30));
  const real = playerVector(p.attributes);

  if (!real) {
    return {
      hasVector: false,
      categories: [],
      strengths: [],
      concerns: [],
      headline: { key: "sc.out.head.noVector" },
      evidence: [{ key: "sc.out.ev.ratings", vars: { overall: p.overall, potential: p.potential, group: p.positionGroup } }],
      confidence: 20,
      sources: [{ key: "sc.out.src.ratingsOnly" }],
    };
  }

  const template = baselineAttributes(p.positionGroup as PositionGroup, skill);
  const edges: TemplateEdge[] = Object.keys(real)
    .filter((k) => typeof template[k] === "number")
    .map((k) => ({ key: k, value: real[k], template: template[k], delta: real[k] - template[k] }))
    .sort((a, b) => b.delta - a.delta || a.key.localeCompare(b.key));

  const strengths = edges.filter((e) => e.delta > 0).slice(0, top);
  const concerns = [...edges].reverse().filter((e) => e.delta < 0).slice(0, top).reverse();
  const templateCats = categoryAverages(template);
  const cats: CategoryEdgeRow[] = categoryAverages(real).map((ca, i) => {
    const tmpl = templateCats[i];
    return { category: ca.category, value: ca.value, template: tmpl.value, delta: ca.value - tmpl.value };
  });

  const sorted = [...cats].sort((a, b) => b.delta - a.delta);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const headline: RowText =
    best.delta > 0 && worst.delta < 0
      ? { key: "sc.out.head.mixed", vars: { group: p.positionGroup, cat: best.category, cat2: worst.category } }
      : best.delta > 0
        ? { key: "sc.out.head.above", vars: { group: p.positionGroup, cat: best.category, delta: round1(best.delta) } }
        : { key: "sc.out.head.flat" };

  return {
    hasVector: true,
    categories: cats,
    strengths,
    concerns,
    headline,
    evidence: [
      { key: "sc.out.ev.compare", vars: { group: p.positionGroup, skill: skill.toFixed(2) } },
      strengths.length
        ? { key: "sc.out.ev.above", vars: { focus: strengths.slice(0, 3).map((s) => s.key).join(",") } }
        : { key: "sc.out.ev.noneAbove" },
      concerns.length
        ? { key: "sc.out.ev.below", vars: { focus: concerns.slice(-3).reverse().map((s) => s.key).join(",") } }
        : { key: "sc.out.ev.noneBelow" },
      { key: "sc.out.ev.headroom", vars: { headroom: headroom(p), vi: round1(valueIndex(p)) } },
    ],
    confidence: 80,
    sources: [
      { key: "sc.out.src.vector" },
      { key: "sc.out.src.template" },
      { key: "sc.out.src.metrics" },
    ],
  };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export interface TemplateEdgeSummary {
  bestCategory: CategoryAverage["category"];
  bestDelta: number;
  worstCategory: CategoryAverage["category"];
  worstDelta: number;
}

/**
 * Cheap category-level version of the scout report for list rows: two averaged
 * vectors and a comparison, with no per-attribute sorting, so it stays
 * negligible across a long table. Null when the player has no vector.
 */
export function templateEdge(p: PlayerRef): TemplateEdgeSummary | null {
  const real = playerVector(p.attributes);
  if (!real) return null;
  const skill = Math.max(0, Math.min(1, (p.overall - 52) / 30));
  const tmpl = categoryAverages(baselineAttributes(p.positionGroup as PositionGroup, skill));
  const own = categoryAverages(real);
  const deltas = own.map((c, i) => ({ category: c.category, delta: c.value - tmpl[i].value }));
  const sorted = [...deltas].sort((a, b) => b.delta - a.delta);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  // Carries the category id, not CATEGORY_LABEL: the two list rows that show
  // this render in every locale, and the dictionary owns attr.*.
  return { bestCategory: best.category, bestDelta: best.delta, worstCategory: worst.category, worstDelta: worst.delta };
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
  value: number;
}

export interface ModelledProfile {
  attributes: ModelledAttribute[];
  /** true when these are the dataset's own per-player values rather than a
   *  position-group estimate */
  measured: boolean;
  confidence: number;
  /** Rows, like the report above: the sentence is the app's, the numbers the record's. */
  note: RowText;
  sources: RowText[];
}

// When the dataset carries the attribute vector the player's overall was built
// from, that vector is reported directly. Only when it is absent (a leaner
// provider) does this fall back to the demo baseline for the position, and the
// note and confidence say which of the two the reader is looking at.
export function modelPlayerProfile(p: PlayerRef, top = 6): ModelledProfile {
  const skill = Math.max(0, Math.min(1, (p.overall - 52) / 30));
  const real = playerVector(p.attributes);
  const attrs: Attributes = real ?? baselineAttributes(p.positionGroup as PositionGroup, skill);
  const attributes: ModelledAttribute[] = strongestAttributes(attrs, top).map((a) => ({
    key: a.key,
    value: a.value,
  }));
  return {
    attributes,
    measured: !!real,
    confidence: real ? 92 : Math.round(Math.max(35, Math.min(70, 40 + skill * 30))),
    note: real ? { key: "sc.prof.note.measured" } : { key: "sc.prof.note.modelled" },
    sources: real
      ? [{ key: "sc.out.src.vector" }, { key: "sc.prof.src.labels" }]
      : [{ key: "sc.prof.src.overall" }, { key: "sc.prof.src.baseline" }],
  };
}
