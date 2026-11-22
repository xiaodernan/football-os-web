// M1177 · The traced FSM every question engine shares.
// One body, one module — both engines import from here, neither copies it.

export type Verdict = "pass" | "refused";

/** The studio-family FSM stages — spelled once, consumed by both engines as `StudioStage` / `ConsultStage`. */
export type FsmStage = "preflight" | "build" | "model" | "precommit" | "commit" | "refused" | "done";

/** The two verifier stages and their notes, shared by every two-step door (M1224/M1226). */
export type VerifierStage = "structure" | "numerals";
export type VerifierNote = "structurePassed" | "structureRefused" | "numeralsPassed" | "numeralsRefused";

export interface TraceEntry<E extends string, N extends string> {
  readonly stage: E;
  readonly verdict: Verdict;
  readonly note: N;
}

export interface TraceState<E extends string, N extends string> {
  readonly status: E;
  readonly trace: readonly TraceEntry<E, N>[];
  readonly answer: string;
}

export function step<S extends TraceState<any, any>>(s: S, entry: TraceEntry<any, any>, next: S["status"]): S {
  return {
    ...s,
    status: next,
    trace: [...s.trace, entry],
  };
}

export function fsmBuild<S extends TraceState<any, any>>(s: S, entry: TraceEntry<any, any>, next: S["status"]): S {
  return step(s, entry, next);
}

export function fsmCommit<S extends TraceState<any, any>>(s: S, answer: string, entry: TraceEntry<any, any>): S {
  return step({ ...s, answer }, entry, "commit" as unknown as S["status"]);
}

export function fsmRefused<S extends TraceState<any, any>>(s: S, answer: string, entry: TraceEntry<any, any>): S {
  return step({ ...s, answer }, entry, "refused" as unknown as S["status"]);
}

/** A refusal that must also fill the fold's own answer field. Three doors refuse with a
 *  deterministic fold of their own state — the broker's ruling, the chair's XI, the desk's
 *  prescription — and each wrote the same spread-and-fill by hand. The field is the door's own
 *  key, the folded value is the door's own door, and the body is written once here. */
export function fsmRefusedWith<S extends TraceState<any, any>, K extends keyof S>(
  s: S,
  answer: string,
  key: K,
  folded: S[K],
  entry: TraceEntry<any, any>,
): S {
  return fsmRefused({ ...s, [key]: folded }, answer, entry);
}

/** A door's preflight: the ONE measured fact it opens on, and the two entries it can record.
 *  The fact is a predicate over the door's own state, so the gate below reads it without every
 *  door spelling the same ternary. */
export interface PreflightEntry<S = any> {
  readonly open: (s: S) => boolean;
  readonly pass: TraceEntry<any, any>;
  readonly refused: TraceEntry<any, any>;
}

/** The preflight gate: a door whose answer depends on ONE measured fact. Every traced door spelled
 *  the same ternary — pass to build when the fact is in hand, refuse otherwise — with only the
 *  fact and the note's own word differing, so the body is written once here. */
export function fsmPreflightGate<S extends TraceState<any, any>>(s: S, entry: PreflightEntry<S>): S {
  return entry.open(s)
    ? step(s, entry.pass, "build" as unknown as S["status"])
    : step({ ...s }, entry.refused, "refused" as unknown as S["status"]);
}

/** The initial state every traced door opens at: its own fields, no trace, no answer, at the
 *  preflight. Six doors wrote the same four literals by hand; the opening is written once here. */
export function fsmOpen<S extends object>(fields: S): S & { readonly status: "preflight"; readonly trace: readonly never[]; readonly answer: "" } {
  return { ...fields, status: "preflight", trace: [], answer: "" };
}

export function fsmPrecommit<S extends TraceState<any, any>>(s: S, verdict: Verdict, entryPass: TraceEntry<any, any>, entryRefused: TraceEntry<any, any>): S {
  return verdict === "pass"
    ? step(s, entryPass, "commit" as unknown as S["status"])
    : step(s, entryRefused, "refused" as unknown as S["status"]);
}
