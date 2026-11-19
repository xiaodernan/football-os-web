// M1175 · The Wire Diary — the model spoke; the file proved every sentence; nothing outside it survived.
// The diary is written once per release by scripts/update-wire-diary.mjs (the real model, imprisoned to the fold),
// verified against the artifact, and committed as public/wire-diary.json. The screen reads it; nothing else writes it.
// M1201: the read mechanics live behind domain/releaseArtifact.ts — the screens call it directly.
import type { ReleaseVerdict } from "@/domain/releaseArtifact";

export type WireDiaryVerdict = ReleaseVerdict;

export interface DiaryArticle {
  leagueId: string;
  league: string;
  season: string;
  verdict: WireDiaryVerdict;
  paragraphs: string[];
}

export interface WireDiaryPayload {
  generatedAt: string;
  by: WireDiaryVerdict;
  diary: DiaryArticle[];
}

/** A reader could hand-edit the file in their browser — this guard refuses anything malformed. */
export function isWireDiaryPayload(p: unknown): p is WireDiaryPayload {
  if (!p || typeof p !== "object") return false;
  const d = (p as WireDiaryPayload).diary;
  if (!Array.isArray(d) || d.length === 0) return false;
  return d.every((a) => a && typeof a.leagueId === "string" && typeof a.league === "string" &&
    Array.isArray(a.paragraphs) && a.paragraphs.length >= 1 &&
    a.paragraphs.every((p) => typeof p === "string" && p.length > 0));
}
