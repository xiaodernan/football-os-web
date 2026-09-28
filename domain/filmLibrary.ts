import type { VideoReport } from "@/data/video";
import { FILM_KEY } from "./localData";
import type { FilmClipInput } from "./filmInsights";
import { asRowText } from "./rowText";

// The clip library is written by the Film Room but read by several pillars
// (review, profile, footprint). One reader keeps them honest about the same
// records instead of each re-implementing the JSON shape.

export interface FilmClip {
  clipId: string;
  addedAt: string;
  report: VideoReport;
}

/** M231: a report's sentences are rows now (strengths, weaknesses, improvements, a detection's
 *  caption, an evidence frame's label), so a clip stored before that holds plain strings where a
 *  row is expected — and `rowLine` would be handed a string, where `"key" in row` throws. The
 *  stored words are the writer's, so each is kept verbatim as a value rather than guessed at as a
 *  key: the same repair a plan's prompt (M223) and a goal's title get, at the same kind of seam. */
function repairReport(report: VideoReport): VideoReport {
  return {
    ...report,
    strengths: (report.strengths ?? []).map(asRowText),
    weaknesses: (report.weaknesses ?? []).map(asRowText),
    improvements: (report.improvements ?? []).map(asRowText),
    events: (report.events ?? []).map((e) => ({ ...e, note: asRowText(e.note ?? "") })),
    frames: (report.frames ?? []).map((f) => ({ ...f, label: asRowText(f.label ?? "") })),
  };
}

/** Defensive parse: a corrupt or legacy entry is skipped, never crashes a page.
 *
 *  M202: the validation stopped at "events is an array", so `[null]` survived it — and the
 *  next thing any reader does is `toClipInputs`, which reads `e.kind` and threw on the spot.
 *  A promise about never crashing a page is only kept if the elements are checked too, so an
 *  entry whose events are not all kind-bearing objects is now skipped with the rest. */
export function parseFilmClips(raw: unknown): FilmClip[] {
  if (!Array.isArray(raw)) return [];
  const out: FilmClip[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Partial<FilmClip>;
    const r = c.report;
    if (typeof c.clipId !== "string" || typeof c.addedAt !== "string") continue;
    if (!r || typeof r !== "object" || !Array.isArray(r.events)) continue;
    if (!r.events.every((e) => !!e && typeof e === "object" && typeof e.kind === "string")) continue;
    out.push({ ...(c as FilmClip), report: repairReport(r) });
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

/** Narrow a clip list to the shape the library-level analysis consumes.
 *
 *  M202: `recommendedFocus` used to be handed over by reference, so a caller that pushed a
 *  suggestion into its own row edited the stored clip too — the library summary and the
 *  clip panel read the same array. The rows are copies now. */
export function toClipInputs(clips: FilmClip[]): FilmClipInput[] {
  return clips.map((c) => ({
    at: c.addedAt,
    durationSec: c.report?.durationSec ?? 0,
    confidence: c.report?.confidence ?? 0,
    events: (c.report?.events ?? []).map((e) => ({ kind: e.kind })),
    recommendedFocus: [...(c.report?.recommendedFocus ?? [])],
  }));
}

export function newestClipAt(clips: FilmClip[]): string | undefined {
  return clips.map((c) => c.addedAt).filter(Boolean).sort((a, b) => b.localeCompare(a))[0];
}
