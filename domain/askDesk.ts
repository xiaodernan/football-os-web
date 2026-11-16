// M1176 · The Ask-Desk StateGraph — the wire's question engine as an explicit,
// honest node machine. Six nodes, one refusal lane:
//   preflight → retrieve → build → model → precommit → commit
// Any failure collapses to the fold's own answer, and the screen says so.
// The model's words are re-proven against the committed fold BEFORE the reader
// sees them; a refusal never becomes a confident-looking paragraph in silence.
// This module carries NO user-facing prose — violations and notes are keyed codes
// the screen renders through i18n.
import type { LiveWirePayload } from "@/data/liveWire";
import type { WireAskId } from "./wireRag";
import { retrieveAsk } from "./wireRag";
import type { Locale } from "@/i18n/dictionaries";

export type AskStage = "preflight" | "retrieve" | "build" | "model" | "precommit" | "commit" | "refused" | "done";
export const ASK_STAGES: readonly AskStage[] = ["preflight", "retrieve", "build", "model", "precommit", "commit"];

export type TraceVerdict = "pass" | "refused";

export type AskNote =
  | "preflightOk"
  | "preflightMissing"
  | "retrievalOk"
  | "retrievalEmpty"
  | "buildOk"
  | "commitOk"
  | "precommitRefused"
  | "foldOk";

export interface AskTraceEntry {
  readonly stage: AskStage;
  readonly verdict: TraceVerdict;
  readonly note: AskNote;
}

export interface AskState {
  readonly payload: LiveWirePayload;
  readonly askId: WireAskId;
  readonly ask: string;
  readonly locale: Locale;
  readonly status: AskStage;
  readonly trace: readonly AskTraceEntry[];
  readonly answer: string;
}

export const createAskDesk = (
  payload: LiveWirePayload,
  askId: WireAskId,
  ask: string,
  locale: Locale,
): AskState => ({ payload, askId, ask, locale, status: "preflight", trace: [], answer: "" });

export type AskViolationCode =
  | "dateIso"
  | "dateMonthName"
  | "playedPair"
  | "scoreline"
  | "matchday"
  | "clubToken"
  | "figureNumber"
  | "ordinal";

const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};
const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
};
const MONTH_RE = new RegExp(`(\\d{1,2}) (${Object.keys(MONTHS).join("|")}) (\\d{4})`, "gi");
const ISO_RE = /\d{4}-\d{2}-\d{2}/g;
const SCORE_RE = /(\d+)\s*[-–—]\s*(\d+)/g;
const OF_RE = /(\d+)\s+of\s+(\d+)/g;
const MATCHDAY_RE = /matchday\s+(\d+)/gi;
const WINS_RE = /(\d+)\s+wins?\b/gi;
const POINTS_RE = /(\d+)\s+points?\b/gi;
const WORD_ORDINAL_RE = new RegExp(`(${Object.keys(ORDINALS).join("|")})`, "gi");
const SUFFIX_ORDINAL_RE = /(\d{1,2})(?:st|nd|rd|th)\b/gi;
const CLUB_TOKEN_RE = /\b[A-Z][A-Za-z&.'\- ]{3,}[A-Z][a-z]?/g;
const CLUB_MARKER_RE = /\b(FC|CF|SC|AC|AS|UD|CD|CS|AFC|VfL|VfB|SV|BSC|TSV|FSV|RB)\b/;

const iso = (d: string) => String(d).slice(0, 10);
const sortedFt = (a: number, b: number) => [a, b].slice().sort((x, y) => x - y).join(",");

interface Universe {
  readonly clubs: readonly string[];
  readonly positions: ReadonlyMap<string, number>;
  readonly wins: ReadonlyMap<string, number>;
  readonly points: ReadonlyMap<string, number>;
  readonly fixtureDates: ReadonlySet<string>;
  readonly scorelines: ReadonlySet<string>;
  readonly matchdays: ReadonlySet<number>;
  readonly playedTotalPairs: ReadonlySet<string>;
}

const buildUniverse = (payload: LiveWirePayload): Universe => {
  const clubs = new Set<string>();
  const positions = new Map<string, number>();
  const wins = new Map<string, number>();
  const points = new Map<string, number>();
  const fixtureDates = new Set<string>();
  const scorelines = new Set<string>();
  const matchdays = new Set<number>();
  const playedTotalPairs = new Set<string>();
  for (const l of payload.leagues) {
    playedTotalPairs.add(`${l.playedFixtures}/${l.totalFixtures}`);
    for (const r of l.table) {
      clubs.add(r.team);
      positions.set(r.team, r.pos);
      wins.set(r.team, r.won);
      points.set(r.team, r.pts);
    }
    for (const f of l.seasonFixtures ?? []) {
      clubs.add(f.home);
      clubs.add(f.away);
      fixtureDates.add(iso(f.date));
      if (Array.isArray(f.ft)) scorelines.add(sortedFt(f.ft[0], f.ft[1]));
      const md = Number(/(\d+)\s*$/.exec(String(f.round ?? ""))?.[1] ?? NaN);
      if (Number.isFinite(md)) matchdays.add(md);
    }
    for (const m of l.recent ?? []) { clubs.add(m.home); clubs.add(m.away); }
    for (const m of l.upcoming ?? []) { clubs.add(m.home); clubs.add(m.away); }
  }
  return { clubs: [...clubs], positions, wins, points, fixtureDates, scorelines, matchdays, playedTotalPairs };
};
const clubsMentioned = (text: string, universe: Universe): string[] =>
  universe.clubs.filter((c) => text.includes(c));

/** The imprisoned verifier: every checkable claim in the model's answer must trace to the fold. */
export function verifyAskText(text: string, payload: LiveWirePayload): AskViolationCode[] {
  const universe = buildUniverse(payload);
  const out = new Set<AskViolationCode>();

  for (const m of text.matchAll(ISO_RE)) {
    if (!universe.fixtureDates.has(m[0])) out.add("dateIso");
  }
  for (const m of text.matchAll(MONTH_RE)) {
    const d = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    const year = Number(m[3]);
    if (!month || !year) continue;
    const wanted = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!universe.fixtureDates.has(wanted)) out.add("dateMonthName");
  }
  for (const m of text.matchAll(OF_RE)) {
    if (!universe.playedTotalPairs.has(`${m[1]}/${m[2]}`)) out.add("playedPair");
  }
  for (const m of text.matchAll(SCORE_RE)) {
    if (!universe.scorelines.has(sortedFt(Number(m[1]), Number(m[2])))) out.add("scoreline");
  }
  for (const m of text.matchAll(MATCHDAY_RE)) {
    if (!universe.matchdays.has(Number(m[1]))) out.add("matchday");
  }
  for (const clause of text.split(/(?<=[.!?])\s+/)) {
    const names = clubsMentioned(clause, universe);
    for (const w of clause.matchAll(CLUB_TOKEN_RE)) {
      const token = w[0].trim();
      if (names.some((c) => c.includes(token))) continue;
      if (CLUB_MARKER_RE.test(token)) out.add("clubToken");
    }
  }
  for (const { re, violation, map } of [
    { re: WINS_RE, violation: "figureNumber" as AskViolationCode, map: universe.wins },
    { re: POINTS_RE, violation: "figureNumber" as AskViolationCode, map: universe.points },
  ]) {
    for (const m of text.matchAll(re)) {
      const n = Number(m[1]);
      const named = clubsMentioned(text.slice(0, m.index ?? 0), universe);
      if (named.some((c) => map.get(c) === n)) continue;
      if (named.length === 0 && [...map.values()].includes(n)) continue;
      out.add(violation);
    }
  }
  for (const re of [SUFFIX_ORDINAL_RE, WORD_ORDINAL_RE]) {
    for (const m of text.matchAll(re)) {
      const n = Number(m[1] ?? m[0]);
      if (!Number.isFinite(n)) continue;
      const named = clubsMentioned(text.slice(0, m.index ?? 0), universe);
      if (named.some((c) => universe.positions.get(c) === n)) continue;
      out.add("ordinal");
    }
  }
  return [...out];
}

// ---- the state machine --------------------------------------------------

const advance = (s: AskState, entry: AskTraceEntry, status: AskStage): AskState =>
  ({ ...s, status, trace: [...s.trace, entry] });

export const askPreflight = (s: AskState): AskState =>
  Array.isArray(s.payload?.leagues) && s.payload.leagues.length > 0
    ? advance(s, { stage: "preflight", verdict: "pass", note: "preflightOk" }, "retrieve")
    : advance({ ...s }, { stage: "preflight", verdict: "refused", note: "preflightMissing" }, "refused");

export const askRetrieve = (s: AskState): AskState => {
  try {
    const lane = retrieveAsk(s.payload, s.askId) as { leagues?: unknown[] };
    return lane && Array.isArray(lane.leagues) && lane.leagues.length > 0
      ? advance(s, { stage: "retrieve", verdict: "pass", note: "retrievalOk" }, "build")
      : advance({ ...s }, { stage: "retrieve", verdict: "refused", note: "retrievalEmpty" }, "refused");
  } catch {
    return advance({ ...s }, { stage: "retrieve", verdict: "refused", note: "retrievalEmpty" }, "refused");
  }
};

export const askBuild = (s: AskState): AskState =>
  advance(s, { stage: "build", verdict: "pass", note: "buildOk" }, "model");

export const askPrecommit = (s: AskState, verdict: TraceVerdict): AskState =>
  verdict === "pass"
    ? advance(s, { stage: "precommit", verdict: "pass", note: "commitOk" }, "commit")
    : advance({ ...s }, { stage: "precommit", verdict: "refused", note: "precommitRefused" }, "refused");

export const askCommit = (s: AskState, answer: string): AskState =>
  advance({ ...s, answer }, { stage: "commit", verdict: "pass", note: "commitOk" }, "done");

export const askRefused = (s: AskState, answer: string): AskState =>
  advance({ ...s, answer }, { stage: "refused", verdict: "refused", note: "foldOk" }, "done");
