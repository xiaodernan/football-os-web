// M1157 · The Prescription — deep optimization, prescribed from the fold's own numbers.
// The ops console shows the visitor behavioural truth; this fold says what it wants changed, in
// order of urgency, with the evidence attached. Deterministic, no model, nothing invented.

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


/**
 * The one prescription fold. Called on the same PulseFold the console renders, so every clause
 * the prescription prints is checkable against the panel two rooms above it.
 */
export function foldPrescription(fold: PulseFold): Prescription[] {
  const out: Prescription[] = [];
  const s = fold.sessions;
  if (s === 0) return out;

  // 1 · the front door quivers — bounce share as percentage of sessions
  if (fold.bounceRate >= RX_BOUNCE_NOW) {
    out.push({ severity: "now", id: "rx.bounce", score: fold.bounceRate, vars: { p: fmt1(fold.bounceRate) } });
  } else if (fold.bounceRate >= RX_BOUNCE_NEXT) {
    out.push({ severity: "next", id: "rx.bounce", score: fold.bounceRate, vars: { p: fmt1(fold.bounceRate) } });
  }

  // 2 · the world fails its first three screens
  if (fold.avgDepth < RX_DEPTH_FLOOR) {
    out.push({ severity: "next", id: "rx.depth", score: (RX_DEPTH_FLOOR - fold.avgDepth) * RX_DEPTH_SCORE, vars: { d: fmt2(fold.avgDepth) } });
  }

  // 3 · the heaviest dead-end — name it and count it
  const topExit = fold.exits[0];
  if (topExit && topExit.exits / s >= RX_DEAD_END_SHARE) {
    out.push({ severity: "now", id: "rx.deadEnd", score: (topExit.exits / s) * 100, vars: { path: topExit.path, n: topExit.exits, s } });
  }

  // 4 · the manual exits — the world owes onboarding pressure
  const manualExits = fold.exits.find((e) => e.path === "/manual")?.exits ?? 0;
  if (manualExits >= RX_MANUAL_EXITS_MIN) {
    out.push({ severity: "next", id: "rx.manualExit", score: manualExits, vars: { n: manualExits } });
  }

  // 5 · the session runs in a loop
  if (fold.loopRate >= RX_LOOP_MIN) {
    out.push({ severity: "next", id: "rx.loop", score: fold.loopRate, vars: { l: fmt1(fold.loopRate) } });
  }

  // 6 · the door that swallows — a route whose bounce share is beyond saving stands named
  const door = [...fold.perRoute]
    .filter((r) => r.visits >= RX_DOOR_VISITS && r.bounceShare >= RX_DOOR_SHARE)
    .sort((a, b) => b.bounceShare - a.bounceShare || a.path.localeCompare(b.path))[0];
  if (door) {
    out.push({ severity: "watch", id: "rx.bounceDoor", score: door.bounceShare, vars: { path: door.path, p: fmt1(door.bounceShare) } });
  }

  // 7 · the rhythm falls into the second half
  const firstHalf = fold.trend.slice(0, Math.floor(fold.trend.length / 2));
  const secondHalf = fold.trend.slice(Math.floor(fold.trend.length / 2));
  const before = sum(firstHalf, (d) => d.visits);
  const after = sum(secondHalf, (d) => d.visits);
  if (before > 0 && after < before * RX_SECOND_HALF_RATIO) {
    out.push({ severity: "watch", id: "rx.fatigue", score: (1 - after / before) * 100, vars: { s: fmt1((after / before) * 100) } });
  }

  if (out.length === 0) {
    out.push({ severity: "watch", id: "rx.hold", score: 0, vars: {} });
  }

  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.score - a.score).slice(0, 5);
}
