import { footballProvider, getClub, clubIdsByCompetition } from "@/data/footballService";
import { simulateMatch, type TeamInput, type SimResult } from "./matchEngine";
import type { PlayerRef } from "./types";

// Manager OS career model (spec §30-33). All logic is pure + deterministic so it
// runs entirely in Demo Mode with no backend, yet a real save/load contract could
// swap localStorage for a database without touching the UI.

export interface Tactics {
  mentality: number; // -2..2
  tempo: number; // 0..1
  press: number; // 0..1
}

export interface CareerResult {
  opponent: string; // opponent clubId
  weHome: boolean;
  ourGoals: number;
  oppGoals: number;
  ourXg: number;
  oppXg: number;
  at: string;
}

export interface CareerState {
  version: 1;
  clubId: string;
  competitionId: string;
  createdAt: string;
  budget: number; // transfer budget (EUR)
  morale: number; // -1..1
  fatigue: number; // 0..1
  tactics: Tactics;
  moved: Record<string, string>; // playerId -> destination clubId ("" = released)
  results: CareerResult[];
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export const roundFee = (v: number) => Math.round(v / 500_000) * 500_000;
export const askingFee = (p: PlayerRef) => roundFee(p.value * 1.1);
export const sellFee = (p: PlayerRef) => roundFee(p.value * 0.85);

export function startBudget(overall: number): number {
  // Ambition scales with squad quality; every club gets a rebuild budget.
  return Math.round((overall * 2_200_000 + 40_000_000) / 1_000_000) * 1_000_000;
}

function allPlayers(): PlayerRef[] {
  return footballProvider.players();
}

export function effClubId(p: PlayerRef, moved: Record<string, string>): string {
  return p.id in moved ? moved[p.id] : p.clubId;
}

export function effectiveSquad(clubId: string, moved: Record<string, string>): PlayerRef[] {
  return allPlayers()
    .filter((p) => effClubId(p, moved) === clubId)
    .sort((a, b) => b.overall - a.overall);
}

function avgOf(squad: PlayerRef[], groups: string[], fallback: number): number {
  const g = squad.filter((p) => groups.includes(p.positionGroup));
  return g.length ? g.reduce((s, p) => s + p.overall, 0) / g.length : fallback;
}

// Team strength derived from the *effective* squad so transfers genuinely change
// how a side performs in the engine — buying a striker lifts the attack line.
export function clubInput(clubId: string, moved: Record<string, string>, tac: Tactics, form: number, morale: number, fatigue: number): TeamInput {
  const c = getClub(clubId)!;
  const squad = effectiveSquad(clubId, moved);
  const best = squad.slice(0, 11);
  const overall = best.length ? best.reduce((s, p) => s + p.overall, 0) / best.length : c.overall;
  const attack = avgOf(squad, ["ST", "W", "AM"], c.overall);
  const midfield = avgOf(squad, ["CM", "DM"], c.overall);
  const defense = avgOf(squad, ["CB", "FB", "GK"], c.overall);
  const m = tac.mentality;
  return {
    name: c.name,
    overall,
    attack: attack + m * 3 - fatigue * 4,
    midfield: midfield + m * 0.5 - fatigue * 3,
    defense: defense - m * 2.5 + (tac.press * 3 - 1.5) - fatigue * 3,
    possessionBias: 0.5 + midfield / 400,
    press: tac.press,
    tempo: tac.tempo,
    fatigue,
    morale,
    form,
  };
}

export function careerForm(state: CareerState): number {
  const last = state.results.slice(-5);
  if (!last.length) return 0;
  const pts = last.reduce((s, r) => s + (r.ourGoals > r.oppGoals ? 3 : r.ourGoals === r.oppGoals ? 1 : 0), 0);
  return (pts / (last.length * 3)) * 2 - 1;
}

export interface Fixture {
  opponent: string;
  weHome: boolean;
}

// Deterministic round-robin fixture list for the managed competition.
export function fixtureAt(compId: string, ourClub: string, index: number): Fixture {
  const opponents = clubIdsByCompetition(compId).filter((id) => id !== ourClub);
  const n = Math.max(1, opponents.length);
  const lap = Math.floor(index / n);
  const opponent = opponents[(index + lap) % n];
  return { opponent, weHome: lap % 2 === 0 };
}

export function seedStandings(compId: string): Record<string, StandingRow> {
  const base = footballProvider.standings(compId);
  const table: Record<string, StandingRow> = {};
  for (const id of clubIdsByCompetition(compId)) {
    const s = base.find((b) => b.clubId === id);
    table[id] = s
      ? { clubId: id, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, gf: s.gf, ga: s.ga, points: s.points }
      : { clubId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  }
  return table;
}

function bump(row: StandingRow, gf: number, ga: number) {
  row.played++;
  row.gf += gf;
  row.ga += ga;
  if (gf > ga) {
    row.won++;
    row.points += 3;
  } else if (gf === ga) {
    row.drawn++;
    row.points += 1;
  } else row.lost++;
}

export function liveStandings(state: CareerState): StandingRow[] {
  const table = seedStandings(state.competitionId);
  for (const r of state.results) {
    const home = r.weHome ? state.clubId : r.opponent;
    const away = r.weHome ? r.opponent : state.clubId;
    const hg = r.weHome ? r.ourGoals : r.oppGoals;
    const ag = r.weHome ? r.oppGoals : r.ourGoals;
    if (table[home]) bump(table[home], hg, ag);
    if (table[away]) bump(table[away], ag, hg);
  }
  return Object.values(table).sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);
}

export function positionOf(state: CareerState): number {
  return liveStandings(state).findIndex((r) => r.clubId === state.clubId) + 1;
}

export function createCareer(clubId: string): CareerState {
  const club = getClub(clubId)!;
  return {
    version: 1,
    clubId,
    competitionId: club.competitionId,
    createdAt: new Date().toISOString(),
    budget: startBudget(club.overall),
    morale: 0,
    fatigue: 0,
    tactics: { mentality: 0, tempo: 0.55, press: 0.5 },
    moved: {},
    results: [],
  };
}

export interface MatchOutcome {
  state: CareerState;
  sim: SimResult;
  ourGoals: number;
  oppGoals: number;
  ourXg: number;
  oppXg: number;
  prize: number;
  opponentName: string;
}

// Play the next scheduled fixture. Returns a new state plus the engine result.
export function playNextFixture(state: CareerState): MatchOutcome {
  const fx = fixtureAt(state.competitionId, state.clubId, state.results.length);
  const form = careerForm(state);
  const weHomeInput = clubInput(state.clubId, state.moved, state.tactics, form, state.morale, state.fatigue);
  const oppInput = clubInput(fx.opponent, state.moved, { mentality: 0, tempo: 0.5, press: 0.5 }, 0, 0, 0);
  const home = fx.weHome ? state.clubId : fx.opponent;
  const away = fx.weHome ? fx.opponent : state.clubId;
  const sim = simulateMatch({
    seed: `career:${state.clubId}:${state.results.length}:${home}:${away}`,
    home: fx.weHome ? weHomeInput : oppInput,
    away: fx.weHome ? oppInput : weHomeInput,
  });
  const ourGoals = fx.weHome ? sim.homeGoals : sim.awayGoals;
  const oppGoals = fx.weHome ? sim.awayGoals : sim.homeGoals;
  const ourXg = fx.weHome ? sim.stats.home.xg : sim.stats.away.xg;
  const oppXg = fx.weHome ? sim.stats.away.xg : sim.stats.home.xg;
  const won = ourGoals > oppGoals;
  const drew = ourGoals === oppGoals;

  const prize = roundFee(won ? 2_000_000 : drew ? 800_000 : 300_000);
  const next: CareerState = {
    ...state,
    budget: state.budget + prize,
    morale: clamp(state.morale + (won ? 0.14 : drew ? 0.02 : -0.16), -1, 1),
    fatigue: clamp(state.fatigue + 0.22, 0, 1),
    results: [...state.results, { opponent: fx.opponent, weHome: fx.weHome, ourGoals, oppGoals, ourXg, oppXg, at: new Date().toISOString() }],
  };
  return { state: next, sim, ourGoals, oppGoals, ourXg, oppXg, prize, opponentName: getClub(fx.opponent)!.name };
}

export function transferIn(state: CareerState, playerId: string): CareerState {
  const p = allPlayers().find((x) => x.id === playerId);
  if (!p) return state;
  const fee = askingFee(p);
  if (state.budget < fee) return state;
  return { ...state, budget: state.budget - fee, moved: { ...state.moved, [playerId]: state.clubId } };
}

export function transferOut(state: CareerState, playerId: string): CareerState {
  const p = allPlayers().find((x) => x.id === playerId);
  if (!p) return state;
  const fee = sellFee(p);
  return { ...state, budget: state.budget + fee, moved: { ...state.moved, [playerId]: "" } };
}

export function setTactics(state: CareerState, tactics: Tactics): CareerState {
  return { ...state, tactics };
}

export function restSquad(state: CareerState): CareerState {
  return { ...state, fatigue: clamp(state.fatigue - 0.5, 0.05, 1) };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function marketTargets(state: CareerState, limit = 40): PlayerRef[] {
  return allPlayers()
    .filter((p) => effClubId(p, state.moved) !== state.clubId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, limit);
}
