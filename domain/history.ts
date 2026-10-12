// The activity timeline is assembled ONLY from events that already exist in the
// user's real, locally-stored state — completed training sessions, AI coach plans,
// coach-memory entries and academy completions. Nothing is invented; each timeline
// row points back to a concrete record. Pure module: no React, no IO, so it is
// trivially testable.
//
// A row's text is therefore one of exactly two things: a dictionary key this module
// chose, or a value that came straight out of the record it names — see ./rowText,
// which the goal rows use the same way.

import type { AttributeDelta } from "./types";
import { asRowText, type RowText } from "./rowText";
import { epochMs } from "@/lib/utils";

export type TimelineKind = "session" | "plan" | "memory" | "learn" | "film";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string; // ISO timestamp
  title: RowText;
  detail?: RowText;
  score?: number; // self-rating for sessions (1..5)
  xp?: number;
  growth?: AttributeDelta[]; // attribute gains from a completed session
  note?: string; // the user's own free-text note captured at completion
}

// The stored subtype of a coach-memory entry, keyed rather than passed through as
// the raw code the profile writes.
const MEMORY_DETAIL: Record<string, RowText> = {
  coach: { key: "hist.mem.coach" },
  training: { key: "hist.mem.training" },
  profile: { key: "hist.mem.profile" },
};

interface SessionSeed {
  id: string;
  // The session's own row, forwarded (see ./training): the app built the title from the
  // attributes the session trains, so re-wrapping it as `{ value }` here would print the
  // English sentence in every locale — the same hole the plan prompt had before M231.
  title: RowText;
  status: string;
  completedAt?: string;
  date: string;
  selfRating?: number;
  xpAwarded?: number;
  growth?: AttributeDelta[];
  notes?: string;
}
interface PlanSeed {
  id: string;
  createdAt: string;
  prompt: RowText;
  provider: string;
}
interface MemorySeed {
  id: string;
  kind: string;
  // Already a keyed row (see ./memory): the timeline forwards it rather than
  // re-wording it, so the same remembered line reads in the reader's locale here too.
  text: RowText;
  at: string;
}
interface LearnSeed {
  id: string;
  /** The lesson's title. The catalogue holds keys now (M246), so a seed that named a
   *  known lesson passes `{ key: … }` and the timeline shows the reader's own word; a
   *  bare id from the record is the record's own value and is shown as written
   *  (`asRowText` below performs that conversion). */
  title: RowText | string;
  completedAt: string;
  quizCorrect: boolean;
  attempts: number;
}
interface FilmSeed {
  id: string;
  at: string;
  fileName: string;
  durationSec: number;
  detections: number;
  scans: number;
  confidence: number;
  recommendedFocus?: string[];
}

export interface HistoryInput {
  sessions: SessionSeed[];
  plans: PlanSeed[];
  memory: MemorySeed[];
  learn?: LearnSeed[];
  film?: FilmSeed[];
}

export function buildTimeline(input: HistoryInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const s of input.sessions) {
    if (s.status !== "completed") continue; // only completed sessions are history
    events.push({
      id: `session-${s.id}`,
      kind: "session",
      at: s.completedAt ?? s.date,
      title: asRowText(s.title),
      score: s.selfRating,
      xp: s.xpAwarded,
      growth: s.growth,
      note: s.notes?.trim() ? s.notes.trim() : undefined,
    });
  }

  for (const p of input.plans) {
    events.push({
      id: `plan-${p.id}`,
      kind: "plan",
      at: p.createdAt,
      // The prompt is already a row: the caller stored a key (or the writer's own words) when
      // the plan was built, so the timeline resolves it here rather than re-wording a sentence
      // that was frozen in whatever language the button happened to be clicked in.
      title: asRowText(p.prompt),
      detail: { value: p.provider },
    });
  }

  for (const m of input.memory) {
    events.push({
      id: `memory-${m.id}`,
      kind: "memory",
      at: m.at,
      // The entry's own text is a stored value, so it passes through; its subtype
      // is a code, so it becomes a key. An unknown code resolves to no label at the
      // render site rather than printing the bare code.
      title: m.text,
      detail: MEMORY_DETAIL[m.kind],
    });
  }

  for (const l of input.learn ?? []) {
    // Only records with a real completion timestamp are history; progress migrated
    // from the old store has no time attached, so it is left off the timeline
    // rather than shown under a made-up date.
    if (!l.completedAt || Number.isNaN(new Date(l.completedAt).getTime())) continue;
    events.push({
      id: `learn-${l.id}`,
      kind: "learn",
      at: l.completedAt,
      // `asRowText` because a seed may carry the record's own bare id (the shape the
      // store keeps, and what a repair path writes); a known lesson arrives as a keyed
      // row and passes through unchanged. Without the wrap a bare string reaches the
      // row-shape checks below as a primitive, which is a crash rather than a render.
      title: asRowText(l.title),
      // The kind chip already prints "Academy", so these say only what the record
      // proves. Singular and plural are separate keys because no `{n}` can pick an
      // English "-s"; the branch reads the record's own count, never a label.
      detail: l.quizCorrect
        ? { key: "hist.learn.passed" }
        : l.attempts === 1
          ? { key: "hist.learn.missedOne" }
          : l.attempts > 1
            ? { key: "hist.learn.missed", vars: { n: l.attempts } }
            : { key: "hist.learn.read" },
    });
  }

  for (const c of input.film ?? []) {
    // A clip is history only once it has actually been analysed, so the entry
    // carries the detections the provider returned rather than a vague "reviewed".
    if (!c.at || Number.isNaN(new Date(c.at).getTime())) continue;
    const perMin = c.durationSec > 0 ? (c.detections / (c.durationSec / 60)).toFixed(1) : "0";
    events.push({
      id: `film-${c.id}`,
      kind: "film",
      at: c.at,
      title: { key: "hist.film.analysed", vars: { f: c.fileName } },
      detail: {
        key: "hist.film.stats",
        vars: {
          d: c.detections,
          s: c.scans,
          min: (c.durationSec / 60).toFixed(1),
          per: perMin,
          conf: c.confidence,
        },
      },
    });
  }

  return events.sort((a, b) => epochMs(b.at) - epochMs(a.at));
}

/** Group a sorted timeline into calendar-day buckets (newest day first). */
export function groupByDay(events: TimelineEvent[]): { day: string; items: TimelineEvent[] }[] {
  const groups: { day: string; items: TimelineEvent[] }[] = [];
  for (const e of events) {
    const day = dayKey(e.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return groups;
}

// The shared local-calendar day key: the day the reader's wall calendar shows, padded,
// compared against another key and never shown. M303 moved the streak's day keys here;
// the elapsed-24-hour and UTC-clock arithmetic they replaced was the last blind shape in
// the relative-time census.
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
