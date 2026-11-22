// M1241 · The Ops Trend — the operator console's forecast. The tide panel drew the fortnight
// and said rising or falling; this reads the SAME series and answers the two questions the
// directive asks of an admin surface: what happens next (a deterministic projection, honestly
// labelled), and what to do about it (rules over the fold's own measured numbers — the model's
// version of this advice lives in the prescription council; this is the arithmetic one). Pure,
// deterministic, no prose: the screen words every code.
import { round2 } from "@/lib/utils";

/** The projection window: seven days, the same length as the window it projects from. */
export const FORECAST_WINDOW = 7;
/** A week-over-week fall at or beyond this percentage is a content warning. */
export const CONTENT_DECLINE_PCT = -10;
/** A loop share at or beyond this percentage is an engagement warning. */
export const HIGH_LOOP_SHARE = 20;
/** A mean depth below this is a navigation warning. */
export const LOW_DEPTH = 2;

export type TrendAdviceCode = "onboarding" | "navigation" | "content" | "engagement" | "healthy";

export interface TrendDay { day: string; visits: number }

export interface TrendInput {
  readonly trend: readonly TrendDay[];
  readonly bounceRate: number;
  readonly avgDepth: number;
  readonly loopRate: number;
}

export interface TrendAdvice {
  readonly code: TrendAdviceCode;
  /** The measured number the rule fired on, so the screen can print the evidence. */
  readonly measure: number;
}

export interface TrendRead {
  /** The last window's mean visits, 2dp. */
  weekAvg: number;
  /** The window before it, 2dp; 0 when the series is shorter than two windows. */
  prevAvg: number;
  /** The week's change against the previous window, percent, 2dp; 0 when prevAvg is 0. */
  slopePct: number;
  /** The next window projected from the week's mean along the slope, clamped at 0. */
  forecast: TrendDay[];
  /** The deterministic advice, in rule order; an empty read carries the healthy code. */
  advice: TrendAdvice[];
  /** Days of history the read actually had. */
  days: number;
}

const mean = (xs: readonly number[]): number => (xs.length ? round2(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);

/** The day after `day` (YYYY-MM-DD), in UTC so no timezone can move a projection's label. */
export const nextDay = (day: string): string => {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return day;
  return new Date(t + 86_400_000).toISOString().slice(0, 10);
};

export function trendRead(input: TrendInput): TrendRead {
  const series = input.trend.filter((d) => Number.isFinite(d.visits) && d.visits >= 0);
  const week = series.slice(-FORECAST_WINDOW);
  const prev = series.slice(-2 * FORECAST_WINDOW, -FORECAST_WINDOW);
  const weekAvg = mean(week.map((d) => d.visits));
  const prevAvg = mean(prev.map((d) => d.visits));
  const slopePct = prevAvg > 0 ? round2(((weekAvg - prevAvg) / prevAvg) * 100) : 0;

  // The projection: the week's mean walking the slope, day by day, clamped at zero — a
  // straight-line read of the series' own momentum, never a model's guess.
  const perDay = prevAvg > 0 ? (weekAvg - prevAvg) / FORECAST_WINDOW : 0;
  const lastDay = series.length ? series[series.length - 1].day : "1970-01-01";
  const forecast: TrendDay[] = [];
  let cursor = lastDay;
  for (let i = 1; i <= FORECAST_WINDOW; i++) {
    cursor = nextDay(cursor);
    forecast.push({ day: cursor, visits: Math.max(0, round2(weekAvg + perDay * i)) });
  }

  // The advice: each rule fires on the fold's own measured number, in a fixed order. An empty
  // series prescribes NOTHING — a world with no data must not be told to fix its navigation
  // (the proof's empty arm caught that a zero depth reads as a low depth).
  const advice: TrendAdvice[] = [];
  if (series.length === 0) return { weekAvg, prevAvg, slopePct, forecast, advice: [{ code: "healthy", measure: 0 }], days: 0 };
  if (input.bounceRate >= 50) advice.push({ code: "onboarding", measure: round2(input.bounceRate) });
  if (input.avgDepth < LOW_DEPTH) advice.push({ code: "navigation", measure: round2(input.avgDepth) });
  if (slopePct <= CONTENT_DECLINE_PCT) advice.push({ code: "content", measure: slopePct });
  if (input.loopRate >= HIGH_LOOP_SHARE) advice.push({ code: "engagement", measure: round2(input.loopRate) });
  if (advice.length === 0) advice.push({ code: "healthy", measure: weekAvg });

  return { weekAvg, prevAvg, slopePct, forecast, advice, days: series.length };
}
