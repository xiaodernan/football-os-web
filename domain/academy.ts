// M1028: the academy line — the seeded world's U-21 intake, read as two honest boards:
// the supply line (which clubs sit on the most unfinished talent) and the world's U-21 elite
// (the brightest individual potentials under the cut-off). Both fold from the same player records
// the player page reads; nothing is stored, nothing is inferred beyond the seed.
//
// The cut-off is 21 — under-21 means age <= 21 — because the seed's youngest is rendered as full
// squads everywhere and 125 of 610 players fall under the wire.

import { indexById } from "@/lib/utils";
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