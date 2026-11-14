// M1135 · The Letterbox — the seven letters the world wrote to itself.
// Every letter is a fold of the seed; no letter was invented by the writer of this file.
// The fold takes the matches and the clubs and answers a shape the JSX renders through t().
import type { Club, Match } from "./types";
import { isFinished, worldUpsets, records, scorelessStreaks, worldLethal } from "./analytics";
import { tomorrowChapter } from "./tomorrow";

export interface LettersData {
  upset: { home: string; away: string; score: string; deficit: number } | null;
  blank: { holder: string | null; longest: number } | null;
  lethal: { club: string; rate: number; league: number } | null;
  wildest: { score: string; margin: number } | null;
  spread: { score: string; total: number } | null;
  tonight: { comp: string; home: string; away: string; h: number; d: number; a: number; score: string } | null;
  ledger: { fixtures: number; clubs: number; goals: number };
}

export function worldLetters(matches: readonly Match[], clubs: readonly Club[]): LettersData {
  const finished = matches.filter((m) => isFinished(m));
  const byId = new Map(clubs.map((c) => [c.id, c] as const));

  const up = worldUpsets(matches as Match[], clubs as Club[]);
  const upset = up.biggestUpset
    ? {
        home: byId.get(up.biggestUpset.homeClubId)?.short ?? up.biggestUpset.homeClubId,
        away: byId.get(up.biggestUpset.awayClubId)?.short ?? up.biggestUpset.awayClubId,
        score: `${up.biggestUpset.homeGoals}-${up.biggestUpset.awayGoals}`,
        deficit: up.biggestUpset.deficit,
      }
    : null;

  const blanks = scorelessStreaks(matches as Match[], clubs as Club[]);
  const blank = blanks.leagueHolder
    ? { holder: byId.get(blanks.leagueHolder)?.short ?? blanks.leagueHolder, longest: blanks.leagueLongest }
    : null;

  const lethalFold = worldLethal(matches as Match[], clubs as Club[]);
  const lethalTop = lethalFold.rows[0];
  const lethal = lethalTop
    ? { club: byId.get(lethalTop.clubId)?.short ?? lethalTop.clubId, rate: lethalTop.rate, league: lethalFold.league }
    : null;

  const rec = records(matches as Match[]);
  const wildest = rec.biggestWin
    ? {
        score: `${rec.biggestWin.homeGoals}-${rec.biggestWin.awayGoals}`,
        margin: rec.biggestWin.margin,
      }
    : null;
  const spread = rec.highestScoring
    ? {
        score: `${rec.highestScoring.homeGoals}-${rec.highestScoring.awayGoals}`,
        total: rec.highestScoring.total,
      }
    : null;

  const chapter = tomorrowChapter(matches as Match[], clubs as Club[]);
  const tonight = chapter
    ? {
        comp: chapter.competitionId,
        home: byId.get(chapter.match.homeClubId)?.short ?? chapter.match.homeClubId,
        away: byId.get(chapter.match.awayClubId)?.short ?? chapter.match.awayClubId,
        h: Math.round(chapter.home),
        d: Math.round(chapter.draw),
        a: Math.round(chapter.away),
        score: chapter.mostLikelyScore,
      }
    : null;

  const goals = finished.reduce((acc, m) => acc + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);

  return {
    upset,
    blank,
    lethal,
    wildest,
    spread,
    tonight,
    ledger: { fixtures: finished.length, clubs: clubs.length, goals },
  };
}
