import type { AttributeDef, Attributes, PositionCode, PositionGroup } from "./types";
import { ATTRIBUTE_LABELS, POSITION_GROUP_LABELS, CATEGORY_LABELS, POSITION_BY_GROUP_LABELS } from "../data/attributesLabels";
import { clamp, epochMs } from "@/lib/utils";

const L = (key: string) => ATTRIBUTE_LABELS[key] ?? key;
const PG = (id: PositionGroup) => POSITION_GROUP_LABELS[id];

// The multi-layer capability model (not a copy of any game's numbers).
export const ATTRIBUTE_DEFS: AttributeDef[] = [
  // Technical
  { key: "ball_control", label: L("ball_control"), category: "technical" },
  { key: "first_touch", label: L("first_touch"), category: "technical" },
  { key: "passing", label: L("passing"), category: "technical" },
  { key: "long_passing", label: L("long_passing"), category: "technical" },
  { key: "shooting", label: L("shooting"), category: "technical" },
  { key: "finishing", label: L("finishing"), category: "technical" },
  { key: "crossing", label: L("crossing"), category: "technical" },
  { key: "dribbling", label: L("dribbling"), category: "technical" },
  { key: "weak_foot", label: L("weak_foot"), category: "technical" },
  { key: "set_pieces", label: L("set_pieces"), category: "technical" },
  // Physical
  { key: "acceleration", label: L("acceleration"), category: "physical" },
  { key: "sprint", label: L("sprint"), category: "physical" },
  { key: "agility", label: L("agility"), category: "physical" },
  { key: "balance", label: L("balance"), category: "physical" },
  { key: "strength", label: L("strength"), category: "physical" },
  { key: "stamina", label: L("stamina"), category: "physical" },
  { key: "explosiveness", label: L("explosiveness"), category: "physical" },
  { key: "mobility", label: L("mobility"), category: "physical" },
  // Tactical
  { key: "scanning", label: L("scanning"), category: "tactical" },
  { key: "positioning", label: L("positioning"), category: "tactical" },
  { key: "decision_making", label: L("decision_making"), category: "tactical" },
  { key: "space_awareness", label: L("space_awareness"), category: "tactical" },
  { key: "press_resistance", label: L("press_resistance"), category: "tactical" },
  { key: "off_ball_movement", label: L("off_ball_movement"), category: "tactical" },
  { key: "defensive_awareness", label: L("defensive_awareness"), category: "tactical" },
  { key: "transition_awareness", label: L("transition_awareness"), category: "tactical" },
  // Mental
  { key: "composure", label: L("composure"), category: "mental" },
  { key: "concentration", label: L("concentration"), category: "mental" },
  { key: "discipline", label: L("discipline"), category: "mental" },
  { key: "confidence", label: L("confidence"), category: "mental" },
  { key: "game_intelligence", label: L("game_intelligence"), category: "mental" },
  { key: "consistency", label: L("consistency"), category: "mental" },
];

export const ATTRIBUTE_KEYS = ATTRIBUTE_DEFS.map((d) => d.key);

export const CATEGORY_ORDER = ["technical", "physical", "tactical", "mental"] as const;

export function attributesByCategory(category: AttributeDef["category"]): AttributeDef[] {
  return ATTRIBUTE_DEFS.filter((a) => a.category === category);
}

// The English names used to *compose domain prose* (coach answers, scout
// headlines, review reasons). They are not display labels: a UI slot reads
// `attr.name.*` / `attr.*` from the dictionary instead, so a row handed to the
// interface carries a key and cannot smuggle an untranslated noun onto a screen.
/** Every attribute category, in table order. `attr.*` holds the display words; a row
 *  names a category by one of these codes. CATEGORY_LABEL below is the English
 *  fallback for prose-layer callers only — the i18n gate audits that the two agree. */
export const CATEGORIES: readonly AttributeDef["category"][] = [
  ...new Set(ATTRIBUTE_DEFS.map((d) => d.category)),
];

export const CATEGORY_LABEL: Record<AttributeDef["category"], string> = CATEGORY_LABELS;

export interface CategoryAverage {
  category: AttributeDef["category"];
  value: number;
}

/** Mean attribute value per category — the shape used by radar charts and by
 *  head-to-head comparisons, so both read the same numbers. */
export function categoryAverages(attrs: Attributes): CategoryAverage[] {
  return CATEGORY_ORDER.map((category) => {
    const defs = attributesByCategory(category);
    const value = Math.round(sum(defs, (d) => attrs[d.key] ?? 0) / (defs.length || 1));
    return { category, value };
  });
}

export function attributeLabel(key: string): string {
  return ATTRIBUTE_DEFS.find((a) => a.key === key)?.label ?? key;
}

// Position baselines: center of the distribution per group. Amateurs are lower.
type Baseline = Partial<Record<string, number>> & { _base: number };

const GROUP_BASELINE: Record<PositionGroup, Baseline> = {
  GK: { _base: 52, positioning: 68, concentration: 68, composure: 62, decision_making: 60, strength: 55, mobility: 60, defensive_awareness: 66, first_touch: 50, ball_control: 48 },
  CB: { _base: 52, positioning: 66, defensive_awareness: 68, strength: 64, concentration: 66, composure: 58, passing: 55, decision_making: 58, off_ball_movement: 40 },
  FB: { _base: 52, sprint: 66, stamina: 66, crossing: 62, acceleration: 64, positioning: 58, defensive_awareness: 58, ball_control: 56, off_ball_movement: 58, transition_awareness: 60 },
  DM: { _base: 52, positioning: 62, defensive_awareness: 64, passing: 62, decision_making: 62, scanning: 60, strength: 58, concentration: 62, press_resistance: 58, transition_awareness: 60 },
  CM: { _base: 52, passing: 64, first_touch: 62, scanning: 62, decision_making: 62, ball_control: 60, space_awareness: 58, press_resistance: 58, stamina: 58, composure: 58 },
  AM: { _base: 52, ball_control: 62, first_touch: 62, dribbling: 62, passing: 60, game_intelligence: 60, composure: 58, space_awareness: 60, off_ball_movement: 60, long_passing: 56, shooting: 54 },
  W: { _base: 52, dribbling: 64, acceleration: 66, sprint: 66, first_touch: 60, ball_control: 62, crossing: 58, off_ball_movement: 60, agility: 62, finishing: 52 },
  ST: { _base: 52, finishing: 62, off_ball_movement: 62, composure: 58, shooting: 60, positioning: 56, strength: 56, first_touch: 58, acceleration: 58, game_intelligence: 56 },
};

export const POSITION_GROUPS: { id: PositionGroup; label: string }[] = [
  { id: "GK", label: PG("GK") },
  { id: "CB", label: PG("CB") },
  { id: "FB", label: PG("FB") },
  { id: "DM", label: PG("DM") },
  { id: "CM", label: PG("CM") },
  { id: "AM", label: PG("AM") },
  { id: "W", label: PG("W") },
  { id: "ST", label: PG("ST") },
];

export const POSITION_BY_GROUP: Record<PositionGroup, PositionCode> = POSITION_BY_GROUP_LABELS;

export function baselineAttributes(group: PositionGroup, skill: number): Attributes {
  const b = GROUP_BASELINE[group];
  const out: Attributes = {};
  for (const { key } of ATTRIBUTE_DEFS) {
    const center = (b[key] as number | undefined) ?? b._base;
    // skill (0..1) scales from the amateur baseline upward
    const value = Math.round(center + skill * (95 - center) * 0.6);
    out[key] = clamp(value, 1, 99);
  }
  return out;
}

export function overallRating(attrs: Attributes): number {
  // Weighted mean with mental + role-critical technical traits carrying more.
  const weights: Record<string, number> = {
    first_touch: 1.1, passing: 1.1, ball_control: 1.1, decision_making: 1.2,
    positioning: 1.1, composure: 1.1, scanning: 1.0, finishing: 1.0,
    stamina: 0.9, concentration: 1.0, game_intelligence: 1.1,
  };
  let sum = 0;
  let wsum = 0;
  for (const { key } of ATTRIBUTE_DEFS) {
    const w = weights[key] ?? 0.8;
    sum += (attrs[key] ?? 0) * w;
    wsum += w;
  }
  return Math.round(sum / wsum);
}

export function weakestAttributes(attrs: Attributes, n = 3): { key: string; value: number }[] {
  return ATTRIBUTE_KEYS.map((k) => ({ key: k, value: attrs[k] ?? 0 }))
    .sort((a, b) => a.value - b.value)
    .slice(0, n);
}

export function strongestAttributes(attrs: Attributes, n = 3): { key: string; value: number }[] {
  return ATTRIBUTE_KEYS.map((k) => ({ key: k, value: attrs[k] ?? 0 }))
    .sort(byValueDesc)
    .slice(0, n);
}

/** Best overall first. Six places ordered a list of players this way, and only one of them —
 *  `scoutComparators.overall` — was a named rule: the squad list, the market targets, the compare
 *  picker, the club page's squad and Football World's browse each hand-wrote `b.overall - a.overall`.
 *  The scout table's own comment already records why that shape is dangerous (the watchlist board
 *  used to retype the table beside its own array), so the arm now rides this door too. */
export function byOverall(a: { overall: number }, b: { overall: number }): number {
  return b.overall - a.overall;
}

/** Best delta first; ties broken by key ascending so two equal deltas order the same way
 *  everywhere (locale-stable, not sort-implementation-stable). Two readers hand-wrote the
 *  identical `(a, b) => b.delta - a.delta || a.key.localeCompare(b.key)` — the scout report's
 *  attribute edges and the weekly review's attribute-gains table — and the same drift risk as
 *  the "completed"/"planned" lookups M347/M374 retired: one reader changes its tiebreak and the
 *  two lists disagree on equal deltas. This is the definition now. */
export function byDeltaDescThenKey(a: { delta: number; key: string }, b: { delta: number; key: string }): number {
  return b.delta - a.delta || a.key.localeCompare(b.key);
}

/** Best value first. Three readers hand-wrote the identical `(a, b) => b.value - a.value` — this
 *  module's strongest-attributes pick, the provider's top-players-by-value list and the profile's
 *  attribute bars. Byte-identical, so the same drift risk the comparators M376/M377 retired: flip
 *  one to ascending and three "biggest first" lists disagree. This is the definition now. */
export function byValueDesc(a: { value: number }, b: { value: number }): number {
  return b.value - a.value;
}

/** Descending by delta, no tiebreak. The same pure `(a, b) => b.delta - a.delta` was written twice
 *  inside domain/scouting.ts (the category-edge and template-edge sorts). Not the same contract as
 *  byDeltaDescThenKey (which breaks ties by key) or worldEngine's `|| b.to - a.to` variant, so it is a
 *  separate door — but two identical copies in one file is still the drift risk the comparators
 *  M376–M378 retired. This is the definition now. */
export function byDeltaDesc(a: { delta: number }, b: { delta: number }): number {
  return b.delta - a.delta;
}

/** Round a value to the nearest 100k. The dynamic world engine's market re-pricing and the seed
 *  generator's player pricing each spelled the nearest-100k rounding inline — the same drift risk
 *  the comparators M376–M378 retired, so it is a door now. Callers pass the already-scaled amount
 *  (e.g. `roundTo100k(base * ageCurve)`). The single site of the inline form is this body. */
export const roundTo100k = (v: number): number => Math.round(v / 100_000) * 100_000;

/** Player market value from overall + age. The dynamic world engine and the seed generator each defined a
 *  byte-identical local pricing function (the engine's own comment says it "mirrors the world generator");
 *  the same contract, so the same drift risk the comparators and roundTo100k retired. This is the
 *  definition now — both callers pass (overall, age) and the rounded result reuses roundTo100k. The base
 *  curve and age taper computed here are the single source of that formula. */
export function marketValue(overall: number, age: number): number {
  const base = Math.pow(Math.max(0, overall - 45) / 10, 3.1) * 6_000_000;
  const ageCurve = age < 23 ? 1.5 : age < 28 ? 1.3 : age < 31 ? 1.0 : age < 34 ? 0.6 : 0.3;
  return roundTo100k(base * ageCurve);
}

/** Average overall of a player list, falling back when the list is empty. The position-group mean in
 *  career.ts (lineMean), the top-11 mean in career.ts (clubInput) and the bucket mean in scouting.ts each
 *  spelled `X.length ? (the total of X's overall figures) / X.length : Y` inline — the same
 *  "average overall with a fallback" primitive the comparators M376–M381 retired in other forms, so it is
 *  a door now. The callers build the list differently and pass their own fallback (or round the result). */
export function meanOverall(players: { overall: number }[], fallback: number): number {
  return players.length ? sum(players, (p) => p.overall) / players.length : fallback;
}

/** Round a value and clamp it to [lo, hi]. The round-then-bound pair was spelled about eight times across
 *  career, scouting, transfers, training, worldEngine and careerArc — the same "round then bound" policy the
 *  comparators and other doors retired. (worldEngine's `clamp(Math.round(a) + rng, lo, hi)` — lines 100–101 —
 *  rounds, then adds a random nudge, then bounds: a different contract, and it stays inline. worldEngine's
 *  line 102 has no nudge and rides this door instead.) This is the definition now. */
export const capRound = (value: number, lo: number, hi: number): number => clamp(Math.round(value), lo, hi);

/** Sort two ISO-date values so the newer one comes first (descending). The comparison — the epochMs of one
 *  argument minus the epochMs of the other, and the equivalent new-Date-getTime subtraction — was spelled
 *  eight times across footprint, history, review, filmInsights, community, dashboard and the profile page:
 *  every one orders a list by an ISO date field. Both ride the one epochMs door; neither reimplements it.
 *  `byDateAsc` is the oldest-first twin. The contracts are genuine (a date comparison), so the door unifies
 *  them rather than leaving eight hand-rolled subtractions that could each drift if epochMs's bad-input
 *  floor ever changes. */
export const byDateDesc = (a: string | undefined, b: string | undefined): number => epochMs(b) - epochMs(a);
export const byDateAsc = (a: string | undefined, b: string | undefined): number => epochMs(a) - epochMs(b);

/** Rank two league-table rows the football way: points first, then goal difference (goals for minus goals
 *  against), then goals for. The three-tiebreak chain was spelled three times — career's live standings,
 *  analytics' team metrics and the season simulator's projected table — each one the same contract, so it is
 *  a door now. It recomputes the difference from goals for / against rather than reading a `gd` field, so
 *  rows without one (career, simulator) and rows with one (analytics, where that field IS the difference)
 *  rank identically. footballSeed's seed ranking keeps the same first two tiebreaks but breaks a still-equal
 *  pair on the club's overall rating — a different contract — and stays inline. */
export const byTableStanding = (
  a: { points: number; gf: number; ga: number },
  b: { points: number; gf: number; ga: number },
): number => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;

/** Total a list through a selector. The fold — a running total that starts at zero and adds each element's
 *  figure — was hand-written about thirty times across the domain and the feature pages (achievements,
 *  analytics, attributes itself, career, filmInsights, learn, load, playerDna, review, training, worldEngine
 *  and several pages). Every one is the same "total of a field (or a computed figure) over a list" contract,
 *  so it is a door now: one place to read the fold, one place the callers' guards (`|| 1`, a safeDiv, a
 *  halving) compose over. The door always starts at zero, like every converted site did; callers keep their
 *  own guard on the outside. */
export const sum = <T>(xs: readonly T[], f: (x: T) => number): number => xs.reduce((s, x) => s + f(x), 0);

/** Deduplicate a list, keeping the first occurrence of each value. The spread-over-a-fresh-Set dedup was
 *  written seven times in two spellings — the spread itself and the Array.from spelling — across
 *  attributes' category list, training's focus attributes, ai's focus/target/last-focus keys,
 *  intelligence's phrase list, LearnHub's category tabs and PlayerOS's carried focus. Same
 *  "first-occurrence order preserved" contract, so it is a door now. */
export const unique = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

/** Pick the element with the greatest figure under a selector. The argmax fold was written twice — the
 *  scout report's best-value-at pick and the career arc's peak point — one spelling it as a call on the
 *  selector, the other as a field access, same "greatest figure wins and the first max is kept" contract,
 *  so it is a door now. ai's nearest-to-target pick keeps a similar fold shape but breaks toward the
 *  SMALLEST distance — a different contract — and stays inline. Empty input throws, exactly like the
 *  no-init fold the scout pick uses (career's `points[0]` init only postponed the same crash to the
 *  `peakPoint.age` read one line later). */
export const maxBy = <T>(xs: readonly T[], f: (x: T) => number): T =>
  xs.reduce((best, x) => (f(x) > f(best) ? x : best));

/** Read the final element of a list. The index form and the slice form were hand-written ten times across
 *  history's day buckets, review's progress window, scouting's worst-edge picks (twice), rng's
 *  weighted-pick fallback, the profile's last result and last session, the dynamic world's latest season
 *  step, the details' final arc point and onboarding's surname initial — every one the same "final element,
 *  undefined when empty" contract, so it is a door now. */
export const last = <T>(xs: readonly T[]): T | undefined => xs[xs.length - 1];

/** Count occurrences of a key into a Map. The tally idiom — set the key to its current count plus one,
 *  defaulting the current count to zero — was hand-written five times across filmInsights' event-kind and
 *  recurring-focus counts, matchProbability's scoreline counts, review's focus counts and CommunityHub's
 *  focus counts. Same "occurrence tally, zero-initialised, first-occurrence insertion order" contract, so
 *  it is a door now: one place the nullish default lives, and a reader that forgets it cannot silently
 *  produce NaN. */
export const tally = <T, K>(xs: readonly T[], f: (x: T) => K): Map<K, number> =>
  xs.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map<K, number>());
