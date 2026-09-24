import type { Attributes, Goal, TrainingSession } from "./types";
import { attributeLabel, weakestAttributes } from "./attributes";
import { buildFilmInsights, type FilmClipInput } from "./filmInsights";

// A period digest compiled purely from the user's local training log, goals,
// progress history, academy records and analysed film. Nothing here is invented —
// every figure traces back to a real record, and the recommendation is framed
// with the evidence and a confidence level that reflects how much data backs it
// (spec §6, §57, §60).

export interface ReviewInput {
  nowMs: number;
  windowDays: number;
  sessions: TrainingSession[];
  goals: Goal[];
  progress: { date: string; overall: number; xp: number }[];
  attributes: Attributes;
  streak: number;
  learn?: { at: string; quizCorrect: boolean }[]; // academy completions
  film?: FilmClipInput[]; // clips analysed on this device
}

export interface FocusStat {
  key: string;
  sessions: number;
}

type FilmSummary = ReturnType<typeof buildFilmInsights>;

export interface AttributeGain {
  key: string;
  delta: number;
}

export type InsightKind = "positive" | "watch" | "plan";

export interface ReviewInsight {
  kind: InsightKind;
  text: string;
}

export interface ReviewRecommendation {
  attributeKey: string;
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
  filmClips: number;
  filmMinutes: number;
  filmScanRate: number;
  filmScanTrend: number | null;
  filmDetections: number;
  filmConfidence: number;
  filmKinds: { kind: string; count: number; perMinute: number }[];
  filmFocus: { key: string; clips: number }[];
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
    .map(([key, sessions]) => ({ key, sessions }))
    .sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key));

  // Total attribute growth actually earned this window, summed from each
  // completed session's recorded deltas — real training effect, not a projection.
  const gainMap = new Map<string, number>();
  for (const s of completed) for (const g of s.growth ?? []) gainMap.set(g.key, (gainMap.get(g.key) ?? 0) + g.delta);
  const attributeGains: AttributeGain[] = [...gainMap.entries()]
    .map(([key, delta]) => ({ key, delta: Math.round(delta * 10) / 10 }))
    .filter((g) => g.delta > 0)
    .sort((a, b) => b.delta - a.delta || a.key.localeCompare(b.key));

  const goalsDone = input.goals.filter((g) => g.done).length;
  const goalsTotal = input.goals.length;

  // Academy activity inside the window, counted from the learner's own completion
  // records. "Mastered" only ever means a recorded passed check quiz.
  const learnIn = (input.learn ?? []).filter((l) => withinWindow(l.at, fromMs, nowMs));
  const lessonsCompleted = learnIn.length;
  const lessonsMastered = learnIn.filter((l) => l.quizCorrect).length;

  // The film library is cumulative, so only clips analysed inside the window are
  // digested here — a lifetime rate quoted under a "last 7 days" heading would
  // misrepresent the period. Rates themselves come from real detections.
  const filmIn = (input.film ?? []).filter((c) => withinWindow(c.at, fromMs, nowMs));
  const filmDigest = filmIn.length ? buildFilmInsights(filmIn) : null;
  // A clip with no usable duration yields zero analyable footage — report "no film"
  // rather than a row of zeros.
  const film = filmDigest && filmDigest.clips > 0 ? filmDigest : null;

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
    film,
  });

  const filmFocus = film?.topFocus[0] ? { key: film.topFocus[0].key, clips: film.topFocus[0].clips } : null;
  const recommendation = buildRecommendation(input.attributes, topFocus, completed.length, ratings.length, filmFocus);

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
    film,
  });

  // Confidence rises with the amount of real signal available; a review with no
  // completed sessions stays low rather than pretending to be authoritative.
  const signal =
    completed.length * 12 +
    (overallDelta != null ? 18 : 0) +
    (avgRating != null ? 12 : 0) +
    Math.min(input.streak, 7) * 2 +
    (goalsTotal ? 8 : 0) +
    Math.min(lessonsMastered, 3) * 4 +
    Math.min(film?.clips ?? 0, 3) * 4;
  const confidence = completed.length === 0 ? Math.min(signal, 30) : Math.min(95, 45 + signal);

  const hasData =
    input.sessions.length > 0 ||
    input.progress.length > 1 ||
    goalsTotal > 0 ||
    input.streak > 0 ||
    lessonsCompleted > 0 ||
    (film?.clips ?? 0) > 0;

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
    filmClips: film?.clips ?? 0,
    filmMinutes: film ? Math.round(film.analysedMinutes * 10) / 10 : 0,
    filmScanRate: film?.scanPerMinute ?? 0,
    filmScanTrend: film?.scanTrend ?? null,
    filmDetections: film?.detections ?? 0,
    filmConfidence: film?.avgConfidence ?? 0,
    filmKinds: film ? film.byKind.filter((k) => k.count > 0).slice(0, 5) : [],
    filmFocus: film ? film.topFocus.slice(0, 3).map((f) => ({ key: f.key, clips: f.clips })) : [],
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
      ...(film ? ["Your local film library (demo video provider)"] : []),
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
  film: FilmSummary | null;
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
        text: `Most of your work hit ${attributeLabel(strongest.key)}, but ${attributeLabel(weakest.key)} is still your lowest attribute. Rotating some attention there keeps development balanced.`,
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

  if (a.film && a.film.clips > 0) {
    const f = a.film;
    out.push({
      kind: "positive",
      text: `You analysed ${f.clips} film clip${f.clips === 1 ? "" : "s"} in this window — ${f.analysedMinutes.toFixed(1)} min of video, ${f.detections} detection${f.detections === 1 ? "" : "s"} at ${f.avgConfidence}% mean provider confidence.`,
    });
    const trendClause =
      f.scanTrend != null
        ? ` — ${f.olderScanRate?.toFixed(2)} → ${f.newerScanRate?.toFixed(2)} per minute between the older and newer half (${f.scanTrend >= 0 ? "+" : ""}${f.scanTrend}).`
        : f.clips === 1
          ? " — analyse a second clip to see which way it is moving."
          : "";
    out.push({
      kind: f.scanTrend == null ? "positive" : f.scanTrend >= 0 ? "positive" : "watch",
      text: `Scanning off the ball averaged ${f.scanPerMinute.toFixed(2)} per minute of analysed video${trendClause}`,
    });
    if (f.topFocus.length) {
      const trainedKeys = new Set(a.topFocus.map((x) => x.key));
      const unfed = f.topFocus.filter((x) => !trainedKeys.has(x.key));
      if (unfed.length) {
        out.push({
          kind: "plan",
          text: `Flagged by the clips but absent from your training: ${unfed.map((u) => `${attributeLabel(u.key)} (×${u.clips})`).join(", ")}. No completed session in this window carried ${unfed.length === 1 ? "that focus" : "those focuses"} — the plan and the film are pointing different ways.`,
        });
      } else {
        const top = f.topFocus[0];
        out.push({
          kind: "positive",
          text: `The focus your clips repeated most — ${attributeLabel(top.key)} on ${top.clips} clip${top.clips === 1 ? "" : "s"} — is also in your completed training mix, so plan and observed evidence agree.`,
        });
      }
    }
  }

  return out;
}

function buildRecommendation(
  attributes: Attributes,
  topFocus: FocusStat[],
  completed: number,
  ratedCount: number,
  filmFocus: { key: string; clips: number } | null,
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
  // Observed film evidence outranks the heuristic: if the provider kept flagging
  // an attribute that is genuinely low, that is the better-prioritised target.
  const filmPick = filmFocus ? weak.find((w) => w.key === filmFocus.key) : undefined;
  const pick = filmPick ?? ranked[0] ?? weak[0];
  const already = trained.get(pick.key) ?? 0;
  const reason = filmPick && filmFocus
    ? `${attributeLabel(pick.key)} is what your analysed clips repeated (${filmFocus.clips} clip${filmFocus.clips === 1 ? "" : "s"} this window) and it sits at ${pick.value} — observed evidence and development ceiling point the same way.`
    : already > 0
      ? `${attributeLabel(pick.key)} sits at ${pick.value} and you already logged ${already} block${already === 1 ? "" : "s"} — progressive overload should move it next.`
      : `${attributeLabel(pick.key)} is your lowest untapped attribute at ${pick.value}. A focused block would raise your overall ceiling fastest.`;

  const conf = Math.min(90, 50 + completed * 5 + ratedCount * 3 + (already > 0 ? 10 : 0) + (filmPick ? 12 : 0));
  return { attributeKey: pick.key, reason, confidence: conf };
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
  film: FilmSummary | null;
}): string[] {
  const e: string[] = [];
  e.push(`Window: last ${a.windowDays} days`);
  e.push(`${a.completed} completed · ${a.minutes} min · ${a.xpGained} XP`);
  if (a.avgRating != null) e.push(`Average self-rating ${a.avgRating}/5`);
  if (a.overallDelta != null) e.push(`Overall change ${a.overallDelta >= 0 ? "+" : ""}${a.overallDelta}`);
  if (a.streak) e.push(`Current streak ${a.streak}d`);
  if (a.topFocus.length) e.push(`Focus mix: ${a.topFocus.map((f) => `${attributeLabel(f.key)} ×${f.sessions}`).join(", ")}`);
  if (a.goalsTotal) e.push(`Goals met ${a.goalsDone}/${a.goalsTotal}`);
  if (a.lessonsCompleted) e.push(`Academy ${a.lessonsCompleted} completed · ${a.lessonsMastered} with a passed check`);
  if (a.film) {
    e.push(`Film ${a.film.clips} clip${a.film.clips === 1 ? "" : "s"} · ${a.film.analysedMinutes.toFixed(1)} min · ${a.film.detections} detections`);
    e.push(`Scanning ${a.film.scanPerMinute.toFixed(2)}/min${a.film.scanTrend != null ? ` (trend ${a.film.scanTrend >= 0 ? "+" : ""}${a.film.scanTrend})` : ""}`);
  }
  return e;
}
