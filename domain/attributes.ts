import type { Attributes, PositionGroup } from "./types";

export interface AttributeDef {
  key: string;
  label: string;
  category: "technical" | "physical" | "tactical" | "mental";
}

// The multi-layer capability model (not a copy of any game's numbers).
export const ATTRIBUTE_DEFS: AttributeDef[] = [
  // Technical
  { key: "ball_control", label: "Ball Control", category: "technical" },
  { key: "first_touch", label: "First Touch", category: "technical" },
  { key: "passing", label: "Passing", category: "technical" },
  { key: "long_passing", label: "Long Passing", category: "technical" },
  { key: "shooting", label: "Shooting", category: "technical" },
  { key: "finishing", label: "Finishing", category: "technical" },
  { key: "crossing", label: "Crossing", category: "technical" },
  { key: "dribbling", label: "Dribbling", category: "technical" },
  { key: "weak_foot", label: "Weak Foot", category: "technical" },
  { key: "set_pieces", label: "Set Pieces", category: "technical" },
  // Physical
  { key: "acceleration", label: "Acceleration", category: "physical" },
  { key: "sprint", label: "Sprint", category: "physical" },
  { key: "agility", label: "Agility", category: "physical" },
  { key: "balance", label: "Balance", category: "physical" },
  { key: "strength", label: "Strength", category: "physical" },
  { key: "stamina", label: "Stamina", category: "physical" },
  { key: "explosiveness", label: "Explosiveness", category: "physical" },
  { key: "mobility", label: "Mobility", category: "physical" },
  // Tactical
  { key: "scanning", label: "Scanning", category: "tactical" },
  { key: "positioning", label: "Positioning", category: "tactical" },
  { key: "decision_making", label: "Decision Making", category: "tactical" },
  { key: "space_awareness", label: "Space Awareness", category: "tactical" },
  { key: "press_resistance", label: "Press Resistance", category: "tactical" },
  { key: "off_ball_movement", label: "Off-ball Movement", category: "tactical" },
  { key: "defensive_awareness", label: "Defensive Awareness", category: "tactical" },
  { key: "transition_awareness", label: "Transition Awareness", category: "tactical" },
  // Mental
  { key: "composure", label: "Composure", category: "mental" },
  { key: "concentration", label: "Concentration", category: "mental" },
  { key: "discipline", label: "Discipline", category: "mental" },
  { key: "confidence", label: "Confidence", category: "mental" },
  { key: "game_intelligence", label: "Game Intelligence", category: "mental" },
  { key: "consistency", label: "Consistency", category: "mental" },
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
export const CATEGORY_LABEL: Record<AttributeDef["category"], string> = {
  technical: "Technical",
  physical: "Physical",
  tactical: "Tactical",
  mental: "Mental",
};

export interface CategoryAverage {
  category: AttributeDef["category"];
  value: number;
}

/** Mean attribute value per category — the shape used by radar charts and by
 *  head-to-head comparisons, so both read the same numbers. */
export function categoryAverages(attrs: Attributes): CategoryAverage[] {
  return CATEGORY_ORDER.map((category) => {
    const defs = attributesByCategory(category);
    const value = Math.round(defs.reduce((s, d) => s + (attrs[d.key] ?? 0), 0) / (defs.length || 1));
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
  { id: "GK", label: "Goalkeeper" },
  { id: "CB", label: "Centre Back" },
  { id: "FB", label: "Full Back / Wing Back" },
  { id: "DM", label: "Defensive Mid" },
  { id: "CM", label: "Central Mid" },
  { id: "AM", label: "Attacking Mid" },
  { id: "W", label: "Winger" },
  { id: "ST", label: "Striker" },
];

export const POSITION_BY_GROUP: Record<PositionGroup, string> = {
  GK: "GK",
  CB: "CB",
  FB: "LB / RB",
  DM: "DM",
  CM: "CM",
  AM: "AMC",
  W: "LW / RW",
  ST: "ST",
};

export function baselineAttributes(group: PositionGroup, skill: number): Attributes {
  const b = GROUP_BASELINE[group];
  const out: Attributes = {};
  for (const { key } of ATTRIBUTE_DEFS) {
    const center = (b[key] as number | undefined) ?? b._base;
    // skill (0..1) scales from the amateur baseline upward
    const value = Math.round(center + skill * (95 - center) * 0.6);
    out[key] = clampAttr(value);
  }
  return out;
}

function clampAttr(v: number): number {
  return Math.max(1, Math.min(99, v));
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
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}
