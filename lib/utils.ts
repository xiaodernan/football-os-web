import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// The app's one numeric clamp. domain/careerArc, transfers, worldEngine, projection and training
// each carried their own byte-identical `Math.max(lo, Math.min(hi, v))`; identical today, but five
// definitions that drift the moment one gains a NaN guard. Callers pass (value, low, high).
export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Index a list of entities by their `id`. Eleven places in this app built the same
 *  `new Map(list.map((x) => [x.id, x]))`, and the two that matter most are the weekly review's
 *  record lookup and the Learn Hub's — the domain and a page, each with its own copy of one
 *  lookup, which is the seam M332-M340 charged six times. */
export function indexById<T extends { id: string }>(list: readonly T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}

// The app's shared round-to-three helper. domain/analytics and domain/matchProbability each carried
// a byte-identical private helper of this shape — the figures behind the Data Room's Poisson
// forecast and the Simulation Lab / Manager match outlook. Identical today, so nothing a reader
// sees changes, but two formulas that part company the moment one is re-rounded. This sits in
// lib/utils and not beside round1 in domain/scouting because scouting reaches analytics through
// data/footballService — analytics importing from scouting would close a cycle, so a rounder shared
// by its consumers must live in this dependency-free module.
export const round3 = (v: number): number => Math.round(v * 1000) / 1000;

// The app's shared round-to-two helper. domain/analytics (the Data Room's λ pair and
// attack/defence ratings), domain/filmInsights (per-minute action and scan rates),
// domain/load (ACWR and monotony) and the news seed's credibility field each carried a
// byte-identical private form of this shape. Identical today, so no stored figure moves,
// but four formulas that part company the moment one is re-rounded. Same dependency-free
// home as round3, for the same cycle reason: analytics is reached from scouting through
// data/footballService, so a rounder it shares must not live in scouting.
export const round2 = (v: number): number => Math.round(v * 100) / 100;

// The app's shared ratio-to-whole-percent helper. A credibility, a readiness, a goal's progress or
// a lesson completion rate is stored as a 0..1 fraction, and the integer figure a reader is shown is
// `Math.round(fraction * 100)`. Seven domain sites each spelled that inline. NOTE this is NOT the
// round2 above: round2 keeps two decimals (`... / 100`) for a stored rating, while pct drops the
// fraction entirely for a displayed percentage — the same `Math.round(… * 100)` prefix hides a
// different denominator, so the census that charges these sites must exclude the `/ 100` form.
export const pct = (ratio: number): number => Math.round(ratio * 100);

// The app's signed-display door. A rising rating, a scan trend or a goal difference earns a literal
// `+` prefix when the figure is non-negative and a plain number when it is negative. domain/review
// spelled this as a private `signed` helper (3 call sites); film Insights, the Manager record and
// the ManagerOS delta each stitched the same sign-or-nothing ternary inline. Identical today, so
// nothing a reader sees moves — but a sign convention spelled four ways that part company the moment
// one gains a locale or a zero-width space. NOTE this door takes the RAW number and coerces it, so
// it is NOT the sibling that signs a PRE-FORMATTED fixed-width figure (a `+` glued in front of a
// two-decimal string): that one keeps padding a caller here would drop, so FilmRoom's trend cell and
// the Manager career's form stay on the padded form and the DynamicWorld delta stays sign-driven by a
// boolean — neither is this door's shape.
export const signed = (n: number): string => (n >= 0 ? "+" + n : String(n));
