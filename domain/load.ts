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
  // Every sentence the load model hands the screen is a row, not a string: a domain
  // module that returns `string` is English in every locale and invisible to the
  // raw-UI scan, which reads component source only.
  advice: RowText;
  recommendation: { text: RowText; earlyTrend: RowText | null; confidence: number } | null;
  evidence: RowText[];
  sources: RowText[];
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

  // `weekly` is a fixed chronic window, not a history length: buildWeekly always emits
  // CHRONIC_DAYS/7 buckets, so its length says nothing about how long someone has been
  // training. A week counts toward depth only if it carries a session — otherwise a
  // first-time reader would be told their ratio had settled.
  const activeWeeks = weekly.filter((w) => w.sessions > 0).length;

  const advice = buildAdvice(zone, acwr);
  const recommendation = buildRecommendation(zone, acwr, hasData, activeWeeks, confidenceInput(totalSessions, activeWeeks));

  const evidence = buildEvidence(totalSessions, durationMin, weekLoad, acute, chronic, acwr, activeWeeks, weekly.length, monotony, strain);

  const sources: RowText[] = [
    { key: "common.src.log" },
    { key: "ld.src.rpe" },
    { key: "ld.src.bands" },
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

// The thresholds quoted in the advice, read out of the same table the classifier walks,
// so changing a band cannot leave a stale number in a sentence the reader sees.
const BAND_EDGE = {
  underMax: ACWR_BANDS[0].upTo as number,
  optimalMax: ACWR_BANDS[1].upTo as number,
  cautionMax: ACWR_BANDS[2].upTo as number,
};

// Below this many weeks of history the ratio is an early trend, and the page says so.
export const WEEKS_TO_SETTLE = 3;

function buildAdvice(zone: LoadZone, acwr: number | null): RowText {
  // A null ratio reaches this point only as `caution` (no 28-day window to divide by) or
  // `none` (no weekly load at all), and both used to be answered with a sentence about a
  // number — "Ratio — is climbing toward the risk band". Say what is missing instead.
  if (acwr == null) {
    return zone === "none"
      ? { key: "ld.ad.none", vars: { days: ACUTE_DAYS } }
      : { key: "ld.ad.noRatio", vars: { days: CHRONIC_DAYS } };
  }
  const ratio = acwr.toFixed(2);
  switch (zone) {
    case "under":
      return { key: "ld.ad.under", vars: { ratio } };
    case "optimal":
      return { key: "ld.ad.optimal", vars: { ratio, lo: BAND_EDGE.underMax, hi: BAND_EDGE.optimalMax } };
    case "caution":
      return { key: "ld.ad.caution", vars: { ratio } };
    case "high":
      return { key: "ld.ad.high", vars: { ratio, max: BAND_EDGE.cautionMax } };
    default:
      // Reachable, not a catch-all: a rest week with a chronic window behind it computes
      // a ratio of 0.00, so `none` can arrive here with a real number to report.
      return { key: "ld.ad.none", vars: { days: ACUTE_DAYS } };
  }
}

// The one action each zone recommends — a map rather than a switch, because a `default:`
// arm here would hide which zone the sentence actually answers.
const REC_TEXT: Record<LoadZone, RowText> = {
  none: { key: "ld.rec.rest", vars: { days: ACUTE_DAYS } },
  under: { key: "ld.rec.under" },
  optimal: { key: "ld.rec.optimal" },
  caution: { key: "ld.rec.caution" },
  high: { key: "ld.rec.high" },
};

function buildRecommendation(
  zone: LoadZone,
  acwr: number | null,
  hasData: boolean,
  activeWeeks: number,
  conf: number,
): { text: RowText; earlyTrend: RowText | null; confidence: number } | null {
  if (!hasData) return null;
  const earlyTrend: RowText | null =
    activeWeeks < WEEKS_TO_SETTLE ? { key: "ld.rec.early", vars: { weeks: WEEKS_TO_SETTLE } } : null;
  let text: RowText = REC_TEXT[zone];
  // A null ratio with weekly load only ever classifies as caution, and that zone's row
  // tells the reader to swap out their hardest session because the ratio is climbing.
  // Nothing is climbing; there is simply no month of load to divide by yet.
  if (acwr == null && zone === "caution") text = { key: "ld.rec.noRatio", vars: { days: CHRONIC_DAYS } };
  const confidence = acwr == null ? Math.min(conf, 45) : conf;
  return { text, earlyTrend, confidence };
}

function confidenceInput(sessions: number, activeWeeks: number): number {
  return Math.max(35, Math.min(92, 40 + sessions * 4 + activeWeeks * 4));
}

function buildEvidence(
  totalSessions: number,
  durationMin: number,
  weekLoad: number,
  acute: number,
  chronic: number,
  acwr: number | null,
  activeWeeks: number,
  totalWeeks: number,
  monotony: number | null,
  strain: number | null,
): RowText[] {
  const e: RowText[] = [];
  e.push({ key: "ld.ev.sessions", vars: { n: totalSessions, min: durationMin } });
  e.push({ key: "ld.ev.week", vars: { value: weekLoad, days: ACUTE_DAYS } });
  e.push({ key: "ld.ev.acute", vars: { days: ACUTE_DAYS, value: acute } });
  e.push({ key: "ld.ev.chronic", vars: { days: CHRONIC_DAYS, value: chronic } });
  // The missing value is its own row rather than a word substituted into a number's
  // place: "ACWR: not enough chronic load" cannot be re-ordered by a translator who has
  // to put the label after the value.
  e.push(acwr == null ? { key: "ld.ev.acwrNone" } : { key: "ld.ev.acwr", vars: { value: acwr.toFixed(2) } });
  // One definition of "a week that counts" for all three places that need it: the number
  // on this line, the confidence figure and the early-trend caveat. If they disagreed, a
  // reader could be told they have 3 weeks of history and that the ratio is still early.
  e.push({ key: "ld.ev.weeks", vars: { active: activeWeeks, total: totalWeeks } });
  if (monotony != null) e.push({ key: "ld.ev.monotony", vars: { value: monotony.toFixed(2) } });
  if (strain != null) e.push({ key: "ld.ev.strain", vars: { value: strain } });
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
