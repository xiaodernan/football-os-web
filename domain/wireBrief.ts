// M1153 · The Wire Brief — deterministic fold facts behind the wire's briefing panel.
// This is the stand-down answer when no model is on call: every value is computed from
// the committed artifact, never estimated, never invented. The LLM path (when armed)
// grounds on the same artifact instead — one wire, two voices, both honest.

import type { LiveWirePayload } from "@/data/liveWire";

export interface WireBriefFacts {
  total: number;
  played: number;
  md: number;
  leader: string;
  leaderPts: number;
  leaderGd: number;
  second: string;
  secondGap: number;
  recentHome: string;
  recentAway: string;
  recentFt: string;
}

/** The facts the fold answer is built from; null when the wire carries no table. */
export function wireBriefFacts(p: LiveWirePayload): WireBriefFacts | null {
  const [first, second] = p.table;
  if (!first || !second) return null;
  const md = Number(/(\d+)\s*$/.exec(p.recent[0]?.round ?? "")?.[1] ?? 0);
  const latest = p.recent[0] ?? null;
  return {
    total: p.totalFixtures,
    played: p.playedFixtures,
    md,
    leader: first.team,
    leaderPts: first.pts,
    leaderGd: first.gd,
    second: second.team,
    secondGap: first.pts - second.pts,
    recentHome: latest?.home ?? "",
    recentAway: latest?.away ?? "",
    recentFt: latest ? `${latest.ft[0]}-${latest.ft[1]}` : "",
  };
}
