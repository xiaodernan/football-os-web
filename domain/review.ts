import type { Attributes, Goal, TrainingSession } from "./types";
import { attributeLabel, weakestAttributes } from "./attributes";

// A period digest compiled purely from the user's local training log, goals and
// progress history. Nothing here is invented — every figure traces back to a
// real record, and the recommendation is framed with the evidence and a
// confidence level that reflects how much data backs it (spec §6, §57, §60).

export interface ReviewInput {
  nowMs: number;
  windowDays: number;
  sessions: TrainingSession[];
  goals: Goal[];
  progress: { date: string; overall: number; xp: number }[];
  attributes: Attributes;
  streak: number;
  learn?: { at: string; quizCorrect: boolean }[]; // academy completions
}

export interface FocusStat {
  key: string;
  label: string;
  sessions: number;
}

export interface AttributeGain {
  key: string;
  label: string;
  delta: number;
}

export type InsightKind = "positive" | "watch" | "plan";

export interface ReviewInsight {
  kind: InsightKind;
  text: string;
}

export interface ReviewRecommendation {
  attributeKey: string;
  attributeLabel: string;
  reason: string;
  confidence: number;
}

export interface WeeklyReview {
  windowDays: number;
  fromMs: number;
  completed: number;
  planned: number;
  missed: number;
  minutes: number;
  xpGained: number;
  avgRating: number | null;
  overallStart: number | null;
  overallEnd: number | null;
  overallDelta: number | null;
  streak: number;
  topFocus: FocusStat[];
  attributeGains: AttributeGain[];
  lessonsCompleted: number;
  lessonsMastered: number;
  goalsTotal: number;
  goalsDone: number;
  insights: ReviewInsight[];
  recommendation: ReviewRecommendation | null;
  evidence: string[];
  confidence: number;
  sources: string[];
  hasData: boolean;
}

function withinWindow(iso: string | undefined, fromMs: number, nowMs: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t >= fromMs && t <= nowMs;
}

// Sessions are attributed to the window by their completion time when present,
// otherwise by their scheduled date.
function sessionStamp(s: TrainingSession): string | undefined {
  return s.status === "completed" ? s.completedAt ?? s.date : s.date;
}

export function buildReview(input: ReviewInput): WeeklyReview {
  const { windowDays, nowMs } = input;
  const fromMs = nowMs - windowDays * 86400000;

  const inWindow = input.sessions.filter((s) => withinWindow(sessionStamp(s), fromMs, nowMs));
  const completed = inWindow.filter((s) => s.status === "completed");
  const planned = inWindow.filter((s) => s.status === "planned");
  const missed = inWindow.filter((s) => s.status === "missed");

  const minutes = completed.reduce((sum, s) => sum + s.targetMinutes, 0);
  const xpGained = completed.reduce((sum, s) => sum + (s.xpAwarded ?? 0), 0);
  const ratings = completed.map((s) => s.selfRating).filter((r): r is number => typeof r === "number");
  const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

  const prog = input.progress
    .filter((p) => withinWindow(p.date, fromMs, nowMs))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const overallStart = prog.length ? prog[0].overall : null;
  const overallEnd = prog.length ? prog[prog.length - 1].overall : null;
  const overallDelta = overallStart != null && overallEnd != null ? overallEnd - overallStart : null;

  const focusMap = new Map<string, number>();
  for (const s of completed) for (const f of s.focusAttributes) focusMap.set(f, (focusMap.get(f) ?? 0) + 1);
  const topFocus: FocusStat[] = [...focusMap.entries()]
    .map(([key, sessions]) => ({ key, label: attributeLabel(key), sessions }))
    .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label));

  // Total attribute growth actually earned this window, summed from each
  // completed session's recorded deltas — real training effect, not a projection.
  const gainMap = new Map<string, number>();
  for (const s of completed) for (const g of s.growth ?? []) gainMap.set(g.key, (gainMap.get(g.key) ?? 0) + g.delta);
  const attributeGains: AttributeGain[] = [...gainMap.entries()]
    .map(([key, delta]) => ({ key, label: attributeLabel(key), delta: Math.round(delta * 10) / 10 }))
    .filter((g) => g.delta > 0)
    .sort((a, b) => b.delta - a.delta || a.label.localeCompare(b.label));

  const goalsDone = input.goals.filter((g) => g.done).length;
  const goalsTotal = input.goals.length;

  // Academy activity inside the window, counted from the learner's own completion
  // records. "Mastered" only ever means a recorded passed check quiz.
  const learnIn = (input.learn ?? []).filter((l) => withinWindow(l.at, fromMs, nowMs));
  const lessonsCompleted = learnIn.length;
  const lessonsMastered = learnIn.filter((l) => l.quizCorrect).length;

  const insights = buildInsights({
    completed: completed.length,
    planned: planned.length,
    missed: missed.length,
    minutes,
    xpGained,
    avgRating,
    overallDelta,
    streak: input.streak,
    topFocus,
    attributes: input.attributes,
    windowDays,
    lessonsCompleted,
    lessonsMastered,
  });

  const recommendation = buildRecommendation(input.attributes, topFocus, completed.length, ratings.length);

  const evidence = buildEvidence({
    windowDays,
    completed: completed.length,
    minutes,
    xpGained,
    avgRating,
    overallDelta,
    streak: input.streak,
    topFocus,
    goalsDone,
    goalsTotal,
    lessonsCompleted,
    lessonsMastered,
  });

  // Confidence rises with the amount of real signal available; a review with no
  // completed sessions stays low rather than pretending to be authoritative.
  const signal =
    completed.length * 12 +
    (overallDelta != null ? 18 : 0) +
    (avgRating != null ? 12 : 0) +
    Math.min(input.streak, 7) * 2 +
    (goalsTotal ? 8 : 0) +
    Math.min(lessonsMastered, 3) * 4;
  const confidence = completed.length === 0 ? Math.min(signal, 30) : Math.min(95, 45 + signal);

  const hasData =
    input.sessions.length > 0 || input.progress.length > 1 || goalsTotal > 0 || input.streak > 0 || lessonsCompleted > 0;

  return {
    windowDays,
    fromMs,
    completed: completed.length,
    planned: planned.length,
    missed: missed.length,
    minutes,
    xpGained,
    avgRating,
    overallStart,
    overallEnd,
    overallDelta,
    streak: input.streak,
    topFocus: topFocus.slice(0, 4),
    attributeGains,
    lessonsCompleted,
    lessonsMastered,
    goalsTotal,
    goalsDone,
    insights,
    recommendation,
    evidence,
    confidence,
    sources: [
      "Your on-device training log",
      "Football OS progress history",
      "Attribute model (demo baseline)",
      ...(input.learn?.length ? ["Your academy completion records"] : []),
    ],
    hasData,
  };
}

function buildInsights(a: {
  completed: number;
  planned: number;
  missed: number;
  minutes: number;
  xpGained: number;
  avgRating: number | null;
  overallDelta: number | null;
  streak: number;
  topFocus: FocusStat[];
  attributes: Attributes;
  windowDays: number;
  lessonsCompleted: number;
  lessonsMastered: number;
}): ReviewInsight[] {
  const out: ReviewInsight[] = [];

  if (a.completed === 0) {
    out.push({
      kind: "plan",
      text: `No sessions completed in this window. A single short block restarts the habit — consistency beats volume when you're rebuilding.`,
    });
  } else {
    out.push({
      kind: "positive",
      text: `You completed ${a.completed} session${a.completed === 1 ? "" : "s"} totalling ${a.minutes} minutes and earned ${a.xpGained} XP.`,
    });
  }

  if (a.avgRating != null) {
    out.push({
      kind: a.avgRating >= 4 ? "positive" : "watch",
      text:
        a.avgRating >= 4
          ? `Your self-rated quality averaged ${a.avgRating}/5 — strong execution; keep the focus tight.`
          : `Quality averaged ${a.avgRating}/5. Lower ratings often point to fatigue or overly long blocks — consider shorter, sharper sessions.`,
    });
  }

  if (a.overallDelta != null && a.overallDelta !== 0) {
    out.push({
      kind: a.overallDelta > 0 ? "positive" : "watch",
      text:
        a.overallDelta > 0
          ? `Your overall rating rose ${a.overallDelta} point${a.overallDelta === 1 ? "" : "s"} across the window.`
          : `Your weighted overall dipped ${Math.abs(a.overallDelta)} point${Math.abs(a.overallDelta) === 1 ? "" : "s"} — usually a sign focus drifted from priority areas.`,
    });
  }

  if (a.streak >= 3) {
    out.push({ kind: "positive", text: `You're on a ${a.streak}-day streak. Protecting the chain is your biggest lever right now.` });
  }

  if (a.missed > 0 && a.completed > 0) {
    out.push({ kind: "watch", text: `${a.missed} planned session${a.missed === 1 ? "" : "s"} slipped. Smaller targets are easier to keep.` });
  }

  if (a.topFocus.length) {
    const strongest = a.topFocus[0];
    const weakest = weakestAttributes(a.attributes, 1)[0];
    if (weakest && strongest.key !== weakest.key && (a.attributes[weakest.key] ?? 0) < strongest.sessions + 55) {
      out.push({
        kind: "watch",
        text: `Most of your work hit ${strongest.label}, but ${attributeLabel(weakest.key)} is still your lowest attribute. Rotating some attention there keeps development balanced.`,
      });
    }
  }

  if (a.lessonsMastered > 0) {
    out.push({
      kind: "positive",
      text: `You passed the check quiz on ${a.lessonsMastered} academy lesson${a.lessonsMastered === 1 ? "" : "s"} in this window.`,
    });
  } else if (a.lessonsCompleted > 0) {
    out.push({
      kind: "watch",
      text: `${a.lessonsCompleted} academy lesson${a.lessonsCompleted === 1 ? "" : "s"} completed but none with a passed check — retaking the quiz is what turns reading into retention.`,
    });
  }

  return out;
}

function buildRecommendation(
  attributes: Attributes,
  topFocus: FocusStat[],
  completed: number,
  ratedCount: number,
): ReviewRecommendation | null {
  const weak = weakestAttributes(attributes, 5);
  if (!weak.length) return null;
  const trained = new Map(topFocus.map((f) => [f.key, f.sessions]));
  // Prefer the lowest attribute the user has NOT already over-trained this window.
  const ranked = [...weak].sort((a, b) => {
    const aT = trained.get(a.key) ?? 0;
    const bT = trained.get(b.key) ?? 0;
    if (aT !== bT) return bT - aT; // neglect under-trained first
    return a.value - b.value; // then the weakest
  });
  const pick = ranked[0] ?? weak[0];
  const already = trained.get(pick.key) ?? 0;
  const reason = already > 0
    ? `${attributeLabel(pick.key)} sits at ${pick.value} and you already logged ${already} block${already === 1 ? "" : "s"} — progressive overload should move it next.`
    : `${attributeLabel(pick.key)} is your lowest untapped attribute at ${pick.value}. A focused block would raise your overall ceiling fastest.`;

  const conf = Math.min(90, 50 + completed * 5 + ratedCount * 3 + (already > 0 ? 10 : 0));
  return { attributeKey: pick.key, attributeLabel: attributeLabel(pick.key), reason, confidence: conf };
}

function buildEvidence(a: {
  windowDays: number;
  completed: number;
  minutes: number;
  xpGained: number;
  avgRating: number | null;
  overallDelta: number | null;
  streak: number;
  topFocus: FocusStat[];
  goalsDone: number;
  goalsTotal: number;
  lessonsCompleted: number;
  lessonsMastered: number;
}): string[] {
  const e: string[] = [];
  e.push(`Window: last ${a.windowDays} days`);
  e.push(`${a.completed} completed · ${a.minutes} min · ${a.xpGained} XP`);
  if (a.avgRating != null) e.push(`Average self-rating ${a.avgRating}/5`);
  if (a.overallDelta != null) e.push(`Overall change ${a.overallDelta >= 0 ? "+" : ""}${a.overallDelta}`);
  if (a.streak) e.push(`Current streak ${a.streak}d`);
  if (a.topFocus.length) e.push(`Focus mix: ${a.topFocus.map((f) => `${f.label} ×${f.sessions}`).join(", ")}`);
  if (a.goalsTotal) e.push(`Goals met ${a.goalsDone}/${a.goalsTotal}`);
  if (a.lessonsCompleted) e.push(`Academy ${a.lessonsCompleted} completed · ${a.lessonsMastered} with a passed check`);
  return e;
}
