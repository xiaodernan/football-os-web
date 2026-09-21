// Transfer Centre model (spec §28 + §"news intelligence"). Turns the intelligence
// layer's transfer-flavoured stories (Rumor / Reported / Confirmed) into
// explainable targets: every row is grounded in a real news article (with its
// source and credibility) and every money figure is a transparent formula over
// the player's market value. When a viewer club is known we add a "fit" score that
// reads that club's own squad depth — still only over data the dataset has.

import { getPlayer, getClub, newsFeed } from "@/data/footballService";
import type { NewsArticle } from "@/domain/types";
import { bucketOf, headroom, valueIndex, squadProfile } from "./scouting";

const RUMOUR_KINDS: NewsArticle["kind"][] = ["Rumor", "Reported", "Confirmed"];

export interface RumourLink {
  articleId: string;
  title: string;
  kind: NewsArticle["kind"];
  source: string;
  credibility: number; // 0..1
  publishedAt: string;
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  fromClubId: string;
  fromClubName: string;
  askingFee: number; // EUR estimate = 1.1 × market value
  valueIndex: number; // overall per €1M
  headroom: number; // potential − overall
  fitScore: number | null; // 0..99 vs. viewer club, or null
  isTarget: boolean; // viewer club is thin at this position
}

export function askingFee(value: number): number {
  return Math.round((value * 1.1) / 100_000) * 100_000;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Fit: how much the viewer's club could use this player, from that club's own
// average rating at the relevant bucket. Thin/weak bucket → higher need.
function fitFor(viewerAvgByBucket: Map<string, number>, bucket: string, playerHeadroom: number, playerOverall: number): number {
  const myAvg = viewerAvgByBucket.get(bucket);
  if (myAvg == null) return 0;
  return clamp(Math.round(50 + (70 - myAvg) * 3 + playerHeadroom * 1.2 + (playerOverall - 60)), 5, 99);
}

export function transferRumours(viewerClubId?: string, kinds: NewsArticle["kind"][] = RUMOUR_KINDS): RumourLink[] {
  const wanted = new Set(kinds);
  const profile = viewerClubId ? new Map(squadProfile(viewerClubId).map((s) => [s.bucket, s.avg])) : null;
  const out: RumourLink[] = [];
  for (const n of newsFeed) {
    if (!wanted.has(n.kind)) continue;
    const pid = n.entityIds.find((id) => getPlayer(id));
    if (!pid) continue;
    const player = getPlayer(pid)!;
    if (viewerClubId && player.clubId === viewerClubId) continue; // not a target for your own players
    const bucket = bucketOf(player.positionGroup);
    const fit = profile ? fitFor(profile, bucket, headroom(player), player.overall) : null;
    out.push({
      articleId: n.id,
      title: n.title,
      kind: n.kind,
      source: n.source,
      credibility: n.credibility,
      publishedAt: n.publishedAt,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      age: player.age,
      fromClubId: player.clubId,
      fromClubName: getClub(player.clubId)?.name ?? player.clubId,
      askingFee: askingFee(player.value),
      valueIndex: Math.round(valueIndex(player) * 10) / 10,
      headroom: headroom(player),
      fitScore: fit,
      isTarget: fit != null && fit >= 70,
    });
  }
  return out.sort(
    (a, b) =>
      (b.fitScore ?? -1) - (a.fitScore ?? -1) ||
      b.credibility - a.credibility ||
      b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function availableKinds(): NewsArticle["kind"][] {
  return RUMOUR_KINDS;
}

// Convenience so the UI can show a player's club colours without
// importing the provider directly.
export const clubOf = (playerId: string) => {
  const p = getPlayer(playerId);
  return p ? getClub(p.clubId) : undefined;
};
