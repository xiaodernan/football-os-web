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

// The same five names as a TYPE. Every carrier of a retrieval kind — a search result, a graph
// node, the canvas's colour table, a section list — is typed against this rather than against a
// hand-typed copy of the union, so the runtime list is the one fact and a sixth kind is a
// compile error in every copy instead of an unnamed word in one of them (M265 found four copies
// and a fifth list, and one chip on the glass printing the code because no copy said which
// family it belonged to).
export type SearchKind = (typeof SEARCH_KINDS)[number];

// What a visitor can mark as theirs: three of the five retrieval kinds, because a match and a
// news story have no slot on the profile to be favourite in. The subset is why this is its own
// list rather than a member test on `SEARCH_KINDS` — the key it composes (`fav.<kind>.<state>`)
// exists for three names only, so the space the control can be handed has to be narrower than
// the space the graph can draw. M266 found this family spelled by hand three times (the
// control's prop, the store's action, the store's public API) with its display key composed at
// the screen, which is the M265 defect class on a second family.
export const FAVORITE_KINDS = ["club", "player", "competition"] as const;

export type FavoriteKind = (typeof FAVORITE_KINDS)[number];

// The article types a news story can carry. The impact panel prints this value twice in
// two different shapes — as the certainty paragraph (`ni.stance.…`) and as the noun in its
// evidence line (`ni.kind.…`) — so one list keeps the two from drifting, the same reason
// SEARCH_KINDS exists. It is deliberately NOT `SEARCH_KINDS`: a retrieval kind names what
// an entity *is* (`club`, `player`) and resolves through `ai.legend.…`, while this names
// what a story *claims*, and rowText keeps them in separate branches so a stored value can
// never be read as the wrong family.
export type NewsKind = "Confirmed" | "Reported" | "Rumor" | "Opinion" | "Analysis";
export const NEWS_KINDS: readonly NewsKind[] = ["Confirmed", "Reported", "Rumor", "Opinion", "Analysis"];

// How a record's underlying performances sit against its points, as the community board's
// career draft words it. Three codes rather than three copies of the sentence: the draft is
// long, the arm is one word of it, and rowText resolves the word the way it resolves every
// other code a domain module holds.
export const RECORD_FEELS = ["ahead", "inline", "behind"] as const;

export type PositionGroup = "GK" | "CB" | "FB" | "DM" | "CM" | "AM" | "W" | "ST";

// A player's preferred foot. Two codes, and the composer that words them reads the runtime
// list below — the same arrangement MatchStatus got in M256 — so a third foot is a missing
// key rather than a letter on screen.
// The eight abbreviations a player's position field may carry, one per PositionGroup and no
// more: its only producer is POSITION_BY_GROUP, so "CDM" and "RB" — which domain/worldEngine.ts
// hand-copied until M263 collapsed that table onto the domain's — are not positions this app
// can hold. Five of the eight (GK/CB/DM/CM/ST) are spelled exactly like five PositionGroup ids,
// which is why the row door dispatches `position` to its own composer instead of joining
// codeWord's name-blind table.
export type PositionCode = "GK" | "CB" | "LB / RB" | "DM" | "CM" | "AMC" | "LW / RW" | "ST";
export type Foot = "L" | "R";
export const FOOTS: readonly Foot[] = ["L", "R"];

export interface NamedValue {
  key: string;
  label: string;
  value: number;
}

export type Attributes = Record<string, number>;

// One row of the capability model. The interface lives here rather than in
// domain/attributes.ts because the English label table it is paired with now sits in
// `data/attributesLabels.ts`, and that file cannot import from the module that imports it.
export interface AttributeDef {
  key: string;
  label: string;
  category: "technical" | "physical" | "tactical" | "mental";
}

export interface PlayerRef {
  id: string;
  name: string;
  position: PositionCode;
  positionGroup: PositionGroup;
  age: number;
  nation: string;
  clubId: string;
  overall: number;
  potential: number;
  archetype: string;
  value: number; // market value in EUR
  foot: Foot;
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
// The same three codes as a runtime list, because the door that words them (domain/rowText.ts)
// is a lookup, not a type. The matches filter strip keeps its own hoisted array for its button
// ORDER, and proof-i18n cross-checks the two so a fourth status cannot exist in one and not the
// other.
export const MATCH_STATUSES: readonly MatchStatus[] = ["SCHEDULED", "LIVE", "FINISHED"];

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
  // The headline's own row: the seed composes key + name vars, and every glass
  // reader words it through `newsTitle`. `title` stays on the record as the raw
  // English string the search matcher and the AI fact layer score against —
  // data to match on, never a surface to print.
  titleKey: string;
  titleVars: { club: string; player: string };
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
  position: PositionCode;
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

// One row per favourite kind, and the `Record` is what makes it exhaustive: a fourth kind in
// `FAVORITE_KINDS` is a compile error here before it is a button that silently sets your
// league, and a fifth slot on the profile is a row no reader can reach. Reading and writing
// the same slot are named in the SAME literal on purpose — before M266 the control's reader
// and the store's writer were two ternary chains that each ended in a fallback arm, so a key
// outside the space resolved to the competition slot in both, and nothing tied the two chains
// to each other.
export const FAVORITES: Record<FavoriteKind, {
  read: (p: UserProfile) => string | null;
  write: (p: UserProfile, id: string | null) => UserProfile;
}> = {
  club: { read: (p) => p.favoriteClubId, write: (p, id) => ({ ...p, favoriteClubId: id }) },
  player: { read: (p) => p.favoritePlayerId, write: (p, id) => ({ ...p, favoritePlayerId: id }) },
  competition: { read: (p) => p.favoriteCompetitionId, write: (p, id) => ({ ...p, favoriteCompetitionId: id }) },
};

export interface TrainingExercise {
  key: string;
  // No `label`. The drill's words live in the dictionary under `drill.<key>`, which every
  // locale has and the session screen reads (`t(`drill.${e.key}`)`), so an English copy in
  // this table was a second source nobody displayed — and one a new drill could update
  // without touching the words the reader sees. proof-training pins that every key here is
  // named in all three columns.
  focus: string; // attribute key
  minutes: number;
  intensity: number; // 1..5
  phase: DrillPhase;
}

// A drill's session phase. Five codes, and the composer that words them reads the runtime
// list below — the same arrangement foot and bucket got in M259/M260 — so a sixth phase
// is a missing key rather than a word on screen.
export type DrillPhase = "warmup" | "technique" | "decision" | "game" | "cooldown";
export const DRILL_PHASES: readonly DrillPhase[] = ["warmup", "technique", "decision", "game", "cooldown"];

export interface AttributeDelta {
  key: string;
  from: number;
  to: number;
  delta: number;
}

export interface TrainingSession {
  id: string;
  date: string; // ISO date
  title: RowText;
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
