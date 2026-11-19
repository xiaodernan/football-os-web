// M1199 · The Frozen Dispatch — the frozen century's own wire desk.
// The seeded world has a league for every era, every fold straight out of the seed:
// this desk lets one imprisoned model write the bulletin, but ONLY as a witness to the
// numbers already on the table. Every numeral it writes must sit in the envelope the
// reader can see; a single free digit belongs to no food except nothing.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { footballProvider } from "@/data/footballService";
import { customPointsTable, STANDARD_RULES } from "@/domain/league";

import { verifyNumbersAgainst, type WorldViolation } from "@/domain/worldLibrarian";

export type FrozenAskId = "summit" | "chase" | "runIn";
export const FROZEN_ASKS = ["summit", "chase", "runIn"] as const;

export type DispatchStage = FsmStage;
export type DispatchNote = "shelvesInHand" | "envelopeSealed" | "commitOk" | "foldOk" | "precommitRefused";
export type DispatchViolation = WorldViolation;

export const DISPATCH_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "envelopeSealed" } as const;
export const DISPATCH_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const DISPATCH_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const DISPATCH_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const DISPATCH_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export interface DispatchTraceEntry {
  readonly stage: DispatchStage;
  readonly verdict: TraceVerdict;
  readonly note: DispatchNote;
}

export interface DispatchState {
  readonly askId: FrozenAskId;
  readonly locale: Locale;
  readonly envelope: object;
  readonly status: DispatchStage;
  readonly trace: readonly DispatchTraceEntry[];
  readonly answer: string;
}

export interface DispatchEnvelopeCompetition {
  readonly name: string;
  readonly clubs: number;
  readonly played: number;
  readonly summit: readonly (readonly [number, string, number, number, number, number, number])[];
  readonly bottom: readonly [number, string, number, number];
  readonly runs: readonly (readonly [number, string, number, string])[];
}

/** The one read-through of the seeded fold — identical to the library corpus' own math. */
export function frozenFolds(provider = footballProvider): DispatchEnvelopeCompetition[] {
  const clubs = provider.clubs();
  const matches = provider.matches();
  const byClub = new Map(clubs.map((c) => [c.id, c] as const));
  const out: DispatchEnvelopeCompetition[] = [];
  for (const comp of provider.competitions()) {
    const table = customPointsTable(comp.id, matches, clubs, STANDARD_RULES);
    const rows = [...table.rows].sort((a, b) => a.standardPosition - b.standardPosition);
    if (rows.length === 0) continue;
    const played = rows[0].played;
    const lead = rows.slice(0, 3).map((r) => {
      const club = byClub.get(r.clubId);
      return [r.standardPosition, club?.name ?? r.clubId, r.standardPoints, r.played, r.gf, r.ga, r.gf - r.ga] as const;
    });
    const last = rows[rows.length - 1];
    const tail: readonly [number, string, number, number] = [
      last.standardPosition,
      byClub.get(last.clubId)?.name ?? last.clubId,
      last.standardPoints,
      last.played,
    ];
    const runs = rows.slice(0, 2).map((r) => {
      // the last five — the seed's own letters, newest at the front.
      const form = [...matches]
        .filter((m) => m.competitionId === comp.id && m.status === "FINISHED"
          && (m.homeClubId === r.clubId || m.awayClubId === r.clubId))
        .sort((a, b) => String(b.kickoff).localeCompare(String(a.kickoff)))
        .slice(0, 5)
        .map((m) => {
          if (m.homeGoals === null || m.awayGoals === null) return "D";
          const mine = m.homeClubId === r.clubId ? Number(m.homeGoals) : Number(m.awayGoals);
          const theirs = m.homeClubId === r.clubId ? Number(m.awayGoals) : Number(m.homeGoals);
          if (mine > theirs) return "W";
          if (mine < theirs) return "L";
          return "D";
        })
        .join("");
      return [r.standardPosition, byClub.get(r.clubId)?.name ?? r.clubId, r.standardPoints, form] as const;
    });
    out.push({
      name: comp.name,
      clubs: rows.length,
      played,
      summit: lead,
      bottom: tail,
      runs,
    });
  }
  return out;
}

export function retrieveFrozen(askId: FrozenAskId, folds: readonly DispatchEnvelopeCompetition[]): object {
  if (askId === "summit") {
    return {
      ask: "summit",
      competitions: folds.map((c) => ({ name: c.name, clubs: c.clubs, played: c.played, summit: c.summit, bottom: c.bottom })),
    };
  }
  if (askId === "chase") {
    return {
      ask: "chase",
      competitions: folds.map((c) => ({
        name: c.name,
        clubs: c.clubs,
        summit: c.summit.slice(0, 2),
        gap: Math.abs((c.summit[0]?.[2] ?? 0) - (c.summit[1]?.[2] ?? 0)),
      })),
    };
  }
  return {
    ask: "runIn",
    competitions: folds.map((c) => ({ name: c.name, played: c.played, runs: c.runs })),
  };
}

/** The dispatch skips a new verifier and rides the one law — verifyNumbersAgainst, shared with the World Desk. */
export const verifyFrozenText = (text: string, envelope: object): DispatchViolation[] =>
  verifyNumbersAgainst(text, JSON.stringify(envelope));

export const createFrozenDispatch = (askId: FrozenAskId, locale: Locale): DispatchState => ({
  askId,
  locale,
  envelope: retrieveFrozen(askId, frozenFolds()),
  status: "preflight",
  trace: [],
  answer: "",
});

// ---- the state machine ---------------------------------------------------------
export const dispatchPreflight = (s: DispatchState): DispatchState =>
  step(s, { stage: "preflight", verdict: "pass", note: "shelvesInHand" }, "build");

export const dispatchBuild = (s: DispatchState): DispatchState =>
  fsmBuild(s, DISPATCH_BUILD_ENTRY, "model");

export const dispatchPrecommit = (s: DispatchState, verdict: TraceVerdict): DispatchState =>
  fsmPrecommit(s, verdict, DISPATCH_PRECOMMIT_PASS, DISPATCH_PRECOMMIT_REFUSED);

export const dispatchCommit = (s: DispatchState, answer: string): DispatchState =>
  fsmCommit({ ...s, answer }, answer, DISPATCH_COMMIT_ENTRY);

export const dispatchRefused = (s: DispatchState, answer: string): DispatchState =>
  fsmRefused({ ...s, answer }, answer, DISPATCH_FOLD_ENTRY);
