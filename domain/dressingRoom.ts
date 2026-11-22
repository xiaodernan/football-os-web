// M1242 · The Dressing Room — door 20, the one that briefs the next match. The Match Reporter
// wrote the game that was played; this one reads the OPPONENT's own demonstrated season and
// briefs the dressing room on it — their record, their form, their best player. Every numeral
// must come from the opponent's own record or the world book; a refusal walks to the fold's own
// deterministic briefing. The model may describe what the opponent has ALREADY done; it may not
// predict a result, and the verifier says so.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";
import { creditRecord, formLetter, recentResults, resultPoints, type SeasonRowFields } from "./attributes";
import { byKickoff } from "./analytics";
import type { Match, PlayerRef } from "./types";

export type DressingStage = FsmStage;
export type DressingNote = "opponentInHand" | "opponentSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface DressingTraceEntry {
  readonly stage: DressingStage;
  readonly verdict: TraceVerdict;
  readonly note: DressingNote;
}

/** The opponent's own demonstrated season — the briefing's entire evidence base. */
export interface OpponentRecord {
  readonly clubId: string;
  readonly clubName: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly gf: number;
  readonly ga: number;
  readonly points: number;
  /** The last five finished results, oldest first, as letters. */
  readonly form: readonly ("W" | "D" | "L")[];
  /** The opponent's best player by overall — the danger the briefing names. */
  readonly bestPlayer: string;
  readonly bestOverall: number;
}

export interface DressingState {
  readonly opponent: OpponentRecord;
  readonly locale: Locale;
  readonly status: DressingStage;
  readonly trace: readonly DressingTraceEntry[];
  readonly answer: string;
}

export const DRESSING_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "opponentSealed" } as const;
export const DRESSING_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const DRESSING_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const DRESSING_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const DRESSING_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

/** The briefing's own length budget, in characters. */
export const BRIEF_MAX_CHARS = 900;

const BRIEF_LINE = /^BRIEF:([A-Za-z0-9_-]+)\s*$/m;

/** The opponent's record, folded from the world's own finished fixtures. */
export function opponentRecord(
  clubId: string,
  clubName: string,
  matches: readonly Match[],
  players: readonly PlayerRef[],
): OpponentRecord | null {
  const finished = matches
    .filter((m) => m.status === "FINISHED" && (m.homeClubId === clubId || m.awayClubId === clubId))
    .sort(byKickoff);
  if (finished.length === 0) return null;
  const row: SeasonRowFields = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  const letters: ("W" | "D" | "L")[] = [];
  for (const m of finished) {
    const home = m.homeClubId === clubId;
    const ourGoals = home ? m.homeGoals! : m.awayGoals!;
    const oppGoals = home ? m.awayGoals! : m.homeGoals!;
    creditRecord(row, ourGoals, oppGoals);
    // The table's own arithmetic, read through the same door the ladder uses: a win is three,
    // a draw one — never a hand-spelled `points += 3` (the M420 dialect the gate charges).
    row.points += resultPoints(ourGoals, oppGoals);
    letters.push(formLetter(ourGoals, oppGoals));
  }
  const squad = players.filter((p) => p.clubId === clubId);
  const best = [...squad].sort((a, b) => b.overall - a.overall || a.id.localeCompare(b.id))[0];
  return {
    clubId,
    clubName,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    gf: row.gf,
    ga: row.ga,
    points: row.points,
    form: recentResults(letters),
    bestPlayer: best?.name ?? "",
    bestOverall: best?.overall ?? 0,
  };
}

export type DressingViolation = "noDirective" | "wrongOpponent" | "offRecord" | "tooLong" | "prediction";

/** Parse the briefing's directive line; it must name the very opponent on the desk. */
export function parseDressingBrief(text: string, opponent: OpponentRecord): { ok: boolean; violations: DressingViolation[] } {
  const m = BRIEF_LINE.exec(text);
  if (!m) return { ok: false, violations: ["noDirective"] };
  if (m[1] !== opponent.clubId) return { ok: false, violations: ["wrongOpponent"] };
  return { ok: true, violations: [] };
}

/** The numeral law over the prose: any figure must be the opponent's own record, the squad's
 *  overalls, or one the world book carries. */
export function verifyDressingText(text: string, opponent: OpponentRecord): DressingViolation[] {
  const out = new Set<DressingViolation>();
  const universe = new Set<string>();
  const add = (n: number) => { universe.add(String(n)); };
  add(opponent.played); add(opponent.won); add(opponent.drawn); add(opponent.lost);
  add(opponent.gf); add(opponent.ga); add(opponent.points); add(opponent.bestOverall);
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) add(base);
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (universe.has(raw) || universe.has(String(Math.round(n)))) continue;
    if (DEEP_DIGEST_NUMBERS.has(raw) || DEEP_DIGEST_NUMBERS.has(String(Math.round(n)))) continue;
    out.add("offRecord");
  }
  // The budget is real or it is not a budget.
  if (text.length > BRIEF_MAX_CHARS) out.add("tooLong");
  // A briefing describes what the opponent has done; a claim about the coming match is refused.
  if (/\b(will|won't|never will|by the time|years from now|mark my words|next match|they are going to)\b/i.test(text)) out.add("prediction");
  return [...out];
}

/** The fold's own briefing as DATA — the record, the form string, the danger. The domain writes
 *  no prose: the screen words this structure through the dictionary. */
export interface FoldBrief {
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly gf: number;
  readonly ga: number;
  readonly points: number;
  readonly form: string;
  readonly bestPlayer: string;
  readonly bestOverall: number;
}

export function foldBrief(o: OpponentRecord): FoldBrief {
  return {
    played: o.played, won: o.won, drawn: o.drawn, lost: o.lost,
    gf: o.gf, ga: o.ga, points: o.points,
    form: o.form.join(""),
    bestPlayer: o.bestPlayer, bestOverall: o.bestOverall,
  };
}

/** The door's own initial state — the opponent's record cloned in, so a caller can never swap
 *  the record from under the proof mid-run. */
export const createDressing = (opponent: OpponentRecord, locale: Locale): DressingState => ({
  opponent: { ...opponent, form: [...opponent.form] },
  locale, status: "preflight", trace: [], answer: "",
});

// ---- the state machine --------------------------------------------------
export const dressingPreflight = (s: DressingState): DressingState =>
  s.opponent.played > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "opponentInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "opponentInHand" }, "refused");

export const dressingBuild = (s: DressingState): DressingState => fsmBuild(s, DRESSING_BUILD_ENTRY, "model");

export const dressingPrecommit = (s: DressingState, verdict: TraceVerdict): DressingState =>
  fsmPrecommit(s, verdict, DRESSING_PRECOMMIT_PASS, DRESSING_PRECOMMIT_REFUSED);

export const dressingCommit = (s: DressingState, answer: string): DressingState =>
  fsmCommit({ ...s, answer }, answer, DRESSING_COMMIT_ENTRY);

export const dressingRefused = (s: DressingState, answer: string): DressingState =>
  fsmRefused({ ...s, answer }, answer, DRESSING_FOLD_ENTRY);
