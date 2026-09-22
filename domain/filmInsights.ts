import { attributeLabel } from "./attributes";

// Library-level film analysis (spec §19). A single clip report answers "what
// happened in this video"; this answers "what keeps happening across the clips
// you have analysed". Input is the user's own locally-stored clip library, so
// every rate is a real count over real detections — nothing is invented.

export type FilmEventKind = "scan" | "touch" | "pass" | "dribble" | "shot" | "turn" | "press";

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
  label: string;
  clips: number; // how many separate clips flagged it
}

export interface FilmInsights {
  clips: number;
  analysedSeconds: number;
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
  evidence: string[];
  confidence: number;
  sources: string[];
  hasData: boolean;
}

const KINDS: FilmEventKind[] = ["scan", "touch", "pass", "dribble", "shot", "turn", "press"];

export function buildFilmInsights(clips: FilmClipInput[]): FilmInsights {
  const valid = clips.filter((c) => c && c.durationSec > 0);
  const analysedSeconds = valid.reduce((s, c) => s + c.durationSec, 0);
  const analysedMinutes = analysedSeconds / 60;

  const counts = new Map<FilmEventKind, number>();
  for (const c of valid) for (const e of c.events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);

  const perMin = (n: number) => (analysedMinutes > 0 ? n / analysedMinutes : 0);
  const byKind: KindRate[] = KINDS.map((kind) => ({
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
    .map(([key, clipCount]) => ({ key, label: attributeLabel(key), clips: clipCount }))
    .sort((a, b) => b.clips - a.clips || a.label.localeCompare(b.label))
    .slice(0, 5);

  const avgConfidence = valid.length ? Math.round(valid.reduce((s, c) => s + c.confidence, 0) / valid.length) : 0;

  const busiest = byKind[0]?.count ? byKind[0] : null;
  const evidence = [
    `${valid.length} clip${valid.length === 1 ? "" : "s"} · ${Math.round(analysedMinutes * 10) / 10} min analysed · ${totalEvents} detections`,
    busiest ? `Most frequent detection: ${busiest.kind} (${busiest.count}, ${busiest.perMinute.toFixed(2)}/min)` : "No detections recorded yet",
    scanTrend != null
      ? `Scanning ${olderScanRate!.toFixed(2)} → ${newerScanRate!.toFixed(2)} per min between older and newer clips (${scanTrend >= 0 ? "+" : ""}${scanTrend})`
      : valid.length < 2
        ? "Add a second clip to unlock the older-vs-newer trend"
        : "Trend unavailable — clips have no usable duration",
    topFocus.length ? `Recurring coaching focus: ${topFocus.map((f) => `${f.label} ×${f.clips}`).join(", ")}` : "No recommended focus yet",
  ].filter(Boolean);

  const confidence = valid.length === 0 ? 0 : Math.min(85, 20 + valid.length * 16);

  return {
    clips: valid.length,
    analysedSeconds,
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
    sources: ["Your local film library (this device)", `Demo video provider detections (${avgConfidence}% mean confidence)`, "Attribute model (focus labels)"],
    hasData: valid.length > 0 && totalEvents > 0,
  };
}
