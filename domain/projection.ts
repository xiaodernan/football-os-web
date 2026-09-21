import type { Attributes } from "./types";
import { attributeLabel, overallRating } from "./attributes";

// Development Projection: simulates the *same* diminishing-returns per-session
// gain the store applies when a session is completed, replayed over a weekly
// cadence. It answers "if I train these focus traits N×/week for W weeks at
// rating R, where does my profile land?" — a transparent model, not a promise.

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Mirrors useFootballOS COMPLETE: room shrinks toward the 95 ceiling, gain is
// capped at 2 points per session so gamification never fakes unrealistic jumps.
function gainPerSession(cur: number, rating: number): number {
  const room = (95 - cur) / 45;
  return clamp(rating * 0.5 * Math.max(0.15, room), 0, 2);
}

export interface ProjectionItem {
  key: string;
  label: string;
  from: number;
  to: number;
  delta: number;
}

export interface ProjectionInput {
  attributes: Attributes;
  focusKeys: string[];
  sessionsPerWeek: number;
  weeks: number;
  rating: number; // session self-rating 1..5 driving per-session gain
}

export interface Projection {
  items: ProjectionItem[];
  weeks: number;
  sessionsPerWeek: number;
  rating: number;
  projectedAttributes: Attributes;
  overallBefore: number;
  overallAfter: number;
  overallDelta: number;
  hasData: boolean;
}

export function projectGrowth(input: ProjectionInput): Projection {
  const { attributes, rating } = input;
  const weeks = Math.max(0, Math.round(input.weeks));
  const sessionsPerWeek = Math.max(0, Math.round(input.sessionsPerWeek));
  const focus = input.focusKeys.filter((k) => typeof attributes[k] === "number");

  const projected: Attributes = { ...attributes };
  const items: ProjectionItem[] = focus.map((key) => {
    const from = attributes[key];
    let cur = from;
    for (let i = 0; i < weeks * sessionsPerWeek; i++) {
      cur = clamp(Math.round((cur + gainPerSession(cur, rating)) * 10) / 10, 1, 99);
    }
    return { key, label: attributeLabel(key), from, to: cur, delta: Math.round((cur - from) * 10) / 10 };
  });
  for (const it of items) projected[it.key] = it.to;

  const overallBefore = overallRating(attributes);
  const overallAfter = overallRating(projected);
  return {
    items,
    weeks,
    sessionsPerWeek,
    rating,
    projectedAttributes: projected,
    overallBefore,
    overallAfter,
    overallDelta: overallAfter - overallBefore,
    hasData: items.length > 0 && weeks > 0 && sessionsPerWeek > 0,
  };
}
