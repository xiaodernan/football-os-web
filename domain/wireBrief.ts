// M1154 · The Wire Brief — deterministic fold facts behind the wire's briefing panel.
// This is the stand-down answer when no model is on call: every value is computed from
// the committed artifact, never estimated, never invented. The LLM path (when armed)
// grounds on the same artifact instead — one wire, two voices, both honest.

import type { LiveWireLeague } from "@/data/liveWire";

export interface WireBriefFacts {
  league: string;
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

/** The facts the fold answer is built from; null when the wire section carries no table. */
export function wireBriefFacts(l: LiveWireLeague): WireBriefFacts | null {
  const [first, second] = l.table;
  if (!first || !second) return null;
  const md = Number(/(\d+)\s*$/.exec(l.recent[0]?.round ?? "")?.[1] ?? 0);
  const latest = l.recent[0] ?? null;
  return {
    league: l.league,
    total: l.totalFixtures,
    played: l.playedFixtures,
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
