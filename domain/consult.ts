// M1178 · The Consultation — the operator's console reads its own prescription aloud.
// The fold (domain/pulse.ts) computed the numbers; prescription.ts folded them into five
// actions. This engine is the THIRD member of the traced-FSM family: the same shared body,
// one more room. The model may narrate only what the fold already measured — any figure it
// writes that the fold cannot carry is refused verbatim and the fold's own sentence substitutes.
import type { Locale } from "@/i18n/dictionaries";
import { round2 } from "@/lib/utils";
import { round1 } from "@/domain/scouting";
import type { PulseFold } from "@/domain/pulse";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";

export type ConsultStage = FsmStage;

export type ConsultNote = "foldInHand" | "envelopeSealed" | "commitOk" | "foldOk" | "precommitRefused";;

export interface ConsultTraceEntry {
  readonly stage: ConsultStage;
  readonly verdict: TraceVerdict;
  readonly note: ConsultNote;
}

export interface ConsultState {
  readonly fold: PulseFold;
  readonly locale: Locale;
  readonly status: ConsultStage;
  readonly trace: readonly ConsultTraceEntry[];
  readonly answer: string;
}

/** The fold's own most-common-hall spots: numbers the model may legitimately quote. */
export const CONSULT_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "envelopeSealed" } as const;
export const CONSULT_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const CONSULT_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const CONSULT_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const CONSULT_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export const createConsult = (fold: PulseFold, locale: Locale): ConsultState => ({
  fold, locale, status: "preflight", trace: [], answer: "",
});

export type ConsultViolation = "wrongNumbers" | "prediction";

/** Every numeral the fold itself prints — one source, formatted exactly as the screens print them. */
const buildUniverse = (fold: PulseFold): ReadonlySet<string> => {
  const out = new Set<string>();
  const push = (n: number, digits = 1): void => {
    if (!Number.isFinite(n)) return;
    const rolled = [Math.round(n), round1(n), round2(n)][digits] ?? Math.round(n);
    out.add(String(rolled));
    out.add(String(Math.round(n)));
  };
  push(fold.sessions, 0);
  push(fold.visits, 0);
  push(fold.bounceSessions, 0);
  push(fold.deadEndSessions, 0);
  push(fold.loopSessions, 0);
  push(fold.bounceRate, 1);
  push(fold.loopRate, 1);
  push(fold.avgDepth, 2);
  push(fold.avgDwellMs, 0);
  for (const q of fold.depthBuckets) push(q, 0);
  for (const r of fold.perRoute) {
    push(r.visits, 0);
    push(r.exits, 0);
    push(r.bounceShare, 1);
    push(r.avgDwellMs, 0);
  }
  for (const e of fold.exits) push(e.exits, 0);
  for (const d of fold.trend) {
    const [y, m, day] = d.day.split("-");
    for (const p of [y, m, day]) if (p) out.add(String(Number(p)));
  }
  for (const y of [2024, 2025, 2026, 2027, 2028, 2029, 2030]) out.add(String(y));
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]) out.add(String(base));
  return out;
};

/** The imprisoned verifier: any number the model writes that the fold cannot carry is refused. */
export function verifyConsultText(text: string, fold: PulseFold): ConsultViolation[] {
  const out = new Set<ConsultViolation>();
  const universe = buildUniverse(fold);
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) continue;
    const candidates = [
      raw,
      String(Math.round(numeric)),
      String(round1(numeric)),
      String(round2(numeric)),
    ];
    if (candidates.some((c) => universe.has(c))) continue;
    if (DEEP_DIGEST_NUMBERS.has(candidates[0]) || DEEP_DIGEST_NUMBERS.has(String(Math.round(Number(raw.replace(/,/g, "")))))) continue;
    out.add("wrongNumbers");
  }
  // Career-future futurology has no place in an operator's console either.
  if (/\b(will|won't|never will|by the time|years from now|listen to me, operator|mark my words)\b/i.test(text)) {
    out.add("prediction");
  }
  return [...out];
}

// ---- the state machine --------------------------------------------------
export const consultPreflight = (s: ConsultState): ConsultState =>
  s.fold.sessions > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "foldInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "foldInHand" }, "refused");

export const consultBuild = (s: ConsultState): ConsultState =>
  fsmBuild(s, CONSULT_BUILD_ENTRY, "model");

export const consultPrecommit = (s: ConsultState, verdict: TraceVerdict): ConsultState =>
  fsmPrecommit(s, verdict, CONSULT_PRECOMMIT_PASS, CONSULT_PRECOMMIT_REFUSED);

export const consultCommit = (s: ConsultState, answer: string): ConsultState =>
  fsmCommit({ ...s, answer }, answer, CONSULT_COMMIT_ENTRY);

export const consultRefused = (s: ConsultState, answer: string): ConsultState =>
  fsmRefused({ ...s, answer }, answer, CONSULT_FOLD_ENTRY);
