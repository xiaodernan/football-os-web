import { footballProvider, getClub, clubIdsByCompetition, formatValue } from "@/data/footballService";
import { simulateMatch, type TeamInput, type SimResult } from "./matchEngine";
import { matchProbability, type MatchProbability } from "./matchProbability";
import type { PlayerRef } from "./types";
import type { RowText } from "./rowText";

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

/** The mean overall of the players in a position group, or `fallback` when that group is empty.
 *
 *  M333: this was private, and the club page (`features/football/Details.tsx`) carried its own
 *  copy of the same three calls — `avgBy(squad, ["ST","W","AM"])` and so on — because nothing
 *  exported it. Two copies of one formula drift the moment either is corrected, and the page's
 *  copy differed already: it answered 0 for an empty group where the domain answers the club's
 *  own rating, which is the difference between "this club fields no attackers" and a rating the
 *  page then substituted at the call site. It is exported now, and the page calls it. */
export function lineMean(squad: PlayerRef[], groups: string[], fallback: number): number {
  const g = squad.filter((p) => groups.includes(p.positionGroup));
  return g.length ? g.reduce((s, p) => s + p.overall, 0) / g.length : fallback;
}

// Team strength comes from the *effective* squad, so transfers change how a side
// performs. When a position group is empty the line falls back to the club's own
// rating instead of averaging zero — which is NOT the same basis as the other two
// lines, so for such a club the attack figure is a club rating, not a squad
// measurement, and signing a real striker can lower it. Since M197 every seeded club
// fields at least one ST/W/AM (the seed's GROUP_PLAN is read from the front, and
// every prefix it can be cut to keeps an attacker), so the fallback is reached only
// by emptying a group with transfers — which is what scripts/proof-career.mjs pins.
export function clubInput(clubId: string, moved: Record<string, string>, tac: Tactics, form: number, morale: number, fatigue: number): TeamInput {
  const c = getClub(clubId)!;
  const squad = effectiveSquad(clubId, moved);
  const best = squad.slice(0, 11);
  const overall = best.length ? best.reduce((s, p) => s + p.overall, 0) / best.length : c.overall;
  const attack = lineMean(squad, ["ST", "W", "AM"], c.overall);
  const midfield = lineMean(squad, ["CM", "DM"], c.overall);
  const defense = lineMean(squad, ["CB", "FB", "GK"], c.overall);
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

export interface OutlookRow {
  clubId: string;
  clubName: string;
  currentPpg: number;
  projectedPoints: number;
  aheadOfUs: boolean;
  beatUsChance: number; // modelled chance they finish above us
}

export interface SeasonOutlook {
  played: number;
  totalFixtures: number;
  remaining: number;
  position: number;
  points: number;
  pointsPerGame: number;
  projectedPoints: number;
  projectedPosition: number;
  gapToProjectedLeader: number; // >= 0; 0 when we are projected top
  leaderName: string;
  titleChance: number; // 0..1
  expectedFinish: number; // modelled expected league position
  zone: { label: RowText; tone: "good" | "mixed" | "bad" };
  rivalRows: OutlookRow[]; // the clubs closest to us in the projected table
  evidence: RowText[];
  confidence: number; // 0..100
  sources: RowText[];
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

// Modelled end-of-season view, computed ONLY from the live table (real seeded
// standings + our deterministic career results) and current form. Every club is
// projected by extrapolating its actual points-per-game over its remaining
// fixtures; per-match uncertainty (~1.4 pts of variance) widens the error bars
// the more games are left, so early projections stay deliberately cautious.
export function seasonOutlook(state: CareerState): SeasonOutlook {
  const rows = liveStandings(state);
  const ours = rows.find((r) => r.clubId === state.clubId) ?? {
    clubId: state.clubId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
  };
  const clubCount = clubIdsByCompetition(state.competitionId).length;
  const totalFixtures = Math.max(1, (clubCount - 1) * 2); // home + away round robin
  const played = state.results.length;
  const remaining = Math.max(0, totalFixtures - played);

  const ppg = (r: StandingRow) => r.points / Math.max(1, r.played);
  // Blend season ppg with recent career form (-1..1 -> -0.30..+0.30 pts/game).
  const form = careerForm(state);
  const ourPpg = Math.max(0, Math.min(3, ppg(ours) + form * 0.3));
  const projectedOf = (r: StandingRow) =>
    r.clubId === state.clubId
      ? ours.points + ourPpg * remaining
      : r.points + ppg(r) * Math.max(0, totalFixtures - r.played);

  const projected = rows.map((r) => ({ row: r, pts: projectedOf(r) }));
  const byProjected = [...projected].sort((a, b) => b.pts - a.pts);
  const projectedPosition = byProjected.findIndex((p) => p.row.clubId === state.clubId) + 1;
  const projLeader = byProjected[0];
  const ourProj = projected.find((p) => p.row.clubId === state.clubId)!.pts;
  const gapToProjectedLeader = Math.max(0, projLeader.pts - ourProj);

  // P(rival finishes above us): margin over a sigma that grows with the number
  // of rounds still to play (difference of two schedules -> sqrt(2) factor).
  const sigma = 1.4 * Math.sqrt(2 * Math.max(remaining, 1));
  const rivalRows: OutlookRow[] = rows
    .filter((r) => r.clubId !== state.clubId)
    .map((r) => {
      const theirProj = projected.find((p) => p.row.clubId === r.clubId)!.pts;
      const gdEdge = (ours.gf - ours.ga) - (r.gf - r.ga);
      const beat = sigmoid((theirProj - ourProj + gdEdge * 0.08) / sigma);
      const theirShown = Math.round(theirProj * 10) / 10;
      const ourShown = Math.round(ourProj * 10) / 10;
      return {
        clubId: r.clubId,
        clubName: getClub(r.clubId)?.name ?? r.clubId,
        currentPpg: Math.round(ppg(r) * 100) / 100,
        projectedPoints: theirShown,
        aheadOfUs: theirShown > ourShown,
        beatUsChance: beat,
      };
    })
    .sort((a, b) => b.beatUsChance - a.beatUsChance);

  const titleChance = rivalRows.reduce((chance, r) => chance * (1 - r.beatUsChance), 1);
  const expectedFinish = 1 + rivalRows.reduce((sum, r) => sum + (1 - r.beatUsChance), 0);

  const position = rows.findIndex((r) => r.clubId === state.clubId) + 1;
  const pct = clubCount ? (position - 1) / clubCount : 1;
  const zone =
    pct <= 0.25
      ? { label: { key: "mgr.zoneTitle" }, tone: "good" as const }
      : pct <= 0.6
        ? { label: { key: "mgr.zoneUpperMid" }, tone: "mixed" as const }
        : { label: { key: "mgr.zoneDrop" }, tone: "bad" as const };

  // Points the CAREER itself earned. `ours.points` is the live-table total, which
  // starts from the seeded standings, so the two must never be conflated in prose.
  const careerPts = state.results.reduce((s, r) => s + (r.ourGoals > r.oppGoals ? 3 : r.ourGoals === r.oppGoals ? 1 : 0), 0);
  // The projected leader's name is the dataset's own word, so it travels as a variable; the
  // two arms of the projection sentence differ in a whole clause ("level with or ahead of" vs
  // "{n} pts behind"), which no `{n}` can choose between.
  const leader = getClub(projLeader.row.clubId)?.name ?? projLeader.row.clubId;
  const projPts = Math.round(ourProj * 10) / 10;
  const evidence: RowText[] = [
    { key: "mgr.outlook.liveTable", vars: { position, points: ours.points, careerPts, played, scheduled: totalFixtures } },
    gapToProjectedLeader === 0
      ? { key: "mgr.outlook.projectedLevel", vars: { points: projPts, leader } }
      : { key: "mgr.outlook.projectedBehind", vars: { points: projPts, gap: Math.round(gapToProjectedLeader * 10) / 10, leader } },
    { key: "mgr.outlook.form", vars: { form: `${form >= 0 ? "+" : ""}${form.toFixed(2)}`, ppg: ourPpg.toFixed(2) } },
    { key: "mgr.outlook.method", vars: { remaining } },
  ];
  const confidence = Math.min(85, 12 + played * 9);

  return {
    played,
    totalFixtures,
    remaining,
    position,
    points: ours.points,
    pointsPerGame: Math.round(ppg(ours) * 100) / 100,
    projectedPoints: Math.round(ourProj * 10) / 10,
    projectedPosition,
    gapToProjectedLeader: Math.round(gapToProjectedLeader * 10) / 10,
    leaderName: leader,
    titleChance,
    expectedFinish: Math.round(expectedFinish * 10) / 10,
    zone,
    rivalRows: rivalRows.slice(0, 4),
    evidence,
    confidence,
    sources: [{ key: "mgr.outlook.srcTable" }, { key: "mgr.outlook.srcForm" }, { key: "mgr.outlook.srcModel" }],
  };
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

export interface MatchPrep {
  opponentName: string;
  weHome: boolean;
  venue: "Home" | "Away";
  us: { attack: number; midfield: number; defense: number };
  them: { attack: number; midfield: number; defense: number };
  attackEdge: number; // our attack - their defense
  defenseEdge: number; // their attack - our defense (positive = we're exposed)
  midfieldEdge: number; // our midfield - their midfield
  recommended: Tactics;
  rationale: RowText[];
  confidence: number; // 0..100
  sources: RowText[];
}

// Pre-match tactic advice. Both sides are fed through the same clubInput() the Match
// Engine uses, but at BALANCED tactics: the advisor measures the base matchup and then
// recommends how to move the sliders, so its figures deliberately do not change with
// the tactics you currently have set (projectFixture is the call that uses the
// recommendation, playNextFixture the one that uses your own settings). Each rule is
// stated with the number that triggered it.
export function matchPrep(state: CareerState): MatchPrep {
  const fx = fixtureAt(state.competitionId, state.clubId, state.results.length);
  const form = careerForm(state);
  const neutral: Tactics = { mentality: 0, tempo: 0.5, press: 0.5 };
  const ourIn = clubInput(state.clubId, state.moved, neutral, form, state.morale, state.fatigue);
  const theirIn = clubInput(fx.opponent, state.moved, neutral, 0, 0, 0);

  const attackEdge = ourIn.attack - theirIn.defense;
  const defenseEdge = theirIn.attack - ourIn.defense; // + means their attack beats our D
  const midfieldEdge = ourIn.midfield - theirIn.midfield;

  const rationale: RowText[] = [];
  // The panel prints the ROUNDED edges, so the sentences must quote those same
  // numbers. `toFixed(0)` and `Math.round` disagree on a negative half-step
  // ((-4.5).toFixed(0) is "-5" while Math.round(-4.5) is -4), which would let the
  // advice cite a figure the panel contradicts.
  const aeR = Math.round(attackEdge);
  const deR = Math.round(defenseEdge);
  const meR = Math.round(midfieldEdge);
  let mentality = 0;
  if (attackEdge >= 4 && defenseEdge <= 2) {
    // M200: the all-out cut was 12, a number the shipped seed cannot reach — every
    // pairing × fatigue state in the whole competition set topped out at an attack
    // edge of +8.50 (and +9.07 even after handing one club the strongest attackers in
    // the data), so this arm was dead code and the panel never said "all-out". The cut
    // now sits inside that envelope: above the +4 "attacking" step, below the observed
    // ceiling, so it fires on the genuinely lopsided fixtures rather than never.
    mentality = attackEdge >= 7 ? 2 : 1;
    // Two arms rather than one word substituted into a sentence: "all-out" and "attacking" sit
    // in the same place but a language may not want them to, and the audit cannot read a
    // sentence whose middle is chosen at the call site.
    rationale.push(mentality > 1
      ? { key: "mgr.prep.mentalityAllOut", vars: { edge: aeR } }
      : { key: "mgr.prep.mentalityAttacking", vars: { edge: aeR } });
  } else if (defenseEdge > 4) {
    mentality = -1;
    rationale.push({ key: "mgr.prep.mentalityDefensive", vars: { edge: deR } });
  } else if (attackEdge < -4) {
    mentality = -1;
    rationale.push({ key: "mgr.prep.mentalityCompact", vars: { edge: aeR } });
  } else rationale.push({ key: "mgr.prep.mentalityBalanced" });
  // The fallthrough is NOT "an even matchup": a +9 attack edge lands here too, because
  // the attacking rule also demands a safe back line (defenseEdge <= 2). The sentence
  // therefore claims only that no rule triggered, never what the matchup looks like.

  let press = 0.5;
  if (midfieldEdge >= 3) {
    press = 0.75;
    rationale.push({ key: "mgr.prep.pressHigh", vars: { edge: meR } });
  } else if (midfieldEdge <= -3) {
    press = 0.3;
    rationale.push({ key: "mgr.prep.pressDeep", vars: { edge: meR } });
  } else rationale.push({ key: "mgr.prep.pressMedium" });

  let tempo = 0.5;
  if (state.fatigue > 0.6) {
    tempo = 0.35;
    rationale.push({ key: "mgr.prep.tempoSlow", vars: { n: Math.round(state.fatigue * 100) } });
  } else if (attackEdge >= 6) {
    tempo = 0.7;
    rationale.push({ key: "mgr.prep.tempoHigh", vars: { edge: aeR } });
  } else rationale.push({ key: "mgr.prep.tempoMedium" });

  return {
    opponentName: getClub(fx.opponent)?.name ?? fx.opponent,
    weHome: fx.weHome,
    venue: fx.weHome ? "Home" : "Away",
    us: { attack: Math.round(ourIn.attack), midfield: Math.round(ourIn.midfield), defense: Math.round(ourIn.defense) },
    them: { attack: Math.round(theirIn.attack), midfield: Math.round(theirIn.midfield), defense: Math.round(theirIn.defense) },
    attackEdge: aeR,
    defenseEdge: deR,
    midfieldEdge: meR,
    recommended: { mentality, tempo, press },
    rationale,
    confidence: Math.min(90, Math.round(55 + Math.abs(attackEdge) + Math.abs(midfieldEdge) / 2 + Math.abs(defenseEdge))),
    sources: [{ key: "mgr.prep.srcSquad" }, { key: "mgr.prep.srcOpponent" }, { key: "mgr.prep.srcState" }],
  };
}

// Run the match-prep recommendation through the SAME probabilistic engine the
// Simulation Lab uses: simulate the upcoming fixture many times under the
// recommended tactics and express the outcome as our-win / draw / their-win
// odds. Deterministic for a given squad + seed.
export function projectFixture(state: CareerState, runs = 150): MatchProbability {
  const fx = fixtureAt(state.competitionId, state.clubId, state.results.length);
  const form = careerForm(state);
  const rec = matchPrep(state).recommended;
  const neutral: Tactics = { mentality: 0, tempo: 0.5, press: 0.5 };
  const ourIn = clubInput(state.clubId, state.moved, rec, form, state.morale, state.fatigue);
  const theirIn = clubInput(fx.opponent, state.moved, neutral, 0, 0, 0);
  return matchProbability({
    seedBase: `prepcareer:${state.clubId}:${fx.opponent}:${state.results.length}`,
    home: fx.weHome ? ourIn : theirIn,
    away: fx.weHome ? theirIn : ourIn,
    runs,
  });
}

export interface SeasonSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  ppg: number;
  cleanSheets: number;
  prizeTotal: number;
  bestWin: { opponent: string; score: string } | null;
  worstLoss: { opponent: string; score: string } | null;
  position: number;
  clubCount: number;
  complete: boolean;
  honour: { label: RowText; tone: "good" | "mixed" | "bad" } | null;
  evidence: RowText[];
}

// Retrospective digest of the career played SO FAR — every figure is summed
// directly from CareerState.results (which only ever contains real engine
// outcomes), so it reads as a record, not a prediction. Prize money is
// recomputed with the exact roundFee() ladder playNextFixture credited, so the
// total reconciles against the budget.
export function seasonSummary(state: CareerState): SeasonSummary {
  const rs = state.results;
  const clubCount = clubIdsByCompetition(state.competitionId).length;
  const totalFixtures = Math.max(1, (clubCount - 1) * 2);
  let won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, cleanSheets = 0, prizeTotal = 0;
  let best: { opponent: string; score: string; diff: number } | null = null;
  let worst: { opponent: string; score: string; diff: number } | null = null;
  for (const r of rs) {
    gf += r.ourGoals;
    ga += r.oppGoals;
    const diff = r.ourGoals - r.oppGoals;
    const prize = roundFee(r.ourGoals > r.oppGoals ? 2_000_000 : r.ourGoals === r.oppGoals ? 800_000 : 300_000);
    prizeTotal += prize;
    if (r.oppGoals === 0) cleanSheets++;
    if (diff > 0) won++;
    else if (diff === 0) drawn++;
    else lost++;
    const opp = getClub(r.opponent)?.name ?? r.opponent;
    if (!best || diff > best.diff) best = { opponent: opp, score: `${r.ourGoals}-${r.oppGoals}`, diff };
    if (!worst || diff < worst.diff) worst = { opponent: opp, score: `${r.ourGoals}-${r.oppGoals}`, diff };
  }
  const points = won * 3 + drawn;
  const gd = gf - ga;
  const played = rs.length;
  const position = positionOf(state);
  const complete = played >= totalFixtures;
  const pct = clubCount ? (position - 1) / clubCount : 1;
  const honour: SeasonSummary["honour"] = !played
    ? null
    : position === 1 && complete
      ? { label: { key: "mgr.honourChampions" }, tone: "good" }
      : position === 1
        ? { label: { key: "mgr.honourTop" }, tone: "good" }
        : pct <= 0.25
          ? { label: { key: "mgr.honourContenders" }, tone: "good" }
          : pct <= 0.6
            ? { label: { key: "mgr.honourMidtable" }, tone: "mixed" }
            : { label: { key: "mgr.honourRelegation" }, tone: "bad" };

  // Every count word is an arm rather than an "-s" glued on here: the record line, the clean
  // sheet, the match count and the remaining-fixture line all read a number a reader can set to
  // one, and `1 fixtures` was the shape this produced. The optional lines are absent rather
  // than empty, which is what the `.filter(Boolean)` used to do.
  const recordVars = { won, drawn, lost, played, gf, ga, gd: `${gd >= 0 ? "+" : ""}${gd}` };
  const evidence: RowText[] = [
    ...(played
      ? [
          { key: played === 1 ? "mgr.summary.recordOne" : "mgr.summary.record", vars: recordVars },
          { key: cleanSheets === 1 ? "mgr.summary.statsOne" : "mgr.summary.stats", vars: { points, ppg: (points / played).toFixed(2), clean: cleanSheets } },
          { key: played === 1 ? "mgr.summary.prizeOne" : "mgr.summary.prize", vars: { money: formatValue(prizeTotal), played } },
        ]
      : [{ key: "mgr.summary.noFixtures" }]),
    ...(best && best.diff > 0 ? [{ key: "mgr.summary.bestWin", vars: { score: best.score, opponent: best.opponent } }] : []),
    ...(worst && worst.diff < 0 ? [{ key: "mgr.summary.worstLoss", vars: { score: worst.score, opponent: worst.opponent } }] : []),
    complete
      ? { key: "mgr.summary.complete" }
      : // `mgr.fixturesLeft` already carries this sentence — the profile screen says it too, and one
      // sentence may not live under two keys.
      { key: Math.max(0, totalFixtures - played) === 1 ? "mgr.summary.remainingOne" : "mgr.fixturesLeft", vars: { n: Math.max(0, totalFixtures - played) } },
  ];

  return {
    played, won, drawn, lost, gf, ga, gd: gf - ga, points,
    ppg: played ? Math.round((points / played) * 100) / 100 : 0,
    cleanSheets, prizeTotal,
    bestWin: best && best.diff > 0 ? { opponent: best.opponent, score: best.score } : null,
    worstLoss: worst && worst.diff < 0 ? { opponent: worst.opponent, score: worst.score } : null,
    position, clubCount, complete, honour, evidence,
  };
}

// The season prize total prints through the app's one `formatValue`, not a private copy: this
// module kept its own euro rule (drop the decimals on a whole million, a lowercase 'k' below one)
// while the Manager OS panel beside it already rounded the same currency the shared way (one
// decimal up to ten million, none beyond), so a single screen could quote a manager's earnings
// under two rules at once — a whole-million season read '7M' here and '7.0M' through the door.

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function marketTargets(state: CareerState, limit = 40): PlayerRef[] {
  return allPlayers()
    .filter((p) => effClubId(p, state.moved) !== state.clubId)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, limit);
}
