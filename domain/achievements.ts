// Achievements are derived ONLY from genuine, completed behaviour already stored
// on this device — never from level alone and never fabricated. Each rule reads
// a real signal (sessions logged, streak kept, goals met, players watched, plans
// requested, level reached, academy lessons completed, film clips analysed) so
// an unlocked badge always has an evidential basis. Pure module: no React, no IO.
import { levelInfo } from "./xp";
import type { Goal, TrainingSession } from "./types";

export interface AchievementInput {
  level: number;
  xp: number;
  sessions: number;
  streak: number;
  goalsDone: number;
  watchlist: number;
  plans: number;
  lessonsCompleted: number;
  lessonsMastered: number; // completed AND check quiz passed
  filmClips: number; // clips actually analysed on this device (video report present)
}

export type Tier = "bronze" | "silver" | "gold";

export interface AchievementDef {
  id: string;
  group: "training" | "consistency" | "growth" | "explorer" | "scholar" | "analyst";
  icon: string;
  tier: Tier;
  target: number;
  current: (i: AchievementInput) => number;
}

export interface AchievementStatus extends AchievementDef {
  value: number;
  pct: number; // 0..1
  unlocked: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Training
  { id: "first_session", group: "training", icon: "✦", tier: "bronze", target: 1, current: (i) => i.sessions },
  { id: "ten_sessions", group: "training", icon: "❉", tier: "silver", target: 10, current: (i) => i.sessions },
  { id: "fifty_sessions", group: "training", icon: "★", tier: "gold", target: 50, current: (i) => i.sessions },
  { id: "first_plan", group: "training", icon: "⚡", tier: "bronze", target: 1, current: (i) => i.plans },
  { id: "plan_seeker", group: "training", icon: "⌕", tier: "silver", target: 5, current: (i) => i.plans },
  // Consistency
  { id: "streak_3", group: "consistency", icon: "▲", tier: "bronze", target: 3, current: (i) => i.streak },
  { id: "streak_7", group: "consistency", icon: "◆", tier: "silver", target: 7, current: (i) => i.streak },
  { id: "streak_30", group: "consistency", icon: "☀", tier: "gold", target: 30, current: (i) => i.streak },
  // Growth
  { id: "goal_getter", group: "growth", icon: "◎", tier: "bronze", target: 1, current: (i) => i.goalsDone },
  { id: "goal_hunter", group: "growth", icon: "⌖", tier: "silver", target: 5, current: (i) => i.goalsDone },
  { id: "level_5", group: "growth", icon: "❯", tier: "silver", target: 5, current: (i) => i.level },
  { id: "level_10", group: "growth", icon: "♛", tier: "gold", target: 10, current: (i) => i.level },
  // Explorer
  { id: "watch_one", group: "explorer", icon: "☆", tier: "bronze", target: 1, current: (i) => i.watchlist },
  { id: "watch_five", group: "explorer", icon: "★", tier: "silver", target: 5, current: (i) => i.watchlist },
  { id: "watch_fifteen", group: "explorer", icon: "☰", tier: "gold", target: 15, current: (i) => i.watchlist },
  // Scholar — driven by recorded academy completions and passed check quizzes
  { id: "first_lesson", group: "scholar", icon: "◈", tier: "bronze", target: 1, current: (i) => i.lessonsCompleted },
  { id: "scholar", group: "scholar", icon: "❐", tier: "silver", target: 3, current: (i) => i.lessonsMastered },
  { id: "polymath", group: "scholar", icon: "✵", tier: "gold", target: 6, current: (i) => i.lessonsMastered },
  // Analyst — driven by real, provider-analysed clips in the local film library
  { id: "first_clip", group: "analyst", icon: "▣", tier: "bronze", target: 1, current: (i) => i.filmClips },
  { id: "five_clips", group: "analyst", icon: "◫", tier: "silver", target: 5, current: (i) => i.filmClips },
  { id: "ten_clips", group: "analyst", icon: "⧉", tier: "gold", target: 10, current: (i) => i.filmClips },
];

/**
 * The one derivation of an AchievementInput. Three surfaces used to build this object by
 * hand, and the two counts every training/consistency badge hangs on — completed sessions
 * and finished goals — are exactly where a screen can quietly disagree with the badge page
 * it mirrors, so the filters live here and a caller passes what it stores.
 */
export function achievementInput(src: {
  xp: number;
  sessions: Pick<TrainingSession, "status">[];
  goals: Pick<Goal, "done">[];
  streak: number;
  watchlist: unknown[];
  plans: unknown[];
  lessons: { completed: number; mastered: number };
  filmClips: number;
}): AchievementInput {
  return {
    level: levelInfo(src.xp).level,
    xp: src.xp,
    sessions: src.sessions.filter((s) => s.status === "completed").length,
    streak: src.streak,
    goalsDone: src.goals.filter((g) => g.done).length,
    watchlist: src.watchlist.length,
    plans: src.plans.length,
    lessonsCompleted: src.lessons.completed,
    lessonsMastered: src.lessons.mastered,
    filmClips: src.filmClips,
  };
}

/**
 * The badges still locked, closest to earning first: progress down, then the smaller
 * target, so a 4/5 badge outranks a 40/50 one. Shared because the Dashboard's "next
 * badge" tile and the player Progress tab must not rank the same list differently.
 */
export function nextBadges(list: AchievementStatus[], n: number): AchievementStatus[] {
  return list
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.pct - a.pct || a.target - b.target)
    .slice(0, n);
}

export function evaluateAchievements(input: AchievementInput): AchievementStatus[] {
  return ACHIEVEMENTS.map((a) => {
    const value = Math.max(0, a.current(input));
    const pct = a.target > 0 ? Math.min(1, value / a.target) : 1;
    return { ...a, value, pct, unlocked: value >= a.target };
  });
}

export function summary(list: AchievementStatus[]) {
  const unlocked = list.filter((a) => a.unlocked).length;
  const points = list.reduce((s, a) => s + (a.unlocked ? tierPoints(a.tier) : 0), 0);
  const byGroup = new Map<string, { unlocked: number; total: number }>();
  for (const a of list) {
    const g = byGroup.get(a.group) ?? { unlocked: 0, total: 0 };
    g.total++;
    if (a.unlocked) g.unlocked++;
    byGroup.set(a.group, g);
  }
  return { unlocked, total: list.length, points, byGroup };
}

export function tierPoints(tier: Tier): number {
  return tier === "gold" ? 30 : tier === "silver" ? 15 : 5;
}
