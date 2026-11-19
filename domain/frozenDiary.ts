// M1201 · The Frozen Diary — the frozen century's own newspaper.
// The diary is written once per release by scripts/update-frozen-diary.mjs (the real model,
// imprisoned to the frozen fold), verified on every numeral against public/frozen-fold.json,
// and committed as public/frozen-diary.json. The screen reads it; nothing else writes it.
// M1201: the read mechanics live behind domain/releaseArtifact.ts — the screens call it directly.

export type FrozenDiaryVerdict = "model" | "fold";

export interface FrozenDiaryArticle {
  competitionId: string;
  competition: string;
  nation: string;
  tier: number;
  paragraphs: string[];
  by: FrozenDiaryVerdict;
}

export interface FrozenDiaryPayload {
  version: string;
  generatedAt: string;
  diary: FrozenDiaryArticle[];
  summary: { competitionsFrozen: number; byModel: number; byFold: number };
  by: "model" | "mixed" | "fold";
}

/** A reader could hand-edit the file in their browser — this guard refuses anything malformed. */
export function isFrozenDiaryPayload(p: unknown): p is FrozenDiaryPayload {
  if (!p || typeof p !== "object") return false;
  const d = p as FrozenDiaryPayload;
  if (d.version !== "frozen-diary/v1") return false;
  if (typeof d.generatedAt !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(d.generatedAt)) return false;
  if (!["model", "mixed", "fold"].includes(d.by)) return false;
  if (!d.summary || d.summary.competitionsFrozen !== d.diary?.length) return false;
  if (typeof d.diary !== "object" || !Array.isArray(d.diary) || d.diary.length === 0) return false;
  for (const a of d.diary) {
    if (!a || typeof a.competitionId !== "string" || typeof a.competition !== "string") return false;
    if (typeof a.nation !== "string" || typeof a.tier !== "number" || !Number.isInteger(a.tier)) return false;
    if (!Array.isArray(a.paragraphs) || a.paragraphs.length === 0) return false;
    if (!a.paragraphs.every((p) => typeof p === "string" && p.length > 0)) return false;
    if (a.by !== "model" && a.by !== "fold") return false;
  }
  return true;
}
