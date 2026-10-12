// The profile is the one place the three modes should meet. This module folds
// what each pillar actually holds on this device into a single, checkable record:
// real counts, real last-activity timestamps, and an honest "not started" for the
// pillars a visitor has never used rather than quietly hiding them.
// Pure: every input is passed in, no IO, no React.

import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/dictionaries";
import type { RowText } from "./rowText";
import { round1 } from "./scouting";
import { epochMs } from "@/lib/utils";

export interface PlayerInput {
  sessionsCompleted: number;
  minutes: number;
  xp: number;
  level: number;
  plans: number;
  goalsDone: number;
  lessonsCompleted: number;
  lessonsMastered: number;
  lastSessionAt?: string;
  lastLessonAt?: string;
}

export interface ManagerInput {
  active: boolean;
  clubName?: string;
  matches: number;
  pointsPerGame?: number;
  position?: number;
  clubCount?: number;
  lastMatchAt?: string;
}

export interface FilmInput {
  clips: number;
  minutes: number;
  lastClipAt?: string;
  detections?: number;
  scanPerMinute?: number;
  avgConfidence?: number;
  recurringFocus?: { key: string; clips: number }[];
}

export interface FanInput {
  watchlist: number;
  posts: number;
  replies: number;
  favouriteClubName?: string;
  lastPostAt?: string;
}

export interface FootprintInput {
  /** Whose calendar the last-activity line is written in. The interface asks;
   *  the browser no longer answers. */
  locale: Locale;
  player: PlayerInput;
  manager: ManagerInput;
  film: FilmInput;
  fan: FanInput;
}

export interface FootprintRow {
  id: "player" | "manager" | "film" | "fan";
  to: string;
  active: boolean;
  lines: RowText[];
  lastAt?: string;
}

export interface Footprint {
  rows: FootprintRow[];
  pillarsTouched: number;
  totalMinutes: number;
  lastActiveAt: string | null;
  evidence: RowText[];
  sources: RowText[];
}

const later = (...isos: (string | undefined)[]): string | undefined =>
  isos.filter((i): i is string => !!i && epochMs(i) > 0).sort((a, b) => epochMs(b) - epochMs(a))[0];

const mins = (v: number) => `${round1(v)}`;

/** Drop the arms a pillar's record did not supply. The parameter is typed rather than
 *  inferred on purpose: an array of object literals with different `vars` shapes does not
 *  satisfy the row union on its own, and TypeScript then rejects the narrowing predicate
 *  instead of the arm that is actually wrong. Typing the argument makes each arm check
 *  against `RowText`, which is where a mistake belongs. */
const present = (arms: (RowText | null)[]): RowText[] => arms.filter((r): r is RowText => r !== null);

export function buildFootprint(i: FootprintInput): Footprint {
  const rows: FootprintRow[] = [];

  // A count word is a key, not an English "-s" glued on in here: the singular and the plural
  // are separate rows (`…One` / `…`) because no `{n}` can pick an arm, which is the rule
  // domain/history.ts already follows. `label` is gone: the profile prints `prof.mode.${id}`
  // for the card's title, so the English word this field held had no reader at all.
  const p = i.player;
  const playerActive = p.sessionsCompleted > 0 || p.lessonsCompleted > 0 || p.plans > 0;
  rows.push({
    id: "player",
    to: "/player",
    active: playerActive,
    lines: playerActive
      ? present([
          { key: p.sessionsCompleted === 1 ? "fp.player.sessionsOne" : "fp.player.sessions", vars: { n: p.sessionsCompleted, min: mins(p.minutes) } },
          { key: p.goalsDone === 1 ? "fp.player.levelOne" : "fp.player.level", vars: { level: p.level, xp: p.xp, n: p.goalsDone } },
          { key: p.lessonsCompleted === 1 ? "fp.player.lessonsOne" : "fp.player.lessons", vars: { n: p.lessonsCompleted, passed: p.lessonsMastered } },
        ])
      : [{ key: "fp.player.none" }],
    lastAt: later(p.lastSessionAt, p.lastLessonAt),
  });

  const m = i.manager;
  rows.push({
    id: "manager",
    to: "/manager",
    active: m.active && m.matches > 0,
    lines:
      m.active && m.matches > 0
        ? present([
            // The club name is the record's own; when the career has none the line has to lose
            // the whole "name · " prefix rather than print a separator with nothing before it,
            // so the absent case is its own pair of keys rather than a substituted word.
            m.clubName
              ? { key: m.matches === 1 ? "fp.manager.fixturesOne" : "fp.manager.fixtures", vars: { club: m.clubName, n: m.matches } }
              : { key: m.matches === 1 ? "fp.manager.fixturesNoClubOne" : "fp.manager.fixturesNoClub", vars: { n: m.matches } },
            m.pointsPerGame != null ? { key: "fp.manager.ppg", vars: { n: m.pointsPerGame.toFixed(2) } } : null,
            m.position != null && m.clubCount ? { key: "fp.manager.table", vars: { pos: m.position, total: m.clubCount } } : null,
          ])
        : m.active
          ? [{ key: "fp.manager.noFixture" }]
          : [{ key: "fp.manager.none" }],
    lastAt: m.lastMatchAt,
  });

  const f = i.film;
  rows.push({
    id: "film",
    to: "/film",
    active: f.clips > 0,
    lines:
      f.clips > 0
        ? present([
            { key: f.clips === 1 ? "fp.film.clipsOne" : "fp.film.clips", vars: { n: f.clips, min: mins(f.minutes) } },
            f.detections != null && f.scanPerMinute != null
              ? f.avgConfidence
                ? { key: "fp.film.detectionsConf", vars: { n: f.detections, rate: f.scanPerMinute.toFixed(2), conf: f.avgConfidence } }
                : { key: "fp.film.detections", vars: { n: f.detections, rate: f.scanPerMinute.toFixed(2) } }
              : null,
            f.recurringFocus && f.recurringFocus.length
              ? { key: "fp.film.focus", vars: { foci: f.recurringFocus.map((x) => `${x.key}:${x.clips}`).join(",") } }
              : null,
          ])
        : [{ key: "fp.film.none" }],
    lastAt: f.lastClipAt,
  });

  const fa = i.fan;
  const fanActive = fa.watchlist > 0 || fa.posts > 0 || fa.replies > 0;
  rows.push({
    id: "fan",
    to: "/watchlist",
    active: fanActive,
    lines: fanActive
      ? present([
          { key: fa.watchlist === 1 ? "fp.fan.watchedOne" : "fp.fan.watched", vars: { n: fa.watchlist } },
          fa.posts + fa.replies > 0
            ? {
                key: fa.posts === 1
                  ? fa.replies === 1 ? "fp.fan.postsOneOne" : "fp.fan.postsOneMany"
                  : fa.replies === 1 ? "fp.fan.postsManyOne" : "fp.fan.postsManyMany",
                vars: { posts: fa.posts, replies: fa.replies },
              }
            : { key: "fp.fan.nothingPosted" },
          fa.favouriteClubName ? { key: "fp.fan.supports", vars: { club: fa.favouriteClubName } } : null,
        ])
      : [{ key: "fp.fan.none" }],
    lastAt: fa.lastPostAt,
  });

  const totalMinutes = p.minutes + f.minutes;
  const lastActiveAt = later(...rows.map((r) => r.lastAt)) ?? null;
  const touched = rows.filter((r) => r.active).length;

  const evidence: RowText[] = [
    { key: "fp.ev.pillars", vars: { n: touched, total: rows.length } },
    { key: "fp.ev.minutes", vars: { min: mins(totalMinutes) } },
    lastActiveAt
      ? { key: "fp.ev.recent", vars: { date: formatDate(i.locale, lastActiveAt) } }
      : { key: "fp.ev.noActivity" },
  ];

  return {
    rows,
    pillarsTouched: touched,
    totalMinutes: round1(totalMinutes),
    lastActiveAt,
    evidence,
    sources: [{ key: "fp.src.state" }, { key: "fp.src.local" }],
  };
}
