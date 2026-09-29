
// Library-level film analysis (spec §19). A single clip report answers "what
// happened in this video"; this answers "what keeps happening across the clips
// you have analysed". Input is the user's own locally-stored clip library, so
// every rate is a real count over real detections — nothing is invented.

import type { RowText } from "./rowText";

export type FilmEventKind = "scan" | "touch" | "pass" | "dribble" | "shot" | "turn" | "press";

/** The seven detections, and the row each one is named by. The dictionary's kind rows,
 *  the badge the Film Room prints, the Weekly Review's bar labels and the evidence line
 *  below are four reads of this one list, so a detection cannot ship without a word and
 *  a word cannot ship no kind can reach. This is the single home of that map: `data/video`
 *  re-exports it, because a domain module may not reach up into `data/`. */
export const FILM_KINDS: readonly FilmEventKind[] = ["scan", "touch", "pass", "dribble", "shot", "turn", "press"];

export const FILM_KIND_KEY: Record<FilmEventKind, string> = {
  scan: "vid.kind.scan",
  touch: "vid.kind.touch",
  pass: "vid.kind.pass",
  dribble: "vid.kind.dribble",
  shot: "vid.kind.shot",
  turn: "vid.kind.turn",
  press: "vid.kind.press",
};

export interface FilmClipInput {
  at: string; // ISO when the clip was analysed
  durationSec: number;
  confidence: number; // 0..100 provider confidence
  events: { kind: FilmEventKind }[];
  recommendedFocus: string[]; // attribute keys
}

export interface KindRate {
  kind: FilmEventKind;
  count: number;
  perMinute: number;
}

export interface FocusStat {
  key: string;
  clips: number; // how many separate clips flagged it
}

export interface FilmInsights {
  clips: number;
  analysedMinutes: number;
  detections: number;
  byKind: KindRate[];
  actionsPerMinute: number;
  scanPerMinute: number;
  scanTrend: number | null; // newer-half minus older-half scans/min
  olderScanRate: number | null;
  newerScanRate: number | null;
  topFocus: FocusStat[];
  avgConfidence: number;
  evidence: RowText[];
  confidence: number;
  sources: RowText[];
  hasData: boolean;
}

export function buildFilmInsights(clips: FilmClipInput[]): FilmInsights {
  const valid = clips.filter((c) => c && c.durationSec > 0);
  const analysedSeconds = valid.reduce((s, c) => s + c.durationSec, 0);
  const analysedMinutes = analysedSeconds / 60;

  const counts = new Map<FilmEventKind, number>();
  for (const c of valid) for (const e of c.events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);

  const perMin = (n: number) => (analysedMinutes > 0 ? n / analysedMinutes : 0);
  const byKind: KindRate[] = FILM_KINDS.map((kind) => ({
    kind,
    count: counts.get(kind) ?? 0,
    perMinute: Math.round(perMin(counts.get(kind) ?? 0) * 100) / 100,
  })).sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));

  const totalEvents = valid.reduce((s, c) => s + c.events.length, 0);
  const scans = counts.get("scan") ?? 0;

  // Split the library into older / newer halves by analysis time and compare
  // scanning frequency — the metric the demo pipeline tracks most directly.
  let olderScanRate: number | null = null;
  let newerScanRate: number | null = null;
  if (valid.length >= 2) {
    const sorted = [...valid].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const half = Math.floor(sorted.length / 2);
    const rate = (group: FilmClipInput[]) => {
      const secs = group.reduce((s, c) => s + c.durationSec, 0);
      const sc = group.reduce((s, c) => s + c.events.filter((e) => e.kind === "scan").length, 0);
      return secs > 0 ? (sc / (secs / 60)) : 0;
    };
    const older = sorted.slice(0, half);
    const newer = sorted.slice(sorted.length - half);
    olderScanRate = Math.round(rate(older) * 100) / 100;
    newerScanRate = Math.round(rate(newer) * 100) / 100;
  }
  const scanTrend = olderScanRate != null && newerScanRate != null ? Math.round((newerScanRate - olderScanRate) * 100) / 100 : null;

  const focusMap = new Map<string, number>();
  for (const c of valid) for (const key of new Set(c.recommendedFocus)) focusMap.set(key, (focusMap.get(key) ?? 0) + 1);
  const topFocus: FocusStat[] = [...focusMap.entries()]
    .map(([key, clipCount]) => ({ key, clips: clipCount }))
    .sort((a, b) => b.clips - a.clips || a.key.localeCompare(b.key))
    .slice(0, 5);

  const avgConfidence = valid.length ? Math.round(valid.reduce((s, c) => s + c.confidence, 0) / valid.length) : 0;

  const busiest = byKind[0]?.count ? byKind[0] : null;
  // Four evidence lines and three provenance sources, all rows. The first three used to be
  // English composed here — invisible to the raw-UI scan (this file is not JSX) and frozen
  // in one language at the reader. The focus line is the reason the join format changed with
  // them: it named attributes through `attributeLabel`, whose English word no locale could
  // put back, so the list now rides as `foci` (`key:count`) and `codeWord` names each part.
  // The busiest detection rides as `event`, a KEY var: the word is `vid.kind.*`, the same row
  // the Film Room's event list already prints.
  const evidence: RowText[] = [
    {
      key: valid.length === 1 ? "fi.ev.clipsOne" : "fi.ev.clips",
      vars: { n: valid.length, min: Math.round(analysedMinutes * 10) / 10, d: totalEvents },
    },
    busiest
      ? {
          key: "fi.ev.busiest",
          vars: { event: FILM_KIND_KEY[busiest.kind], count: busiest.count, rate: busiest.perMinute.toFixed(2) },
        }
      : { key: "fi.ev.none" },
    scanTrend != null
      ? {
          key: "fi.ev.trend",
          vars: {
            older: olderScanRate!.toFixed(2),
            newer: newerScanRate!.toFixed(2),
            delta: `${scanTrend >= 0 ? "+" : ""}${scanTrend}`,
          },
        }
      : valid.length < 2
        ? { key: "fi.ev.needSecond" }
        : { key: "fi.ev.noTrend" },
    topFocus.length
      ? { key: "fi.ev.focus", vars: { foci: topFocus.map((f) => `${f.key}:${f.clips}`).join(",") } }
      : { key: "fi.ev.noFocus" },
  ];

  const confidence = valid.length === 0 ? 0 : Math.min(85, 20 + valid.length * 16);

  return {
    clips: valid.length,
    analysedMinutes: Math.round(analysedMinutes * 100) / 100,
    detections: totalEvents,
    byKind,
    actionsPerMinute: Math.round(perMin(totalEvents) * 100) / 100,
    scanPerMinute: Math.round(perMin(scans) * 100) / 100,
    scanTrend,
    olderScanRate,
    newerScanRate,
    topFocus,
    avgConfidence,
    evidence,
    confidence,
    sources: [
      { key: "fi.src.library" },
      { key: "fi.src.provider", vars: { conf: avgConfidence } },
      { key: "fi.src.model" },
    ],
    hasData: valid.length > 0 && totalEvents > 0,
  };
}
