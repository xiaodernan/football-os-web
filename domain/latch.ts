// M1187 · The Latch — one operator's next instruction, written by the deck's own evidence.
// The user's words back in order: "根据这些数据给出下一步应该采取的深度优化措施" — the answer is one firm sentence, not a dashboard.
// The same traced-FSM layout the analysts ride: the model writes only what the fold carries; otherwise, the fold's own text speaks.
// One ask, one sentence, tighter than the debrief on purpose — the whole product is the latch, not the letter.
import type { PulseFold } from "./pulse";
import type { Prescription } from "./prescription";
import { round2 } from "@/lib/utils";
import { round1, addNumeral } from "@/domain/scouting";
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";

export type LatchStage = FsmStage;
// The refusal codes are shared with The Analyst — one vocabulary, one source of truth.
export type { AnalystViolation as LatchViolation } from "./analyst";
import type { AnalystViolation as LatchViolation } from "./analyst";
export type LatchNote = "latchOn" | "evidenceSealed" | "commitOk" | "foldOk" | "precommitRefused";

export const LATCH_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "evidenceSealed" } as const;
export const LATCH_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const LATCH_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const LATCH_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const LATCH_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface LatchTraceEntry {
  readonly stage: LatchStage;
  readonly verdict: TraceVerdict;
  readonly note: LatchNote;
}
export interface LatchState {
  readonly fold: PulseFold;
  readonly locale: Locale;
  readonly status: LatchStage;
  readonly trace: readonly LatchTraceEntry[];
  readonly answer: string;
}

// The latch demands real traffic, not a session count alone — the one instruction it writes
// is only as good as the evidence behind the fold.
export const latchPreflight = (s: LatchState): LatchState => {
  const ready = s.fold.sessions > 0 && s.fold.visits > 0;
  return ready
    ? step(s, { stage: "preflight", verdict: "pass", note: "latchOn" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "latchOn" }, "refused");
};

export const latchBuild = (s: LatchState): LatchState =>
  fsmBuild(s, LATCH_BUILD_ENTRY, "model");

export const latchPrecommit = (s: LatchState, verdict: TraceVerdict): LatchState =>
  fsmPrecommit(s, verdict, LATCH_PRECOMMIT_PASS, LATCH_PRECOMMIT_REFUSED);

export const latchCommit = (s: LatchState, answer: string): LatchState =>
  fsmCommit({ ...s, answer }, answer, LATCH_COMMIT_ENTRY);

export const latchRefused = (s: LatchState, answer: string): LatchState =>
  fsmRefused({ ...s, answer }, answer, LATCH_FOLD_ENTRY);

export const LATCH_BASE_EVIDENCE: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  for (const v of ["0", "1", "2", "3", "4", "5", "10", "14", "15", "20", "30", "40", "50", "60", "70", "90", "100", "365"]) s.add(v);
  return s;
})();

export const latchEnvelope = (fold: PulseFold, rx: readonly Prescription[]): string =>
  JSON.stringify({
    cohort: fold.cohort,
    sessions: fold.sessions,
    visits: fold.visits,
    bounceRate: round1(fold.bounceRate),
    avgDepth: round2(fold.avgDepth),
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
export const LATCH_FOLD_ANSWER_KEY = "ops.latch.foldAnswer.intro";

/** Every numeral the latch's own envelope carries — the imprisoned set the model may quote. */
export const latchEvidence = (fold: PulseFold): ReadonlySet<string> => {
  const out = new Set<string>(LATCH_BASE_EVIDENCE);
  for (const v of [fold.sessions, fold.visits, fold.bounceRate, fold.avgDepth, fold.avgDwellMs, fold.loopRate, fold.deadEndSessions]) addNumeral(out, v);
  for (const r of fold.perRoute) addNumeral(out, r.visits);
  for (const e of fold.exits) addNumeral(out, e.exits);
  for (const d of fold.trend.slice(-14)) addNumeral(out, d.visits);
  // Number registration for the fixed bounds the deck itself uses.
  for (const v of [14, 30, 90, 5, 3, 50, 70]) addNumeral(out, v);
  return out;
};

export function verifyLatchText(text: string, fold: PulseFold): LatchViolation[] {
  const out = new Set<LatchViolation>();
  const ev = latchEvidence(fold);
  let digitCount = 0;
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    digitCount += 1;
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!ev.has(raw) && !ev.has(String(Math.round(n))) && !ev.has(String(round1(n))) && !ev.has(String(round2(n)))) out.add("offEvidence");
  }
  if (digitCount > 12) out.add("tooManyNumbers");
  if (/\b(will|won't|guaranteed|predict|next season|next year|by \d{4})\b/i.test(text)) out.add("prediction");
  return [...out];
}
