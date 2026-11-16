// M1175 · The Wire Diary — the model spoke; the file proved every sentence; nothing outside it survived.
// The diary is written once per release by scripts/update-wire-diary.mjs (the real model, imprisoned to the fold),
// verified against the artifact, and committed as public/wire-diary.json. The screen reads it; nothing else writes it.

export type WireDiaryVerdict = "model" | "fold";

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

let cached: Promise<WireDiaryPayload | null> | null = null;

export async function fetchWireDiary(): Promise<WireDiaryPayload | null> {
  if (cached) return cached;
  cached = fetch(`${import.meta.env.BASE_URL}wire-diary.json`, { cache: "no-cache" })
    .then((r) => (r.ok ? (r.json() as Promise<WireDiaryPayload>) : null))
    .catch(() => null);
  return cached;
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
