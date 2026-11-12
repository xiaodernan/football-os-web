// M1023: the league table, under different rules — the same fixtures the seed's own standings
// carry, folded again with the win/draw/loss triplet the reader asks for. Two ladders, one walk:
// the standard triplet (3/1/0) the seed's board itself is built on, and the reader's choice.
// Everything is refolded on read; nothing is stored, mirrored, or synced — the board is a
// thought experiment with a fixture underneath it. Resurrects the drafted `.drafts/domain/league.ts`
// (an interface-only stub) and `features/league/LeagueManager.tsx` (a localStorage-backed mock of
// multi-user leagues; superseded by this seed-scale fold — nothing in it compiled into a door the
// app owns).

import { sum, byTableStanding, creditRecord } from "./attributes";
import type { ResultTally } from "./attributes";
import { isFinished } from "./analytics";
import { indexById } from "@/lib/utils";
import type { Club, Match } from "./types";

export interface PointsRules {
  /** A win pays this many points. */
  win: number;
  /** A draw pays this many points. */
  draw: number;
  /** A loss pays this many points. */
  loss: number;
}

/** A match under a rules vector — `{win: 3, draw: 1, loss: 0}` is the table everyone knows. */
export const STANDARD_RULES: PointsRules = { win: 3, draw: 1, loss: 0 };
/** The older order: a win paid twice a draw's price, no more. */
export const TWO_ONE_ZERO_RULES: PointsRules = { win: 2, draw: 1, loss: 0 };
/** Win-or-nothing: a draw was a ruined fixture, not a half-point. */
export const ALL_OR_NOTHING_RULES: PointsRules = { win: 3, draw: 0, loss: 0 };

export interface CustomTableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  /** Points under the reader's rules. */
  rulesPoints: number;
  /** Points under the standard 3-1-0 triplet, for the shift column. */
  standardPoints: number;
  /** rulesPoints − standardPoints — what changed for this club. */
  shift: number;
  /** 1-based position under the reader's rules. */
  rulesPosition: number;
  /** 1-based position under the standard triplet, the same tie rules three times over. */
  standardPosition: number;
  /** standardPosition − rulesPosition — a positive sway climbed under the new rules. */
  sway: number;
}

export interface CustomPointsTable {
  /** Laid out in the order the reader's rules put them. */
  rows: CustomTableRow[];
  matches: number;
}

const pointsOf = (r: { won: number; drawn: number; lost: number }, rules: PointsRules) =>
  r.won * rules.win + r.drawn * rules.draw + r.lost * rules.loss;



const ORDER = (a: { points: number; gf: number; ga: number; clubId: string }, b: { points: number; gf: number; ga: number; clubId: string }) =>
  byTableStanding(a, b) || a.clubId.localeCompare(b.clubId);

// The shared rank: points, goal difference, goals for — byTableStanding's own ladder — with the
// club id as the last resort so the board is deterministic, a nuance nothing else needs to know.

export function customPointsTable(compId: string, matches: Match[], clubs: Club[], rules: PointsRules): CustomPointsTable {
  const ranked = indexById(clubs);
  const acc = new Map<string, ResultTally>();
  for (const m of matches) {
    if (m.competitionId !== compId || !isFinished(m)) continue;
    for (const side of [m.homeClubId, m.awayClubId] as const) {
      if (!ranked.has(side)) continue;
      const ours = side === m.homeClubId ? m.homeGoals : m.awayGoals;
      const theirs = side === m.homeClubId ? m.awayGoals : m.homeGoals;
      const cur = acc.get(side) ?? { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      creditRecord(cur, ours, theirs);
      acc.set(side, cur);
    }
  }
  const counted = [...acc.entries()].map(([clubId, v]) => ({ clubId, ...v }));
  // The standard board first, to keep the sway column's own order honest.
  const standard = [...counted].map((r) => ({ ...r, points: pointsOf(r, STANDARD_RULES) }));
  standard.sort(ORDER);
  const standardPosition = new Map<string, number>();
  standard.forEach((r, i) => standardPosition.set(r.clubId, i + 1));
  // The reader's ladder, laid out the same way.
  const rulesLaid = [...counted].map((r) => ({ ...r, points: pointsOf(r, rules) }));
  rulesLaid.sort(ORDER);
  const rows: CustomTableRow[] = rulesLaid.map((r, i) => {
    const standardPoints = pointsOf(r, STANDARD_RULES);
    const basePosition = standardPosition.get(r.clubId)!;
    return {
      clubId: r.clubId,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      gf: r.gf,
      ga: r.ga,
      rulesPoints: r.points,
      standardPoints,
      shift: r.points - standardPoints,
      rulesPosition: i + 1,
      standardPosition: basePosition,
      sway: basePosition - (i + 1),
    };
  });
  return { rows, matches: sum(rows, (r) => r.played) / 2 };
}

// M1072: the rules-swing kings — the biggest table moves each competition makes when the
// win/draw/loss triplet changes. The league table fold walks the fixtures twice
// (standard triplet and the reader's), and the gap between the two ladders is the argument
// the swing makes about how an era of football prices a win: "a win is worth two draws" is
// not decoration, it re-orders real tables. This fold walks all of the competitions under
// both historic triplets and names, per competition, the single club the triplet moves
// furthest — because every table's story under different rules is really one name.
export interface SwingEntry {
  compId: string;
  compName: string;
  moverId: string;
  /** standardPosition − rulesPosition — positive means the club climbs under the triplet. */
  sway: number;
  rulesPosition: number;
  standardPosition: number;
}
export interface RulesSwingBoard {
  two: SwingEntry[];
  all: SwingEntry[];
}

/** Per competition, per triplet family: walk the custom table, track the club with the
 *  widest position swing (max |sway|), keep them. Sorted by |sway| desc, tie by compId
 *  asc — the world's biggest table-tugs, one card per rule family. */
export function rulesSwingBoard(
  competitions: readonly { id: string; name: string }[],
  matches: readonly Match[],
  clubs: readonly Club[],
  limit = 4,
): RulesSwingBoard {
  const one = (rules: PointsRules): SwingEntry[] => {
    const rows: SwingEntry[] = [];
    for (const c of competitions) {
      const t = customPointsTable(c.id, [...matches], [...clubs], rules);
      if (t.rows.length === 0) continue;
      // One name per competition: the club the triplet moves furthest. Ties (common in
      // tiny tables) are decided by clubId asc — declared here, not discovered.
      let mover = t.rows[0];
      for (const r of t.rows) {
        if (Math.abs(r.sway) > Math.abs(mover.sway)) mover = r;
        else if (Math.abs(r.sway) === Math.abs(mover.sway) && r.clubId < mover.clubId) mover = r;
      }
      rows.push({
        compId: c.id, compName: c.name,
        moverId: mover.clubId, sway: mover.sway,
        rulesPosition: mover.rulesPosition, standardPosition: mover.standardPosition,
      });
    }
    return rows
      .filter((r) => Math.abs(r.sway) > 0)
      .sort((a, b) => Math.abs(b.sway) - Math.abs(a.sway) || a.compId.localeCompare(b.compId))
      .slice(0, Math.max(1, Math.floor(limit)));
  };
  return { two: one(TWO_ONE_ZERO_RULES), all: one(ALL_OR_NOTHING_RULES) };
}
