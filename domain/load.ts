import type { RowText } from "./rowText";
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

  const zone = classifyZone(acwr, weekLoad);

  const advice = buildAdvice(zone, acwr);
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

// The ACWR bands, in the order the classifier tests them. Every number in this app's
// load guidance lives here once: `classifyZone` reads the verdict out of this table and
// `ZONE_LEGEND` composes the range text out of it, so the legend under the zone banner
// cannot drift from the rule that put you in that zone — which is exactly what it used to
// be: four threshold strings typed into the screen next to three numbers in a switch.
// `upTo` is inclusive for the two middle bands (ratio 1.30 is still "optimal", 1.50 still
// "cautionary") and exclusive for the first (`0.80` is not "under").
export const ACWR_BANDS: { zone: Exclude<LoadZone, "none">; upTo: number | null; incl: boolean }[] = [
  { zone: "under", upTo: 0.8, incl: false },
  { zone: "optimal", upTo: 1.3, incl: true },
  { zone: "caution", upTo: 1.5, incl: true },
  { zone: "high", upTo: null, incl: false },
];

// The third argument is the 28-day total, and `weekLoad` is the 7-day slice of it,
// so a nonzero week always means a nonzero chronic total. That makes the old
// "no ratio AND no chronic load" arm unreachable — the only way to an absent ratio is
// a chronic total small enough to round to zero, which is a history that exists but is
// too short to divide by. Hence: unknown ratio means "not enough baseline yet", and it
// is said that way rather than by borrowing a band's sentence.
export function classifyZone(acwr: number | null, weekLoad: number): LoadZone {
  if (!weekLoad) return "none";
  if (acwr == null) return "caution";
  for (const band of ACWR_BANDS) {
    if (band.upTo == null) return band.zone;
    if (band.incl ? acwr <= band.upTo : acwr < band.upTo) return band.zone;
  }
  return "high";
}

function buildAdvice(zone: LoadZone, acwr: number | null): string {
  const ratio = acwr == null ? "—" : acwr.toFixed(2);
  // `classifyZone` can only reach a null ratio through the caution band, and the band's
  // sentence quotes a number that does not exist. Say what is actually missing instead.
  if (zone === "caution" && acwr == null) {
    return "There is load this week, but not enough of a 28-day history to divide it by, so the ratio itself is not available yet. Keep the next sessions light and regular — the bands become meaningful once a month of load exists.";
  }
  switch (zone) {
    case "none":
      // Reachable two ways: no history at all, and a month of history with an empty
      // current week. The old line asserted the first even to readers who had three
      // sessions behind them, so the sentence keeps to the window that is actually empty.
      return "Nothing logged in the last 7 days, so there is no weekly load to judge and no ratio to report. Log a session when you're ready to start — or restart — the count.";
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
      // Only the `none` zone reaches here, and only when there is data at all: the
      // recommendation is null for a brand-new account. So this is a rest week, not a
      // missing baseline, and it should not read like one.
      text = "Nothing logged in the last 7 days, so the ratio has no weekly load to compare. One session brings the number back.";
  }
  // A null ratio with weekly load only ever classifies as caution, and that band's line
  // tells the reader to swap out their hardest session because the ratio is climbing.
  // Nothing is climbing; there is simply no month of load to divide by yet. (An empty
  // week is the `none` arm above, which is the truer statement for that state.)
  if (acwr == null && zone === "caution") text = "Not enough of a 28-day history to compute a ratio. Keep the week light and regular, then re-check once a month of load exists.";
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

// A zone name is a key, not a word typed in here. The banner on /load, the ACWR legend
// under it, the player screen's load tile and the dashboard's recovery line all print the
// same five names, and until now the legend read the dictionary while the banner read this
// map — so a reader of 简体中文 got 负荷不足 in one line and "Underloaded" in the one above
// it, on the same screen. `RowText` is the convention that makes producing an English
// noun in a domain module a type error rather than an oversight.
export const ZONE_LABEL: Record<LoadZone, RowText> = {
  none: { key: "ld.zoneNone" },
  under: { key: "ld.zoneUnder" },
  optimal: { key: "ld.zoneOptimal" },
  caution: { key: "ld.zoneCaution" },
  high: { key: "ld.zoneHigh" },
};

// The range text the legend prints, composed from the same numbers the classifier uses.
export const ZONE_LEGEND: { zone: Exclude<LoadZone, "none">; band: string }[] = ACWR_BANDS.map(
  (band, i) => {
    const prev = i > 0 ? ACWR_BANDS[i - 1].upTo : null;
    if (band.upTo == null) return { zone: band.zone, band: `>${prev}` };
    if (prev == null) return { zone: band.zone, band: `<${band.upTo}` };
    return { zone: band.zone, band: `${prev}–${band.upTo}` };
  },
);
