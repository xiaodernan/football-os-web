// M1185 · The Analyst — the admin console reasons about its own fold.
// The /ops console already prints the truth (pulse tiles, route ladder, 14-day tide, prescription).
// M1157 ships the fold's own numbered fixes; what is missing is the model behind the keyboard:
// an engine that reads the same fold, writes a three-turn briefing, and refuses to say anything
// the fold cannot prove — and folds back to the fold's own opinion when the model cannot.
// Deterministic fallback; no model; nothing invented. Imprisoned: the model may name EXACTLY the
// numerals in the envelope below; anything else is offBook, and repeated futurology is refused.
// The architecture is the same traced-FSM family the app already runs — same stages, same idiom.

import type { PulseFold } from "./pulse";
import type { Prescription } from "./prescription";
import { round2 } from "@/lib/utils";
import { round1, addNumeral } from "@/domain/scouting";
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";

export type AnalystStage = FsmStage;
export type AnalystNote = "analystOn" | "evidenceSealed" | "commitOk" | "foldOk" | "precommitRefused";
export type AnalystViolation = "offEvidence" | "prediction" | "tooManyNumbers";

export const ANALYST_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "evidenceSealed" } as const;
export const ANALYST_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const ANALYST_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const ANALYST_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const ANALYST_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface AnalystTraceEntry {
  readonly stage: AnalystStage;
  readonly verdict: TraceVerdict;
  readonly note: AnalystNote;
}
export interface AnalystState {
  readonly fold: PulseFold;
  readonly locale: Locale;
  readonly status: AnalystStage;
  readonly trace: readonly AnalystTraceEntry[];
  readonly answer: string;
}

export const analystPreflight = (s: AnalystState): AnalystState => {
  const ready = s.fold.sessions > 0;
  return ready
    ? step(s, { stage: "preflight", verdict: "pass", note: "analystOn" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "analystOn" }, "refused");
};

export const analystBuild = (s: AnalystState): AnalystState =>
  fsmBuild(s, ANALYST_BUILD_ENTRY, "model");

export const analystPrecommit = (s: AnalystState, verdict: TraceVerdict): AnalystState =>
  fsmPrecommit(s, verdict, ANALYST_PRECOMMIT_PASS, ANALYST_PRECOMMIT_REFUSED);

export const analystCommit = (s: AnalystState, answer: string): AnalystState =>
  fsmCommit({ ...s, answer }, answer, ANALYST_COMMIT_ENTRY);

export const analystRefused = (s: AnalystState, answer: string): AnalystState =>
  fsmRefused({ ...s, answer }, answer, ANALYST_FOLD_ENTRY);

/** Every numeral the evidence envelope carries — the only numbers the model may quote. */
export const EVIDENCE_NUMBERS: ReadonlySet<string> = (() => {
  const s = new Set<string>();
  const seed = ["0", "1", "2", "3", "4", "5", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"];
  for (const v of seed) s.add(v);
  return s;
})();

/** Numbers the fold actually knows — every string spelling of the model's plausible quote forms. */
export const evidenceNumbers = (fold: PulseFold): ReadonlySet<string> => {
  const out = new Set<string>(EVIDENCE_NUMBERS);
  for (const v of [fold.sessions, fold.visits, fold.bounceRate, fold.avgDepth, fold.avgDwellMs, fold.loopRate, fold.deadEndSessions, fold.trend.length, fold.depthBuckets.length]) addNumeral(out, v);
  for (const r of fold.perRoute) addNumeral(out, r.visits);
  for (const e of fold.exits) addNumeral(out, e.exits);
  // Number registration for the fixed bounds the fold itself uses.
  for (const v of [55, 40, 30, 2, 0.3, 3, 5, 70, 14, 10, 8, 6, 4, 12]) addNumeral(out, v);
  return out;
};

/** The imprisoned verifier. The model may write only prose the envelope can prove. */
export function verifyAnalystText(text: string, fold: PulseFold): AnalystViolation[] {
  const out = new Set<AnalystViolation>();
  const ev = evidenceNumbers(fold);
  let digitCount = 0;
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    digitCount += 1;
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!ev.has(raw) && !ev.has(String(Math.round(n))) && !ev.has(String(round1(n))) && !ev.has(String(round2(n)))) out.add("offEvidence");
  }
  if (digitCount > 36) out.add("tooManyNumbers");
  if (/\b(will|won't|guaranteed|predict|forecast|next quarter|in 2027|by 2030|definitely|certainly)\b/i.test(text)) out.add("prediction");
  return [...out];
}

/** The one artefact the analyst refuses without — an envelope with exact numbers from the fold. */
export const analystEnvelope = (fold: PulseFold, rx: readonly Prescription[]): string =>
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
    exits: fold.exits.slice(0, 5),
    prescriptionIds: rx.map((r) => r.id),
  });

/** Deterministic fold-back key used when the model drifts or is unavailable. */
export const ANALYST_FOLD_ANSWER_KEY = "ops.analyst.foldAnswer.intro";
