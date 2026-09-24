import type { Attributes, PositionGroup } from "./types";
import {
  ATTRIBUTE_DEFS,
  attributeLabel,
  baselineAttributes,
  overallRating,
  POSITION_GROUPS,
} from "./attributes";

// Role Gap Analysis: compares a player's saved attributes against a heuristic
// archetype for their position group at their current level, then ranks the
// role-relevant deficits into concrete development priorities. Pure + testable;
// the target is a model estimate (see `sources`), never a claim about real players.

const ROLE_FLOOR = 52; // neutral baseline every group shares for non-emphasised traits

export interface GapItem {
  key: string;
  actual: number;
  target: number;
  delta: number; // target - actual; >0 means room to develop for this role
  criticality: number; // how much this role emphasises the trait (0..~33)
}

export interface GapAnalysis {
  group: PositionGroup;
  overall: number;
  skill: number; // 0..1 tier the archetype is calibrated to
  readiness: number; // 0..100 weighted coverage of role-relevant targets
  items: GapItem[];
  strengths: GapItem[]; // at/above role target, largest surplus first
  priorities: GapItem[]; // below role target, largest gap first
  evidence: string[];
  confidence: number;
  sources: string[];
  hasData: boolean;
}

function skillForOverall(overall: number): number {
  return Math.max(0, Math.min(1, (overall - ROLE_FLOOR) / 30));
}

export function groupLabel(group: PositionGroup): string {
  return POSITION_GROUPS.find((g) => g.id === group)?.label ?? group;
}

export interface GapInput {
  attributes: Attributes;
  group: PositionGroup;
}

export function analyzeGap(input: GapInput): GapAnalysis {
  const { attributes, group } = input;
  const keys = ATTRIBUTE_DEFS.map((d) => d.key);
  const present = keys.filter((k) => typeof attributes[k] === "number");
  const hasData = present.length > 0;
  const overall = overallRating(attributes);
  const skill = skillForOverall(overall);
  const target = baselineAttributes(group, skill);

  const items: GapItem[] = keys.map((k) => {
    const actual = attributes[k] ?? 0;
    const t = target[k] ?? ROLE_FLOOR;
    return {
      key: k,
      actual,
      target: t,
      delta: Math.round((t - actual) * 10) / 10,
      criticality: Math.max(0, t - ROLE_FLOOR),
    };
  });

  // Readiness: coverage of role-relevant targets, weighted by how much the role
  // emphasises each trait so generic floor attributes don't dilute the score.
  let covered = 0;
  let required = 0;
  for (const it of items) {
    const w = it.criticality || 0.25;
    covered += Math.min(it.actual, it.target) * w;
    required += it.target * w;
  }
  const readiness = required > 0 ? Math.round((covered / required) * 100) : 0;

  const priorities = items
    .filter((it) => it.criticality > 0 && it.delta > 0)
    .sort((a, b) => b.delta * b.criticality - a.delta * a.criticality)
    .slice(0, 6);

  const strengths = items
    .filter((it) => it.actual >= it.target)
    .sort((a, b) => b.actual - b.target - (a.actual - a.target))
    .slice(0, 4);

  const evidence: string[] = [];
  if (hasData) {
    evidence.push(`Overall ${overall} → archetype calibrated to level tier ${(skill * 100).toFixed(0)}%.`);
    const roleTraits = items.filter((it) => it.criticality > 0).length;
    evidence.push(`${roleTraits} role-emphasised traits compared for ${groupLabel(group)}.`);
    if (priorities[0]) evidence.push(`Largest role gap: ${attributeLabel(priorities[0].key)} (${priorities[0].actual} vs ${priorities[0].target} target, −${Math.abs(priorities[0].delta)}).`);
    if (strengths[0]) evidence.push(`Strongest relative to role: ${attributeLabel(strengths[0].key)} (${strengths[0].actual} vs ${strengths[0].target} target).`);
    evidence.push(`Role-relevant target coverage (readiness): ${readiness}%.`);
  } else {
    evidence.push("No saved attributes to compare.");
  }

  const sources = [
    "Football OS role archetype baseline (demo heuristic model)",
    "Your saved attribute profile",
  ];

  const confidence = hasData ? Math.max(55, Math.min(80, 60 + Math.round(present.length / 8))) : 0;

  return {
    group,
      overall,
    skill,
    readiness,
    items,
    strengths,
    priorities,
    evidence,
    confidence,
    sources,
    hasData,
  };
}
