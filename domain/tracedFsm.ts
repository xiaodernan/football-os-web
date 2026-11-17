// M1177 · The traced FSM every question engine shares.
// One body, one module — both engines import from here, neither copies it.

export type Verdict = "pass" | "refused";

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

export function fsmPrecommit<S extends TraceState<any, any>>(s: S, verdict: Verdict, entryPass: TraceEntry<any, any>, entryRefused: TraceEntry<any, any>): S {
  return verdict === "pass"
    ? step(s, entryPass, "commit" as unknown as S["status"])
    : step(s, entryRefused, "refused" as unknown as S["status"]);
}
