// Deterministic pseudo-random utilities so every Demo Mode result is reproducible
// from a seed (required by the Football OS simulation contract).

import { sum } from "@/domain/attributes";

export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
export function makeRng(seed: string | number): () => number {
  let a = typeof seed === "number" ? seed >>> 0 : hashString(seed) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function rngFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

// An empty pool is a caller bug: the signature promises a T, and the old answer —
// `undefined` from `arr[NaN]` — was a type lie whose poison landed wherever the result
// was read, far from the cause. Fail here instead, with a named error.
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick: empty pool");
  return arr[Math.floor(rng() * arr.length)];
}

/** Weighted pick: entries are [value, weight]. */
export function weightedPick<T>(rng: () => number, entries: readonly [T, number][]): T {
  // Same contract as ./pick: an empty pool throws at the cause rather than falling off
  // the loop into `entries[-1][0]` — a TypeError that named nothing.
  if (entries.length === 0) throw new Error("weightedPick: empty pool");
  const total = sum(entries, ([, w]) => w);
  let r = rng() * total;
  for (const [value, w] of entries) {
    if ((r -= w) <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
