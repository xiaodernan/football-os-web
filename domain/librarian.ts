// M1181 · The Librarian — the reading room's own ask desk.
// The brief demanded: every function teach itself to a new user — embedded in-app, not in docs.
// This module is the engine: given a visitor's question and the manual itself, it may
// answer from the manual ONLY; anything outside the book is refused and the fold answers.
// The constitution is simple: the model may name everything the manual already names and
// nothing else; verification is imprisoned to the chapter keys, never to the corpus' words.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";

export type LibrarianStage = FsmStage;
export type LibrarianNote = "bookInHand" | "indexSealed" | "commitOk" | "foldOk" | "precommitRefused";
export type LibrarianViolation = "offBook" | "prediction";

export const LIBRARIAN_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "indexSealed" } as const;
export const LIBRARIAN_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const LIBRARIAN_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const LIBRARIAN_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const LIBRARIAN_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface LibrarianTraceEntry {
  readonly stage: LibrarianStage;
  readonly verdict: TraceVerdict;
  readonly note: LibrarianNote;
}

export interface LibrarianState {
  readonly chapter: BookChapter | null;
  readonly question: string;
  readonly locale: Locale;
  readonly status: LibrarianStage;
  readonly trace: readonly LibrarianTraceEntry[];
  readonly answer: string;
}

/** A chapter of the embedded manual — one bucket the model may quote from. */
export interface BookChapter {
  readonly id: string;
  readonly titleKey: string;
  readonly bodyKeys: readonly string[];
  readonly keywordKey: string;
}

/** The doors of the embedded manual — one imprisonable bucket per chapter. */
export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { id: "welcome", titleKey: "manual.welcomeTitle", bodyKeys: ["manual.welcomeTitle", "manual.welcomeBody", "manual.welcomeStep1", "manual.welcomeStep2", "manual.welcomeStep3", "manual.onboardingCta"],
    keywordKey: "manual.librarian.keywords.welcome" },
  { id: "modes", titleKey: "manual.modesTitle", bodyKeys: ["manual.modesTitle", "manual.fanTitle", "manual.fanBody", "manual.fanBullet1", "manual.fanBullet2", "manual.fanBullet3", "manual.playerTitle", "manual.playerBody", "manual.playerBullet1", "manual.playerBullet2", "manual.playerBullet3", "manual.managerTitle", "manual.managerBody", "manual.managerBullet1", "manual.managerBullet2", "manual.managerBullet3"],
    keywordKey: "manual.librarian.keywords.modes" },
  { id: "explore", titleKey: "manual.exploreTitle", bodyKeys: ["manual.exploreTitle", "manual.exploreBody"],
    keywordKey: "manual.librarian.keywords.explore" },
  { id: "epics", titleKey: "manual.epicsTitle", bodyKeys: ["manual.epicsTitle", "manual.epicsBody", "manual.epicsStep1", "manual.epicsStep2", "manual.epicsStep3", "manual.epicsStep4"],
    keywordKey: "manual.librarian.keywords.epics" },
  { id: "spring", titleKey: "manual.springTitle", bodyKeys: ["manual.springTitle", "manual.springBody", "manual.springItem1", "manual.springItem2", "manual.springItem3"],
    keywordKey: "manual.librarian.keywords.spring" },
  { id: "honesty", titleKey: "manual.honestyTitle", bodyKeys: ["manual.honestyTitle", "manual.honestyBody"],
    keywordKey: "manual.librarian.keywords.honesty" },
  { id: "gatelane", titleKey: "manual.gatelaneTitle", bodyKeys: ["manual.gatelaneTitle", "manual.gatelaneBody", "manual.gatelaneItem1", "manual.gatelaneItem2", "manual.gatelaneItem3", "manual.gatelaneItem4", "manual.gatelaneItem5", "manual.gatelaneItem6"],
    keywordKey: "manual.librarian.keywords.gatelane" },
  { id: "print", titleKey: "manual.printTitle", bodyKeys: ["manual.printTitle", "manual.printBody"],
    keywordKey: "manual.librarian.keywords.print" },
  { id: "doors", titleKey: "manual.doorsTitle", bodyKeys: ["manual.doorsTitle", "manual.doorsBody"],
    keywordKey: "manual.librarian.keywords.doors" },
] as const;

/** Overlap score — every keyword that substring-matches the question counts. */
const score = (question: string, keywordString: string): number => {
  const q = question.toLowerCase();
  let hits = 0;
  for (const kw of keywordString.toLowerCase().split("|")) {
    const trimmed = kw.trim();
    if (trimmed.length > 1 && q.includes(trimmed)) hits += 1;
  }
  return hits;
};

/** Pick the best-scoring chapter; ties favour earlier (welcome acts as the default FIRST door). */
export function pickBookChapter(
  question: string,
  translate: (key: string) => string,
): BookChapter | null {
  let best: BookChapter | null = null;
  let bestScore = 0;
  for (const ch of BOOK_CHAPTERS) {
    const s = score(question, translate(ch.keywordKey));
    if (s > bestScore) { best = ch; bestScore = s; }
  }
  return bestScore >= 1 ? best : null;
}

export const createLibrarian = (chapter: BookChapter | null, question: string, locale: Locale): LibrarianState => ({
  chapter, question, locale, status: "preflight", trace: [], answer: "",
});

/** The imprisoned verifier — everything the model writes must anchor in the book. */
export function verifyLibrarianText(text: string): LibrarianViolation[] {
  const out = new Set<LibrarianViolation>();
  // Every numeral the model writes must exist somewhere in this world (digest + book uses these same numerics).
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!DEEP_DIGEST_NUMBERS.has(raw) && !DEEP_DIGEST_NUMBERS.has(String(Math.round(n)))) out.add("offBook");
  }
  // The seven doors the manual names are the only doors it claims exist —
  // anything the model calls "chapter" outside these string-ids is out of the book.
  for (const m of text.matchAll(/chapter\s+(\w+)/gi)) {
    if (!["welcome", "modes", "explore", "epics", "spring", "honesty", "print"].includes(m[1].toLowerCase())) out.add("offBook");
  }
  if (/\b(will|won't|never will|by the time|years from now|listen to me)\b/i.test(text)) out.add("prediction");
  return [...out];
}

// ---- the state machine --------------------------------------------------
export const librarianPreflight = (s: LibrarianState): LibrarianState =>
  s.chapter !== null
    ? step(s, { stage: "preflight", verdict: "pass", note: "bookInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "bookInHand" }, "refused");

export const librarianBuild = (s: LibrarianState): LibrarianState =>
  fsmBuild(s, LIBRARIAN_BUILD_ENTRY, "model");

export const librarianPrecommit = (s: LibrarianState, verdict: TraceVerdict): LibrarianState =>
  fsmPrecommit(s, verdict, LIBRARIAN_PRECOMMIT_PASS, LIBRARIAN_PRECOMMIT_REFUSED);

export const librarianCommit = (s: LibrarianState, answer: string): LibrarianState =>
  fsmCommit({ ...s, answer }, answer, LIBRARIAN_COMMIT_ENTRY);

export const librarianRefused = (s: LibrarianState, answer: string): LibrarianState =>
  fsmRefused({ ...s, answer }, answer, LIBRARIAN_FOLD_ENTRY);
