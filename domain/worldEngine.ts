// Dynamic World engine (spec §"the world keeps evolving"). A pure, deterministic
// season-progression simulation layered over the demo dataset. It never mutates
// WORLD — given the same base + number of elapsed seasons it always reproduces
// the same evolved world, so the whole thing stays inside the Demo Mode contract
// and is unit-testable with no I/O.
//
// Honest scope: the bundled dataset is eight separate tier-1 leagues with no
// lower divisions, so promotion/relegation between tiers is not modelled (that
// would mean inventing a fake pyramid). What IS modelled per season is genuine:
// player development + aging curves, market re-pricing, retirements, youth
// regeneration and a simulated league champion.

import { makeRng, rngInt, rngFloat, pick } from "@/lib/rng";
import { clamp } from "@/lib/utils";
import { round1 } from "@/domain/scouting";
import { POSITION_BY_GROUP, POSITION_GROUPS } from "@/domain/attributes";
import type { Club, Competition, PlayerRef, PositionCode, PositionGroup } from "@/domain/types";

const BASE_START_YEAR = 2026; // base season is 2026/27
const POS_GROUPS: PositionGroup[] = POSITION_GROUPS.map((g) => g.id);
// One table spells a group's abbreviation, and it is the domain's: this engine used to carry a
// hand copy whose four values disagreed with it (RB/CDM/CAM/RW where the world's players read
// "LB / RB", DM, AMC, "LW / RW"), so a regenerated player was labelled one way on /world and
// another everywhere else. Deriving it is what makes the eight spellings one space (M263).
const POS_LABEL = POSITION_BY_GROUP;
// Compact name pools so the engine stays self-contained and reproducible.
const P_FIRST = ["Luca", "Kai", "Mateo", "Noah", "Emre", "Rafa", "Theo", "Enzo", "Iker", "Milan", "Yann", "Omar"];
const P_LAST = ["Silva", "Rossi", "Novak", "Berg", "Vidal", "Nagy", "Marín", "Pires", "Roche", "Toth", "Blom", "Grassi"];

export function seasonLabel(elapsed: number): string {
  const y = BASE_START_YEAR + elapsed;
  return `${y}/${String(y + 1).slice(2)}`;
}

// Market value curve — mirrors the world generator so evolved values stay
// consistent with how the base squad was priced.
export function marketValue(overall: number, age: number): number {
  const base = Math.pow(Math.max(0, overall - 45) / 10, 3.1) * 6_000_000;
  const ageCurve = age < 23 ? 1.5 : age < 28 ? 1.3 : age < 31 ? 1.0 : age < 34 ? 0.6 : 0.3;
  return Math.round((base * ageCurve) / 100_000) * 100_000;
}

export interface PlayerChange {
  id: string;
  name: string;
  clubId: string;
  position: PositionCode;
  age: number;
  from: number;
  to: number;
  delta: number;
}

export interface Prospect {
  id: string;
  name: string;
  clubId: string;
  position: PositionCode;
  age: number;
  overall: number;
  potential: number;
  value: number;
}

export interface Champion {
  compId: string;
  compName: string;
  clubId: string;
  clubName: string;
  points: number;
}

export interface SeasonStep {
  index: number;
  label: string;
  champions: Champion[];
  developments: PlayerChange[];
  declines: PlayerChange[];
  prospects: Prospect[];
  retired: PlayerChange[];
  avgOverall: number;
  marketTotal: number;
}

export interface WorldSnapshot {
  players: PlayerRef[];
  seasonsElapsed: number;
  history: SeasonStep[];
}

export interface WorldInput {
  players: PlayerRef[];
  clubs: Club[];
  competitions: Competition[];
}

function develop(p: PlayerRef, rng: () => number): { player: PlayerRef; retired: boolean } {
  const age = p.age + 1;
  const headroom = Math.max(0, p.potential - p.overall);
  // Slight potential unlock for still-developing players.
  let potential = p.potential;
  if (age <= 23 && rng() < 0.3) potential = clamp(potential + rngInt(rng, 1, 3), p.overall, 99);

  let g: number;
  if (age <= 20) g = clamp(Math.round(headroom * 0.35) + rngInt(rng, 0, 2), 0, 6);
  else if (age <= 23) g = clamp(Math.round(headroom * 0.28) + rngInt(rng, 0, 1), 0, 4);
  else if (age <= 26) g = clamp(Math.round(headroom * 0.18), 0, 2);
  else if (age <= 30) g = rngInt(rng, -1, 1);
  else if (age <= 32) g = rngInt(rng, -2, 0);
  else if (age <= 34) g = rngInt(rng, -4, -1);
  else g = rngInt(rng, -8, -3);

  let overall = p.overall + g;
  if (g > 0) overall = Math.min(overall, potential); // growth capped at ceiling
  overall = clamp(overall, 40, 99);

  const retired = age >= 37 || (age >= 35 && overall < 55);
  const next: PlayerRef = {
    ...p,
    age,
    overall,
    potential: clamp(Math.max(potential, overall), 40, 99),
    value: marketValue(overall, age),
  };
  return { player: next, retired };
}

function makeProspect(club: Club, rng: () => number, season: number): Prospect {
  const group = pick(rng, POS_GROUPS);
  const base = clamp(club.overall + rngInt(rng, -14, -2), 45, 82);
  const overall = clamp(base - rngInt(rng, 12, 22), 42, 74);
  const age = rngInt(rng, 16, 18);
  const potential = clamp(overall + rngInt(rng, 8, 22), overall + 4, 92);
  const name = `${pick(rng, P_FIRST)} ${pick(rng, P_LAST)}`;
  return {
    id: `${club.id}-y${season}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
    name,
    clubId: club.id,
    position: POS_LABEL[group],
    age,
    overall,
    potential,
    value: marketValue(overall, age),
  };
}

function simulateChampion(comp: Competition, clubsById: Map<string, Club>, rng: () => number): Champion {
  let best: { club: Club; perf: number } | null = null;
  for (const id of comp.clubIds) {
    const club = clubsById.get(id);
    if (!club) continue;
    const perf = club.overall + rngFloat(rng, -7, 11);
    if (!best || perf > best.perf) best = { club, perf };
  }
  const club = best?.club ?? clubsById.get(comp.clubIds[0])!;
  const points = clamp(Math.round(58 + (club.overall - 60) * 1.4 + rngFloat(rng, -6, 12)), 30, 100);
  return { compId: comp.id, compName: comp.name, clubId: club.id, clubName: club.name, points };
}

function stepSeason(input: WorldInput, elapsed: number): { players: PlayerRef[]; step: SeasonStep } {
  const rng = makeRng(`football-os-season-${elapsed}`);
  const clubsById = new Map(input.clubs.map((c) => [c.id, c]));
  const byId = new Map(input.players.map((p) => [p.id, p]));

  // Carry forward any players already aged; freshly generated prospects develop
  // in later steps too, so the working set only needs base + new prospects.
  const changed: PlayerChange[] = [];
  const retired: PlayerChange[] = [];
  const next: PlayerRef[] = [];
  for (const p of input.players) {
    const { player, retired: isRetired } = develop(p, rng);
    byId.set(p.id, player);
    const delta = player.overall - p.overall;
    if (isRetired) {
      retired.push({ id: p.id, name: p.name, clubId: p.clubId, position: p.position, age: player.age, from: p.overall, to: player.overall, delta });
    } else {
      next.push(player);
      if (delta !== 0) changed.push({ id: p.id, name: p.name, clubId: p.clubId, position: p.position, age: player.age, from: p.overall, to: player.overall, delta });
    }
  }

  // Regenerate: one youth prospect into each retiring player's club, plus a
  // couple of fresh prospects per competition, to keep squads populated.
  const prospects: Prospect[] = [];
  const replenishClubs = new Set(retired.map((r) => r.clubId));
  for (const clubId of replenishClubs) {
    const club = clubsById.get(clubId);
    if (club) prospects.push(makeProspect(club, rng, elapsed));
  }
  for (const comp of input.competitions) {
    for (let i = 0; i < 2; i++) {
      const clubId = pick(rng, comp.clubIds);
      const club = clubsById.get(clubId);
      if (club) prospects.push(makeProspect(club, rng, elapsed));
    }
  }
  for (const pr of prospects) {
    next.push({
      id: pr.id,
      name: pr.name,
      position: pr.position,
      positionGroup: (POS_GROUPS.find((g) => POS_LABEL[g] === pr.position) ?? "CM"),
      age: pr.age,
      nation: clubsById.get(pr.clubId)?.nation ?? "—",
      clubId: pr.clubId,
      overall: pr.overall,
      potential: pr.potential,
      archetype: "prospect",
      value: pr.value,
      foot: rng() > 0.2 ? "R" : "L",
    });
  }

  const champions = input.competitions.map((c) => simulateChampion(c, clubsById, rng));
  const developments = [...changed].filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta || b.to - a.to).slice(0, 8);
  const declines = [...changed].filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 6);
  const avgOverall = round1(next.reduce((s, p) => s + p.overall, 0) / Math.max(1, next.length));
  const marketTotal = next.reduce((s, p) => s + p.value, 0);

  return {
    players: next,
    step: {
      index: elapsed,
      label: seasonLabel(elapsed),
      champions,
      developments,
      declines,
      prospects,
      retired,
      avgOverall,
      marketTotal,
    },
  };
}

/** Run the world forward by `seasonsElapsed` seasons from the base dataset. Pure. */
export function runWorld(base: WorldInput, seasonsElapsed: number): WorldSnapshot {
  let players = base.players.map((p) => ({ ...p }));
  const history: SeasonStep[] = [];
  const input: WorldInput = { ...base };
  for (let i = 1; i <= seasonsElapsed; i++) {
    input.players = players;
    const { players: evolved, step } = stepSeason(input, i);
    players = evolved;
    history.push(step);
  }
  return { players, seasonsElapsed, history };
}

export function formatMarket(v: number): string {
  if (v >= 1_000_000_000) return `€${(v / 1_000_000_000).toFixed(2)}B`;
  return `€${Math.round(v / 1_000_000)}M`;
}
