// M1195 · The Counselor — the dashboard's next step, written by a door imprisoned to the reader's own facts.
// The ranked checklist (domain/nextStep.ts) answers "what now" with a deterministic fold. The Counselor answers the
// same question in prose — through the same traced FSM as every other imprisoned door: preflight → build → model →
// precommit → commit | refused → done. The model never ships a sentence whose numerals the reader's own fold cannot
// re-prove; a drift anywhere in those numbers — or a future prediction, or an entity the fold does not name — means
// refusal, and the fold's own reading stands in. The local (no-key) arm is byte-deterministic: the fold answers.
import type { Locale } from "@/i18n/dictionaries";
import type { NextStepFacts } from "./nextStep";
import { NEXT_MATCH_SOON_MINUTES } from "./nextStep";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";

export type CounselStage = FsmStage;
export type CounselNote = "factsSealed" | "envelopeSealed" | "commitOk" | "foldOk" | "precommitRefused";

export const COUNSEL_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "envelopeSealed" } as const;
export const COUNSEL_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const COUNSEL_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const COUNSEL_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const COUNSEL_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface CounselTraceEntry { readonly stage: CounselStage; readonly verdict: TraceVerdict; readonly note: CounselNote }

export interface CounselState {
  readonly facts: NextStepFacts;
  readonly locale: Locale;
  readonly status: CounselStage;
  readonly trace: readonly CounselTraceEntry[];
  readonly answer: string;
}

/** The one honest reading of a reader's fold; the fold's own last words when the model drifts. */
export const COUNSEL_LOCAL_KEY = (facts: NextStepFacts): { key: string; params?: { n: number } } => {
  if (facts.liveMatchId) return { key: "counsel.localLive" };
  if (facts.nextMatchInMinutes !== null && facts.nextMatchInMinutes <= NEXT_MATCH_SOON_MINUTES) {
    return { key: "counsel.localSoon", params: { n: Math.max(0, facts.nextMatchInMinutes) } };
  }
  if (facts.plannedSessions === 0) return { key: "counsel.localEmptyPlan" };
  if (facts.filmClips === 0) return { key: "counsel.localNoFilm" };
  if (facts.watchlist === 0) return { key: "counsel.localEmptyWatchlist" };
  return { key: "counsel.localNothing" };
};

export const createCounsel = (facts: NextStepFacts, locale: Locale): CounselState => ({
  facts,
  locale,
  status: "preflight",
  trace: [],
  answer: "",
});

export const counselPreflight = (s: CounselState): CounselState =>
  factsHaveContent(s.facts)
    ? step(s, { stage: "preflight", verdict: "pass", note: "factsSealed" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "factsSealed" }, "refused");

const factsHaveContent = (f: NextStepFacts): boolean =>
  f.liveMatchId !== null || f.nextMatchId !== null || f.nextMatchInMinutes !== null
  || f.plannedSessions > 0 || f.filmClips > 0 || f.watchlist > 0;

export const counselBuild = (s: CounselState): CounselState => fsmBuild(s, COUNSEL_BUILD_ENTRY, "model");
export const counselPrecommit = (s: CounselState, verdict: TraceVerdict): CounselState =>
  fsmPrecommit(s, verdict, COUNSEL_PRECOMMIT_PASS, COUNSEL_PRECOMMIT_REFUSED);
export const counselCommit = (s: CounselState, answer: string): CounselState =>
  fsmCommit({ ...s, answer }, answer, COUNSEL_COMMIT_ENTRY);
export const counselRefused = (s: CounselState, answer: string): CounselState =>
  fsmRefused({ ...s, answer }, answer, COUNSEL_FOLD_ENTRY);

/** The fold's own last words, sealed for the refusal arm. */
export const COUNSEL_FOLD_ANSWER_KEY = "counsel.foldAnswer";

/** The exact fold the model sees — the reader's own numbers and nothing else. The instruction lines
 * ride in the feature's system envelope (the librarian pattern), never in the rendered UI. */
export const counselEnvelope = (facts: NextStepFacts): string =>
  JSON.stringify({
    liveMatch: facts.liveMatchId !== null,
    nextMatch: facts.nextMatchId !== null,
    nextMatchInMinutes: facts.nextMatchInMinutes,
    plannedSessions: facts.plannedSessions,
    filmClips: facts.filmClips,
    badgeWaiting: facts.badgeWaiting,
    watchlistCount: facts.watchlist,
  });

export const COUNSEL_NUMBER = (raw: string): number | null => {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const BASE_EVIDENCE: ReadonlySet<string> = new Set(["0", "1", "2", "3"]);

export const counselEvidence = (facts: NextStepFacts): ReadonlySet<string> => {
  const out = new Set<string>(BASE_EVIDENCE);
  const add = (v: number | null) => { if (v !== null && Number.isFinite(v)) out.add(String(Math.round(v))); };
  add(facts.nextMatchInMinutes);
  add(facts.plannedSessions);
  add(facts.filmClips);
  add(facts.watchlist);
  return out;
};

export type CounselViolation = "offEvidence" | "tooManyNumbers" | "prediction";

export function verifyCounselText(text: string, facts: NextStepFacts): CounselViolation[] {
  const out = new Set<CounselViolation>();
  const ev = counselEvidence(facts);
  let digitCount = 0;
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    digitCount += 1;
    const raw = m[0].replace(/,/g, "");
    const n = COUNSEL_NUMBER(raw);
    if (n === null) continue;
    if (!ev.has(raw) && !ev.has(String(Math.round(n)))) out.add("offEvidence");
  }
  if (digitCount > 12) out.add("tooManyNumbers");
  if (/\b(will win|definitely|guaranteed|predict|next season|next year|by 20\d\d)\b/i.test(text)) out.add("prediction");
  return [...out];
}
