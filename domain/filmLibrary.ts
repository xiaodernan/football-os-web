import type { VideoReport } from "@/data/video";
import { FILM_KEY } from "./localData";
import type { FilmClipInput } from "./filmInsights";

// The clip library is written by the Film Room but read by several pillars
// (review, profile, footprint). One reader keeps them honest about the same
// records instead of each re-implementing the JSON shape.

export interface FilmClip {
  clipId: string;
  addedAt: string;
  report: VideoReport;
}

/** Defensive parse: a corrupt or legacy entry is skipped, never crashes a page. */
export function parseFilmClips(raw: unknown): FilmClip[] {
  if (!Array.isArray(raw)) return [];
  const out: FilmClip[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Partial<FilmClip>;
    const r = c.report;
    if (typeof c.clipId !== "string" || typeof c.addedAt !== "string") continue;
    if (!r || typeof r !== "object" || !Array.isArray(r.events)) continue;
    out.push(c as FilmClip);
  }
  return out;
}

export function loadFilmClips(): FilmClip[] {
  try {
    return parseFilmClips(JSON.parse(localStorage.getItem(FILM_KEY) ?? "null"));
  } catch {
    return [];
  }
}

export function saveFilmClips(clips: FilmClip[]): void {
  try {
    localStorage.setItem(FILM_KEY, JSON.stringify(clips));
  } catch {
    /* storage may be unavailable; the session still works in-memory */
  }
}

/** Narrow a clip list to the shape the library-level analysis consumes. */
export function toClipInputs(clips: FilmClip[]): FilmClipInput[] {
  return clips.map((c) => ({
    at: c.addedAt,
    durationSec: c.report?.durationSec ?? 0,
    confidence: c.report?.confidence ?? 0,
    events: (c.report?.events ?? []).map((e) => ({ kind: e.kind })),
    recommendedFocus: c.report?.recommendedFocus ?? [],
  }));
}

export function newestClipAt(clips: FilmClip[]): string | undefined {
  return clips.map((c) => c.addedAt).filter(Boolean).sort((a, b) => b.localeCompare(a))[0];
}
