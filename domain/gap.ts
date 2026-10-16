import type { Attributes, PositionGroup } from "./types";
import {
  ATTRIBUTE_DEFS,
  baselineAttributes,
  overallRating,
} from "./attributes";
import type { RowText } from "./rowText";
import { round1 } from "./scouting";
import { clamp, fmt0, pct } from "@/lib/utils";

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
  evidence: RowText[];
  confidence: number;
  sources: RowText[];
  hasData: boolean;
}

function skillForOverall(overall: number): number {
  return clamp((overall - ROLE_FLOOR) / 30, 0, 1);
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
      delta: round1(t - actual),
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
  const readiness = required > 0 ? pct(covered / required) : 0;

  const priorities = items
    .filter((it) => it.criticality > 0 && it.delta > 0)
    .sort((a, b) => b.delta * b.criticality - a.delta * a.criticality)
    .slice(0, 6);

  const strengths = items
    .filter((it) => it.actual >= it.target)
    .sort((a, b) => b.actual - b.target - (a.actual - a.target))
    .slice(0, 4);

  // Every line is a key the screen resolves, so this model's own voice arrives in the
  // reader's language instead of the one it was typed in. `group` and `a` are named for
  // rowText's code variables on purpose: the first holds a PositionGroup id and the
  // second an attribute key, and both are resolved through the dictionary rather than
  // being baked into an English sentence here.
  const evidence: RowText[] = [];
  if (hasData) {
    evidence.push({ key: "gap.ev.calibrated", vars: { overall, tier: fmt0(skill * 100) } });
    const roleTraits = items.filter((it) => it.criticality > 0).length;
    evidence.push({ key: "gap.ev.traitsCompared", vars: { n: roleTraits, group } });
    if (priorities[0]) {
      evidence.push({ key: "gap.ev.largestGap", vars: { a: priorities[0].key, actual: priorities[0].actual, target: priorities[0].target, gap: Math.abs(priorities[0].delta) } });
    }
    if (strengths[0]) {
      evidence.push({ key: "gap.ev.strongest", vars: { a: strengths[0].key, actual: strengths[0].actual, target: strengths[0].target } });
    }
    evidence.push({ key: "gap.ev.readiness", vars: { n: readiness } });
  } else {
    evidence.push({ key: "gap.ev.noData" });
  }

  const sources: RowText[] = [
    { key: "gap.src.baseline" },
    { key: "gap.src.profile" },
  ];

  const confidence = hasData ? clamp(60 + Math.round(present.length / 8), 55, 80) : 0;

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
