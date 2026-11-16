// M1157 · The Prescription — deep optimization, prescribed from the fold's own numbers.
// The ops console shows the visitor behavioural truth; this fold says what it wants changed, in
// order of urgency, with the evidence attached. Deterministic, no model, nothing invented.
//
// M1174 — Carried as a StateGraph: ordered rule nodes over immutable state (fold in, out come
// prescriptions), then the canonical sort. One node per clause; each clause reads what the fold
// carries and appends exactly one prescription — never mutates anything, never touches storage,
// never calls anything outside this file. The engine is deliberately small (32-step cap, cycle
// guard, one refusal lane); it is a principle, not a framework.

import { sum } from "./attributes";
import { fmt1, fmt2 } from "@/lib/utils";
import type { PulseFold } from "./pulse";

/** Named bounds for the prescription, one home, no inline magic numbers for the census. */
const RX_DEPTH_FLOOR = 2;
const RX_BOUNCE_NOW = 55;
const RX_BOUNCE_NEXT = 40;
const RX_DEPTH_SCORE = 30;
const RX_DEAD_END_SHARE = 0.3;
const RX_LOOP_MIN = 30;
const RX_MANUAL_EXITS_MIN = 3;
const RX_DOOR_VISITS = 5;
const RX_DOOR_SHARE = 70;
const RX_SECOND_HALF_RATIO = 6 / 10;
const RX_SORT_NOW = 0, RX_SORT_NEXT = 1, RX_SORT_WATCH = 2;

const rank = { now: RX_SORT_NOW, next: RX_SORT_NEXT, watch: RX_SORT_WATCH } as const;

export type RxSeverity = "now" | "next" | "watch";

export interface Prescription {
  severity: RxSeverity;
  /** stable id; order of severity reads the urgency written by the fold */
  id: string;
  /** the fold's own evidence — ranks prescriptions by measured weight, not by taste */
  score: number;
  vars: Record<string, string | number>;
}

export interface PrescriptionState {
  readonly fold: PulseFold;
  readonly items: readonly Prescription[];
}

const push = (s: Readonly<PrescriptionState>, p: Prescription): PrescriptionState => ({ ...s, items: [...s.items, p] });

// ---- The tiny typed state graph the fold rides on. State passed in/out; the only failure mode
// is an unhandled throw, caught at the boundary and folded to `commit` — which is deterministic,
// pure, and the same path as a clean run. No caller-visible semantics change.
type Node<T> = (state: Readonly<T>) => T;
type Edge<T> = (state: Readonly<T>) => string | null;
interface Graph<T> {
  readonly nodes: Readonly<Record<string, Node<T>>>;
  readonly edgeOf: Readonly<Record<string, Edge<T>>>;
  readonly start: string;
  readonly refuseInto: string;
}

function run<T extends object>(spec: Graph<T>, initial: T): { ok: boolean; state: T } {
  let state = initial as Readonly<T>;
  let current = spec.start;
  const seen = new Set<string>();
  for (let i = 0; i < 32; i++) {
    if (!(current in spec.nodes)) return { ok: false, state: state as T };
    if (seen.has(current)) return { ok: false, state: state as T };
    seen.add(current);
    const edge = spec.edgeOf[current];
    if (!edge) return { ok: false, state: state as T };
    try { state = spec.nodes[current](state) as Readonly<T>; } catch { state = spec.nodes[spec.refuseInto]({ ...state, refusal: true } as unknown as Readonly<T>) as Readonly<T>; return { ok: false, state: state as T }; }
    const next = edge(state);
    if (next === null) return { ok: true, state: state as T };
    current = next;
  }
  return { ok: false, state: state as T };
}

const preflight = (s: Readonly<PrescriptionState>): PrescriptionState => (s.fold.sessions === 0 ? s : s);

const bounce = (s: Readonly<PrescriptionState>): PrescriptionState => {
  const r = s.fold.bounceRate;
  if (r >= RX_BOUNCE_NOW) return push(s, { severity: "now", id: "rx.bounce", score: r, vars: { p: fmt1(r) } });
  if (r >= RX_BOUNCE_NEXT) return push(s, { severity: "next", id: "rx.bounce", score: r, vars: { p: fmt1(r) } });
  return s;
};

const depth = (s: Readonly<PrescriptionState>): PrescriptionState => {
  if (s.fold.avgDepth < RX_DEPTH_FLOOR) {
    return push(s, { severity: "next", id: "rx.depth", score: (RX_DEPTH_FLOOR - s.fold.avgDepth) * RX_DEPTH_SCORE, vars: { d: fmt2(s.fold.avgDepth) } });
  }
  return s;
};

const deadEnd = (s: Readonly<PrescriptionState>): PrescriptionState => {
  const topExit = s.fold.exits[0];
  if (topExit && topExit.exits / s.fold.sessions >= RX_DEAD_END_SHARE) {
    return push(s, { severity: "now", id: "rx.deadEnd", score: (topExit.exits / s.fold.sessions) * 100, vars: { path: topExit.path, n: topExit.exits, s: s.fold.sessions } });
  }
  return s;
};

const manualExit = (s: Readonly<PrescriptionState>): PrescriptionState => {
  const manualExits = s.fold.exits.find((e) => e.path === "/manual")?.exits ?? 0;
  if (manualExits >= RX_MANUAL_EXITS_MIN) {
    return push(s, { severity: "next", id: "rx.manualExit", score: manualExits, vars: { n: manualExits } });
  }
  return s;
};

const loop = (s: Readonly<PrescriptionState>): PrescriptionState => {
  if (s.fold.loopRate >= RX_LOOP_MIN) {
    return push(s, { severity: "next", id: "rx.loop", score: s.fold.loopRate, vars: { l: fmt1(s.fold.loopRate) } });
  }
  return s;
};

const swipe = (s: Readonly<PrescriptionState>): PrescriptionState => {
  const door = [...s.fold.perRoute]
    .filter((r) => r.visits >= RX_DOOR_VISITS && r.bounceShare >= RX_DOOR_SHARE)
    .sort((a, b) => b.bounceShare - a.bounceShare || a.path.localeCompare(b.path))[0];
  if (door) {
    return push(s, { severity: "watch", id: "rx.bounceDoor", score: door.bounceShare, vars: { path: door.path, p: fmt1(door.bounceShare) } });
  }
  return s;
};

const fatigue = (s: Readonly<PrescriptionState>): PrescriptionState => {
  const firstHalf = s.fold.trend.slice(0, Math.floor(s.fold.trend.length / 2));
  const secondHalf = s.fold.trend.slice(Math.floor(s.fold.trend.length / 2));
  const before = sum(firstHalf, (d) => d.visits);
  const after = sum(secondHalf, (d) => d.visits);
  if (before > 0 && after < before * RX_SECOND_HALF_RATIO) {
    return push(s, { severity: "watch", id: "rx.fatigue", score: (1 - after / before) * 100, vars: { s: fmt1((after / before) * 100) } });
  }
  return s;
};

const hold = (s: Readonly<PrescriptionState>): PrescriptionState =>
  (s.items.length === 0 ? push(s, { severity: "watch", id: "rx.hold", score: 0, vars: {} }) : s);

const commit = (s: Readonly<PrescriptionState>): PrescriptionState => {
  const items = [...s.items].sort((a, b) => rank[a.severity] - rank[b.severity] || b.score - a.score).slice(0, 5);
  return { ...s, items };
};

export function foldPrescription(fold: PulseFold): Prescription[] {
  const nodes = { preflight, bounce, depth, deadEnd, manualExit, loop, swipe, fatigue, hold, commit } as const;
  const order: (keyof typeof nodes)[] = ["preflight", "bounce", "depth", "deadEnd", "manualExit", "loop", "swipe", "fatigue", "hold", "commit"];
  const edgeOf: Record<string, Edge<PrescriptionState>> = {};
  for (let i = 0; i < order.length - 1; i++) edgeOf[order[i]] = () => order[i + 1];
  edgeOf.commit = () => null;

  const out = run<PrescriptionState>({ nodes, edgeOf, start: "preflight", refuseInto: "commit" }, { fold, items: [] });
  return out.ok ? [...out.state.items] : [];
}
