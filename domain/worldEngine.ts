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
import { clamp, indexById, safeDiv, pct } from "@/lib/utils";
import { round1 } from "@/domain/scouting";
import { POSITION_BY_GROUP, POSITION_GROUPS, marketValue, capRound, sum, headroomOf, last } from "@/domain/attributes";
import type { RowText } from "@/domain/rowText";
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

// Market value curve — now the attributes domain's `marketValue` door (M381), which itself mirrors the
// world generator so evolved values stay consistent with how the base squad was priced.

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
  const headroom = headroomOf(p.potential, p.overall);
  // Slight potential unlock for still-developing players.
  let potential = p.potential;
  if (age <= 23 && rng() < 0.3) potential = clamp(potential + rngInt(rng, 1, 3), p.overall, 99);

  let g: number;
  if (age <= 20) g = clamp(Math.round(headroom * 0.35) + rngInt(rng, 0, 2), 0, 6);
  else if (age <= 23) g = clamp(Math.round(headroom * 0.28) + rngInt(rng, 0, 1), 0, 4);
  else if (age <= 26) g = capRound(headroom * 0.18, 0, 2);
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
  const points = capRound(58 + (club.overall - 60) * 1.4 + rngFloat(rng, -6, 12), 30, 100);
  return { compId: comp.id, compName: comp.name, clubId: club.id, clubName: club.name, points };
}

function stepSeason(input: WorldInput, elapsed: number): { players: PlayerRef[]; step: SeasonStep } {
  const rng = makeRng(`football-os-season-${elapsed}`);
  const clubsById = indexById(input.clubs);
  const byId = indexById(input.players);

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
  const avgOverall = round1(safeDiv(sum(next, (p) => p.overall), next.length));
  const marketTotal = sum(next, (p) => p.value);

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

// ─── M525: the season report ────────────────────────────────────────────────────
// The history panel answers "what happened last season?"; the report answers "what has
// the whole run done so far?". Like the résumé, it is DERIVED — every figure is read
// out of the snapshot the engine already reproduces deterministically, so a report
// exported from this device reconciles line for line with the screen beside it.

export interface SeasonReportRow {
  index: number;
  label: string;
  topPoints: number; // the strongest champion's points that season
  risers: number;
  fallers: number;
  prospectCount: number;
  retiredCount: number;
  avgOverall: number;
  marketTotal: number;
  /** Fraction the tracked market moved against the previous season (0 for the first). */
  marketStep: number;
}

export interface DynastyRow {
  clubId: string;
  clubName: string;
  compName: string;
  titles: number;
}

export interface SeasonReport {
  rows: SeasonReportRow[];
  /** Clubs that kept or regained a title, strongest hold first. */
  dynasties: DynastyRow[];
  rise: { name: string; clubId: string; from: number; to: number; delta: number; season: string } | null;
  fall: { name: string; clubId: string; from: number; to: number; delta: number; season: string } | null;
  totalRetired: number;
  totalProspects: number;
  /** Whole-run market growth against the base dataset, as a fraction. */
  marketGrowth: number;
  /** Whole-run movement of the squad's mean overall, in rating points. */
  avgGrowth: number;
  evidence: RowText[];
  sources: RowText[];
}

const byDeltaDesc = (a: PlayerChange, b: PlayerChange): number => b.delta - a.delta || b.to - a.to;

/** Read the whole simulated run into one report. `base` supplies the market and rating
 *  baselines the growth figures are measured against; both grow only through the engine's
 *  own steps, so the growth is the run's, not the clock's. */
export function buildSeasonReport(base: WorldInput, snapshot: WorldSnapshot): SeasonReport {
  const baseMarket = sum(base.players, (p) => p.value);
  const baseAvg = safeDiv(sum(base.players, (p) => p.overall), base.players.length);

  const rows: SeasonReportRow[] = [];
  const titleCounts = new Map<string, DynastyRow>();
  let rise: SeasonReport["rise"] = null;
  let fall: SeasonReport["fall"] = null;
  let totalRetired = 0;
  let totalProspects = 0;

  for (const step of snapshot.history) {
    const prev = last(rows);
    rows.push({
      index: step.index,
      label: step.label,
      topPoints: step.champions.reduce((top, c) => Math.max(top, c.points), 0),
      risers: step.developments.length,
      fallers: step.declines.length,
      prospectCount: step.prospects.length,
      retiredCount: step.retired.length,
      avgOverall: step.avgOverall,
      marketTotal: step.marketTotal,
      marketStep: prev ? safeDiv(step.marketTotal - prev.marketTotal, prev.marketTotal) : 0,
    });
    for (const c of step.champions) {
      const key = `${c.clubId}|${c.compId}`;
      const held = titleCounts.get(key) ?? { clubId: c.clubId, clubName: c.clubName, compName: c.compName, titles: 0 };
      held.titles++;
      titleCounts.set(key, held);
    }
    const stepRise = [...step.developments].sort(byDeltaDesc)[0];
    if (stepRise && (!rise || stepRise.delta > rise.delta)) {
      rise = { name: stepRise.name, clubId: stepRise.clubId, from: stepRise.from, to: stepRise.to, delta: stepRise.delta, season: step.label };
    }
    const stepFall = [...step.declines].sort(byDeltaDesc)[0];
    if (stepFall && (!fall || stepFall.delta < fall.delta)) {
      fall = { name: stepFall.name, clubId: stepFall.clubId, from: stepFall.from, to: stepFall.to, delta: stepFall.delta, season: step.label };
    }
    totalRetired += step.retired.length;
    totalProspects += step.prospects.length;
  }

  const dynasties = [...titleCounts.values()].filter((d) => d.titles > 1).sort((a, b) => b.titles - a.titles || a.clubName.localeCompare(b.clubName));
  const latest = last(snapshot.history);
  const marketGrowth = safeDiv((latest?.marketTotal ?? baseMarket) - baseMarket, baseMarket);
  const avgGrowth = round1((latest?.avgOverall ?? baseAvg) - baseAvg);

  const evidence: RowText[] = [
    { key: "world.report.evidence.market", vars: { pct: pct(marketGrowth), seasons: snapshot.seasonsElapsed } },
    ...(rise ? [{ key: "world.report.evidence.rise", vars: { name: rise.name, delta: rise.delta, from: rise.from, to: rise.to, season: rise.season } }] : []),
    ...(fall ? [{ key: "world.report.evidence.fall", vars: { name: fall.name, delta: Math.abs(fall.delta), from: fall.from, to: fall.to, season: fall.season } }] : []),
  ];
  // The list is filtered to titles > 1, so the sentence only ever needs the plural arm —
  // an arm for a single title would be dead code wearing a key.
  const topDynasty = dynasties[0];
  if (topDynasty) {
    evidence.push({ key: "world.report.evidence.dynasty", vars: { club: topDynasty.clubName, comp: topDynasty.compName, n: topDynasty.titles } });
  }
  evidence.push(
    totalRetired === 1
      ? { key: "world.report.evidence.retiredOne", vars: { prospects: totalProspects } }
      : { key: "world.report.evidence.retired", vars: { n: totalRetired, prospects: totalProspects } },
  );

  return {
    rows,
    dynasties,
    rise,
    fall,
    totalRetired,
    totalProspects,
    marketGrowth,
    avgGrowth,
    evidence,
    sources: [{ key: "world.report.src.engine" }, { key: "world.report.src.base" }],
  };
}

/** The export payload: the report plus the run it was read from, so a downloaded file
 *  can be checked against the screen that produced it without re-running anything. */
export function seasonReportPayload(base: WorldInput, snapshot: WorldSnapshot): Record<string, unknown> {
  return {
    app: "football-os",
    kind: "season-report",
    seasonsElapsed: snapshot.seasonsElapsed,
    report: buildSeasonReport(base, snapshot),
  };
}

// M401: this module used to carry its own euro formatter (`formatMarket`), and the app has
// said in two places that there is ONE money door -- domain/career.ts:617 ("the season prize
// total prints through the app's one `fmtMoney`, not a private copy") and
// domain/compare.ts:146 ("the value row prints money through the app's one `fmtMoney`, not a
// local copy"). This copy was the survivor, and it was the one with the reader-visible
// defect: it had NO K branch, so a squad worth €400K read "€0M" and one worth €500K read
// "€1M" -- a figure that says zero where the value is not zero. It also quoted the billions
// at two decimals and the millions at none, so the same currency read three ways on one
// screen. The world screen now reads the shared door, like the player page, the dashboard,
// the manager and the transfer centre already do (features/world/DynamicWorld.tsx).
// M402 moved that door into lib/utils.ts, beside the fmt0/fmt1 it is built from, and renamed
// it `fmtMoney`; the world screen followed it there.
