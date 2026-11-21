// M1224 · The Long-Context Chronicler — door 15, the two-step imprisoned chapter.
// The complete tape (1,566 seeded fixtures, byte-stable in DEEP_DIGEST) is the SHARED prefix:
// withWorldBook puts it ahead of a small dynamic envelope, so the 24h cache lane stays warm and
// only the suffix changes between asks. The model seals one finished fixture with a CHAPTER:<id>
// first line and writes a three-section micro-chapter. Two verifiers stand between the draft and
// the commit: STRUCTURE first (three ordered, non-empty sections within budget), then NUMERALS
// (the shared evidence-number law over that fixture's sealed envelope). Either refusal — or a
// bad directive, an abstention, an offline proxy — walks the graph to an honest fold chapter
// built from the very same tape line. No second randomness source, no invented figure.
import type { Locale } from "@/i18n/dictionaries";
import { step, fsmBuild, fsmCommit, fsmRefused, type FsmStage, type Verdict, type VerifierStage, type VerifierNote } from "@/domain/tracedFsm";
import type { BenchRoute } from "@/domain/witnessBench";
import { verifyReplayText } from "@/domain/replay";
import { safeDiv } from "@/lib/utils";

/** The three sealed sections, in the one order the structure verifier accepts. */
export const CHAPTER_SECTIONS = ["SETTING", "TURN", "ECHO"] as const;
export type ChapterSection = (typeof CHAPTER_SECTIONS)[number];
/** The operator badges, spelled once and consumed by graph notes and the panel alike. */
export type ChapterBadge = "verified" | "folded" | "invalid" | "abstained" | "offline";
export type ChapterStructureViolation = "missingSection" | "wrongOrder" | "emptySection" | "tooLong";

/** One finished fixture parsed verbatim from a complete-tape line. */
export interface ChapterFixture {
  readonly id: string;
  readonly date: string;
  readonly competition: string;
  readonly matchday: number;
  readonly home: string;
  readonly away: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly status: string;
  readonly line: string;
}

// date · competition · MDn — home goals-away goals · status · id (the tape's own verbatim shape).
const TAPE_LINE = /^(\d{4}-\d{2}-\d{2}) (\S+) MD(\d+) — (.+?) (\d+)-(\d+) (.+?) · (\S+) · (\S+)$/;

/** Every finished fixture in the complete tape — scheduled lines carry no score and cannot seal a chapter. */
export function fixturesFromTape(tape: string): ChapterFixture[] {
  const out: ChapterFixture[] = [];
  for (const raw of String(tape ?? "").split(/\r?\n/)) {
    const m = TAPE_LINE.exec(raw.trim());
    if (!m) continue;
    out.push({
      date: m[1], competition: m[2], matchday: Number(m[3]),
      home: m[4].trim(), homeGoals: Number(m[5]), awayGoals: Number(m[6]),
      away: m[7].trim(), status: m[8], id: m[9], line: raw.trim(),
    });
  }
  return out;
}

/** Three deterministic fixtures spread across the whole tape (first, middle, last) — no RNG. */
export function pickTapeFixtures(fixtures: readonly ChapterFixture[], count = 3): ChapterFixture[] {
  if (fixtures.length === 0) return [];
  const out: ChapterFixture[] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    const span = Math.max(1, count) - 1;
    const idx = Math.floor(safeDiv(i * (fixtures.length - 1), span));
    const f = fixtures[idx];
    if (f && !out.some((o) => o.id === f.id)) out.push(f);
  }
  return out;
}

/** The exact ground truth offered to the model: the fixture's own verbatim tape line. */
export function chronicleEnvelope(f: ChapterFixture, law: string): object {
  return {
    law,
    tapeLine: f.line,
    fixture: {
      id: f.id,
      date: f.date,
      competition: f.competition,
      matchday: f.matchday,
      home: f.home,
      away: f.away,
      homeGoals: f.homeGoals,
      awayGoals: f.awayGoals,
      status: f.status,
    },
  };
}

// ── step two of the verifier: the ONE shared evidence-number door, never a second copy ─────────
// The Replay Room already owns the law (compound numerals only, rounded twins allowed, future
// promises refused, offending figures reported). Door 15 rides that door directly; a private
// re-spelling would let the two imprisoned doors drift apart on the same evidence.
export const verifyChapterNumerals = verifyReplayText;

// ── step one of the verifier: a sealed three-section chapter, in order, non-empty, in budget ───
export function parseChapterSections(body: string): Partial<Record<ChapterSection, string>> {
  const text = String(body ?? "");
  const out: Partial<Record<ChapterSection, string>> = {};
  const marks: { section: ChapterSection; at: number; end: number }[] = [];
  for (const m of text.matchAll(/^\s*(SETTING|TURN|ECHO)\s*:/gim)) {
    marks.push({
      section: m[1].toUpperCase() as ChapterSection,
      at: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
    });
  }
  marks.forEach((mk, i) => {
    out[mk.section] = text.slice(mk.end, i + 1 < marks.length ? marks[i + 1].at : text.length).trim();
  });
  return out;
}

export function verifyChapterStructure(body: string): ChapterStructureViolation[] {
  const text = String(body ?? "");
  const marks = [...text.matchAll(/^\s*(SETTING|TURN|ECHO)\s*:/gim)].map((m) => m[1].toUpperCase());
  const found = new Set<ChapterStructureViolation>();
  for (const s of CHAPTER_SECTIONS) if (!marks.includes(s)) found.add("missingSection");
  if (marks.length === CHAPTER_SECTIONS.length && CHAPTER_SECTIONS.some((s, i) => marks[i] !== s)) found.add("wrongOrder");
  const sections = parseChapterSections(text);
  if (CHAPTER_SECTIONS.some((s) => !(sections[s] ?? ""))) found.add("emptySection");
  if (text.split(/\s+/).filter(Boolean).length > 140) found.add("tooLong");
  return [...found];
}

/**
 * The honest fallback: a structure-valid, numeral-clean chapter told only from the fixture's own
 * tape line. The section markers are protocol tokens owned here; the sentences are localised by
 * the caller, so no English prose lives in this domain module (the i18n prose ceiling is zero)
 * and every number still comes from the very line the model was offered.
 */
export function foldChapter(f: ChapterFixture, lines: Record<ChapterSection, string>): string {
  return CHAPTER_SECTIONS
    .map((s) => `${s}: ${(lines[s] ?? "").trim() || f.id}`)
    .join("\n");
}

// ── the first-line directive grammar, first line only ──────────────────────────────────────────
export interface ChapterDirective {
  readonly fixtureId: string | null;
  readonly route: BenchRoute;
}

export function parseChapterDirective(text: string, offered: readonly ChapterFixture[]): ChapterDirective | null {
  const first = String(text ?? "").split(/\r?\n/, 1)[0].trim();
  if (/^\[?ABSTAIN\]?\b/i.test(first)) return { fixtureId: null, route: "abstain" };
  const m = /^CHAPTER:(\S+)\b/i.exec(first);
  if (!m) return null;
  const fixtureId = offered.find((f) => f.id.toLowerCase() === m[1].toLowerCase())?.id ?? null;
  return fixtureId ? { fixtureId, route: "answer" } : null;
}

export const stripChapterDirective = (text: string): string =>
  String(text ?? "")
    .replace(/^\s*(\[?ABSTAIN\]?|CHAPTER:\S+)\b[^\n]*\n?/i, "")
    .trim();

// ── the traced StateGraph: two verifier stages between the model and the commit ────────────────
export type ChronicleStage = FsmStage | VerifierStage;
export type ChronicleNote =
  | "tapeSealed" | "chapterChose" | "directiveInvalid" | "modelAbstained"
  | VerifierNote
  | "commitOk" | "foldOk";

export interface ChapterTraceEntry {
  readonly stage: ChronicleStage;
  readonly verdict: Verdict;
  readonly note: ChronicleNote;
}

export interface ChapterState {
  readonly locale: Locale;
  readonly status: ChronicleStage;
  readonly fixtureId: string | null;
  readonly trace: readonly ChapterTraceEntry[];
  readonly answer: string;
  /** Each verifier's result lives in state: step two can never run on an unchecked draft. */
  readonly structureOk: boolean;
  readonly numeralsOk: boolean;
  /** A committed chapter is sealed; a refused one carries no seal into the next ask. */
  readonly committed: boolean;
}

export const createChapter = (locale: Locale): ChapterState => ({
  locale, status: "preflight", fixtureId: null, trace: [], answer: "",
  structureOk: false, numeralsOk: false, committed: false,
});

/** The tape is only "sealed" when three distinct finished fixtures are offered with verbatim lines. */
export const chapterPreflight = (s: ChapterState, offered: readonly ChapterFixture[]): ChapterState =>
  offered.length >= 3 && offered.every((f) => f.line.length > 0 && f.id.length > 0)
    ? step(s, { stage: "preflight", verdict: "pass", note: "tapeSealed" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "foldOk" }, "refused");

/** A new ask clears the prior answer and seal before the model is consulted. */
export const chapterBuild = (s: ChapterState): ChapterState =>
  fsmBuild({ ...s, answer: "", fixtureId: null },
    { stage: "build", verdict: "pass", note: "tapeSealed" }, "model");

export const chapterModelChose = (s: ChapterState, fixtureId: string): ChapterState =>
  step({ ...s, fixtureId }, { stage: "model", verdict: "pass", note: "chapterChose" }, "structure");

/** A bad directive names no fixture: clear a carried seal on the refused arm. */
export const chapterDirectiveInvalid = (s: ChapterState, answer: string): ChapterState =>
  fsmRefused({ ...s, fixtureId: null, answer }, answer,
    { stage: "model", verdict: "refused", note: "directiveInvalid" });

/** Abstention names no branch either. */
export const chapterAbstained = (s: ChapterState, answer: string): ChapterState =>
  fsmRefused({ ...s, fixtureId: null, answer }, answer,
    { stage: "model", verdict: "refused", note: "modelAbstained" });

/** Step one passed — the draft is structurally a chapter; now the numerals must answer to the tape. */
export const chapterStructurePassed = (s: ChapterState): ChapterState =>
  step({ ...s, structureOk: true }, { stage: "structure", verdict: "pass", note: "structurePassed" }, "numerals");

export const chapterStructureRefused = (s: ChapterState, answer: string): ChapterState =>
  fsmRefused(s, answer, { stage: "structure", verdict: "refused", note: "structureRefused" });

/** Step two passed — every compound numeral anchors in the sealed fixture. */
export const chapterNumeralsPassed = (s: ChapterState): ChapterState =>
  step({ ...s, numeralsOk: true }, { stage: "numerals", verdict: "pass", note: "numeralsPassed" }, "commit");

export const chapterNumeralsRefused = (s: ChapterState, answer: string): ChapterState =>
  fsmRefused(s, answer, { stage: "numerals", verdict: "refused", note: "numeralsRefused" });

export const chapterCommit = (s: ChapterState, answer: string): ChapterState =>
  fsmCommit({ ...s, answer, committed: true }, answer, { stage: "commit", verdict: "pass", note: "commitOk" });

export const chapterRefused = (s: ChapterState, answer: string): ChapterState =>
  fsmRefused({ ...s, answer, committed: false }, answer, { stage: "refused", verdict: "refused", note: "foldOk" });
