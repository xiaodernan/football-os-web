// The profile is the one place the three modes should meet. This module folds
// what each pillar actually holds on this device into a single, checkable record:
// real counts, real last-activity timestamps, and an honest "not started" for the
// pillars a visitor has never used rather than quietly hiding them.
// Pure: every input is passed in, no IO, no React.

import { attributeLabel } from "./attributes";

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
  player: PlayerInput;
  manager: ManagerInput;
  film: FilmInput;
  fan: FanInput;
}

export interface FootprintRow {
  id: "player" | "manager" | "film" | "fan";
  label: string;
  to: string;
  active: boolean;
  lines: string[];
  lastAt?: string;
}

export interface Footprint {
  rows: FootprintRow[];
  pillarsTouched: number;
  totalMinutes: number;
  lastActiveAt: string | null;
  evidence: string[];
  sources: string[];
}

const ts = (iso?: string) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const later = (...isos: (string | undefined)[]): string | undefined =>
  isos.filter((i): i is string => !!i && ts(i) > 0).sort((a, b) => ts(b) - ts(a))[0];

const mins = (v: number) => `${Math.round(v * 10) / 10}`;

export function buildFootprint(i: FootprintInput): Footprint {
  const rows: FootprintRow[] = [];

  const p = i.player;
  const playerActive = p.sessionsCompleted > 0 || p.lessonsCompleted > 0 || p.plans > 0;
  rows.push({
    id: "player",
    label: "Player",
    to: "/player",
    active: playerActive,
    lines: playerActive
      ? [
          `${p.sessionsCompleted} session${p.sessionsCompleted === 1 ? "" : "s"} · ${mins(p.minutes)} min trained`,
          `Level ${p.level} · ${p.xp} XP · ${p.goalsDone} goal${p.goalsDone === 1 ? "" : "s"} met`,
          `${p.lessonsCompleted} academy lesson${p.lessonsCompleted === 1 ? "" : "s"} · ${p.lessonsMastered} passed check`,
        ]
      : ["No training log yet — onboarding a profile starts this pillar."],
    lastAt: later(p.lastSessionAt, p.lastLessonAt),
  });

  const m = i.manager;
  rows.push({
    id: "manager",
    label: "Manager",
    to: "/manager",
    active: m.active && m.matches > 0,
    lines:
      m.active && m.matches > 0
        ? [
            `${m.clubName ?? "Your club"} · ${m.matches} fixture${m.matches === 1 ? "" : "s"} managed`,
            m.pointsPerGame != null ? `${m.pointsPerGame.toFixed(2)} pts/game` : "",
            m.position != null && m.clubCount ? `#${m.position} of ${m.clubCount}` : "",
          ].filter(Boolean)
        : m.active
          ? ["Career started but no fixture played yet."]
          : ["No career started."],
    lastAt: m.lastMatchAt,
  });

  const f = i.film;
  rows.push({
    id: "film",
    label: "Film",
    to: "/film",
    active: f.clips > 0,
    lines:
      f.clips > 0
        ? [
            `${f.clips} clip${f.clips === 1 ? "" : "s"} analysed · ${mins(f.minutes)} min of footage`,
            f.detections != null && f.scanPerMinute != null
              ? `${f.detections} detections · ${f.scanPerMinute.toFixed(2)} scans/min${f.avgConfidence ? ` · ${f.avgConfidence}% mean confidence` : ""}`
              : "",
            f.recurringFocus && f.recurringFocus.length
              ? `Repeated coaching focus: ${f.recurringFocus.map((x) => `${attributeLabel(x.key)} ×${x.clips}`).join(", ")}`
              : "",
          ].filter(Boolean)
        : ["No clips analysed on this device."],
    lastAt: f.lastClipAt,
  });

  const fa = i.fan;
  const fanActive = fa.watchlist > 0 || fa.posts > 0 || fa.replies > 0;
  rows.push({
    id: "fan",
    label: "Fan",
    to: "/watchlist",
    active: fanActive,
    lines: fanActive
      ? [
          `${fa.watchlist} player${fa.watchlist === 1 ? "" : "s"} watched`,
          fa.posts + fa.replies > 0 ? `${fa.posts} post${fa.posts === 1 ? "" : "s"} · ${fa.replies} repl${fa.replies === 1 ? "y" : "ies"}` : "Nothing posted yet",
          fa.favouriteClubName ? `Supports ${fa.favouriteClubName}` : "",
        ].filter(Boolean)
      : ["No watchlist, favourites or posts yet."],
    lastAt: fa.lastPostAt,
  });

  const totalMinutes = p.minutes + f.minutes;
  const lastActiveAt = later(...rows.map((r) => r.lastAt)) ?? null;
  const touched = rows.filter((r) => r.active).length;

  const evidence = [
    `${touched} of ${rows.length} pillars have real records on this device`,
    `${mins(totalMinutes)} minutes of your own training and film`,
    lastActiveAt ? `Most recent activity ${new Date(lastActiveAt).toLocaleString()}` : "No dated activity recorded yet",
  ];

  return {
    rows,
    pillarsTouched: touched,
    totalMinutes: Math.round(totalMinutes * 10) / 10,
    lastActiveAt,
    evidence,
    sources: ["Your on-device Football OS state", "Academy, career, film and community local records"],
  };
}
