// Core domain types shared across the Football OS product.

export type Mode = "FAN" | "PLAYER" | "MANAGER";

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
  | "SUB"
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
  url: string;
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
}

export interface AiMemoryEntry {
  id: string;
  kind: "coach" | "training" | "profile" | "tactical";
  text: string;
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

export interface Goal {
  id: string;
  title: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  createdAt: string;
  done: boolean;
}
