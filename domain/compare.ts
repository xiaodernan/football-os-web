// Player comparison model. Deliberately built only from fields the dataset
// really provides (overall, potential, age, value) — it never fabricates
// attribute vectors for world players. Every metric is a transparent number and
// the "winner" is chosen by a stated direction, so a verdict is explainable.

import { getPlayer, getClub } from "@/data/footballService";
import type { PlayerRef } from "./types";
import { headroom, valueIndex, primeYears, bucketOf } from "./scouting";

export type MetricDir = "high" | "low" | "info";

export interface CompareMetric {
  key: string;
  label: string;
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
}

// A player "advantage" score for the headline verdict: quality + upside − cost
// pressure, all normalised. Transparent, not a black box.
function advantage(p: PlayerRef): number {
  return (
    p.overall + // current quality
    headroom(p) * 0.6 + // growth still available
    primeYears(p) * 1.5 - // how long value holds
    Math.min(20, p.value / 100_000_000) // mild cost/ageing penalty for big spends
  );
}

export function compare(aId: string, bId: string): CompareResult | null {
  const a = getPlayer(aId);
  const b = getPlayer(bId);
  if (!a || !b || a.id === b.id) return null;

  const metrics: CompareMetric[] = [
    { key: "overall", label: "Overall", dir: "high", a: a.overall, b: b.overall, display: (v) => `${v}` },
    { key: "potential", label: "Potential", dir: "high", a: a.potential, b: b.potential, display: (v) => `${v}` },
    { key: "headroom", label: "Headroom", dir: "high", a: headroom(a), b: headroom(b), display: (v) => `+${v}` },
    { key: "age", label: "Age", dir: "low", a: a.age, b: b.age, display: (v) => `${v}` },
    { key: "prime", label: "Prime years", dir: "high", a: primeYears(a), b: primeYears(b), display: (v) => `${v}` },
    { key: "value", label: "Market value", dir: "info", a: a.value, b: b.value, display: (v) => formatEUR(v) },
    { key: "valueIndex", label: "Value index", dir: "high", a: round1(valueIndex(a)), b: round1(valueIndex(b)), display: (v) => `${v.toFixed(1)}` },
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
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function formatEUR(v: number): string {
  if (v >= 1_000_000_000) return `€${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}
