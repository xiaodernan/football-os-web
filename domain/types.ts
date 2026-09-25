// Core domain types shared across the Football OS product.

import type { RowText } from "./rowText";

export type Mode = "FAN" | "PLAYER" | "MANAGER";

// The same three codes as the union, spelled once at runtime so a reader that has to
// recognise a stored mode (domain/rowText.ts) can be checked against this list rather
// than keeping a second copy that nothing audits. proof-i18n fails if the two drift.
export const MODES: readonly Mode[] = ["FAN", "PLAYER", "MANAGER"];

export type PositionGroup = "GK" | "CB" | "FB" | "DM" | "CM" | "AM" | "W" | "ST";

export interface NamedValue {
  key: string;
  label: string;
  value: number;
}

export type Attributes = Record<string, number>;

export interface PlayerRef {
  id: string;
  name: string;
  position: string;
  positionGroup: PositionGroup;
  age: number;
  nation: string;
  clubId: string;
  overall: number;
  potential: number;
  archetype: string;
  value: number; // market value in EUR
  foot: "L" | "R";
  /** The attribute vector this player's overall was computed from. Optional
   *  because providers may ship ratings without a full vector. */
  attributes?: Attributes;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  competitionId: string;
  nation: string;
  overall: number;
  colors: [string, string];
  stadium: string;
}

export interface Competition {
  id: string;
  name: string;
  nation: string;
  tier: number;
  clubIds: string[];
}

export interface Standing {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED";

export interface Match {
  id: string;
  competitionId: string;
  season: string;
  homeClubId: string;
  awayClubId: string;
  kickoff: string; // ISO
  round: number;
  status: MatchStatus;
  homeGoals: number | null;
  awayGoals: number | null;
  events?: MatchEvent[];
}

export type MatchEventType =
  | "GOAL"
  | "YELLOW"
  | "RED"
  | "SHOT"
  | "SAVE"
  | "VAR";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: "home" | "away";
  player: string;
  detail?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  // Genuine external reference a real news provider can supply. Demo Mode never
  // fabricates one, so the article UI only shows a "read at source" link when a
  // real provider has actually attached a resolvable url.
  url?: string;
  publishedAt: string;
  credibility: number; // 0..1
  kind: "Confirmed" | "Reported" | "Rumor" | "Opinion" | "Analysis";
  entityIds: string[];
  topics: string[];
}

// ---- Player OS (user world) ----

export interface UserProfile {
  displayName: string;
  mode: Mode;
  positionGroup: PositionGroup;
  position: string;
  ageGroup: string;
  goal: string;
  favoriteClubId: string | null;
  favoritePlayerId: string | null;
  favoriteCompetitionId: string | null;
  attributes: Attributes;
  xp: number;
  level: number;
  createdAt: string;
}

export interface TrainingExercise {
  key: string;
  label: string;
  focus: string; // attribute key
  minutes: number;
  intensity: number; // 1..5
  phase: "warmup" | "technique" | "decision" | "game" | "cooldown";
}

export interface AttributeDelta {
  key: string;
  from: number;
  to: number;
  delta: number;
}

export interface TrainingSession {
  id: string;
  date: string; // ISO date
  title: string;
  focusAttributes: string[];
  exercises: TrainingExercise[];
  targetMinutes: number;
  status: "planned" | "completed" | "missed";
  completedAt?: string;
  selfRating?: number; // 1..5
  xpAwarded?: number;
  notes?: string;
  growth?: AttributeDelta[]; // attributes that actually rose on completion
}

export interface AiMemoryEntry {
  id: string;
  kind: "coach" | "training" | "profile";
  // Keyed row: the app composes these lines, so their words belong to the reader. See
  // ./rowText and ./memory.
  text: RowText;
  at: string;
}

export interface CoachPlan {
  id: string;
  createdAt: string;
  prompt: string;
  diagnosis: string;
  focus: string[];
  session: TrainingSession;
  rationale: string[];
  confidence: number;
  sources: string[];
  provider: string;
}

// The four things a goal can count. A row stores the code, never the word: the
// unit label is resolved through the dictionary where the row is read, so a goal
// created in one locale does not freeze its own wording for every later reader.
export type GoalMetric = "xp" | "sessions" | "level" | "attribute";

// The goal a visitor picks during onboarding, stored as a code: profile.goal is persisted
// and read back on the profile header and the coach's memory line, so a sentence stored
// there would stay English for every later reader. Mirrored at runtime by GOAL_CODES in
// ./onboarding, which proof-i18n requires to be the same list.
export type OnboardingGoalCode =
  | "firstTouch"
  | "getFaster"
  | "finishBetter"
  | "playSmarter"
  | "holdUpPlay"
  | "twoFooted";

// The age bands whose codes happen to be English words. "U15" needs no lookup; these four
// do, and the list is mirrored by TRANSLATED_AGE_GROUPS in ./onboarding.
export type AgeGroupWord = "Amateur" | "Semi-pro" | "Pro" | "Veteran";

export interface Goal {
  id: string;
  // A goal made by the app names a dictionary key; a goal the visitor types is their
  // own words and stays a value. See ./rowText — the title used to be a string built
  // at creation time, so it froze one locale's wording for every later reader.
  title: RowText;
  metric: GoalMetric;
  key?: string; // for metric="attribute": the attribute key this goal tracks
  target: number;
  current: number;
  createdAt: string;
  done: boolean;
}
