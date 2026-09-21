// Deterministic pseudo-random utilities so every Demo Mode result is reproducible
// from a seed (required by the Football OS simulation contract).

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

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Weighted pick: entries are [value, weight]. */
export function weightedPick<T>(rng: () => number, entries: readonly [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    if ((r -= w) <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

export function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Deterministic value noise for seeded attribute generation. */
export function seededAttribute(seed: string, center: number, spread: number): number {
  const rng = makeRng(seed);
  const v = center + (rng() * 2 - 1) * spread;
  return Math.max(1, Math.min(99, Math.round(v)));
}
