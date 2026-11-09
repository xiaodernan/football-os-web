// M1028: the academy line — the seeded world's U-21 intake, read as two honest boards:
// the supply line (which clubs sit on the most unfinished talent) and the world's U-21 elite
// (the brightest individual potentials under the cut-off). Both fold from the same player records
// the player page reads; nothing is stored, nothing is inferred beyond the seed.
//
// The cut-off is 21 — under-21 means age <= 21 — because the seed's youngest is rendered as full
// squads everywhere and 125 of 610 players fall under the wire.

import { indexById, round2 } from "@/lib/utils";
import type { Club, PlayerRef, PositionCode, PositionGroup } from "./types";

// One predicate, spelled once — not reused as an export because consumers pass the whole pool.
const isUnder21 = (p: PlayerRef): boolean => p.age <= 21;

export interface AcademySupplyRow {
  clubId: string;
  /** Players under the age cut-off at this club. */
  u21: number;
  /** Σ (potential − overall) under the cut-off — how far this nursery's books are from finished. */
  upside: number;
  /** The brightest jewel under the cut-off by potential, then overall. */
  jewelId: string;
  jewelName: string;
  jewelPosition: PositionCode;
  jewelOverall: number;
  jewelPotential: number;
  jewelAge: number;
}

export interface AcademyJewel {
  playerId: string;
  name: string;
  position: PositionCode;
  positionGroup: PositionGroup;
  clubId: string;
  overall: number;
  potential: number;
  age: number;
  /** potential − overall. */
  headroom: number;
}

export interface AcademyIntake {
  /** Ordered by upside desc, then id — most unfinished talent first. */
  supply: AcademySupplyRow[];
  /** Ordered by potential desc, then age asc, then id — the world's elite under the cut-off. */
  elite: AcademyJewel[];
  /** Players seen under the cut-off, over all the caller passed. */
  players: number;
}

export interface AgeRow {
  clubId: string;
  /** Players at 19 or younger. */
  u19: number;
  /** Players at 20 to 24. */
  u24: number;
  /** Players at 25 and over. */
  vets: number;
  /** (u19 + u24) / total, 2dp — the club's tilt toward the future. */
  youthShare: number;
  /** Mean overall across the whole squad, 2dp. */
  avgOverall: number;
}

export interface AgeCurve {
  /** Ordered by youthShare desc, then id. */
  rows: AgeRow[];
  /** The world's own totals across every player in the population. */
  world: { u19: number; u24: number; vets: number; avgOverall: number };
}

/** M1029: the world's age pyramid — three bands per club and for the world whole. The same
 *  population the other academy folds read; pure bucketing, nothing inferred. */
export function ageCurve(clubs: Club[], players: PlayerRef[]): AgeCurve {
  const ranked = indexById(clubs);
  const clubSums = new Map<string, { u19: number; u24: number; vets: number; n: number; overall: number }>();
  for (const p of players) {
    if (!ranked.has(p.clubId)) continue;
    const cur = clubSums.get(p.clubId) ?? { u19: 0, u24: 0, vets: 0, n: 0, overall: 0 };
    cur.n++;
    cur.overall += p.overall;
    if (p.age <= 19) cur.u19++;
    else if (p.age <= 24) cur.u24++;
    else cur.vets++;
    clubSums.set(p.clubId, cur);
  }
  const rows: AgeRow[] = [];
  let wu19 = 0, wu24 = 0, wvets = 0, wall = 0, wOverall = 0;
  for (const [clubId, v] of clubSums) {
    wu19 += v.u19; wu24 += v.u24; wvets += v.vets; wall += v.n; wOverall += v.overall;
    rows.push({
      clubId,
      u19: v.u19,
      u24: v.u24,
      vets: v.vets,
      youthShare: v.n ? round2((v.u19 + v.u24) / v.n) : 0,
      avgOverall: v.n ? round2(v.overall / v.n) : 0,
    });
  }
  rows.sort((a, b) => b.youthShare - a.youthShare || a.clubId.localeCompare(b.clubId));
  return { rows, world: { u19: wu19, u24: wu24, vets: wvets, avgOverall: wall ? round2(wOverall / wall) : 0 } };
}

export function academyIntake(clubs: Club[], players: PlayerRef[]): AcademyIntake {
  const ranked = indexById(clubs);
  const byClub = new Map<string, PlayerRef[]>();
  const elite: AcademyJewel[] = [];
  for (const p of players) {
    if (!isUnder21(p)) continue;
    if (!ranked.has(p.clubId)) continue;
    elite.push({ playerId: p.id, name: p.name, position: p.position, positionGroup: p.positionGroup, clubId: p.clubId, overall: p.overall, potential: p.potential, age: p.age, headroom: p.potential - p.overall });
    const cur = byClub.get(p.clubId) ?? [];
    cur.push(p);
    byClub.set(p.clubId, cur);
  }
  const supply: AcademySupplyRow[] = [];
  for (const [clubId, list] of byClub) {
    let upside = 0;
    let jewel: PlayerRef | null = null;
    for (const p of list) {
      upside += p.potential - p.overall;
      if (!jewel || p.potential > jewel.potential || (p.potential === jewel.potential && p.overall > jewel.overall)) jewel = p;
    }
    supply.push({
      clubId,
      u21: list.length,
      upside,
      jewelId: jewel!.id,
      jewelName: jewel!.name,
      jewelPosition: jewel!.position,
      jewelOverall: jewel!.overall,
      jewelPotential: jewel!.potential,
      jewelAge: jewel!.age,
    });
  }
  supply.sort((a, b) => b.upside - a.upside || a.clubId.localeCompare(b.clubId));
  elite.sort((a, b) => b.potential - a.potential || a.age - b.age || a.playerId.localeCompare(b.playerId));
  return { supply, elite: elite.slice(0, 10), players: elite.length };
}