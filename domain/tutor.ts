// M1179 · The Tutor — the Learning Hall's own "问老师" desk.
// The third question engine's younger sibling: the model may teach this lesson ONLY from
// the lesson's own words; anything it says that the page cannot back is refused and the
// fold's own reading speaks instead. The model's freedom ends where the lesson begins —
// and it tells the student so every time, honestly.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";

export type TutorStage = FsmStage;
export type TutorNote = "lessonInHand" | "lessonSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface TutorTraceEntry {
  readonly stage: TutorStage;
  readonly verdict: TraceVerdict;
  readonly note: TutorNote;
}

export interface TutorCorpus {
  readonly id: string;
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
  readonly body: readonly string[];
  readonly quizQuestion: string;
  readonly quizOptions: readonly string[];
}

export interface TutorState {
  readonly corpus: TutorCorpus;
  readonly locale: Locale;
  readonly status: TutorStage;
  readonly trace: readonly TutorTraceEntry[];
  readonly answer: string;
}

/** The consultation's own traced-step presets, spelled once. */
export const TUTOR_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "lessonSealed" } as const;
export const TUTOR_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const TUTOR_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const TUTOR_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const TUTOR_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export const createTutor = (corpus: TutorCorpus, locale: Locale): TutorState => ({
  // The FSM imprisons the model to this lesson's own words — clone them so
  // a caller can never swap the page's sentences from under the proof mid-run.
  corpus: { ...corpus, body: [...corpus.body] },
  locale, status: "preflight", trace: [], answer: "",
});

export type TutorViolation = "offLesson" | "prediction";

/** Every numeral the lesson itself prints — one string at a time. */
const buildUniverse = (c: TutorCorpus): ReadonlySet<string> => {
  const out = new Set<string>();
  const hay = [c.title, c.summary, ...c.body, c.quizQuestion, ...c.quizOptions].join(" ");
  for (const m of hay.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    out.add(raw);
    out.add(String(Math.round(Number(raw))));
  }
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) out.add(String(base));
  return out;
};

/** The imprisoned verifier: any numeral the model writes that the lesson cannot carry is refused. */
export function verifyTutorText(text: string, corpus: TutorCorpus): TutorViolation[] {
  const out = new Set<TutorViolation>();
  const universe = buildUniverse(corpus);
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!universe.has(raw) && !universe.has(String(Math.round(n)))) out.add("offLesson");
  }
  if (/\b(will|won't|never will|by the time|years from now|mark my words)\b/i.test(text)) out.add("prediction");
  return [...out];
}

// ---- the state machine --------------------------------------------------
export const tutorPreflight = (s: TutorState): TutorState =>
  s.corpus.body.length > 0 && s.corpus.title.trim().length > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "lessonInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "lessonInHand" }, "refused");

export const tutorBuild = (s: TutorState): TutorState =>
  fsmBuild(s, TUTOR_BUILD_ENTRY, "model");

export const tutorPrecommit = (s: TutorState, verdict: TraceVerdict): TutorState =>
  fsmPrecommit(s, verdict, TUTOR_PRECOMMIT_PASS, TUTOR_PRECOMMIT_REFUSED);

export const tutorCommit = (s: TutorState, answer: string): TutorState =>
  fsmCommit({ ...s, answer }, answer, TUTOR_COMMIT_ENTRY);

export const tutorRefused = (s: TutorState, answer: string): TutorState =>
  fsmRefused({ ...s, answer }, answer, TUTOR_FOLD_ENTRY);
