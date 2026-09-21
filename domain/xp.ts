// XP curve + gamification that must not override real training logic:
// XP is only granted for genuine completed behaviour, and attribute growth is
// derived from the trained evidence, not from level alone.

export interface LevelInfo {
  level: number;
  intoLevel: number;
  forNext: number;
  progress: number; // 0..1
}

/** Cumulative XP required to *reach* a level (quadratic-ish, gentle early). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return Math.round(60 * n + 8 * n * n);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const intoLevel = xp - base;
  const forNext = next - base;
  return {
    level,
    intoLevel,
    forNext,
    progress: forNext > 0 ? Math.min(1, intoLevel / forNext) : 1,
  };
}

/** XP awarded for completing a real session, scaled by quality + load. */
export function xpForSession(opts: {
  minutes: number;
  intensity: number; // 1..5
  selfRating: number; // 1..5
  focusCount: number;
}): number {
  const timeFactor = Math.min(2, opts.minutes / 45);
  const effort = 0.6 + opts.intensity * 0.14;
  const quality = 0.7 + opts.selfRating * 0.12;
  const breadth = 1 + (opts.focusCount - 1) * 0.08;
  return Math.max(10, Math.round(50 * timeFactor * effort * quality * breadth));
}

export function streakBonus(streak: number): number {
  // Small, capped bonus — rewards consistency without breaking training logic.
  return Math.min(5, Math.floor(streak / 3));
}
