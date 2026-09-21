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
  zone: { label: string; tone: "good" | "mixed" | "bad" };
  rivalRows: OutlookRow[]; // the clubs closest to us in the projected table
  evidence: string[];
  confidence: number; // 0..100
  sources: string[];
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
      return {
        clubId: r.clubId,
        clubName: getClub(r.clubId)?.name ?? r.clubId,
        currentPpg: Math.round(ppg(r) * 100) / 100,
        projectedPoints: Math.round(theirProj * 10) / 10,
        aheadOfUs: theirProj > ourProj,
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
      ? { label: "Title race", tone: "good" as const }
      : pct <= 0.6
        ? { label: "Upper midtable", tone: "mixed" as const }
        : { label: "Drop zone", tone: "bad" as const };

  const evidence = [
    `#${position} with ${ours.points} pts from ${played} career fixtures (${totalFixtures} scheduled this season)`,
    `Projected to ${Math.round(ourProj * 10) / 10} pts — ${gapToProjectedLeader === 0 ? "level with or ahead of" : `${Math.round(gapToProjectedLeader * 10) / 10} pts behind`} projected leader ${getClub(projLeader.row.clubId)?.name ?? projLeader.row.clubId}`,
    `Form ${form >= 0 ? "+" : ""}${form.toFixed(2)} adjusts points/game to ${ourPpg.toFixed(2)}`,
    `Each rival extrapolated from its own points-per-game over ${remaining} rounds left; results are modelled estimates, not fixtures played`,
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
    leaderName: getClub(projLeader.row.clubId)?.name ?? projLeader.row.clubId,
    titleChance,
    expectedFinish: Math.round(expectedFinish * 10) / 10,
    zone,
    rivalRows: rivalRows.slice(0, 4),
    evidence,
    confidence,
    sources: ["Live league table (seeded standings + your career results)", "Career form (last 5 fixtures)", "Deterministic projection model (demo)"],
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
  rationale: string[];
  confidence: number; // 0..100
  sources: string[];
}

// Pre-match tactic advice, computed by feeding BOTH sides through the same
// clubInput() the Match Engine will use — so the recommendation is grounded in
// the exact quantities the simulation keys off, not a separate heuristic. Each
// rule is stated with the number that triggered it.
export function matchPrep(state: CareerState): MatchPrep {
  const fx = fixtureAt(state.competitionId, state.clubId, state.results.length);
  const form = careerForm(state);
  const neutral: Tactics = { mentality: 0, tempo: 0.5, press: 0.5 };
  const ourIn = clubInput(state.clubId, state.moved, neutral, form, state.morale, state.fatigue);
  const theirIn = clubInput(fx.opponent, state.moved, neutral, 0, 0, 0);

  const attackEdge = ourIn.attack - theirIn.defense;
  const defenseEdge = theirIn.attack - ourIn.defense; // + means their attack beats our D
  const midfieldEdge = ourIn.midfield - theirIn.midfield;

  const rationale: string[] = [];
  let mentality = 0;
  if (attackEdge >= 4 && defenseEdge <= 2) {
    mentality = attackEdge >= 12 ? 2 : 1;
    rationale.push(`Attack edge +${attackEdge.toFixed(0)} over their defense with a safe back line → ${mentality > 1 ? "all-out" : "attacking"} mentality.`);
  } else if (defenseEdge > 4) {
    mentality = -1;
    rationale.push(`Their attack outruns our defense by ${defenseEdge.toFixed(0)} → drop to a defensive mentality first.`);
  } else if (attackEdge < -4) {
    mentality = -1;
    rationale.push(`We are the weaker side on paper (attack edge ${attackEdge.toFixed(0)}) → stay compact and counter.`);
  } else rationale.push("Even matchup on paper → keep a balanced mentality.");

  let press = 0.5;
  if (midfieldEdge >= 3) {
    press = 0.75;
    rationale.push(`We win the midfield by ${midfieldEdge.toFixed(0)} → a high press converts possession into chances.`);
  } else if (midfieldEdge <= -3) {
    press = 0.3;
    rationale.push(`They control midfield (${midfieldEdge.toFixed(0)}) → hold a deeper block and stay organized.`);
  } else rationale.push("Midfield is balanced → a medium press keeps it neutral.");

  let tempo = 0.5;
  if (state.fatigue > 0.6) {
    tempo = 0.35;
    rationale.push(`Fatigue is ${Math.round(state.fatigue * 100)}% → slow the tempo to preserve legs.`);
  } else if (attackEdge >= 6) {
    tempo = 0.7;
    rationale.push(`Clear attacking edge (+${attackEdge.toFixed(0)}) → play at a higher tempo to press the advantage.`);
  } else rationale.push("No strong tempo signal → keep a medium tempo.");

  return {
    opponentName: getClub(fx.opponent)?.name ?? fx.opponent,
    weHome: fx.weHome,
    venue: fx.weHome ? "Home" : "Away",
    us: { attack: Math.round(ourIn.attack), midfield: Math.round(ourIn.midfield), defense: Math.round(ourIn.defense) },
    them: { attack: Math.round(theirIn.attack), midfield: Math.round(theirIn.midfield), defense: Math.round(theirIn.defense) },
    attackEdge: Math.round(attackEdge),
    defenseEdge: Math.round(defenseEdge),
    midfieldEdge: Math.round(midfieldEdge),
    recommended: { mentality, tempo, press },
    rationale,
    confidence: Math.min(90, Math.round(55 + Math.abs(attackEdge) + Math.abs(midfieldEdge) / 2 + Math.abs(defenseEdge))),
    sources: ["Match Engine clubInput (your squad + tactics)", "Opponent effective squad", "Current morale, fatigue and form"],
  };
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
  honour: { label: string; tone: "good" | "mixed" | "bad" } | null;
  evidence: string[];
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
      ? { label: "Champions", tone: "good" }
      : position === 1
        ? { label: "Top of the table", tone: "good" }
        : pct <= 0.25
          ? { label: "Title contenders", tone: "good" }
          : pct <= 0.6
            ? { label: "Midtable", tone: "mixed" }
            : { label: "Relegation battle", tone: "bad" };

  const evidence = [
    played ? `${won}-${drawn}-${lost} from ${played} fixtures · ${gf} scored, ${ga} conceded (GD ${gd >= 0 ? "+" : ""}${gd})` : "No fixtures played yet.",
    played ? `${points} pts · ${(points / played).toFixed(2)} pts/game · ${cleanSheets} clean sheet${cleanSheets === 1 ? "" : "s"}` : "",
    played ? `Prize money earned ${formatMoney(prizeTotal)} across ${played} matches` : "",
    best && best.diff > 0 ? `Biggest win ${best.score} vs ${best.opponent}` : "",
    worst && worst.diff < 0 ? `Heaviest defeat ${worst.score} vs ${worst.opponent}` : "",
    complete ? "Season complete." : `${Math.max(0, totalFixtures - played)} fixtures remaining.`,
  ].filter(Boolean);

  return {
    played, won, drawn, lost, gf, ga, gd: gf - ga, points,
    ppg: played ? Math.round((points / played) * 100) / 100 : 0,
    cleanSheets, prizeTotal,
    bestWin: best && best.diff > 0 ? { opponent: best.opponent, score: best.score } : null,
    worstLoss: worst && worst.diff < 0 ? { opponent: worst.opponent, score: worst.score } : null,
    position, clubCount, complete, honour, evidence,
  };
}

function formatMoney(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  return `€${Math.round(v / 1000)}k`;
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
