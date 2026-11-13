// M1080: the Season Command Room — one fold a screen's worth of season verdicts for the same
// frozen seed. The seed is written to be rewound at any time, and every fold here is a pure
// function with no browser, no clock, no fetch: one read, many panels.
//
// Four honest questions, four live answers:
//   · Who championed which league under the standard 3-1-0 triplet?
//   · Who leads the same 15 leagues under the two historic alternatives (2-1-0, 3-0-0)?
//   · Which clubs run a real profit and which one carried an insolvent roster?
//   · How wide is the winning gap in each league (the odds of a late-turnaround swing)?
//
// Everything derives from the seeded world. This module reads nothing but matches, players,
// clubs and competitions — no clocks, no DOM, no Math.random, nothing the reader can disagree
// on — and every output is the fold reconciled by its own doorway, not by assumption.
//
// The wording: a competition the seed has not finished is reported, never invented. An empty
// table answers rows: []; the screen shows the honest empty state.

import { customPointsTable, STANDARD_RULES, TWO_ONE_ZERO_RULES, ALL_OR_NOTHING_RULES, type CustomPointsTable } from "./league";
import { clubFinance } from "./finance";
import type { Club, Competition, Match, PlayerRef } from "./types";
import { indexById } from "@/lib/utils";

export interface StandingCard {
  compId: string;
  compName: string;
  nation: string;
  played: number;
  leaderId: string;
  leaderName: string;
  leaderPoints: number;
  runnerUpId: string;
  runnerUpName: string;
  runnerUpPoints: number;
  gap: number;
  playedFixtures: number;
  totalFixtures: number;
}

export interface AlternateRuler {
  compId: string;
  compName: string;
  rulerId: string;
  rulerName: string;
  rulerPoints: number;
  standardLeaderName: string;
  /** 1 = same club leads under both triplets; 0 = the title flips with the rule. */
  sameAsStandard: boolean;
  /** The alternate ruler's places moved down its OWN ladders: its standard position minus its
   * rulesPosition — 0 for the unchanged ruler, ≥1 when the crown flips with the triplet. */
  sway: number;
}

// M1085 additions: the relegation end of the same fold — the three most endangered clubs in every
// league, measured by the same door the champion cards use. The watch lists them DEEPEST trouble
// first (rulesPosition descending), and each is charged one figure the reader cannot otherwise
// see on this screen: how many points short of the first club safely above the drop zone this
// club sits.
export interface RelegationCrumb {
  clubId: string;
  clubName: string;
  rulesPosition: number;
  points: number;
  played: number;
  /** safe.points − this.points: how many points short of the first club above the drop zone.
   * 0 when the table has fewer than four rows (everyone is in the zone) — never a lie. */
  offSafety: number;
  /** true when this club is one of the five least solvent books in the world. */
  insolvent: boolean;
}

export interface RelegationWatch {
  compId: string;
  compName: string;
  nation: string;
  clubs: Readonly<RelegationCrumb[]>;
}

export interface SeasonVerdict {
  clubId: string;
  clubName: string;
  net: number;
  squadValue: number;
  wageRatio: number;
  revenue: number;
  wages: number;
  amortize: number;
  matchday: number;
}

export interface SeasonSituation {
  /** One card per competition. Sorted by competitionId. Empty competitions answer null. */
  standings: Readonly<StandingCard[]>;
  /** Same standings under two-one-zero (2 points for a win). Keyed by competitionId. */
  twoOneZero: Readonly<AlternateRuler[]>;
  /** Same standings under all-or-nothing (zero for a draw). Keyed by competitionId. */
  allOrNothing: Readonly<AlternateRuler[]>;
  /** The five most profitable clubs in the world, net descending; ties by clubId. */
  profitableFive: Readonly<SeasonVerdict[]>;
  /** The five least solvent clubs; buy the cheapest squad with the least wage drag. */
  insolventFive: Readonly<SeasonVerdict[]>;
  /** The drop-zone watch, one card per competition with at least one finished fixture. */
  bottomThree: Readonly<RelegationWatch[]>;
}

/** One crease of a league's table under a given triplet. */
function alternateRulers(
  comps: readonly Competition[],
  matches: readonly Match[],
  clubs: readonly Club[],
  rules: typeof TWO_ONE_ZERO_RULES | typeof ALL_OR_NOTHING_RULES,
): AlternateRuler[] {  const standard = new Map(
    comps.map((c) => [c.id, customPointsTable(c.id, [...matches], [...clubs], STANDARD_RULES)]),
  );
  const alt = new Map(
    comps.map((c) => [c.id, customPointsTable(c.id, [...matches], [...clubs], rules)]),
  );
  const out: AlternateRuler[] = [];
  for (const c of comps) {
    const s = standard.get(c.id);
    const a = alt.get(c.id);
    if (!s || !a || a.rows.length === 0 || s.rows.length === 0) continue;
    const stdLeader = s.rows.find((r) => r.rulesPosition === 1) ?? s.rows[0];
    const altLeader = a.rows.find((r) => r.rulesPosition === 1) ?? a.rows[0];
    out.push({
      compId: c.id,
      compName: c.name,
      rulerId: altLeader.clubId,
      rulerName: clubs.find((x) => x.id === altLeader.clubId)?.name ?? altLeader.clubId,
      rulerPoints: altLeader.rulesPoints,
      standardLeaderName: clubs.find((x) => x.id === stdLeader.clubId)?.name ?? stdLeader.clubId,
      sameAsStandard: altLeader.clubId === stdLeader.clubId,
      sway: altLeader.standardPosition - altLeader.rulesPosition,
    });
  }
  return out.sort((a, b) => Math.abs(b.sway) - Math.abs(a.sway) || a.compId.localeCompare(b.compId));
}

/** The full verdict of a season, one read over the seeded world. */
export function seasonSituation(
  matches: readonly Match[],
  players: readonly PlayerRef[],
  clubs: readonly Club[],
  competitions: readonly Competition[],
): SeasonSituation {
  const byId = indexById(clubs);

  // One table per competition, read once — the same read serves the champion cards, the
  // drop-zone watch and nothing else. (AlternateRulers re-reads with each triplet on purpose:
  // those are different ladders.)
  const tables = new Map<string, CustomPointsTable>();
  for (const c of competitions) {
    const t = customPointsTable(c.id, [...matches], [...clubs], STANDARD_RULES);
    if (t.rows.length) tables.set(c.id, t);
  }

  const finance = clubFinance([...clubs], [...players]);
  const financialVerdict: SeasonVerdict[] = finance.rows.map((r) => ({
    clubId: r.clubId,
    clubName: byId.get(r.clubId)?.name ?? r.clubId,
    net: r.net,
    squadValue: r.squadValue,
    wageRatio: r.wageRatio,
    revenue: r.revenue,
    wages: r.wages,
    amortize: r.amortize,
    matchday: r.matchday,
  }));

  const profitableFive = [...financialVerdict].sort((a, b) => b.net - a.net || a.clubId.localeCompare(b.clubId)).slice(0, 5);
  const insolventFive = [...financialVerdict].sort((a, b) => a.net - b.net || a.clubId.localeCompare(b.clubId)).slice(0, 5);
  const insolvent = new Set(insolventFive.map((r) => r.clubId));

  const standings: StandingCard[] = [];
  const bottomThree: RelegationWatch[] = [];
  for (const c of competitions) {
    const t = tables.get(c.id);
    if (!t) continue;
    const leader = t.rows.find((r) => r.rulesPosition === 1) ?? t.rows[0];
    const runnerUp = t.rows.find((r) => r.rulesPosition === 2) ?? t.rows[1] ?? leader;
    standings.push({
      compId: c.id,
      compName: c.name,
      nation: c.nation,
      played: leader.played,
      leaderId: leader.clubId,
      leaderName: byId.get(leader.clubId)?.name ?? leader.clubId,
      leaderPoints: leader.rulesPoints,
      runnerUpId: runnerUp.clubId,
      runnerUpName: byId.get(runnerUp.clubId)?.name ?? runnerUp.clubId,
      runnerUpPoints: runnerUp.rulesPoints,
      gap: leader.rulesPoints - runnerUp.rulesPoints,
      playedFixtures: t.matches,
      totalFixtures: matches.filter((m) => m.competitionId === c.id).length,
    });
    // The drop zone: the bottom three positions in this table, DEEPEST trouble first. A club's
    // offSafety is the distance to the first club above the zone (0 when nobody is safe).
    const safeRow = t.rows.length > 3 ? t.rows.find((r) => r.rulesPosition === t.rows.length - 3) : undefined;
    const bottoms = [...t.rows].sort((a, b) => b.rulesPosition - a.rulesPosition).slice(0, 3);
    bottomThree.push({
      compId: c.id,
      compName: c.name,
      nation: c.nation,
      clubs: bottoms.map((r) => ({
        clubId: r.clubId,
        clubName: byId.get(r.clubId)?.name ?? r.clubId,
        rulesPosition: r.rulesPosition,
        points: r.rulesPoints,
        played: r.played,
        offSafety: safeRow ? safeRow.rulesPoints - r.rulesPoints : 0,
        insolvent: insolvent.has(r.clubId),
      })),
    });
  }
  standings.sort((a, b) =>
    b.leaderPoints - a.leaderPoints
    || b.gap - a.gap
    || b.played - a.played
    || a.compId.localeCompare(b.compId));

  return {
    standings,
    twoOneZero: alternateRulers(competitions, matches, clubs, TWO_ONE_ZERO_RULES),
    allOrNothing: alternateRulers(competitions, matches, clubs, ALL_OR_NOTHING_RULES),
    profitableFive,
    insolventFive,
    bottomThree,
  };
}
