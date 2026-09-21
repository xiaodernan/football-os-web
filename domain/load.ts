import type { TrainingSession } from "./types";
import { sessionIntensity } from "./training";

// Training-load management built on the same monotony/strain + acute:chronic
// ratio (ACWR) ideas used in strength & conditioning. Every number is derived
// from sessions the user actually completed — duration × perceived intensity.
// Nothing is invented; where there is too little history the metrics come back
// null rather than a confident-looking guess (spec §6, §57, §60).

export const ACUTE_DAYS = 7;
export const CHRONIC_DAYS = 28;

export interface LoadInput {
  nowMs: number;
  sessions: TrainingSession[];
}

export type LoadZone = "none" | "under" | "optimal" | "caution" | "high";

export interface DailyLoad {
  date: string; // YYYY-MM-DD
  load: number;
  sessions: number;
}

export interface WeeklyLoad {
  weekStart: string;
  load: number;
  sessions: number;
}

export interface LoadSummary {
  hasData: boolean;
  totalSessions: number;
  durationMin: number;
  daily: DailyLoad[];
  weekly: WeeklyLoad[];
  acute: number;
  chronic: number;
  acwr: number | null;
  zone: LoadZone;
  weekLoad: number;
  monotony: number | null;
  strain: number | null;
  advice: string;
  recommendation: { text: string; confidence: number } | null;
  evidence: string[];
  sources: string[];
}

const DAY = 86400000;

function dayKey(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

// Duration × session-RPE. Completed sessions carry a self-rating (1..5); if a
// record lacks one we fall back to the objective intensity of its exercises.
function sessionLoad(s: TrainingSession): { minutes: number; load: number } {
  const exMinutes = s.exercises.reduce((sum, e) => sum + e.minutes, 0);
  const minutes = exMinutes || s.targetMinutes || 0;
  const rpe = s.selfRating ?? sessionIntensity(s);
  return { minutes, load: Math.round(minutes * rpe) };
}

export function buildLoad(input: LoadInput): LoadSummary {
  const { nowMs } = input;
  const chronicFrom = nowMs - CHRONIC_DAYS * DAY;

  const completed = input.sessions.filter((s) => s.status === "completed");

  const dayMap = new Map<string, { load: number; minutes: number; sessions: number }>();
  let durationMin = 0;
  for (const s of completed) {
    const stamp = s.completedAt ?? s.date;
    const t = new Date(stamp).getTime();
    if (Number.isNaN(t) || t < chronicFrom || t > nowMs) continue;
    const { minutes, load } = sessionLoad(s);
    const k = dayKey(stamp);
    const cur = dayMap.get(k) ?? { load: 0, minutes: 0, sessions: 0 };
    cur.load += load;
    cur.minutes += minutes;
    cur.sessions += 1;
    dayMap.set(k, cur);
    durationMin += minutes;
  }

  const daily: DailyLoad[] = [...dayMap.entries()]
    .filter(([k]) => k)
    .map(([date, v]) => ({ date, load: v.load, sessions: v.sessions }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const hasData = daily.length > 0;
  const totalSessions = daily.reduce((s, d) => s + d.sessions, 0);

  // Acute (7d) and chronic (28d) are *average daily* load across the full
  // window, so rest days correctly pull the mean down.
  const sumLoad = (fromMs: number) =>
    daily.reduce((s, d) => (new Date(d.date + "T00:00:00Z").getTime() >= fromMs ? s + d.load : s), 0);
  const acuteTotal = sumLoad(nowMs - ACUTE_DAYS * DAY);
  const chronicTotal = sumLoad(chronicFrom);
  const acute = Math.round(acuteTotal / ACUTE_DAYS);
  const chronic = Math.round(chronicTotal / CHRONIC_DAYS);
  const weekLoad = acuteTotal;
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null;

  const weekly = buildWeekly(nowMs, daily);
  const { monotony, strain } = buildMonotony(weekly);

  const zone = classifyZone(acwr, weekLoad, chronicTotal);

  const advice = buildAdvice(zone, acwr, weekLoad);
  const recommendation = buildRecommendation(zone, acwr, hasData, weekly.length, confidenceInput(totalSessions, weekly.length));

  const evidence = buildEvidence(totalSessions, durationMin, weekLoad, acute, chronic, acwr, weekly, monotony, strain);

  const sources = [
    "Your on-device training log",
    "Session-RPE load model (duration × perceived intensity)",
    "Gabbett-style ACWR thresholds (demo)",
  ];

  return {
    hasData,
    totalSessions,
    durationMin,
    daily,
    weekly,
    acute,
    chronic,
    acwr,
    zone,
    weekLoad,
    monotony,
    strain,
    advice,
    recommendation,
    evidence,
    sources,
  };
}

function buildWeekly(nowMs: number, daily: DailyLoad[]): WeeklyLoad[] {
  const weeks: WeeklyLoad[] = [];
  for (let k = CHRONIC_DAYS / 7 - 1; k >= 0; k--) {
    const end = nowMs - k * 7 * DAY;
    const start = end - 7 * DAY;
    let load = 0;
    let sessions = 0;
    for (const d of daily) {
      const t = new Date(d.date + "T00:00:00Z").getTime();
      if (t >= start && t < end) {
        load += d.load;
        sessions += d.sessions;
      }
    }
    weeks.push({ weekStart: new Date(start).toISOString().slice(0, 10), load, sessions });
  }
  return weeks;
}

function buildMonotony(weekly: WeeklyLoad[]): { monotony: number | null; strain: number | null } {
  const loads = weekly.map((w) => w.load);
  const n = loads.length;
  if (n < 2) return { monotony: null, strain: null };
  const mean = loads.reduce((a, b) => a + b, 0) / n;
  const variance = loads.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  if (mean <= 0) return { monotony: null, strain: null };
  const monotony = sd > 0 ? Math.round((mean / sd) * 100) / 100 : null;
  const strain = monotony != null ? Math.round(mean * monotony) : null;
  return { monotony, strain };
}

function classifyZone(acwr: number | null, weekLoad: number, chronicTotal: number): LoadZone {
  if (!weekLoad) return "none";
  if (acwr == null) return chronicTotal > 0 ? "caution" : "under";
  if (acwr < 0.8) return "under";
  if (acwr <= 1.3) return "optimal";
  if (acwr <= 1.5) return "caution";
  return "high";
}

function buildAdvice(zone: LoadZone, acwr: number | null, weekLoad: number): string {
  const ratio = acwr == null ? "—" : acwr.toFixed(2);
  switch (zone) {
    case "none":
      return "No completed sessions in the last 28 days, so there is no load to manage yet. Log a session to start your baseline.";
    case "under":
      return `Your acute:chronic ratio is ${ratio} — under the training you're used to. If you feel fresh, you have room to add a session; ramp up gradually rather than jumping.`;
    case "optimal":
      return `Ratio ${ratio} sits in the 0.8–1.3 "sweet spot". You're absorbing load well — maintain the current rhythm before pushing the volume up.`;
    case "caution":
      return `Ratio ${ratio} is climbing toward the risk band. Keep the next block technical or lighter and prioritise sleep — avoid adding a high-intensity session back-to-back.`;
    case "high":
      return `Ratio ${ratio} is above the 1.5 spike threshold, where injury risk climbs. Consider a deload: cut volume sharply for a few days before building again.`;
    default:
      return "";
  }
}

function buildRecommendation(
  zone: LoadZone,
  acwr: number | null,
  hasData: boolean,
  weeks: number,
  conf: number,
): { text: string; confidence: number } | null {
  if (!hasData) return null;
  const lowHistory = weeks < 3;
  let text: string;
  switch (zone) {
    case "under":
      text = "Add one moderate session this week, then re-check the ratio before adding more.";
      break;
    case "optimal":
      text = "Hold your current weekly volume — progress by intensity, not by piling on sessions.";
      break;
    case "caution":
      text = "Swap the hardest planned session for a technique or recovery block.";
      break;
    case "high":
      text = "Take 3–4 lighter days, then rebuild volume step by step.";
      break;
    default:
      text = "Keep logging to establish a reliable baseline.";
  }
  if (lowHistory) text += " (Early trend — the ratio firms up after ~3 weeks of data.)";
  const confidence = acwr == null ? Math.min(conf, 45) : conf;
  return { text, confidence };
}

function confidenceInput(sessions: number, weeks: number): number {
  return Math.max(35, Math.min(92, 40 + sessions * 4 + weeks * 4));
}

function buildEvidence(
  totalSessions: number,
  durationMin: number,
  weekLoad: number,
  acute: number,
  chronic: number,
  acwr: number | null,
  weekly: WeeklyLoad[],
  monotony: number | null,
  strain: number | null,
): string[] {
  const e: string[] = [];
  e.push(`Tracked sessions: ${totalSessions} (${durationMin} min total)`);
  e.push(`This week's load: ${weekLoad} AU · last 7 days`);
  e.push(`Acute (7-day avg daily): ${acute} AU`);
  e.push(`Chronic (28-day avg daily): ${chronic} AU`);
  e.push(`ACWR (acute ÷ chronic): ${acwr == null ? "not enough chronic load" : acwr.toFixed(2)}`);
  const active = weekly.filter((w) => w.sessions > 0).length;
  e.push(`Weeks with training: ${active}/${weekly.length}`);
  if (monotony != null) e.push(`Weekly monotony: ${monotony.toFixed(2)}`);
  if (strain != null) e.push(`Weekly strain: ${strain} AU`);
  return e;
}

export const ZONE_LABEL: Record<LoadZone, string> = {
  none: "No data",
  under: "Underloaded",
  optimal: "Optimal",
  caution: "Precautionary",
  high: "High-risk spike",
};
