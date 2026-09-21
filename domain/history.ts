// The activity timeline is assembled ONLY from events that already exist in the
// user's real, locally-stored state — completed training sessions, AI coach plans
// and coach-memory entries. Nothing is invented; each timeline row points back to
// a concrete record. Pure module: no React, no IO, so it is trivially testable.

import type { AttributeDelta } from "./types";

export type TimelineKind = "session" | "plan" | "memory";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  at: string; // ISO timestamp
  title: string;
  detail?: string;
  score?: number; // self-rating for sessions (1..5)
  xp?: number;
  growth?: AttributeDelta[]; // attribute gains from a completed session
}

interface SessionSeed {
  id: string;
  title: string;
  status: string;
  completedAt?: string;
  date: string;
  selfRating?: number;
  xpAwarded?: number;
  growth?: AttributeDelta[];
}
interface PlanSeed {
  id: string;
  createdAt: string;
  prompt: string;
  provider: string;
}
interface MemorySeed {
  id: string;
  kind: string;
  text: string;
  at: string;
}

export interface HistoryInput {
  sessions: SessionSeed[];
  plans: PlanSeed[];
  memory: MemorySeed[];
}

const ts = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

export function buildTimeline(input: HistoryInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const s of input.sessions) {
    if (s.status !== "completed") continue; // only completed sessions are history
    events.push({
      id: `session-${s.id}`,
      kind: "session",
      at: s.completedAt ?? s.date,
      title: s.title,
      score: s.selfRating,
      xp: s.xpAwarded,
      growth: s.growth,
    });
  }

  for (const p of input.plans) {
    events.push({
      id: `plan-${p.id}`,
      kind: "plan",
      at: p.createdAt,
      title: p.prompt,
      detail: p.provider,
    });
  }

  for (const m of input.memory) {
    events.push({
      id: `memory-${m.id}`,
      kind: "memory",
      at: m.at,
      title: m.text,
      detail: m.kind,
    });
  }

  return events.sort((a, b) => ts(b.at) - ts(a.at));
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

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "invalid";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
