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

// The app's percent-label door: a 0..1 fraction rendered as an integer followed by a literal `%`.
// Two screens each carried a byte-identical local `const pct = (v) => \`${Math.round(v * 100)}%\``
// (ManagerOS's odds panel and SimulationLab's fatigue slider), and five more stitched the same
// `Math.round(x * 100)}%` shape inline in JSX (FilmRoom confidence, FootballWorld credibility ×2,
// ManagerOS fatigue ×2, Profile progress, TransferCentre credibility). Identical today, so no
// figure a reader sees moves — but a label convention spelled seven ways that part company the
// moment one gains a locale separator or a decimal. NOTE this door is NOT the domain `pct` above:
// that one returns the bare integer for an i18n var, while this one appends the `%` for a JSX
// text node; a caller that swapped them would double the percent sign or lose it.
export const pctLabel = (ratio: number): string => `${Math.round(ratio * 100)}%`;

// The app's share-of-a-max door for CSS lengths: a progress bar's fill, a marker's left offset or a
// column's height whose size is one value expressed as a percentage of a maximum. Five render sites
// across the development, player and review screens each spelled the same value-divided-by-max times
// a hundred followed by a literal percent sign inside a style template string — three different
// properties (width, left, height) but one fraction-of-a-scale computation. Identical today, so no
// bar resizes, but a convention spelled five ways that drifts the moment the scale changes. NOTE this
// is NOT the pctLabel above: pctLabel ROUNDS its ratio to an integer for a text node and treats the
// input as a 0..1 fraction, while this keeps the raw fractional precision a style needs and takes a
// value plus a separate max. It is also NOT the clamp-guarded fills (Math.max(2, …), Math.min(100, …))
// some screens use to guarantee a visible sliver — those wrap a bound this door does not express, so
// the census charges only the bare value-over-max-percent shape and leaves every guarded sibling inline.
export const pctOf = (value: number, max: number): string => `${(value / max) * 100}%`;

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

// The app's parse-a-timestamp door: an ISO-ish string to epoch milliseconds, with a missing or
// unparseable string floored to 0. domain/footprint, domain/history and the Profile record each
// spelled this as a private `ts` helper (identical modulo history's shorter signature — its single
// call passes a defined `.at`, and `!""`/`!undefined` return the same 0 the raw `new Date` NaN floor
// would). Nothing a reader sees moves. NOTE this door is NOT the bare inline `new Date(x).getTime()`
// it replaces inside a comparator: a bare parse yields NaN for a bad string, so a list sorted by it
// keeps that pair in place, whereas this door's 0 floor would yank the bad entry to one end and
// reorder it. That ordering-visible difference is why the ~dozen inline comparator parses stay inline.
export const epochMs = (iso?: string): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// The app's one "how many milliseconds is a day" figure. domain/load named it `const DAY = 86400000`,
// domain/review and the Review page's points window multiplied a raw `* 86400000`, the History page
// subtracted a bare `- 86400000` for yesterday, and i18n/format divided a `86_400_000` — four
// spellings of one number, two of them already differing by the underscore separator, each a missing
// or doubled zero away from a wrong window. This door shares only the NUMBER; it is deliberately NOT
// a `daysBefore`/`daysBetween` function, because the three arithmetic shapes around it are genuinely
// different computations that must not be merged: load/review take `nowMs - days * DAY_MS` (a UTC
// elapsed-block window), format.ts differences two LOCAL midnights and divides by DAY_MS (DST-aware,
// 23/25h days round to the calendar day), and HistoryPage subtracts one DAY_MS from a fixed instant
// to label yesterday. A future "just use one helper" that folds the divide into the multiply would
// re-introduce M216's bug — an elapsed-block count that reads tomorrow as today.
export const DAY_MS = 86400000;

// The app's two-decimal display-string door. Seventy-seven sites spelled `.toFixed(2)` inline —
// monospace cells, i18n vars, template segments and Fact values across twenty-two files — one
// display convention that parts company the moment a single site gains a locale separator or a
// third decimal. Identical today, so no figure a reader sees moves. NOTE this door is NOT the
// round2 above: round2 returns a NUMBER re-rounded for arithmetic or storage, while fmt2 returns
// the fixed-point STRING a reader is shown — and the two even disagree on where a value lands
// (fmt2(2.675) is "2.67" off the binary value, round2(2.675) is 2.68 off a multiplied Math.round),
// so a swap moves figures, not just types; `+fmt2(x)` is exactly the `+x.toFixed(2)` the unary-plus
// sites already spelled and stays where a number is wanted. Four families remain inline on purpose
// and the census in proof-fmt2 counts exactly them: `x?.toFixed(2)` optional cells keep their
// undefined short-circuit before a `?? "—"` fallback (five), a receiver behind `?.` short-circuits
// the whole call to undefined and fmt2(undefined) would throw (Data Room league average), the two
// `parseFloat((…).toFixed(2))` seeds round back to a number, and the two padded sign cells —
// career form and FilmRoom scan trend — glue a `+` in front of a fixed-width string in the exact
// form proof-signed pins by its literal.
export const fmt2 = (v: number): string => v.toFixed(2);

// The division door: a quotient whose denominator is floored at 1. Five quotients across four files
// hand-stitched `a / Math.max(1, b)` because the count under them can arrive empty — an empty
// position ring, a row not yet played, a filtered squad — and a bare `/0` is Infinity or NaN where
// every caller wants a number. The body IS the old shape, so no quotient moves. NOTE the floor is 1,
// not epsilon: safeDiv(10, 0.5) is 10 where a divide-by-nonzero guard would give 20 — this door
// guards integer COUNTS by contract and does not honor fractional denominators. Three sibling
// `Math.max(1, …)` floors stay hand-stitched and proof-div-guard charges exactly them: a count floor
// that also guards a modulo (career's round-robin index), a computed season floor that feeds only
// subtraction and comparison, and a floor AFTER a divide (the player card node level) whose rounding
// order is a different measurement.
export const safeDiv = (num: number, den: number): number => num / Math.max(1, den);
