// M1188 · The Dispatch — the fold's ranked orders, dispatched by the model, signed by the fold.
// The admin surface now prescribes (M1157), reasons (M1185), writes (M1186) and speaks one sentence (M1187);
// what it cannot yet do is choose which prescription to ship first. The dispatch closes the loop: the model
// picks ONE rx id from the envelope, justifies it in ONE sentence, and the board inks it. The refusal
// vocabulary is shared with The Analyst — one source of truth, never re-spelled. Same traced-FSM family;
// the digits budget is the tightest in the house (8) because one order needs one metric, not a paragraph.
import type { PulseFold } from "./pulse";
import type { Prescription } from "./prescription";
import { round2 } from "@/lib/utils";
import { round1, addNumeral } from "@/domain/scouting";
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";

export type DispatchStage = FsmStage;
// The refusal codes are shared with The Analyst — one vocabulary, one source of truth.
export type { AnalystViolation as DispatchViolation } from "./analyst";
import type { AnalystViolation as DispatchViolation } from "./analyst";
export type DispatchNote = "dispatchOn" | "ordersSealed" | "commitOk" | "foldOk" | "precommitRefused";

export const DISPATCH_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "ordersSealed" } as const;
export const DISPATCH_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const DISPATCH_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const DISPATCH_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const DISPATCH_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface DispatchTraceEntry {
  readonly stage: DispatchStage;
  readonly verdict: TraceVerdict;
  readonly note: DispatchNote;
}
export interface DispatchState {
  readonly fold: PulseFold;
  readonly locale: Locale;
  readonly status: DispatchStage;
  readonly trace: readonly DispatchTraceEntry[];
  readonly answer: string;
}

// The dispatch demands a real prescription list — no orders to ship means no door.
export const dispatchPreflight = (s: DispatchState, rx: readonly Prescription[]): DispatchState => {
  const ready = s.fold.sessions > 0 && rx.length > 0;
  return ready
    ? step(s, { stage: "preflight", verdict: "pass", note: "dispatchOn" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "dispatchOn" }, "refused");
};

export const dispatchBuild = (s: DispatchState): DispatchState =>
  fsmBuild(s, DISPATCH_BUILD_ENTRY, "model");

export const dispatchPrecommit = (s: DispatchState, verdict: TraceVerdict): DispatchState =>
  fsmPrecommit(s, verdict, DISPATCH_PRECOMMIT_PASS, DISPATCH_PRECOMMIT_REFUSED);

export const dispatchCommit = (s: DispatchState, answer: string): DispatchState =>
  fsmCommit({ ...s, answer }, answer, DISPATCH_COMMIT_ENTRY);

export const dispatchRefused = (s: DispatchState, answer: string): DispatchState =>
  fsmRefused({ ...s, answer }, answer, DISPATCH_FOLD_ENTRY);

export const DISPATCH_BASE_EVIDENCE: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  for (const v of ["0", "1", "2", "3", "5", "8", "10", "14", "20", "30", "40", "50", "55", "60", "70", "90", "100", "365"]) s.add(v);
  return s;
})();

/** The numerals the dispatch envelope actually carries — everything the model may quote. */
export const dispatchEvidence = (fold: PulseFold, rx: readonly Prescription[]): ReadonlySet<string> => {
  const out = new Set<string>(DISPATCH_BASE_EVIDENCE);
  for (const v of [fold.sessions, fold.visits, fold.bounceRate, fold.avgDepth, fold.avgDwellMs, fold.loopRate, fold.deadEndSessions]) addNumeral(out, v);
  for (const r of fold.perRoute) addNumeral(out, r.visits);
  for (const e of fold.exits) addNumeral(out, e.exits);
  // Every numeral printed inside the prescription vars is a claim the model may cite — register them.
  for (const r of rx) {
    for (const v of Object.values(r.vars)) {
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(n)) addNumeral(out, n);
    }
    addNumeral(out, r.score);
  }
  return out;
};

/** The rx ids the model is allowed to name — the enumerated orders, nothing else. */
export const dispatchOrderIds = (rx: readonly Prescription[]): readonly string[] => rx.map((r) => r.id);

export function verifyDispatchText(text: string, fold: PulseFold, rx: readonly Prescription[]): DispatchViolation[] {
  const out = new Set<DispatchViolation>();
  const ev = dispatchEvidence(fold, rx);
  let digitCount = 0;
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    digitCount += 1;
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!ev.has(raw) && !ev.has(String(Math.round(n))) && !ev.has(String(round1(n))) && !ev.has(String(round2(n)))) out.add("offEvidence");
  }
  if (digitCount > 8) out.add("tooManyNumbers");
  if (/\b(will|won't|guaranteed|predict|next season|next year|by \d{4})\b/i.test(text)) out.add("prediction");
  return [...out];
}

/** The envelope the model sees — the orders, their vars, the fold's own truths. */
export const dispatchEnvelope = (fold: PulseFold, rx: readonly Prescription[]): string =>
  JSON.stringify({
    cohort: fold.cohort,
    sessions: fold.sessions,
    visits: fold.visits,
    bounceRate: round1(fold.bounceRate),
    avgDepth: round2(fold.avgDepth),
    avgDwellMs: fold.avgDwellMs,
    loopRate: round1(fold.loopRate),
    deadEndSessions: fold.deadEndSessions,
    orders: rx.map((r) => ({ id: r.id, severity: r.severity, score: round2(r.score), vars: r.vars })),
  });

/** The one fold-back line the app uses when the model drifts or is unavailable. */
export const DISPATCH_FOLD_ANSWER_KEY = "ops.dispatch.foldAnswer.intro";
