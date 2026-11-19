// M1217 · The Witness Bench — imprisoned LLM door #13.
// The difference from the twelve before it: the model does not only write the answer,
// it drives a transition. When the envelope cannot support a truthful sentence the model
// may speak the single directive ABSTAIN; the graph reads that verdict and walks itself
// into the refused arm, where the fold answers honestly in its place. No numeral is ever
// printed without first being re-proved against the envelope the reader can see.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { footballProvider } from "@/data/footballService";
import { frozenFolds, retrieveFrozen, verifyFrozenText, type FrozenAskId } from "@/domain/frozenDispatch";

export const WITNESS_LENSES = ["crown", "chase", "form"] as const;
export type WitnessLens = (typeof WITNESS_LENSES)[number];

/** The three new lenses ride the Dispatch's three envelopes — one fold, one verifier, zero drift. */
export const BENCH_TO_FROZEN: Readonly<Record<WitnessLens, FrozenAskId>> = {
  crown: "summit",
  chase: "chase",
  form: "runIn",
};

export type BenchStage = FsmStage;
export type BenchNote = "shelvesInHand" | "envelopeSealed" | "modelRouted" | "modelAbstained" | "modelChoseLens" | "modelRouteInvalid" | "commitOk" | "precommitRefused" | "foldOk" | "abstainFold";

export const BENCH_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "envelopeSealed" } as const;
export const BENCH_MODEL_ROUTED = { stage: "model", verdict: "pass", note: "modelRouted" } as const;
export const BENCH_MODEL_ABSTAINED = { stage: "model", verdict: "refused", note: "modelAbstained" } as const;
export const BENCH_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const BENCH_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;
export const BENCH_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const BENCH_REFUSED_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const BENCH_ABSTAIN_ENTRY = { stage: "refused", verdict: "refused", note: "abstainFold" } as const;

export type BenchRoute = "answer" | "abstain";

/** ABSTAIN counts only as the model's OPENING word. Mid-prose "abstain" is ordinary language. */
export function benchRoute(text: string): BenchRoute {
  return /^\s*\[?ABSTAIN\]?\b/i.test(text) ? "abstain" : "answer";
}

// ── M1219 · the model chooses the BRANCH, not only the answer ────────────────────────────
// The routing grammar is deliberately tiny and FIRST-LINE ONLY. A paragraph that merely
// mentions "the crown" is not a directive; a model that drifts into prose cannot silently
// pick a lens. ABSTAIN still wins, as before, and an unrecognised directive is a refused
// graph edge — never a guess about what the model "probably meant".
export interface BenchDirective {
  readonly lens: WitnessLens | null;
  readonly route: BenchRoute;
}

export function parseBenchDirective(text: string): BenchDirective | null {
  const first = String(text ?? "").split(/\r?\n/, 1)[0].trim();
  if (/^\[?ABSTAIN\]?\b/i.test(first)) return { lens: null, route: "abstain" };
  const m = /^LENS:(crown|chase|form)\b/i.exec(first);
  if (!m) return null;
  const lens = WITNESS_LENSES.find((candidate) => candidate === m[1].toLowerCase());
  return lens ? { lens, route: "answer" } : null;
}

/** Strip the directive line so the answer body can still meet the old numeral law. */
export const stripBenchDirective = (text: string): string =>
  String(text ?? "").replace(/^\s*(\[?ABSTAIN\]?|LENS:(?:crown|chase|form))\b[^\n]*\n?/i, "").trim();

export interface BenchTraceEntry {
  readonly stage: BenchStage;
  readonly verdict: TraceVerdict;
  readonly note: BenchNote;
}

export interface BenchState {
  readonly locale: Locale;
  readonly lens: WitnessLens;
  /** The edge the model itself chose — null until it has spoken. */
  readonly route: BenchRoute | null;
  /** M1219 · who picked the lens. The UI must never call a visitor's click a model choice. */
  readonly chosenBy?: "visitor" | "model";
  readonly status: BenchStage;
  readonly trace: readonly BenchTraceEntry[];
  readonly answer: string;
}

export const benchEnvelope = (lens: WitnessLens): object => retrieveFrozen(BENCH_TO_FROZEN[lens], frozenFolds(footballProvider));

export const verifyBenchText = (text: string, envelope: object) => verifyFrozenText(text, envelope);

export const createBench = (lens: WitnessLens, locale: Locale): BenchState => ({
  locale,
  lens,
  route: null,
  status: "preflight",
  trace: [],
  answer: "",
});

// ---- the state machine ---------------------------------------------------------
// The bench carries its lens INTO the graph: an unrecognised lens never advances to the model.
// This is a real guard, not a renamed copy of the Dispatch's preflight (proof-rules pairs bodies
// under consistent identifier renaming and refuses look-alike rules).
export const benchPreflight = (s: BenchState): BenchState =>
  WITNESS_LENSES.includes(s.lens)
    ? step(s, { stage: "preflight", verdict: "pass", note: "shelvesInHand" }, "build")
    : s;

export const benchBuild = (s: BenchState): BenchState =>
  fsmBuild(s, BENCH_BUILD_ENTRY, "model");

/** THE model-driven edge: its own output decides which transition the graph takes. */
export const benchModel = (s: BenchState, route: BenchRoute): BenchState =>
  step({ ...s, route }, route === "abstain" ? BENCH_MODEL_ABSTAINED : BENCH_MODEL_ROUTED, "precommit");

export const benchPrecommit = (s: BenchState, verdict: TraceVerdict): BenchState =>
  fsmPrecommit(s, verdict, BENCH_PRECOMMIT_PASS, BENCH_PRECOMMIT_REFUSED);

export const benchCommit = (s: BenchState, answer: string): BenchState =>
  fsmCommit({ ...s, answer }, answer, BENCH_COMMIT_ENTRY);

export const benchRefused = (s: BenchState, answer: string): BenchState =>
  fsmRefused({ ...s, answer }, answer, BENCH_REFUSED_ENTRY);

export const benchAbstained = (s: BenchState, answer: string): BenchState =>
  fsmRefused({ ...s, answer }, answer, BENCH_ABSTAIN_ENTRY);

/** M1219 · the model named a lens; the graph walks into THAT branch, still gated by precommit. */
export const benchModelChose = (s: BenchState, lens: WitnessLens): BenchState =>
  step({ ...s, lens, route: "answer", chosenBy: "model" },
    { stage: "model", verdict: "pass", note: "modelChoseLens" }, "precommit");

/** An unusable directive is a refused edge — the fold answers and the badge says so. */
export const benchModelRouteInvalid = (s: BenchState, answer: string): BenchState =>
  fsmRefused({ ...s, chosenBy: "model", answer }, answer,
    { stage: "model", verdict: "refused", note: "modelRouteInvalid" });
