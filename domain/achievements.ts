// Achievements are derived ONLY from genuine, completed behaviour already stored
// in the user's local state — never from level alone and never fabricated. Each
// rule reads a real signal (sessions logged, streak kept, goals met, players
// watched, plans requested, level reached) so an unlocked badge always has an
// evidential basis. Pure module: no React, no IO.

export interface AchievementInput {
  level: number;
  xp: number;
  sessions: number;
  streak: number;
  goalsDone: number;
  watchlist: number;
  plans: number;
}

export type Tier = "bronze" | "silver" | "gold";

export interface AchievementDef {
  id: string;
  group: "training" | "consistency" | "growth" | "explorer";
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
];

export const TIER_ORDER: Tier[] = ["gold", "silver", "bronze"];

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
