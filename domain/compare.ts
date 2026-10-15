// Player comparison model. Built from fields the dataset really provides: the
// headline ratings, age and value, plus — when a player carries one — the same
// attribute vector his overall was derived from. Nothing is estimated here: if a
// provider ships no attribute vectors, the attribute panels report that rather
// than inventing a profile. Every winner is chosen by a stated direction, so a
// verdict stays explainable.

import { getPlayer, getClub, formatValue } from "@/data/footballService";
import { fmt1 } from "@/lib/utils";
import type { PlayerRef } from "./types";
import { categoryAverages } from "./attributes";
import { headroom, valueIndex, primeHold, bucketOf, round1 } from "./scouting";

export type MetricDir = "high" | "low" | "info";

export interface CompareMetric {
  key: string;
  dir: MetricDir; // "high" bigger is better, "low" smaller is better, "info" neutral
  a: number;
  b: number;
  display: (v: number) => string;
}

export interface CompareResult {
  a: PlayerRef;
  b: PlayerRef;
  aClub: string;
  bClub: string;
  sameBucket: boolean;
  metrics: CompareMetric[];
  aWins: number;
  bWins: number;
  verdict: "a" | "b" | "even";
  /** true when BOTH players ship a real attribute vector */
  hasAttributes: boolean;
  attributeEdges: AttributeEdge[];
  categoryEdges: CategoryEdge[];
}

export interface AttributeEdge {
  key: string;
  a: number;
  b: number;
  /** a − b; positive favours player A */
  delta: number;
  favor: "a" | "b" | "even";
}

export interface CategoryEdge {
  category: string;
  a: number;
  b: number;
  delta: number;
  favor: "a" | "b" | "even";
}

const hasVector = (p: PlayerRef) => !!p.attributes && Object.keys(p.attributes).length >= 8;

// A player "advantage" score for the headline verdict: quality + upside − cost
// pressure, all normalised. Transparent, not a black box.
function advantage(p: PlayerRef): number {
  return (
    p.overall + // current quality
    headroom(p) * 0.6 + // growth still available
    primeHold(p) * 1.5 - // how long value holds
    Math.min(20, p.value / 100_000_000) // mild cost/ageing penalty for big spends
  );
}

export function compare(aId: string, bId: string): CompareResult | null {
  const a = getPlayer(aId);
  const b = getPlayer(bId);
  if (!a || !b || a.id === b.id) return null;

  const metrics: CompareMetric[] = [
    { key: "overall", dir: "high", a: a.overall, b: b.overall, display: (v) => `${v}` },
    { key: "potential", dir: "high", a: a.potential, b: b.potential, display: (v) => `${v}` },
    { key: "headroom", dir: "high", a: headroom(a), b: headroom(b), display: (v) => `+${v}` },
    { key: "age", dir: "low", a: a.age, b: b.age, display: (v) => `${v}` },
    { key: "prime", dir: "high", a: Math.round(primeHold(a)), b: Math.round(primeHold(b)), display: (v) => `${v}` },
    { key: "value", dir: "info", a: a.value, b: b.value, display: formatValue },
    { key: "valueIndex", dir: "high", a: round1(valueIndex(a)), b: round1(valueIndex(b)), display: (v) => `${fmt1(v)}` },
  ];

  let aWins = 0;
  let bWins = 0;
  for (const m of metrics) {
    if (m.dir === "info") continue;
    if (m.a === m.b) continue;
    const aBetter = m.dir === "high" ? m.a > m.b : m.a < m.b;
    if (aBetter) aWins++;
    else bWins++;
  }

  const adv = advantage(a) - advantage(b);
  const verdict: CompareResult["verdict"] = Math.abs(adv) < 1.5 ? "even" : adv > 0 ? "a" : "b";

  const hasAttributes = hasVector(a) && hasVector(b);
  let attributeEdges: AttributeEdge[] = [];
  let categoryEdges: CategoryEdge[] = [];
  if (hasAttributes) {
    const aAttrs = a.attributes!;
    const bAttrs = b.attributes!;
    attributeEdges = Object.keys(aAttrs)
      .filter((k) => typeof bAttrs[k] === "number")
      .map((k) => {
        const av = aAttrs[k];
        const bv = bAttrs[k];
        const delta = av - bv;
        return { key: k, a: av, b: bv, delta, favor: delta > 0 ? "a" as const : delta < 0 ? "b" as const : "even" as const };
      })
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta) || x.key.localeCompare(y.key))
      .slice(0, 8);
    const bCats = categoryAverages(bAttrs);
    categoryEdges = categoryAverages(aAttrs).map((ca, i) => {
      const cb = bCats[i];
      const delta = ca.value - cb.value;
      return {
        category: ca.category,
        a: ca.value,
        b: cb.value,
        delta,
        favor: delta > 0 ? ("a" as const) : delta < 0 ? ("b" as const) : ("even" as const),
      };
    });
  }

  return {
    a,
    b,
    aClub: getClub(a.clubId)?.name ?? a.clubId,
    bClub: getClub(b.clubId)?.name ?? b.clubId,
    sameBucket: bucketOf(a.positionGroup) === bucketOf(b.positionGroup),
    metrics,
    aWins,
    bWins,
    verdict,
    hasAttributes,
    attributeEdges,
    categoryEdges,
  };
}

// `round1` rides in from the scouting module above rather than being re-declared here: three
// domain modules each kept a byte-identical copy of this one-line rounder. And the value row
// prints money through the app's one `formatValue`, not a local copy: this
// module once carried its own euro formatter, so a future rounding tweak to the shared one
// would silently leave the comparison page quoting the same transfer fee a different way
// than the player page, dashboard and manager all already do.
