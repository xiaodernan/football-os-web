// M1182 · The Tide — the Operator's console over the last fortnight, measured.
// The fold already carries the 14-day visits trend; this module turns it into three verdicts and one forecast.
// No model, no entitlements, no invented smoothing — just the carry-over arithmetic the seed admits.
import type { PulseFold } from "@/domain/pulse";
import { safeDiv } from "@/lib/utils";
import { sum, last } from "@/domain/attributes";

export type TideClass = "rising" | "steady" | "falling";

export interface TideReading {
  readonly dayCount: number;
  readonly firstHalfAvg: number;
  readonly secondHalfAvg: number;
  readonly deltaPct: number;
  readonly cls: TideClass;
  /** Next-three readings extrapolated from the last four real days, same seed, no fake smoothing. */
  readonly forecast: readonly [number, number, number];
}

const mean = (xs: readonly number[]): number => safeDiv(sum(xs, (x) => x), xs.length);

export function foldTide(fold: PulseFold): TideReading {
  const days: readonly { day: string; visits: number }[] = fold.trend.slice(-14);
  const dayCount = days.length;
  const half = Math.floor(dayCount / 2);
  const firstHalfAvg = mean(days.slice(0, half).map((d) => d.visits));
  const secondHalfAvg = mean(days.slice(half).map((d) => d.visits));
  const deltaPct = firstHalfAvg === 0 ? 0 : safeDiv(secondHalfAvg - firstHalfAvg, Math.max(1, firstHalfAvg)) * 100;
  const cls: TideClass = deltaPct >= 10 ? "rising" : deltaPct <= -10 ? "falling" : "steady";
  const tail = days.slice(-4).map((d) => d.visits);
  const mean4 = Math.max(1, mean(tail));
  const drift = tail.length >= 4 ? safeDiv((last(tail) ?? 0) - tail[0], tail.length) : 0;
  const forecast: [number, number, number] = [
    Math.round(mean4 + drift * 1),
    Math.round(mean4 + drift * 2),
    Math.round(mean4 + drift * 3),
  ];
  return { dayCount, firstHalfAvg, secondHalfAvg, deltaPct, cls, forecast };
}
