// M1236 · The Match Reporter — door 18, the one that writes the game. The chronicler seals a
// micro-chapter from the whole tape; this one takes ONE finished fixture and writes its report,
// the way a journalist who watched it would. Every numeral must come from the fixture's own
// envelope — the score, the minutes on the clock, the stats the engine recorded — and a refusal
// walks to the fold's own deterministic report built from the very same events. The model's
// freedom ends where the fixture's facts begin.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";
import type { Match } from "./types";

export type ReporterStage = FsmStage;
export type ReporterNote = "fixtureInHand" | "fixtureSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface ReporterTraceEntry {
  readonly stage: ReporterStage;
  readonly verdict: TraceVerdict;
  readonly note: ReporterNote;
}

/** One finished fixture as the reporter sees it — the engine's own record, nothing inferred. */
export interface ReporterFixture {
  readonly id: string;
  readonly homeName: string;
  readonly awayName: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  /** The events the engine recorded, in minute order. */
  readonly events: readonly { minute: number; type: string; side: string; player: string }[];
  /** The stats the engine recorded, as numbers the prose may carry. */
  readonly stats: readonly number[];
}

export interface ReporterState {
  readonly fixture: ReporterFixture;
  readonly locale: Locale;
  readonly status: ReporterStage;
  readonly trace: readonly ReporterTraceEntry[];
  readonly answer: string;
}

export const REPORTER_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "fixtureSealed" } as const;
export const REPORTER_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const REPORTER_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const REPORTER_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const REPORTER_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

/** The report's own length budget, in characters. */
export const REPORT_MAX_CHARS = 900;

const REPORT_LINE = /^REPORT:([A-Za-z0-9_-]+)\s*$/m;

/** A finished fixture with events, sealed as the reporter's envelope. The club NAMES are passed
 *  in rather than looked up here: the domain stays pure and the screen owns the world read. */
export function sealFixture(match: Match, homeName: string, awayName: string): ReporterFixture | null {
  if (match.status !== "FINISHED" || match.homeGoals === null || match.awayGoals === null) return null;
  if (!match.events?.length) return null;
  const stats = match.stats
    ? [match.stats.home, match.stats.away].flatMap((s) => [s.possession, s.shots, s.onTarget, s.xg, s.passes, s.passAcc, s.tackles, s.duels, s.corners, s.fouls, s.yellows, s.reds])
    : [];
  return {
    id: match.id,
    homeName,
    awayName,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    events: match.events.map((e) => ({ minute: e.minute, type: e.type, side: e.side, player: e.player })),
    stats,
  };
}

export const createReporter = (fixture: ReporterFixture, locale: Locale): ReporterState => ({
  fixture: { ...fixture, events: fixture.events.map((e) => ({ ...e })), stats: [...fixture.stats] },
  locale, status: "preflight", trace: [], answer: "",
});

export type ReporterViolation = "noDirective" | "wrongFixture" | "offFixture" | "tooLong" | "prediction";

/** Parse the report's directive line; it must name the very fixture on the desk. */
export function parseReporterReport(text: string, fixture: ReporterFixture): { ok: boolean; violations: ReporterViolation[] } {
  const m = REPORT_LINE.exec(text);
  if (!m) return { ok: false, violations: ["noDirective"] };
  if (m[1] !== fixture.id) return { ok: false, violations: ["wrongFixture"] };
  return { ok: true, violations: [] };
}

/** The numeral law over the prose: every figure must be one the fixture carries — the score, an
 *  event's minute, a stat — or one the world book carries. Anything else is refused. */
export function verifyReporterText(text: string, fixture: ReporterFixture): ReporterViolation[] {
  const out = new Set<ReporterViolation>();
  const universe = new Set<string>();
  const add = (n: number) => { universe.add(String(n)); };
  add(fixture.homeGoals);
  add(fixture.awayGoals);
  for (const e of fixture.events) add(e.minute);
  for (const s of fixture.stats) add(s);
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) add(base);
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (universe.has(raw) || universe.has(String(Math.round(n)))) continue;
    if (DEEP_DIGEST_NUMBERS.has(raw) || DEEP_DIGEST_NUMBERS.has(String(Math.round(n)))) continue;
    out.add("offFixture");
  }
  if (/\b(will|won't|never will|by the time|years from now|mark my words|next match)\b/i.test(text)) out.add("prediction");
  // The budget is real or it is not a budget: a report past REPORT_MAX_CHARS is refused.
  if (text.length > REPORT_MAX_CHARS) out.add("tooLong");
  return [...out];
}

/** The fold's own report as DATA — the score, the goalscorers in minute order, the engine's
 *  tallies. The domain writes no prose (the domain-prose ceiling is zero): the screen words
 *  this structure through the dictionary, so a refusal's report is translated like everything
 *  else the reader sees. */
export interface FoldReport {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly goals: readonly { player: string; minute: number }[];
  readonly shots: number;
  readonly saves: number;
}

export function foldReport(fixture: ReporterFixture): FoldReport {
  const goals = fixture.events
    .filter((e) => e.type === "GOAL")
    .map((e) => ({ player: e.player, minute: e.minute }));
  return {
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    goals,
    shots: fixture.events.filter((e) => e.type === "SHOT").length,
    saves: fixture.events.filter((e) => e.type === "SAVE").length,
  };
}

// ---- the state machine --------------------------------------------------
export const reporterPreflight = (s: ReporterState): ReporterState =>
  s.fixture.events.length > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "fixtureInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "fixtureInHand" }, "refused");

export const reporterBuild = (s: ReporterState): ReporterState => fsmBuild(s, REPORTER_BUILD_ENTRY, "model");

export const reporterPrecommit = (s: ReporterState, verdict: TraceVerdict): ReporterState =>
  fsmPrecommit(s, verdict, REPORTER_PRECOMMIT_PASS, REPORTER_PRECOMMIT_REFUSED);

export const reporterCommit = (s: ReporterState, answer: string): ReporterState =>
  fsmCommit({ ...s, answer }, answer, REPORTER_COMMIT_ENTRY);

export const reporterRefused = (s: ReporterState, answer: string): ReporterState =>
  fsmRefused({ ...s, answer }, answer, REPORTER_FOLD_ENTRY);
