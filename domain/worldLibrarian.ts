// M1197 · The World Desk — the Library's own imprisoned ask door (the eleventh door).
// The constitution is as simple as it is strict:
//   the model may answer from the passages the index JUST FOUND, and nothing else.
//   A numeral is lawful only if it appears in those passages; anything else is a refusal,
//   and the fold answers with the deterministic honest reading. No number invented. Ever.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import type { LibraryHit } from "@/data/libraryCorpus";

export type WorldStage = FsmStage;
export type WorldNote = "shelvesInHand" | "envelopeSealed" | "commitOk" | "foldOk" | "precommitRefused";
export type WorldViolation = "offCorpus" | "prediction";

export const WORLD_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "envelopeSealed" } as const;
export const WORLD_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const WORLD_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const WORLD_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const WORLD_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface WorldTraceEntry {
  readonly stage: WorldStage;
  readonly verdict: TraceVerdict;
  readonly note: WorldNote;
}

export interface WorldState {
  readonly question: string;
  readonly locale: Locale;
  readonly hits: readonly LibraryHit[];
  readonly status: WorldStage;
  readonly trace: readonly WorldTraceEntry[];
  readonly answer: string;
}

/** The evidence envelope — exactly what the index found, spelled raw, nothing more. */
export interface CorpusEnvelopeItem {
  readonly id: string;
  readonly kind: string;
  readonly target: string;
  readonly evidence: string;
}

export interface CorpusEnvelope {
  readonly question: string;
  readonly locale: string;
  readonly hits: readonly CorpusEnvelopeItem[];
}

export const createWorldDesk = (question: string, hits: readonly LibraryHit[], locale: Locale): WorldState => {
  const seen = new Set<string>();
  // The shelf answers honestly about itself — the same passage never counts twice for the desk.
  const uniqueHits = hits.filter((hit) => {
    const id = hit.document.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return { question, locale, hits: uniqueHits, status: "preflight", trace: [], answer: "" };
};

export const envelopeFor = (question: string, hits: readonly LibraryHit[], locale: string): CorpusEnvelope => ({
  question,
  locale,
  hits: hits.map((hit) => ({
    id: hit.document.id,
    kind: hit.document.kind,
    target: hit.document.target,
    evidence: hit.document.text,
  })),
});

/**
 * Every numeral the model may lawfully write — the union of digits present in the evidence.
 * M1219: the old `[\d.,]*` closure swallowed the COMMAS BETWEEN JSON-ARRAY ELEMENTS, so
 * `[1,37,15]` harvested one 13715 instead of three lawful numbers and every real sentence
 * about the sealed fold was refused. A thousands group is one number; a plain comma is a
 * separator. Both are captured, and the rounded twin is still kept for the shared law.
 */
export const collectEvidenceNumbers = (evidence: string): Set<string> => {
  const out = new Set<string>();
  for (const m of evidence.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) {
    const raw = m[0].replace(/,/g, "");
    out.add(raw);
    out.add(String(Math.round(Number(raw))));
  }
  return out;
};

/** The one numerical-imprisonment law both ask desks obey: zero free digits in a sealed envelope. */
export const verifyNumbersAgainst = (text: string, evidence: string): WorldViolation[] => {
  const out = new Set<WorldViolation>();
  const allowed = collectEvidenceNumbers(evidence);
  for (const m of text.matchAll(/\d+(?:[\d.,]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    // Single digits are ubiquitous and meaningless to imprison; compound numerals must anchor.
    if (raw.length === 1) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!allowed.has(raw) && !allowed.has(String(Math.round(n)))) out.add("offCorpus");
  }
  if (/\b(will|won't|never will|by the time|years from now|listen to me)\b/i.test(text)) out.add("prediction");
  return [...out];
};

/** The imprisoned verifier — every numeral must be traceable to a passage the reader actually opened. */
export function verifyWorldText(text: string, hits: readonly LibraryHit[]): WorldViolation[] {
  return verifyNumbersAgainst(text, hits.map((hit) => hit.document.text).join("\n"));
}

// ---- the state machine -----------------------------------------------------
export const worldPreflight = (s: WorldState): WorldState =>
  s.hits.length > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "shelvesInHand" }, "build")
    : step(s, { stage: "preflight", verdict: "refused", note: "shelvesInHand" }, "refused");

export const worldBuild = (s: WorldState): WorldState =>
  fsmBuild(s, WORLD_BUILD_ENTRY, "model");

export const worldPrecommit = (s: WorldState, verdict: TraceVerdict): WorldState =>
  fsmPrecommit(s, verdict, WORLD_PRECOMMIT_PASS, WORLD_PRECOMMIT_REFUSED);

export const worldCommit = (s: WorldState, answer: string): WorldState =>
  fsmCommit({ ...s, answer }, answer, WORLD_COMMIT_ENTRY);

export const worldRefused = (s: WorldState, answer: string): WorldState =>
  fsmRefused({ ...s, answer }, answer, WORLD_FOLD_ENTRY);
