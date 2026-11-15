// M1149 · The Pulse — how this world behaves when nobody is watching.
// Folds the device's own visit trail (localStorage, never the network) into the numbers the
// operator needs: sessions, depth, bounce, exit, the dead-end door. When the device holds
// nothing yet, a seeded cohort (n = 2000) renders the SAME fold so the console is not blank
// on first entry — always labelled "seeded demonstration cohort", never presented as real traffic.

import { sum, tally, last } from "./attributes";
import { DAY_MS } from "@/lib/utils";
import { round2, safeDiv } from "@/lib/utils";

export const PULSE_KEY = "football-os.pulse.v1";

export type Cohort = "device" | "seeded";

export interface VisitRecord {
  path: string;
  /** epoch millis the visit began */
  at: number;
  /** milliseconds until the visitor left for somewhere else (0 = still being timed) */
  dwellMs: number;
}

export interface RouteRow {
  path: string;
  visits: number;
  avgDwellMs: number;
  exits: number;
  bounceShare: number;
}

export interface PulseFold {
  cohort: Cohort;
  visits: number;
  sessions: number;
  bounceSessions: number;
  bounceRate: number;
  avgDepth: number;
  avgDwellMs: number;
  loopSessions: number;
  loopRate: number;
  deadEndSessions: number;
  depthBuckets: [number, number, number, number];
  perRoute: RouteRow[];
  exits: { path: string; exits: number }[];
  trend: { day: string; visits: number }[];
}

const SESSION_GAP_MS = 30 * 60 * 1000;
const BOUNCE_DWELL_MS = 5_000;
/** A bounce share at or above this percentage is highlighted as a warning band. */
export const HIGH_BOUNCE_SHARE = 50;
const DEAD_END_MS = 3_000;

const isPhantom = (v: VisitRecord) => v.at <= 0;

/** Split a chronological visit trail into sessions on the 30-minute inactivity fold. */
function splitSessions(visits: VisitRecord[]): VisitRecord[][] {
  const out: VisitRecord[][] = [];
  let cur: VisitRecord[] = [];
  for (const v of visits) {
    const prevVisit = last(cur);
    if (prevVisit && v.at - (prevVisit.at + prevVisit.dwellMs) > SESSION_GAP_MS) {
      out.push(cur);
      cur = [];
    }
    cur.push(v);
  }
  if (cur.length) out.push(cur);
  return out;
}

const emptyFold = (): PulseFold => ({
  cohort: "device",
  visits: 0, sessions: 0, bounceSessions: 0, bounceRate: 0, avgDepth: 0, avgDwellMs: 0,
  loopSessions: 0, loopRate: 0, deadEndSessions: 0, depthBuckets: [0, 0, 0, 0],
  perRoute: [], exits: [], trend: [],
});

/** The one fold. Both real traces and the seeded cohort ride the same lane — no re-derivation. */
export function foldPulse(rawVisits: readonly VisitRecord[], cohort: Cohort = "device"): PulseFold {
  const visits = [...rawVisits].filter((v) => !isPhantom(v)).sort((a, b) => a.at - b.at);
  if (visits.length === 0) return { ...emptyFold(), cohort };

  const sessions = splitSessions(visits);
  const sessionCount = sessions.length;
  const depths = sessions.map((s) => s.length);
  const bounceSessions = sessions.filter((s) => s.length === 1 && s[0].dwellMs < BOUNCE_DWELL_MS).length;
  const loopSessions = sessions.filter((s) => new Set(s.map((v) => v.path)).size < s.length).length;
  const deadEndSessions = sessions.filter((s) => (last(s)?.dwellMs ?? 0) < DEAD_END_MS).length;

  const perRoute = (() => {
    const by = new Map<string, { visits: number; dwell: number; bounces: number; exits: number }>();
    for (const s of sessions) {
      for (let i = 0; i < s.length; i++) {
        const v = s[i];
        const b = by.get(v.path) ?? { visits: 0, dwell: 0, bounces: 0, exits: 0 };
        b.visits++;
        b.dwell += v.dwellMs;
        if (v.dwellMs < BOUNCE_DWELL_MS) b.bounces++;
        if (i === s.length - 1) b.exits++;
        by.set(v.path, b);
      }
    }
    return [...by.entries()]
      .map(([path, b]) => ({ path, visits: b.visits, avgDwellMs: Math.round(safeDiv(b.dwell, b.visits)), exits: b.exits, bounceShare: round2(safeDiv(b.bounces * 100, b.visits)) }))
      .sort((a, b) => b.visits - a.visits || a.path.localeCompare(b.path));
  })();

  const exits = [...perRoute]
    .filter((r) => r.exits > 0)
    .map(({ path, exits: e }) => ({ path, exits: e }))
    .sort((a, b) => b.exits - a.exits || a.path.localeCompare(b.path))
    .slice(0, 6);

  const trend = (() => {
    const by = tally(visits, (v) => new Date(v.at).toISOString().slice(0, 10));
    const days = [...by.keys()].sort().slice(-14);
    return days.map((day) => ({ day, visits: by.get(day) ?? 0 }));
  })();

  const bucket = (d: number) => (d === 1 ? 0 : d <= 3 ? 1 : d <= 6 ? 2 : 3);
  const depthBuckets: [number, number, number, number] = [0, 0, 0, 0];
  for (const d of depths) depthBuckets[bucket(d)]++;

  const totalDwell = sum(visits, (v) => v.dwellMs);
  const totalSessions = sessionCount || 1;

  return {
    cohort,
    visits: visits.length,
    sessions: sessionCount,
    bounceSessions,
    bounceRate: round2(safeDiv(bounceSessions * 100, totalSessions)),
    avgDepth: round2(safeDiv(visits.length, totalSessions)),
    avgDwellMs: Math.round(safeDiv(totalDwell, visits.length)),
    loopSessions,
    loopRate: round2(safeDiv(loopSessions * 100, totalSessions)),
    deadEndSessions,
    depthBuckets,
    perRoute,
    exits,
    trend,
  };
}

/** mulberry-ish LCG, one seeded generator for the whole cohort — no Math.random. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const DEEP_ROUTES = ["/football", "/dream-team", "/leaders", "/news", "/tomorrow", "/ai", "/records", "/legends", "/chronicle", "/scouting", "/dossiers", "/manual", "/academy"];
const CONTINUATIONS: [string, number][] = [
  ["/football", 0.26], ["/dream-team", 0.10], ["/leaders", 0.10], ["/tomorrow", 0.09], ["/ai", 0.08],
  ["/news", 0.06], ["/scouting", 0.05], ["/records", 0.05], ["/manual", 0.05], ["/academy", 0.05], ["/onboarding", 0.05], ["/about", 0.06],
];
const PAGE_DWELL: Record<string, number> = { "/": 38_000, "/onboarding": 52_000, "/manual": 64_000, "/dream-team": 95_000 };
const BOUNCE_HAZARD: Record<string, number> = { "/": 0.42, "/onboarding": 0.30, "/manual": 0.25 };

/** A seeded 2,000-session demonstration cohort recorded through the same doors the device uses. */
const COHORT_SEED = 20261115;

export function syntheticCohort(): VisitRecord[] {
  const rnd = lcg(COHORT_SEED);
  const out: VisitRecord[] = [];
  const pick = (xs: readonly string[]) => xs[Math.floor(rnd() * xs.length)] ?? xs[0];
  const weighted = (table: readonly [string, number][]) => {
    let r = rnd();
    for (const [k, w] of table) { if (r < w) return k; r -= w; }
    const tail = last(table);
    return tail ? tail[0] : table[0][0];
  };
  let clock = Date.now() - 14 * DAY_MS;
  const advance = () => { clock += Math.floor(rnd() * 240_000) + 15_000; };

  for (let i = 0; i < 2000; i++) {
    let path = rnd() < 0.58 ? "/" : rnd() < 0.24 ? pick(DEEP_ROUTES) : rnd() < 0.52 ? "/onboarding" : "/manual";
    const sessionStart = clock;
    const count = 1 + Math.floor(rnd() * 6 + rnd() * 4);
    for (let step = 0; step < count; step++) {
      const bounce = rnd() < (BOUNCE_HAZARD[path] ?? 0.35);
      const dwell = Math.max(800, Math.round((PAGE_DWELL[path] ?? 45_000) * (0.55 + rnd() * 0.9)));
      out.push({ path, at: clock, dwellMs: dwell });
      advance();
      if (bounce) break;
      if (rnd() < 0.08) {
        // backtracks to the corridor the visitor came from — a re-visit, not a new screen
        out.push({ path, at: clock, dwellMs: Math.max(600, Math.round(dwell * 0.35)) });
        advance();
        continue;
      }
      path = weighted(CONTINUATIONS);
    }
    // idle gap between sessions keeps splitSessions honest
    clock = Math.max(clock, sessionStart) + Math.floor(rnd() * 5_000) + Math.floor((rnd() < 0.25 ? 40 * 60_000 : 5 * 60_000) * rnd());
  }
  return out;
}

