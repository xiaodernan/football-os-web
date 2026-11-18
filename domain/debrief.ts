// M1186 · The Debrief — the admin console writes your monthly statement from the fold's own numbers.
// The user's words back in order: "管理员页面里要能监控所有用户的统计数据、做分析和趋势预测，并根据这些数据给出下一步应该采取的深度优化措施" - a complete debrief letter is the most direct answer.
// The same FSM mental layout as The Analyst: the model writes only what the fold carries; otherwise, the fold's own text speaks.
// Same streams; same lane; same refusal recovery; same imprisoned envelope.
import type { PulseFold } from "./pulse";
import type { Prescription } from "./prescription";
import { round2 } from "@/lib/utils";
import { round1 } from "@/domain/scouting";
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";

export type DebriefStage = FsmStage;
export type DebriefNote = "monthSealed" | "envelopeSealed" | "commitOk" | "foldOk" | "precommitRefused";
export type DebriefViolation = "offEvidence" | "prediction" | "tooManyNumbers";

export const DEBRIEF_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "envelopeSealed" } as const;
export const DEBRIEF_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const DEBRIEF_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const DEBRIEF_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const DEBRIEF_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface DebriefTraceEntry {
  readonly stage: DebriefStage;
  readonly verdict: TraceVerdict;
  readonly note: DebriefNote;
}
export interface DebriefState {
  readonly fold: PulseFold;
  readonly locale: Locale;
  readonly status: DebriefStage;
  readonly trace: readonly DebriefTraceEntry[];
  readonly answer: string;
}

export const debriefPreflight = (s: DebriefState): DebriefState =>
  s.fold.sessions > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "monthSealed" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "monthSealed" }, "refused");

export const debriefBuild = (s: DebriefState): DebriefState =>
  fsmBuild(s, DEBRIEF_BUILD_ENTRY, "model");

export const debriefPrecommit = (s: DebriefState, verdict: TraceVerdict): DebriefState =>
  fsmPrecommit(s, verdict, DEBRIEF_PRECOMMIT_PASS, DEBRIEF_PRECOMMIT_REFUSED);

export const debriefCommit = (s: DebriefState, answer: string): DebriefState =>
  fsmCommit({ ...s, answer }, answer, DEBRIEF_COMMIT_ENTRY);

export const debriefRefused = (s: DebriefState, answer: string): DebriefState =>
  fsmRefused({ ...s, answer }, answer, DEBRIEF_FOLD_ENTRY);

export const DEBRIEF_BASE_EVIDENCE: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  for (const v of ["0","1","2","3","4","5","10","14","15","20","30","40","50","60","70","90","100","180","365"]) s.add(v);
  return s;
})();

export const debriefEnvelope = (fold: PulseFold, rx: readonly Prescription[]): string =>
  JSON.stringify({
    cohort: fold.cohort,
    sessions: fold.sessions,
    visits: fold.visits,
    avgDepth: round2(fold.avgDepth),
    bounceRate: round1(fold.bounceRate),
    avgDwellMs: fold.avgDwellMs,
    loopRate: round1(fold.loopRate),
    deadEndSessions: fold.deadEndSessions,
    depthBuckets: fold.depthBuckets,
    perRoute: fold.perRoute.slice(0, 5).map((r) => ({ path: r.path, visits: r.visits, bounceShare: round1(r.bounceShare), avgDwellMs: r.avgDwellMs, exits: r.exits })),
    trend: fold.trend.slice(-14).map((d) => ({ day: d.day, visits: d.visits })),
    exits: fold.exits.slice(0, 5),
    prescriptionIds: rx.map((r) => r.id),
  });

/** The fold's own last words — printed when the model drifts or is unavailable. */
export const DEBRIEF_FOLD_ANSWER_KEY = "ops.debrief.foldAnswer.intro";

export const DEBRIEF_NUMBER = (raw: string): number | null => {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const debriefEvidence = (fold: PulseFold): ReadonlySet<string> => {
  const out = new Set<string>(DEBRIEF_BASE_EVIDENCE);
  const add = (n: number) => { const v = Math.round(n); out.add(String(v)); out.add(String(n)); out.add(String(round1(n))); out.add(String(round2(n))); };
  for (const v of [fold.sessions, fold.visits, fold.bounceRate, fold.avgDepth, fold.avgDwellMs, fold.loopRate, fold.deadEndSessions]) add(v);
  for (const r of fold.perRoute) add(r.visits);
  for (const e of fold.exits) add(e.exits);
  for (const d of fold.trend.slice(-14)) add(d.visits);
  for (const v of [14, 30, 90, 365, 5, 3, 50, 70]) add(v);
  return out;
};

export function verifyDebriefText(text: string, fold: PulseFold): DebriefViolation[] {
  const out = new Set<DebriefViolation>();
  const ev = debriefEvidence(fold);
  let digitCount = 0;
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    digitCount += 1;
    const raw = m[0].replace(/,/g, "");
    const n = DEBRIEF_NUMBER(raw);
    if (n === null) continue;
    if (!ev.has(raw) && !ev.has(String(Math.round(n))) && !ev.has(String(round1(n))) && !ev.has(String(round2(n)))) out.add("offEvidence");
  }
  if (digitCount > 60) out.add("tooManyNumbers");
  if (/\b(will|won't|guaranteed|predict|next season|next year|by \d{4})\b/i.test(text)) out.add("prediction");
  return [...out];
}
