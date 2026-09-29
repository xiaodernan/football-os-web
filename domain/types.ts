// Core domain types shared across the Football OS product.

import type { RowText } from "./rowText";

export type Mode = "FAN" | "PLAYER" | "MANAGER";

// The same three codes as the union, spelled once at runtime so a reader that has to
// recognise a stored mode (domain/rowText.ts) can be checked against this list rather
// than keeping a second copy that nothing audits. proof-i18n fails if the two drift.
export const MODES: readonly Mode[] = ["FAN", "PLAYER", "MANAGER"];

// The entity kinds the Football AI can retrieve and the knowledge graph can draw. One
// list, so a row that names a kind (`ai.src.entity`) and the legend chips cannot drift:
// both resolve a kind through `ai.legend.…`, and the i18n gate audits that space.
export const SEARCH_KINDS = ["club", "player", "competition", "match", "news"] as const;

// The article types a news story can carry. The impact panel prints this value twice in
// two different shapes — as the certainty paragraph (`ni.stance.…`) and as the noun in its
// evidence line (`ni.kind.…`) — so one list keeps the two from drifting, the same reason
// SEARCH_KINDS exists. It is deliberately NOT `SEARCH_KINDS`: a retrieval kind names what
// an entity *is* (`club`, `player`) and resolves through `ai.legend.…`, while this names
// what a story *claims*, and rowText keeps them in separate branches so a stored value can
// never be read as the wrong family.
export type NewsKind = "Confirmed" | "Reported" | "Rumor" | "Opinion" | "Analysis";
export const NEWS_KINDS: readonly NewsKind[] = ["Confirmed", "Reported", "Rumor", "Opinion", "Analysis"];

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

// The shot a goal was scored with. The engine's two weight tables name a code from this list
// and the row builder resolves it through `sim.shot.…`, so a new shot is a key decision rather
// than a word typed into the engine — and `tsc` refuses a code the union does not carry. The
// list is runtime data as well as a type because the i18n gate reads the value space off it,
// which is what makes a seventh table entry fail until all three locales have its words.
export type ShotType = "tap_in" | "close_range" | "header" | "left_foot" | "right_foot" | "volley" | "penalty";
export const SHOT_TYPES: readonly ShotType[] = ["tap_in", "close_range", "header", "left_foot", "right_foot", "volley", "penalty"];

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  side: "home" | "away";
  player: string;
  // M225. The goal line read `xG 0.31 · Right-foot curl` in every locale: a sentence the engine
  // wrote, printed raw by the match page. It is a row now, like every other sentence the model
  // hands the interface.
  detail?: RowText;
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
  kind: NewsKind;
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
  prompt: RowText;
  diagnosis: RowText[];
  focus: string[];
  session: TrainingSession;
  rationale: RowText[];
  confidence: number;
  sources: RowText[];
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
