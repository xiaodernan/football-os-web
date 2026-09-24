import type { Attributes } from "./types";
import { overallRating } from "./attributes";
import { perSessionGain } from "./training";

// Development Projection: simulates the *same* diminishing-returns per-session
// gain the store applies when a session is completed, replayed over a weekly
// cadence. It answers "if I train these focus traits N×/week for W weeks at
// rating R, where does my profile land?" — a transparent model, not a promise.

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface ProjectionItem {
  key: string;
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
      cur = clamp(Math.round((cur + perSessionGain(cur, rating)) * 10) / 10, 1, 99);
    }
    return { key, from, to: cur, delta: Math.round((cur - from) * 10) / 10 };
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
    hasData: items.length > 0 && weeks > 0 && sessionsPerWeek > 0,
  };
}
