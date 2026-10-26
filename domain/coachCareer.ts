// M523 — the coach's public résumé. Everything on it is DERIVED, never stored: the
// CareerState the manager OS already keeps is the single source, and this module turns
// it into the three things a visiting reader gets — the tenure's figures, the milestone
// badges the tenure has earned and the public card that shows only what the coach chose
// to make visible. The drafted copy of this file (M463–M521 lane) invented its own demo
// rows behind a private localStorage key; nothing here reads storage — persistence is
// the screen's business, through the same door every other key uses.
//
// Pure and deterministic: the same CareerState always yields the same résumé, badge for
// badge and timestamp for timestamp, because every badge is pinned to the result that
// earned it rather than to the clock.

import { getClub, getCompetition } from "@/data/footballService";
import { seasonSummary, seasonFixtures, seedStandings, type CareerState, type StandingRow } from "./career";
import { creditResult, resultPoints, byTableStanding, last } from "./attributes";
import type { RowText } from "./rowText";
import type { Tone } from "./types";

/** One milestone the tenure has reached, pinned to the match that earned it. `at` is the
 *  result's own timestamp, so a badge cannot claim an hour the record does not hold. */
export interface CoachBadge {
  id: BadgeId;
  /** Index into CareerState.results of the result that completed the milestone. */
  earnedAtIndex: number;
  at: string;
}

export type BadgeId =
  | "debut" // the first match in charge
  | "firstWin" // the first three points
  | "awayWin" // a win on the road
  | "streak3" // three straight wins
  | "clean3" // three clean sheets
  | "goals10" // ten goals scored
  | "points20" // twenty points banked
  | "topSpot" // top of the live table at any point
  | "ironMan"; // every fixture of the season played

export const BADGE_IDS: BadgeId[] = [
  "debut", "firstWin", "awayWin", "streak3", "clean3", "goals10", "points20", "topSpot", "ironMan",
];

// The counter-match milestones. Each row names the running figure it watches and the
// figure that completes it, so a milestone's number is written ONCE, as spec data —
// no threshold comparison is spelled anywhere in the scan below.
const MILESTONE_KEYS = ["matches", "wins", "awayWins", "streak", "cleanSheets", "goals", "points"] as const;
type MilestoneKey = (typeof MILESTONE_KEYS)[number];
interface Milestone {
  id: BadgeId;
  key: MilestoneKey;
  at: number;
}
const MILESTONES: Milestone[] = [
  { id: "debut", key: "matches", at: 1 },
  { id: "firstWin", key: "wins", at: 1 },
  { id: "awayWin", key: "awayWins", at: 1 },
  { id: "streak3", key: "streak", at: 3 },
  { id: "clean3", key: "cleanSheets", at: 3 },
  { id: "goals10", key: "goals", at: 10 },
  { id: "points20", key: "points", at: 20 },
];

/** One pass over the results, counters running; `topSpot` alone needs the table replayed
 *  row by row, because "top at some point" is a claim about history the final table hides. */
export function coachBadges(state: CareerState): CoachBadge[] {
  const counters: Record<MilestoneKey, number> = { matches: 0, wins: 0, awayWins: 0, streak: 0, cleanSheets: 0, goals: 0, points: 0 };
  const earned: CoachBadge[] = [];
  for (let i = 0; i < state.results.length; i++) {
    const r = state.results[i];
    const before: Record<MilestoneKey, number> = { ...counters };
    const won = r.ourGoals > r.oppGoals;
    counters.matches++;
    counters.streak = won ? counters.streak + 1 : 0;
    if (won) counters.wins++;
    if (won && !r.weHome) counters.awayWins++;
    if (r.oppGoals === 0) counters.cleanSheets++;
    counters.goals += r.ourGoals;
    counters.points += resultPoints(r.ourGoals, r.oppGoals);
    for (const m of MILESTONES) {
      // A milestone is pinned the round its figure first crosses `at`: before it had
      // not, now it has. Comparisons read the spec row, never a spelled number.
      if (before[m.key] < m.at && counters[m.key] >= m.at) {
        earned.push({ id: m.id, earnedAtIndex: i, at: r.at });
      }
    }
  }
  const top = firstTopSpotIndex(state);
  if (top >= 0 && top < state.results.length) {
    earned.push({ id: "topSpot", earnedAtIndex: top, at: state.results[top].at });
  }
  const total = seasonFixtures(Object.keys(seedStandings(state.competitionId)).length);
  const finalResult = last(state.results);
  if (total > 0 && state.results.length >= total && finalResult) {
    earned.push({ id: "ironMan", earnedAtIndex: state.results.length - 1, at: finalResult.at });
  }
  // Badge order is milestone order, so a reader reads the tenure's story left to right.
  return BADGE_IDS.map((id) => earned.find((b) => b.id === id)).filter((b): b is CoachBadge => !!b);
}

/** The first result after which the live table had us first — replays the standings the
 *  same way liveStandings does, one result at a time, and stops at the top. */
function firstTopSpotIndex(state: CareerState): number {
  const table: Record<string, StandingRow> = seedStandings(state.competitionId);
  const ours = table[state.clubId];
  if (!ours) return -1;
  for (let i = 0; i < state.results.length; i++) {
    const r = state.results[i];
    const home = r.weHome ? state.clubId : r.opponent;
    const away = r.weHome ? r.opponent : state.clubId;
    const hg = r.weHome ? r.ourGoals : r.oppGoals;
    const ag = r.weHome ? r.oppGoals : r.ourGoals;
    if (table[home]) creditResult(table[home], hg, ag);
    if (table[away]) creditResult(table[away], ag, hg);
    const sorted = Object.values(table).sort(byTableStanding);
    if (sorted.findIndex((row) => row.clubId === state.clubId) === 0) return i;
  }
  return -1;
}

export interface CoachResume {
  managerClub: string;
  managerCompetition: string;
  startedAt: string;
  lastMatchAt: string | null;
  matches: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  points: number;
  ppg: number;
  position: number;
  clubCount: number;
  complete: boolean;
  honour: { label: RowText; tone: Tone } | null;
  bestWin: { opponent: string; score: string } | null;
  worstLoss: { opponent: string; score: string } | null;
  evidence: RowText[];
  badges: CoachBadge[];
}

/** The résumé is a read of the record, not a prediction: every figure is seasonSummary's
 *  own arithmetic, and the honour line is the same one the manager OS prints. */
export function buildCoachResume(state: CareerState): CoachResume {
  const s = seasonSummary(state);
  return {
    managerClub: getClub(state.clubId)?.name ?? state.clubId,
    managerCompetition: getCompetition(state.competitionId)?.name ?? state.competitionId,
    startedAt: state.createdAt,
    lastMatchAt: last(state.results)?.at ?? null,
    matches: s.played,
    won: s.won,
    drawn: s.drawn,
    lost: s.lost,
    goalsFor: s.gf,
    goalsAgainst: s.ga,
    cleanSheets: s.cleanSheets,
    points: s.points,
    ppg: s.ppg,
    position: s.position,
    clubCount: s.clubCount,
    complete: s.complete,
    honour: s.honour,
    bestWin: s.bestWin,
    worstLoss: s.worstLoss,
    evidence: s.evidence,
    badges: coachBadges(state),
  };
}

/** What a visiting reader may see. Absent from `badges` means public — a badge earned is
 *  a badge shown unless the coach says otherwise — so the record starts open and the
 *  toggles are the only thing this key ever stores. */
export interface CoachVisibility {
  record: boolean;
  badges: Record<string, boolean>;
}

export const DEFAULT_VISIBILITY: CoachVisibility = { record: true, badges: {} };

export const badgeIsPublic = (v: CoachVisibility, id: BadgeId): boolean => v.badges[id] !== false;

/** The card a visitor gets: the tenure's headline figures always, the record table and
 *  each badge only when their toggles say so. The name travels in from the profile —
 *  the résumé knows the club, the person is the app's own. */
export interface PublicCoachCard {
  managerName: string;
  clubName: string;
  competitionName: string;
  matches: number;
  points: number;
  ppg: number;
  badges: CoachBadge[];
  recordShown: boolean;
  honour: { label: RowText; tone: Tone } | null;
}

export function publicCoachCard(
  resume: CoachResume,
  visibility: CoachVisibility,
  managerName: string,
): PublicCoachCard {
  return {
    managerName,
    clubName: resume.managerClub,
    competitionName: resume.managerCompetition,
    matches: resume.matches,
    points: resume.points,
    ppg: resume.ppg,
    badges: resume.badges.filter((b) => badgeIsPublic(visibility, b.id)),
    recordShown: visibility.record,
    honour: visibility.record ? resume.honour : null,
  };
}
