import type { Attributes, Goal, TrainingSession } from "./types";
import type { RowText } from "./rowText";
import { weakestAttributes } from "./attributes";
import { buildFilmInsights, type FilmClipInput, type KindRate } from "./filmInsights";
import { round1 } from "./scouting";
import { completedMinutes, completedSessions } from "./training";
import { signed, DAY_MS, fmt2 } from "@/lib/utils";

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
  text: RowText;
}

export interface ReviewRecommendation {
  attributeKey: string;
  reason: RowText;
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
  filmKinds: KindRate[];
  filmFocus: { key: string; clips: number }[];
  goalsTotal: number;
  goalsDone: number;
  insights: ReviewInsight[];
  recommendation: ReviewRecommendation | null;
  evidence: RowText[];
  confidence: number;
  sources: RowText[];
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
  const fromMs = nowMs - windowDays * DAY_MS;

  const inWindow = input.sessions.filter((s) => withinWindow(sessionStamp(s), fromMs, nowMs));
  // M347: "completed" and its minutes are the training domain's definitions, not this file's.
  const completed = completedSessions(inWindow);
  const planned = inWindow.filter((s) => s.status === "planned");
  const missed = inWindow.filter((s) => s.status === "missed");

  const minutes = completedMinutes(inWindow);
  const xpGained = completed.reduce((sum, s) => sum + (s.xpAwarded ?? 0), 0);
  const ratings = completed.map((s) => s.selfRating).filter((r): r is number => typeof r === "number");
  const avgRating = ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null;

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
    .map(([key, delta]) => ({ key, delta: round1(delta) }))
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
    filmMinutes: film ? round1(film.analysedMinutes) : 0,
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
      { key: "common.src.log" },
      { key: "rv.src.progress" },
      { key: "rv.src.attrModel" },
      ...(input.learn?.length ? [{ key: "rv.src.academy" }] : []),
      ...(film ? [{ key: "rv.src.film" }] : []),
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
      text: { key: "rv.ins.none" },
    });
  } else {
    out.push({
      kind: "positive",
      text:
        a.completed === 1
          ? { key: "rv.ins.doneOne", vars: { min: a.minutes, xp: a.xpGained } }
          : { key: "rv.ins.doneMany", vars: { n: a.completed, min: a.minutes, xp: a.xpGained } },
    });
  }

  if (a.avgRating != null) {
    out.push({
      kind: a.avgRating >= 4 ? "positive" : "watch",
      text:
        a.avgRating >= 4
          ? { key: "rv.ins.qualityHigh", vars: { r: a.avgRating } }
          : { key: "rv.ins.qualityLow", vars: { r: a.avgRating } },
    });
  }

  if (a.overallDelta != null && a.overallDelta !== 0) {
    const up = a.overallDelta > 0;
    const n = Math.abs(a.overallDelta);
    out.push({
      kind: up ? "positive" : "watch",
      text: up
        ? n === 1
          ? { key: "rv.ins.riseOne" }
          : { key: "rv.ins.riseMany", vars: { n } }
        : n === 1
          ? { key: "rv.ins.dipOne" }
          : { key: "rv.ins.dipMany", vars: { n } },
    });
  }

  if (a.streak >= 3) {
    out.push({ kind: "positive", text: { key: "rv.ins.streak", vars: { n: a.streak } } });
  }

  if (a.missed > 0 && a.completed > 0) {
    out.push({
      kind: "watch",
      text:
        a.missed === 1
          ? { key: "rv.ins.missedOne" }
          : { key: "rv.ins.missedMany", vars: { n: a.missed } },
    });
  }

  if (a.topFocus.length) {
    const strongest = a.topFocus[0];
    const weakest = weakestAttributes(a.attributes, 1)[0];
    if (weakest && strongest.key !== weakest.key && (a.attributes[weakest.key] ?? 0) < strongest.sessions + 55) {
      out.push({
        kind: "watch",
        text: { key: "rv.ins.imbalanced", vars: { a: strongest.key, b: weakest.key } },
      });
    }
  }

  if (a.lessonsMastered > 0) {
    out.push({
      kind: "positive",
      text:
        a.lessonsMastered === 1
          ? { key: "rv.ins.lessonsDoneOne" }
          : { key: "rv.ins.lessonsDoneMany", vars: { n: a.lessonsMastered } },
    });
  } else if (a.lessonsCompleted > 0) {
    out.push({
      kind: "watch",
      text:
        a.lessonsCompleted === 1
          ? { key: "rv.ins.lessonsReadOne" }
          : { key: "rv.ins.lessonsReadMany", vars: { n: a.lessonsCompleted } },
    });
  }

  if (a.film && a.film.clips > 0) {
    const f = a.film;
    out.push({
      kind: "positive",
      text:
        f.clips === 1
          ? { key: "rv.ins.filmOne", vars: { min: f.analysedMinutes.toFixed(1), conf: f.avgConfidence, d: f.detections } }
          : { key: "rv.ins.filmMany", vars: { n: f.clips, min: f.analysedMinutes.toFixed(1), conf: f.avgConfidence, d: f.detections } },
    });
    out.push({
      kind: f.scanTrend == null ? "positive" : f.scanTrend >= 0 ? "positive" : "watch",
      text: scanInsight(f),
    });
    if (f.topFocus.length) {
      const trainedKeys = new Set(a.topFocus.map((x) => x.key));
      const unfed = f.topFocus.filter((x) => !trainedKeys.has(x.key));
      if (unfed.length) {
        out.push({
          kind: "plan",
          text:
            unfed.length === 1
              ? { key: "rv.ins.unfedOne", vars: { focus: unfed.map((u) => u.key).join(",") } }
              : { key: "rv.ins.unfedMany", vars: { focus: unfed.map((u) => u.key).join(",") } },
        });
      } else {
        const top = f.topFocus[0];
        out.push({
          kind: "positive",
          text:
            top.clips === 1
              ? { key: "rv.ins.focusAgreeOne", vars: { a: top.key } }
              : { key: "rv.ins.focusAgreeMany", vars: { a: top.key, n: top.clips } },
        });
      }
    }
  }

  return out;
}

// The scanning line used to be one sentence plus a clause the module appended in code:
// `{base}{trendClause}`. That is untranslatable by construction — a target language
// with the direction word before the figure would need the fragments reordered, not
// rejoined — so each of the three shapes the model can be in is now a row of its own,
// carrying every figure it names.
function scanInsight(f: FilmSummary): RowText {
  const rate = fmt2(f.scanPerMinute);
  const older = f.olderScanRate;
  const newer = f.newerScanRate;
  if (f.scanTrend != null && older != null && newer != null) {
    return {
      key: "rv.ins.scanTrend",
      vars: { rate, older: fmt2(older), newer: fmt2(newer), trend: signed(f.scanTrend) },
    };
  }
  return f.clips === 1 ? { key: "rv.ins.scanSecond", vars: { rate } } : { key: "rv.ins.scan", vars: { rate } };
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
  const reason: RowText = filmPick && filmFocus
    ? filmFocus.clips === 1
      ? { key: "rv.reco.filmOne", vars: { a: pick.key, v: pick.value } }
      : { key: "rv.reco.filmMany", vars: { a: pick.key, n: filmFocus.clips, v: pick.value } }
    : already > 0
      ? already === 1
        ? { key: "rv.reco.trainedOne", vars: { a: pick.key, v: pick.value } }
        : { key: "rv.reco.trainedMany", vars: { a: pick.key, n: already, v: pick.value } }
      : { key: "rv.reco.untapped", vars: { a: pick.key, v: pick.value } };

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
}): RowText[] {
  const e: RowText[] = [];
  e.push({ key: "rv.ev.window", vars: { n: a.windowDays } });
  e.push({ key: "rv.ev.done", vars: { n: a.completed, min: a.minutes, xp: a.xpGained } });
  if (a.avgRating != null) e.push({ key: "rv.ev.rating", vars: { r: a.avgRating } });
  if (a.overallDelta != null) e.push({ key: "rv.ev.delta", vars: { value: signed(a.overallDelta) } });
  if (a.streak) e.push({ key: "rv.ev.streak", vars: { n: a.streak } });
  if (a.topFocus.length)
    e.push({
      key: "rv.ev.focus",
      vars: { focus: a.topFocus.map((f) => f.key).join(","), n: a.topFocus.reduce((s, f) => s + f.sessions, 0) },
    });
  if (a.goalsTotal) e.push({ key: "rv.ev.goals", vars: { done: a.goalsDone, total: a.goalsTotal } });
  if (a.lessonsCompleted) e.push({ key: "rv.ev.academy", vars: { n: a.lessonsCompleted, m: a.lessonsMastered } });
  if (a.film) {
    const min = a.film.analysedMinutes.toFixed(1);
    const d = a.film.detections;
    e.push(
      a.film.clips === 1
        ? { key: "rv.ev.filmOne", vars: { min, d } }
        : { key: "rv.ev.filmMany", vars: { n: a.film.clips, min, d } },
    );
    const rate = fmt2(a.film.scanPerMinute);
    e.push(a.film.scanTrend != null ? { key: "rv.ev.scanTrend", vars: { rate, trend: signed(a.film.scanTrend) } } : { key: "rv.ev.scan", vars: { rate } });
  }
  return e;
}
