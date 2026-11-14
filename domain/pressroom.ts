// M1140 · The Press Room — the three questions the tape answers before a microphone does.
// Pure folds; the component composes the words. Every number comes from this dataset.

import { teamMetrics, headToHead, venueSplit } from "./analytics";
import type { Club, Match } from "./types";

export interface PressRoomData {
  homeClubId: string;
  awayClubId: string;
  kickoff: string;
  competitionId: string;
  /** The meetings ledger: how the two sides have genuinely met before tonight. */
  form: { meetings: number; winsA: number; draws: number; winsB: number; streak: string | null };
  /** The profiles: attack vs defence at league rate, and the home-and-away ppg pair. */
  profile: { homeAttack: number; awayDefence: number; homePpg: number | null; awayPpg: number | null };
}

export function pressRoom(
  matches: readonly Match[],
  clubs: readonly Club[],
  featured: { homeClubId: string; awayClubId: string; kickoff: string; competitionId: string },
): PressRoomData {
  const compId = featured.competitionId;
  const h2h = headToHead(featured.homeClubId, featured.awayClubId, matches as Match[]);
  const metrics = teamMetrics(compId, matches as Match[], clubs as Club[]);
  const h = metrics.find((r) => r.clubId === featured.homeClubId);
  const a = metrics.find((r) => r.clubId === featured.awayClubId);
  const vs = venueSplit(compId, matches as Match[], clubs as Club[]);
  const hSplit = vs.rows.find((r) => r.clubId === featured.homeClubId);
  const aSplit = vs.rows.find((r) => r.clubId === featured.awayClubId);
  const streak = h2h.streak
    ? `${h2h.streak.side === "a" ? "home" : h2h.streak.side === "b" ? "away" : "draw"}:${h2h.streak.length}`
    : null;
  return {
    homeClubId: featured.homeClubId,
    awayClubId: featured.awayClubId,
    kickoff: featured.kickoff,
    competitionId: compId,
    form: {
      meetings: h2h.played,
      winsA: h2h.winsA,
      draws: h2h.draws,
      winsB: h2h.winsB,
      streak,
    },
    profile: {
      homeAttack: h?.attack ?? 1,
      awayDefence: a?.defence ?? 1,
      homePpg: hSplit?.homePpg ?? null,
      awayPpg: aSplit?.awayPpg ?? null,
    },
  };
}
