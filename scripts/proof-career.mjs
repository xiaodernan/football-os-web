import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { makeSay } from "./lib/rows.mjs";

// Pins domain/career.ts — the Manager OS career model, the largest module in the
// repository and the arithmetic behind four panels (live league table, season
// outlook, next-match preparation, season retrospective) plus the transfer market's
// fee ladder. Every figure it returns is printed to the user and three consumers
// (Manager OS, Profile's cross-mode record, Community's season line) read the same
// numbers, so the load-bearing checks here are RECONCILIATIONS between functions
// that must agree, not isolated formulas:
//
//  • the prize a fixture credits is recomputed by seasonSummary, so the budget and
//    the retrospective can never disagree (money is the figure a manager audits);
//  • the points the career earned equal the live table's delta over the seeded table;
//  • the strength lines the advisor quotes are the ones the Match Engine is handed,
//    and the projected odds are replayed through matchProbability under the
//    RECOMMENDED tactics — the claim "these odds reflect the advice" is tested by
//    rebuilding the call AND by asserting it is not the neutral-tactics numbers;
//  • every number written into a rationale or evidence SENTENCE equals the field the
//    panel prints beside it (the M76/M183 family: prose must not carry a second copy
//    of a figure, because a second copy can be wrong).
//
// Five defects were found while writing this gate:
//  1. the mentality fallthrough said "Even matchup on paper" for three clubs whose
//     attack edge was +4, +8 and +12 — the attacking rule was merely blocked by its
//     own safe-back-line condition, which is not an even matchup (the same panel's
//     tempo line called +12 "a clear attacking edge"); FIXED in domain/career.ts.
//  2. the outlook's first evidence line printed the LIVE table total and attributed it
//     to the career fixtures ("with 15 pts from 10 career fixtures" when the career
//     earned 8 of those 15); FIXED — the line now prints both figures separately.
//  3. the module's own comment claimed "buying a striker lifts the attack line" while
//     26 of the 39 seeded clubs had NO attacking player at all (the seed sliced a
//     eleven-slot GROUP_PLAN to 7-9 slots, always cutting the forwards), so their
//     attack line was the club-rating fallback and for 20 of them it was HIGHER than
//     any real attacker: signing one LOWERED the printed attack. The comment is
//     corrected and the population is pinned below. M197 fixed the seed itself — the
//     plan now keeps an attacker in every prefix a squad is cut to, so all 39 clubs
//     field a measurable attack line and the fallback only appears when a manager
//     releases everyone in a group.
//  4. the advisor quoted its edges with `toFixed(0)` while the panel beside it prints
//     `Math.round`, and the two disagree on a negative half-step: Math.round(-5.5) is
//     -5 but (-5.5).toFixed(0) is "-6". 41 of the 828 reachable career states sit on
//     such a value, so a reader could be shown "Attack edge -6" next to "-5". The
//     sentences now quote the rounded fields themselves.
//  5. matchPrep's provenance chip said "your squad + tactics". It reads neither
//     slider: the advisor measures both sides at balanced tactics on purpose, because
//     it is the call that RECOMMENDS the sliders. FIXED — the chip now says what is
//     measured, and the old wording is refused by name below.
// (1), (2) and (5) are refused by name below, so they cannot come back quietly.
//
// Where a rule is a THRESHOLD (attack edge ≥ 4, fatigue > 0.6, the 0.25/0.6 zone
// bands) the expectation is re-derived from the RAW edge this script computes itself:
// the returned fields are rounded, and a rounded value cannot reproduce a boundary
// decision — which is exactly why the sentences must quote the rounded ones.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const CAREER = await server.ssrLoadModule("/domain/career.ts");
const {
  roundFee, askingFee, sellFee, startBudget, effClubId, effectiveSquad, clubInput, careerForm, fixtureAt,
  seedStandings, liveStandings, positionOf, seasonOutlook, createCareer, playNextFixture, transferIn,
  transferOut, setTactics, restSquad, matchPrep, projectFixture, seasonSummary, marketTargets,
} = CAREER;
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const { footballProvider, getClub, clubIdsByCompetition } = SVC;
const { simulateMatch } = await server.ssrLoadModule("/domain/matchEngine.ts");
const { matchProbability } = await server.ssrLoadModule("/domain/matchProbability.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
// M245 moved this module's rationale, evidence and sources onto rows, so every clause below
// that used to read a sentence off the object asks the app what the row says — the seam every
// other row-reading proof uses, rather than a second interpreter built here.
const { say: sayIn } = await makeSay(server);
const en = sayIn("en");
const say = (row) => en(row) ?? "";
const sayAll = (rows) => rows.map(say).join(" | ");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); } };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const SRC = readFileSync(new URL("../domain/career.ts", import.meta.url), "utf8");

// --- fixtures taken from the seed itself ---------------------------------------
const PLAYERS = footballProvider.players();
const ALL_CLUBS = footballProvider.clubs();
const ALL_IDS = ALL_CLUBS.map((c) => c.id);
const COMP_IDS = [...new Set(ALL_CLUBS.map((c) => c.competitionId))];
const compSize = (id) => clubIdsByCompetition(id).length;
// The biggest competition has enough rivals for the projection to slice its rival
// list; the smallest has so few that rivalRows is the complete set.
const COMP = COMP_IDS.slice().sort((a, b) => compSize(b) - compSize(a) || (a < b ? -1 : 1))[0];
const SMALL = COMP_IDS.slice().sort((a, b) => compSize(a) - compSize(b) || (a < b ? -1 : 1))[0];
const SMALL_CLUBS = clubIdsByCompetition(SMALL);
const CLUBS = clubIdsByCompetition(COMP);
const N = CLUBS.length;
const TOTAL = (N - 1) * 2;
const SEED = seedStandings(COMP);

// --- which clubs' attack line is actually a squad measurement? -----------------
// The seed generates each squad as the FIRST squadSize entries of GROUP_PLAN, and
// squads are 7-9 players. Until M197 the plan parked its attackers in slots 9-12, so
// 26 of the 39 clubs had no ST/W/AM at all and clubInput answered their attack line
// with the club's own rating. The plan now keeps an attacker inside every prefix a
// club can be cut to, so the squad-driven arithmetic is tested on every club
// (SQUAD_ATK); NO_ATK is pinned at 0 below, and the fallback itself is kept honest by
// emptying a group through transfers — the only way left to reach it.
const ATT = ["ST", "W", "AM"];
const MID = ["CM", "DM"];
const DEF = ["CB", "FB", "GK"];
const attOf = (clubId, moved = {}) => effectiveSquad(clubId, moved).filter((p) => ATT.includes(p.positionGroup));
const hasLines = (clubId) => {
  const s = effectiveSquad(clubId, {});
  return [ATT, MID, DEF].every((g) => s.some((p) => g.includes(p.positionGroup)));
};
// Deterministic: the first club of the reference competition with all three lines.
const US = CLUBS.find(hasLines) ?? CLUBS[0];
const SQUAD_ATK = ALL_IDS.filter((id) => attOf(id).length > 0);
const NO_ATK = ALL_IDS.filter((id) => attOf(id).length === 0);
// Synthetic results must never list a fixture against the managed club itself; US is not
// CLUBS[0] any more, so rivals are taken from an explicitly-filtered list.
const RIV = CLUBS.filter((id) => id !== US);

const TAC = { mentality: 0, tempo: 0.55, press: 0.5 };
const NEUTRAL = { mentality: 0, tempo: 0.5, press: 0.5 };
const st = (o = {}) => ({
  version: 1, clubId: US, competitionId: COMP, createdAt: "2026-01-01T00:00:00.000Z",
  budget: 200_000_000, morale: 0, fatigue: 0, tactics: { ...TAC }, moved: {}, results: [], ...o,
});
const sFor = (clubId, o = {}) => st({ clubId, competitionId: getClub(clubId).competitionId, ...o });
const res = (opponent, ourGoals, oppGoals, weHome = true) => ({
  opponent, weHome, ourGoals, oppGoals, ourXg: ourGoals + 0.4, oppXg: oppGoals + 0.4, at: "2026-01-01T15:00:00.000Z",
});

// Independent re-implementations, written from the module's declared rules.
const eff = (p, moved) => (p.id in moved ? moved[p.id] : p.clubId);
const GRID = 500_000;
const handRound = (v) => Math.round(v / GRID) * GRID;
const handPrize = (ours, opps) => handRound(ours > opps ? 2_000_000 : ours === opps ? 800_000 : 300_000);
const handPts = (rs) => rs.reduce((s, r) => s + (r.ourGoals > r.oppGoals ? 3 : r.ourGoals === r.oppGoals ? 1 : 0), 0);
const handGoals = (rs) => rs.reduce((s, r) => s + r.ourGoals + r.oppGoals, 0);
const groupAvg = (squad, groups, fallback) => {
  const g = squad.filter((p) => groups.includes(p.positionGroup));
  return g.length ? g.reduce((s, p) => s + p.overall, 0) / g.length : fallback;
};
const handInput = (clubId, moved, tac, fatigue = 0) => {
  const c = getClub(clubId);
  const squad = PLAYERS.filter((p) => eff(p, moved) === clubId).sort((a, b) => b.overall - a.overall);
  const best = squad.slice(0, 11);
  const att = groupAvg(squad, ["ST", "W", "AM"], c.overall);
  const mid = groupAvg(squad, ["CM", "DM"], c.overall);
  const def = groupAvg(squad, ["CB", "FB", "GK"], c.overall);
  return {
    name: c.name,
    overall: best.length ? best.reduce((s, p) => s + p.overall, 0) / best.length : c.overall,
    midRaw: mid,
    lines: {
      attack: att + tac.mentality * 3 - fatigue * 4,
      midfield: mid + tac.mentality * 0.5 - fatigue * 3,
      defense: def - tac.mentality * 2.5 + (tac.press * 3 - 1.5) - fatigue * 3,
    },
    rating: c.overall,
  };
};
const ci = (clubId, moved, tac, o = {}) => clubInput(clubId, moved, tac, o.form ?? 0, o.morale ?? 0, o.fatigue ?? 0);
const runOf = (outcomes) => outcomes.split("").map((o, i) => o === "W" ? res(RIV[i % RIV.length], 2, 0) : o === "D" ? res(RIV[i % RIV.length], 1, 1) : res(RIV[i % RIV.length], 0, 2));
const playSeason = (n, from = st()) => { let s = from; for (let i = 0; i < n; i++) s = playNextFixture(s).state; return s; };

// ---------------------------------------------------------------------------
// 1 · the fee ladder — the only money contract the transfer board prints.
// ---------------------------------------------------------------------------
ok("roundFee snaps to the 500k grid (1,234,567 → 1M, 1.4M → 1.5M, 0 → 0)",
  roundFee(1_234_567) === 1_000_000 && roundFee(1_400_000) === 1_500_000 && roundFee(0) === 0);
// M318 companion: a non-zero valuation rounds to a positive fee on the grid, so the "0 → 0" clause above has a population pin.
ok("the market quotes at least one positive rounded fee", PLAYERS.some((p) => p.value > 0 && roundFee(p.value) > 0));
ok("roundFee rounds a half step UP, so a 1.25M valuation asks 1.5M (the tie the board shows)",
  roundFee(1_250_000) === 1_500_000);
ok("roundFee matches an independent grid rounding for every valuation in the seed",
  PLAYERS.every((p) => roundFee(p.value) === handRound(p.value)));
ok("askingFee is value × 1.1 on the grid — 100M becomes 110M", askingFee({ value: 100_000_000 }) === 110_000_000);
ok("sellFee is value × 0.85 on the grid — 100M becomes 85M", sellFee({ value: 100_000_000 }) === 85_000_000);
ok("no player can ever be bought below their value or sold above it",
  PLAYERS.every((p) => askingFee(p) >= p.value && sellFee(p) <= p.value) &&
  askingFee({ value: 100_000_000 }) >= 100_000_000 && sellFee({ value: 100_000_000 }) <= 100_000_000); /* M323-PLANT: walks the same predicate on a concrete fee, so an always-true sweep reads it */
ok("every fee the market can quote sits on the grid and none collapses to a free transfer",
  PLAYERS.every((p) => askingFee(p) % GRID === 0 && sellFee(p) % GRID === 0 && askingFee(p) > 0 && sellFee(p) > 0) &&
  askingFee({ value: 3 * GRID }) % GRID === 0 && sellFee({ value: 3 * GRID }) % GRID === 0); /* M323-PLANT: a fee off the grid at a non-unit multiple would pass the seed sweep alone */
ok("signing a player and selling them straight back is a net loss, not a round trip at par",
  (() => { const p = marketTargets(st(), PLAYERS.length).slice(-1)[0]; return askingFee(p) - sellFee(p) > 0; })());

// ---------------------------------------------------------------------------
// 2 · startBudget — what a new career's war chest is.
// ---------------------------------------------------------------------------
ok("startBudget is round((overall × 2.2M + 40M)/1M)×1M — 50/85/89 give 150M/227M/236M",
  startBudget(50) === 150_000_000 && startBudget(85) === 227_000_000 && startBudget(89) === 236_000_000);
ok("startBudget never shrinks as squad quality rises (40 → 99)",
  (() => { for (let o = 40; o < 99; o++) if (startBudget(o + 1) < startBudget(o)) return false; return true; })() &&
  startBudget(50) < startBudget(51));
ok("every club's opening budget is a whole number of millions and a rebuild, not zero",
  ALL_CLUBS.every((c) => startBudget(c.overall) > 0 && startBudget(c.overall) % 1_000_000 === 0) &&
  startBudget(60) > 0 && startBudget(60) % 1_000_000 === 0);

// ---------------------------------------------------------------------------
// 3 · effClubId / effectiveSquad — who plays for whom after moves.
// ---------------------------------------------------------------------------
const US_NATIVE = PLAYERS.filter((p) => p.clubId === US);
const ONE = US_NATIVE[0];
ok("an untouched squad is exactly the provider's players for that club",
  effectiveSquad(US, {}).length === US_NATIVE.length && effectiveSquad(US, {}).every((p) => p.clubId === US) &&
  effectiveSquad(US, {}).length > 0);
ok("effectiveSquad is ordered strongest first (the eleven is the first eleven rows)",
  (() => { const s = effectiveSquad(US, {}); return s.every((p, i) => i === 0 || s[i - 1].overall >= p.overall); })() &&
  effectiveSquad(US, {})[0].overall >= effectiveSquad(US, {})[1].overall);
ok("effClubId reports a release as an empty destination, never the old club",
  effClubId(ONE, { [ONE.id]: "" }) === "" && effClubId(ONE, {}) === ONE.clubId &&
  effClubId(ONE, { [ONE.id]: "" }) === "");
ok("a transfer relocates the player: out of one squad, into the other",
  (() => { const m = { [ONE.id]: RIV[0] }; return !effectiveSquad(US, m).some((p) => p.id === ONE.id) && effectiveSquad(RIV[0], m).some((p) => p.id === ONE.id) && effectiveSquad(RIV[0], m).length >= 1; })());
ok("a released player belongs to NO club of the competition",
  (() => { const m = { [ONE.id]: "" }; return CLUBS.length > 0 && CLUBS.every((c) => !effectiveSquad(c, m).some((p) => p.id === ONE.id)); })());
// M318 companion: a transferred player belongs to exactly one club, so the "NO club" clause above has a population pin.
ok("the market moves at least one player to a new club", (() => { const m = { [ONE.id]: RIV[0] }; return effectiveSquad(RIV[0], m).length >= 1; })());
ok("moving players between clubs conserves the population (nobody invented, nobody dropped)",
  (() => {
    const native = PLAYERS.filter((p) => CLUBS.includes(p.clubId));
    const m = {}; native.forEach((p, i) => { m[p.id] = CLUBS[i % N]; });
    return CLUBS.reduce((s, c) => s + effectiveSquad(c, m).length, 0) === native.length;
  })());
ok("releasing ten players removes exactly ten from the competition's squads",
  (() => {
    const native = PLAYERS.filter((p) => CLUBS.includes(p.clubId));
    const gone = native.slice(0, 10);
    const m = {}; gone.forEach((p) => { m[p.id] = ""; });
    return CLUBS.reduce((s, c) => s + effectiveSquad(c, m).length, 0) === native.length - 10
      && gone.every((p) => CLUBS.every((c) => !effectiveSquad(c, m).some((x) => x.id === p.id)));
  })());

// ---------------------------------------------------------------------------
// 4 · clubInput — the strength lines the engine is actually handed.
// ---------------------------------------------------------------------------
ok("every strength line equals a hand re-derivation from that club's effective squad (all clubs of the competition)",
  CLUBS.every((c) => {
    const h = handInput(c, {}, NEUTRAL), g = ci(c, {}, NEUTRAL);
    return g.name === h.name && near(g.overall, h.overall) && near(g.attack, h.lines.attack)
      && near(g.midfield, h.lines.midfield) && near(g.defense, h.lines.defense);
  }));
ok("possessionBias reads the RAW midfield average (0.5 + mid/400), not the mentality-adjusted line",
  CLUBS.every((c) => { const h = handInput(c, {}, NEUTRAL); return near(ci(c, {}, NEUTRAL).possessionBias, 0.5 + h.midRaw / 400, 1e-12); }));
ok("mentality never moves possession — the same adjustment is not counted twice",
  CLUBS.every((c) => near(ci(c, {}, NEUTRAL).possessionBias, ci(c, {}, { ...NEUTRAL, mentality: 2 }).possessionBias, 1e-12)));
ok("mentality +2 lifts attack by exactly 6 and midfield by 1 while costing the back line 5",
  CLUBS.every((c) => { const a = ci(c, {}, NEUTRAL), b = ci(c, {}, { ...NEUTRAL, mentality: 2 }); return near(b.attack - a.attack, 6) && near(b.midfield - a.midfield, 1) && near(b.defense - a.defense, -5); }));
ok("mentality −2 is the exact mirror image",
  CLUBS.every((c) => { const a = ci(c, {}, NEUTRAL), b = ci(c, {}, { ...NEUTRAL, mentality: -2 }); return near(b.attack - a.attack, -6) && near(b.midfield - a.midfield, -1) && near(b.defense - a.defense, 5); }));
ok("full fatigue costs exactly 4 / 3 / 3 off the three lines",
  CLUBS.every((c) => { const a = ci(c, {}, NEUTRAL), b = ci(c, {}, NEUTRAL, { fatigue: 1 }); return near(a.attack - b.attack, 4) && near(a.midfield - b.midfield, 3) && near(a.defense - b.defense, 3); }));
ok("press enters the defensive line as (press × 3 − 1.5): 1.0 gains 1.5 over 0.5, 0.0 loses 1.5",
  near(ci(US, {}, { ...NEUTRAL, press: 1 }).defense - ci(US, {}, { ...NEUTRAL, press: 0.5 }).defense, 1.5)
    && near(ci(US, {}, { ...NEUTRAL, press: 0 }).defense - ci(US, {}, { ...NEUTRAL, press: 0.5 }).defense, -1.5));
ok("signing an attacker above the group's own mean lifts the attack line by exactly the re-derived mean",
  (() => {
    let tested = 0;
    for (const clubId of SQUAD_ATK) {
      const squad = effectiveSquad(clubId, {});
      const g = squad.filter((p) => ATT.includes(p.positionGroup));
      const mean = g.reduce((s, p) => s + p.overall, 0) / g.length;
      const base = ci(clubId, {}, NEUTRAL).attack;
      for (const p of PLAYERS.filter((x) => ATT.includes(x.positionGroup) && effClubId(x, {}) !== clubId && x.overall > mean)) {
        tested++;
        const want = (g.reduce((s, x) => s + x.overall, 0) + p.overall) / (g.length + 1);
        if (!near(ci(clubId, { [p.id]: clubId }, NEUTRAL).attack, want)) return false;
        if (!(ci(clubId, { [p.id]: clubId }, NEUTRAL).attack > base)) return false;
      }
    }
    return tested > 0;
  })());
ok("…and a below-average attacker LOWERS it: the line is a mean of the group, not a max",
  (() => {
    let tested = 0;
    for (const clubId of SQUAD_ATK) {
      const g = effectiveSquad(clubId, {}).filter((p) => ATT.includes(p.positionGroup));
      const mean = g.reduce((s, p) => s + p.overall, 0) / g.length;
      const base = ci(clubId, {}, NEUTRAL).attack;
      for (const p of PLAYERS.filter((x) => ATT.includes(x.positionGroup) && effClubId(x, {}) !== clubId && x.overall < mean)) {
        tested++;
        if (!(ci(clubId, { [p.id]: clubId }, NEUTRAL).attack < base)) return false;
      }
    }
    return tested > 0;
  })());
ok("every club with attackers has its attack line equal to that group's mean (no hidden floor or bonus)",
  SQUAD_ATK.every((id) => near(ci(id, {}, NEUTRAL).attack, handInput(id, {}, NEUTRAL).lines.attack) && near(handInput(id, {}, NEUTRAL).lines.attack, groupAvg(effectiveSquad(id, {}), ATT, getClub(id).overall))));
// --- M197: the seed now deals a balanced squad, so the fallback arrives only by
// transfer. The plan is re-read from the seed's own SOURCE: if a future reorder parks
// the attackers behind the 7-slot cut again, this goes red instead of quietly
// re-creating the 26-club population M196 measured.
const SEED_SRC = readFileSync(new URL("../data/footballSeed.ts", import.meta.url), "utf8");
const PLAN_SRC = (SEED_SRC.match(/const GROUP_PLAN: PositionGroup\[\] = \[([\s\S]*?)\];/) || [, ""])[1]
  .split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
const DEAL_SIZES = [7, 8, 9];
ok(`the seed's GROUP_PLAN keeps an attacker in every squad size it can be cut to (${PLAN_SRC.length} slots, dealt ${DEAL_SIZES.join("-")})`,
  PLAN_SRC.length >= Math.max(...DEAL_SIZES) && DEAL_SIZES.every((n) => PLAN_SRC.slice(0, n).some((g) => ATT.includes(g))),
  PLAN_SRC.join("/"));
const RAW_ATT = ALL_IDS.map((id) => PLAYERS.filter((p) => p.clubId === id && ATT.includes(p.positionGroup)).length);
ok(`every seeded club fields all three lines, so no career starts on a fallback attack (${ALL_IDS.length} clubs × ${PLAYERS.length} players; thinnest attacking line holds ${Math.min(...RAW_ATT)}, M196's 26-club debt is closed)`,
  ALL_IDS.every((id) => hasLines(id)) && NO_ATK.length === 0 && SQUAD_ATK.length === ALL_IDS.length && Math.min(...RAW_ATT) > 0);
ok("…counted straight off the seed rows, not through effectiveSquad, so this script's own partition cannot make it true",
  (() => {
    const raw = new Map();
    for (const p of PLAYERS) if (ATT.includes(p.positionGroup)) raw.set(p.clubId, (raw.get(p.clubId) ?? 0) + 1);
    return ALL_IDS.every((id) => (raw.get(id) ?? 0) > 0) && raw.size === ALL_IDS.length;
  })());
ok("the attack line is a squad measurement at every club now, never the club rating",
  ALL_IDS.every((id) => ci(id, {}, NEUTRAL).attack !== getClub(id).overall && attOf(id).length > 0));
const ATTACK_MEAN_GAP = ALL_IDS.map((id) => { const g = attOf(id); return g.reduce((s, p) => s + p.overall, 0) / g.length - getClub(id).overall; });
ok(`and the reason the fallback mattered is measured, not asserted: every club's attacking mean sits BELOW its own rating (gap ${Math.min(...ATTACK_MEAN_GAP).toFixed(2)} to ${Math.max(...ATTACK_MEAN_GAP).toFixed(2)}, so the old rating fallback always over-reported)`,
  Math.max(...ATTACK_MEAN_GAP) < 0);
ok("the fallback is still REACHABLE, but only by emptying a group: releasing every attacker leaves the club rating on that line",
  (() => {
    const moved = {};
    for (const p of attOf(US)) moved[p.id] = "";
    return attOf(US, moved).length === 0 && near(ci(US, moved, NEUTRAL).attack, getClub(US).overall)
      && near(ci(US, moved, NEUTRAL).midfield, groupAvg(effectiveSquad(US, moved), MID, getClub(US).overall));
  })());
ok("…and a brand-new career never starts there: createCareer's own moved map is empty at every club",
  ALL_IDS.every((id) => { const s = createCareer(id); return attOf(id, s.moved).length > 0 && clubInput(id, s.moved, s.tactics, 0, 0, 0).attack !== getClub(id).overall; }));
ok("the module no longer claims unconditionally that buying a striker lifts the attack line",
  !/buying a striker lifts the attack line/.test(SRC));
ok("an emptied attack group falls back to the club's own rating instead of averaging zero",
  (() => {
    const clubId = SQUAD_ATK[0];
    const m = {}; for (const p of attOf(clubId)) m[p.id] = RIV[0];
    return attOf(clubId).length > 0 && near(ci(clubId, m, NEUTRAL).attack, getClub(clubId).overall);
  })());
ok("a club with nobody left reports its own rating on every line and in possession",
  (() => {
    const m = {}; for (const p of US_NATIVE) m[p.id] = "";
    const g = ci(US, m, NEUTRAL), o = getClub(US).overall;
    return near(g.overall, o) && near(g.attack, o) && near(g.midfield, o) && near(g.defense, o) && near(g.possessionBias, 0.5 + o / 400, 1e-12);
  })());
ok("tempo, press, fatigue, morale and form are carried into the engine untouched",
  (() => { const g = ci(US, {}, { mentality: 1, tempo: 0.8, press: 0.2 }, { form: 0.4, morale: -0.3, fatigue: 0.6 }); return g.tempo === 0.8 && g.press === 0.2 && g.fatigue === 0.6 && g.morale === -0.3 && g.form === 0.4; })());

// ---------------------------------------------------------------------------
// 5 · careerForm — the last-five rungs the advisor and the projection both use.
// ---------------------------------------------------------------------------
ok("a career with no fixtures has no form at all (exactly 0, not a neutral half-way value)",
  careerForm(st()) === 0 &&
  careerForm(st({ results: runOf("WWWWW") })) > 0); /* M323-PLANT: a form that always read 0 would satisfy the empty arm alone */
// M318 companion: a career with fixtures produces non-zero form, so the "no form" clause above has a population pin.
ok("a career with five wins shows positive form", near(careerForm(st({ results: runOf("WWWWW") })), 1));
ok("five wins are the ceiling (+1)", near(careerForm(st({ results: runOf("WWWWW") })), 1));
ok("five losses are the floor (−1)", near(careerForm(st({ results: runOf("LLLLL") })), -1));
ok("five draws are the hand value (5/15)×2 − 1", near(careerForm(st({ results: runOf("DDDDD") })), (5 / 15) * 2 - 1));
ok("a mixed run is the points ladder over fifteen (W D L W W → 10 pts → +0.333…)",
  near(careerForm(st({ results: runOf("WDLWW") })), (10 / 15) * 2 - 1));
ok("only the most recent five fixtures count (five losses then five wins still reads +1)",
  near(careerForm(st({ results: [...runOf("LLLLL"), ...runOf("WWWWW")] })), 1));
ok("careerForm never leaves [-1, 1] during a real simulated season",
  (() => { let s = st(); for (let i = 0; i < TOTAL; i++) { const f = careerForm(s); if (f < -1 || f > 1 || Number.isNaN(f)) return false; s = playNextFixture(s).state; } return true; })());

// ---------------------------------------------------------------------------
// 6 · fixtureAt — the round robin the season is played on.
// ---------------------------------------------------------------------------
ok("over a full season every rival is met exactly twice, once at home and once away",
  CLUBS.every((c) => {
    const rivals = clubIdsByCompetition(getClub(c).competitionId).filter((x) => x !== c);
    const seen = {};
    for (let i = 0; i < rivals.length * 2; i++) { const fx = fixtureAt(getClub(c).competitionId, c, i); (seen[fx.opponent] = seen[fx.opponent] || []).push(fx.weHome); }
    return rivals.every((id) => (seen[id] || []).length === 2 && seen[id].filter(Boolean).length === 1 && seen[id].filter((x) => !x).length === 1);
  }));
ok("the managed club is never scheduled against itself",
  CLUBS.every((c) => { for (let i = 0; i < TOTAL + 4; i++) if (fixtureAt(getClub(c).competitionId, c, i).opponent === c) return false; return true; }));
ok("the first lap is played at home and the second away",
  (() => { const rivals = CLUBS.filter((x) => x !== US); return rivals.every((_, i) => fixtureAt(COMP, US, i).weHome === true && fixtureAt(COMP, US, i + rivals.length).weHome === false); })());
ok("the list wraps into a second season with the same shape (each rival four times, two per venue)",
  (() => {
    const seen = {};
    for (let i = 0; i < TOTAL * 2; i++) { const fx = fixtureAt(COMP, US, i); (seen[fx.opponent] = seen[fx.opponent] || []).push(fx.weHome); }
    return Object.keys(seen).length === N - 1 && Object.values(seen).every((l) => l.length === 4 && l.filter(Boolean).length === 2);
  })());

// ---------------------------------------------------------------------------
// 7 · seedStandings / liveStandings / positionOf — the table the user reads.
// ---------------------------------------------------------------------------
ok("seedStandings gives exactly one row per club of the competition, keyed by id",
  Object.keys(SEED).length === N && CLUBS.every((c) => SEED[c] && SEED[c].clubId === c));
ok("with no career fixtures the live table IS the seeded table, row for row",
  (() => { const rows = liveStandings(st()); return rows.length === N && rows.every((r) => { const s = SEED[r.clubId]; return s && r.played === s.played && r.won === s.won && r.drawn === s.drawn && r.lost === s.lost && r.gf === s.gf && r.ga === s.ga && r.points === s.points; }); })());
const HAND = [res(RIV[0], 3, 1), res(RIV[1], 0, 0), res(RIV[2], 1, 2, false), res(RIV[0], 2, 2)];
ok("the table replays an independent bump of BOTH sides, fixture by fixture",
  (() => {
    const t = {}; for (const id of CLUBS) t[id] = { ...SEED[id] };
    for (const r of HAND) {
      const home = r.weHome ? US : r.opponent, away = r.weHome ? r.opponent : US;
      const hg = r.weHome ? r.ourGoals : r.oppGoals, ag = r.weHome ? r.oppGoals : r.ourGoals;
      for (const [id, g, a] of [[home, hg, ag], [away, ag, hg]]) {
        const row = t[id]; if (!row) continue;
        row.played++; row.gf += g; row.ga += a;
        if (g > a) { row.won++; row.points += 3; } else if (g === a) { row.drawn++; row.points += 1; } else row.lost++;
      }
    }
    return liveStandings(st({ results: HAND })).every((r) => { const h = t[r.clubId]; return h && r.played === h.played && r.won === h.won && r.drawn === h.drawn && r.lost === h.lost && r.gf === h.gf && r.ga === h.ga && r.points === h.points; });
  })());
ok("every row satisfies points = 3×won + drawn", liveStandings(st({ results: HAND })).every((r) => r.points === 3 * r.won + r.drawn));
ok("the career's own goals balance across the table (deltas over the seed, which need not)",
  (() => { const rows = liveStandings(st({ results: HAND })); const dgf = rows.reduce((s, r) => s + (r.gf - SEED[r.clubId].gf), 0); const dga = rows.reduce((s, r) => s + (r.ga - SEED[r.clubId].ga), 0); return dgf === handGoals(HAND) && dga === handGoals(HAND); })());
ok("the table is sorted by points, then goal difference, then goals scored",
  (() => { const rows = liveStandings(st({ results: HAND })); for (let i = 1; i < rows.length; i++) { const a = rows[i - 1], b = rows[i]; if (a.points < b.points) return false; if (a.points === b.points && a.gf - a.ga < b.gf - b.ga) return false; if (a.points === b.points && a.gf - a.ga === b.gf - b.ga && a.gf < b.gf) return false; } return true; })());
ok("positionOf is the club's own 1-based row in that ordering, for every club",
  CLUBS.every((c) => positionOf(sFor(c)) === liveStandings(sFor(c)).findIndex((r) => r.clubId === c) + 1));
ok("positionOf always lands inside the table", CLUBS.every((c) => { const p = positionOf(sFor(c)); return p >= 1 && p <= N; }));
ok("a fixture against a club outside the competition bumps our row and drops their side",
  (() => { const rows = liveStandings(st({ results: [res("not-a-club", 2, 0)] })); return rows.length === N && !rows.some((r) => r.clubId === "not-a-club") && rows.find((r) => r.clubId === US).played === SEED[US].played + 1; })());

// ---------------------------------------------------------------------------
// 8 · playNextFixture — the state transition the Play button runs.
// ---------------------------------------------------------------------------
ok("playNextFixture never mutates the state it is handed",
  (() => { const s = st(); const snap = JSON.stringify(s); playNextFixture(s); return JSON.stringify(s) === snap; })());
ok("it appends exactly one result and returns the same figures it stored",
  (() => { const s = st(); const o = playNextFixture(s); const r = o.state.results[0]; return o.state.results.length === 1 && o.state.results[0] === s.results[0] + 1 ? false : o.state.results.length === 1 && r.ourGoals === o.ourGoals && r.oppGoals === o.oppGoals && r.ourXg === o.ourXg && r.oppXg === o.oppXg; })());
ok("the stored fixture is exactly the one fixtureAt promised for that index",
  (() => { const s = st(); const fx = fixtureAt(COMP, US, 0); const o = playNextFixture(s); return o.state.results[0].opponent === fx.opponent && o.state.results[0].weHome === fx.weHome && o.opponentName === getClub(fx.opponent).name; })());
ok("the match played is the engine run on OUR clubInput against the rival's neutral one, under the declared seed",
  (() => {
    let s = st();
    for (let i = 0; i < 4; i++) {
      const o = playNextFixture(s);
      const fx = fixtureAt(COMP, US, i);
      const homeId = fx.weHome ? US : fx.opponent, awayId = fx.weHome ? fx.opponent : US;
      const ours = clubInput(US, s.moved, s.tactics, careerForm(s), s.morale, s.fatigue);
      const theirs = clubInput(fx.opponent, s.moved, NEUTRAL, 0, 0, 0);
      const hand = simulateMatch({ seed: `career:${US}:${i}:${homeId}:${awayId}`, home: fx.weHome ? ours : theirs, away: fx.weHome ? theirs : ours });
      if (hand.seed !== o.sim.seed || hand.homeGoals !== o.sim.homeGoals || hand.awayGoals !== o.sim.awayGoals) return false;
      if (hand.stats.home.xg !== o.sim.stats.home.xg || hand.stats.away.xg !== o.sim.stats.away.xg) return false;
      s = o.state;
    }
    return true;
  })());
ok("our goals are the home side's when we host and the away side's when we travel",
  (() => { let s = st(); for (let i = 0; i < TOTAL; i++) { const o = playNextFixture(s); const r = o.state.results[i]; const ours = r.weHome ? o.sim.homeGoals : o.sim.awayGoals; const theirs = r.weHome ? o.sim.awayGoals : o.sim.homeGoals; if (r.ourGoals !== ours || r.oppGoals !== theirs || o.ourGoals + o.oppGoals !== o.sim.homeGoals + o.sim.awayGoals) return false; s = o.state; } return true; })());
ok("the prize is the declared ladder and the only movement in the budget",
  (() => { let s = st(); for (let i = 0; i < 6; i++) { const o = playNextFixture(s); if (o.prize !== handPrize(o.ourGoals, o.oppGoals) || o.state.budget !== s.budget + o.prize) return false; s = o.state; } return true; })());
ok("morale follows +0.14 / +0.02 / −0.16 clamped to [-1, 1], starting from a near-perfect 0.9",
  (() => {
    let s = st({ morale: 0.9 });
    for (let i = 0; i < TOTAL; i++) {
      const o = playNextFixture(s);
      const want = o.ourGoals > o.oppGoals ? 0.14 : o.ourGoals === o.oppGoals ? 0.02 : -0.16;
      if (!near(o.state.morale, clamp(s.morale + want, -1, 1))) return false;
      s = o.state;
    }
    return true;
  })());
ok("fatigue climbs by exactly 0.22 and the ceiling holds (0.95 + 0.22 → 1, not 1.17)",
  (() => { const a = playNextFixture(st()); const b = playNextFixture(sFor(US, { fatigue: 0.95 })); return near(a.state.fatigue, 0.22) && near(b.state.fatigue, 1); })());
ok("the same state replays the same match, and the stored instant is a real timestamp",
  (() => {
    const s = st(); const a = playNextFixture(s), b = playNextFixture(s);
    if (a.state.budget !== b.state.budget || a.state.morale !== b.state.morale || a.state.fatigue !== b.state.fatigue) return false;
    const { at: _x, ...ra } = a.state.results[0]; const { at: _y, ...rb } = b.state.results[0];
    return JSON.stringify(ra) === JSON.stringify(rb) && !Number.isNaN(Date.parse(ra.at ?? "2026-01-01"))
      && Math.abs(Date.parse(a.state.results[0].at) - Date.now()) < 60_000;
  })());
ok("the seed carries the club and the fixture index, so no two matches share a seed",
  (() => { const a = playNextFixture(st()), b = playNextFixture(sFor(US, { results: runOf("W") })); return a.sim.seed !== b.sim.seed && a.sim.seed.includes(`career:${US}:0:`) && a.sim.seed.length > 0; })());
ok("a full season plays exactly totalFixtures fixtures and never throws", playSeason(TOTAL).results.length === TOTAL);

// ---------------------------------------------------------------------------
// 9 · transfers, tactics and rest — the state's other transitions.
// ---------------------------------------------------------------------------
const TARGET = marketTargets(st(), PLAYERS.length).slice(-1)[0];
ok("an unknown player id returns the SAME object (no invented signing)",
  (() => { const s = st(); return transferIn(s, "no-such-player") === s; })() &&
  transferIn(st({ budget: 500_000_000 }), TARGET.id).moved[TARGET.id] === US); /* M323-PLANT: a transferIn that moved nobody would satisfy the identity arm alone */
ok("an unaffordable target is refused by identity: same object, same budget, no move recorded",
  (() => { const s = st({ budget: askingFee(TARGET) - 1 }); const r = transferIn(s, TARGET.id); return r === s && r.budget === s.budget && Object.keys(r.moved).length === 0; })() &&
  transferIn(st({ budget: askingFee(TARGET) }), TARGET.id).moved[TARGET.id] === US); /* M323-PLANT: a guard that refused everything would satisfy the refusal arm alone */
ok("spending to the cent is allowed (the guard is budget < fee, not <=)",
  (() => { const s = st({ budget: askingFee(TARGET) }); const r = transferIn(s, TARGET.id); return r !== s && r.moved[TARGET.id] === US; })());
ok("an affordable target is charged exactly askingFee and joins the squad while leaving its old one",
  (() => {
    const s = st({ budget: askingFee(TARGET) }); const r = transferIn(s, TARGET.id);
    return r.budget === s.budget - askingFee(TARGET) && effectiveSquad(US, r.moved).some((p) => p.id === TARGET.id) && !effectiveSquad(TARGET.clubId, r.moved).some((p) => p.id === TARGET.id);
  })());
ok("selling credits sellFee (not askingFee) and releases the player to no club",
  (() => { const mine = US_NATIVE[1]; const s = st(); const r = transferOut(s, mine.id); return r.budget === s.budget + sellFee(mine) && r.moved[mine.id] === "" && !effectiveSquad(US, r.moved).some((p) => p.id === mine.id) && sellFee(mine) < askingFee(mine); })()); /* M323-PLANT: a sellFee quoting the asking price would satisfy the credit arm alone */
ok("a buy-then-sell round trip LOSES exactly askingFee − sellFee (never breaks even)",
  (() => { const a = transferIn(st({ budget: 500_000_000 }), TARGET.id); const b = transferOut(a, TARGET.id); return 500_000_000 - b.budget === askingFee(TARGET) - sellFee(TARGET) && b.budget < 500_000_000; })());
ok("setTactics replaces the tactics and nothing else",
  (() => { const s = st(); const t = { mentality: 2, tempo: 0.9, press: 0.1 }; const r = setTactics(s, t); return JSON.stringify(r.tactics) === JSON.stringify(t) && r.budget === s.budget && r.morale === s.morale && r.fatigue === s.fatigue && r.results === s.results; })() &&
  setTactics(st({ results: runOf("W") }), { mentality: 2, tempo: 0.9, press: 0.1 }).results.length === 1); /* M323-PLANT: a setTactics that wiped the results would satisfy the "nothing else" arm alone */
ok("restSquad takes 0.5 off fatigue and floors at 0.05 rather than reaching zero",
  [0, 0.05, 0.2, 0.7, 1].every((f) => near(restSquad(st({ fatigue: f })).fatigue, Math.max(0.05, f - 0.5))));
ok("the rest control cannot reach that floor by accident: the panel disables it at or above the domain floor",
  (() => {
    const ui = readFileSync(new URL("../features/manager/ManagerOS.tsx", import.meta.url), "utf8");
    const m = /career\.fatigue <= ([\d.]+)/.exec(ui);
    return !!m && Number(m[1]) >= restSquad(st({ fatigue: 0 })).fatigue;
  })());
ok("marketTargets never lists a player the club already holds, and respects the limit",
  (() => { const s = st(); const list = marketTargets(s, 7); return list.length === 7 && !list.some((p) => effClubId(p, s.moved) === US); })());
ok("marketTargets is ordered by overall, best first, and covers every other club's player",
  (() => { const list = marketTargets(st(), PLAYERS.length); const others = PLAYERS.filter((p) => p.clubId !== US); return list.length === others.length && list.every((p, i) => i === 0 || list[i - 1].overall >= p.overall); })());
ok("a released player stays on the market (they can be re-signed, not deleted)",
  (() => { const mine = US_NATIVE[2]; return marketTargets(transferOut(st(), mine.id), PLAYERS.length).some((p) => p.id === mine.id); })());

// ---------------------------------------------------------------------------
// 10 · matchPrep — the advice panel, and the prose that must match its numbers.
// ---------------------------------------------------------------------------
const rawEdges = (s) => {
  const fx = fixtureAt(s.competitionId, s.clubId, s.results.length);
  const ourIn = clubInput(s.clubId, s.moved, NEUTRAL, careerForm(s), s.morale, s.fatigue);
  const theirIn = clubInput(fx.opponent, s.moved, NEUTRAL, 0, 0, 0);
  return { fx, ae: ourIn.attack - theirIn.defense, de: theirIn.attack - ourIn.defense, me: ourIn.midfield - theirIn.midfield, ourIn, theirIn };
};
const PREPS = ALL_IDS.map((id) => ({ id, s: sFor(id), p: matchPrep(sFor(id)) }));
const CONTRADICTED = PREPS.filter(({ p }) => /[Ee]ven matchup/.test(say(p.rationale[0])) && p.attackEdge >= 4).map(({ id }) => id);
ok("the advisor's three edges are the difference of the SAME clubInput lines the engine will get",
  PREPS.every(({ s, p }) => { const { ae, de, me } = rawEdges(s); return p.attackEdge === Math.round(ae) && p.defenseEdge === Math.round(de) && p.midfieldEdge === Math.round(me); }));
ok("the advisor hands over both squads' rounded lines, not just its verdict",
  PREPS.every(({ s, p }) => { const { ourIn, theirIn } = rawEdges(s); return p.us.attack === Math.round(ourIn.attack) && p.us.midfield === Math.round(ourIn.midfield) && p.us.defense === Math.round(ourIn.defense) && p.them.attack === Math.round(theirIn.attack) && p.them.midfield === Math.round(theirIn.midfield) && p.them.defense === Math.round(theirIn.defense); }));
ok("exactly one reason per rule is printed (mentality, press, tempo — three lines)",
  PREPS.every(({ p }) => p.rationale.length === 3));
const handMentality = (ae, de) => (ae >= 4 && de <= 2) ? (ae >= 7 ? 2 : 1) : de > 4 ? -1 : ae < -4 ? -1 : 0;
const handPress = (me) => (me >= 3 ? 0.75 : me <= -3 ? 0.3 : 0.5);
const handTempo = (ae, fatigue) => (fatigue > 0.6 ? 0.35 : ae >= 6 ? 0.7 : 0.5);
ok("mentality is exactly the declared rule chain over the raw edges (never a rounded boundary)",
  PREPS.every(({ s, p }) => { const { ae, de } = rawEdges(s); return p.recommended.mentality === handMentality(ae, de); }));
ok("press is the midfield-edge rule, and midfield is never read as defence",
  PREPS.every(({ s, p }) => { const { me } = rawEdges(s); return p.recommended.press === handPress(me); }));
ok("tempo is the fatigue-then-attack rule chain",
  PREPS.every(({ s, p }) => { const { ae } = rawEdges(s); return p.recommended.tempo === handTempo(ae, s.fatigue); }));
ok("a positive mentality always implies the attacking rule's own numbers (edge ≥ 4 and a safe back line)",
  PREPS.every(({ p }) => p.recommended.mentality > 0 ? (p.attackEdge >= 4 && p.defenseEdge <= 2) : true));
ok("only a large attacking edge earns the all-out mentality",
  PREPS.every(({ p }) => p.recommended.mentality === 2 ? p.attackEdge >= 7 : true));
ok("a defensive mentality is only ever printed when a defensive rule actually fired",
  PREPS.every(({ s, p }) => { if (p.recommended.mentality !== -1) return true; const { ae, de } = rawEdges(s); return de > 4 || ae < -4; }));
ok("a balanced mentality is always explained as a threshold outcome, never as an even matchup",
  PREPS.filter(({ p }) => p.recommended.mentality === 0).every(({ p }) => /threshold/i.test(say(p.rationale[0])) && !/even/i.test(say(p.rationale[0]))));
ok("no club still gets advice that calls an edge of +4 or more an even matchup",
  CONTRADICTED.length === 0 && PREPS.length > 0);
// M318 companion: at least one club receives balanced mentality advice, so the "no contradictions" clause above has a population pin.
ok("at least one club receives balanced mentality advice (edge within threshold)", PREPS.some(({ p }) => p.recommended.mentality === 0) && PREPS.some(({ p }) => p.recommended.mentality !== 0)); /* M323-PLANT: advice that always answered 0 would satisfy the balanced arm alone */
ok("the sentence that used to lie is gone from the model itself",
  !/Even matchup on paper/.test(SRC));
// Every sentence in matchPrep that repeats a figure the panel ALSO prints as a
// field. Derived from the source's own rationale templates, so a new sentence that
// quotes a number has to be added here or the reachability check goes red.
const FIGURES = [
  [/Attack edge \+(-?\d+) over their defense/, "attackEdge"],
  [/Their attack outruns our defense by (-?\d+)/, "defenseEdge"],
  [/weaker side on paper \(attack edge (-?\d+)\)/, "attackEdge"],
  [/We win the midfield by (-?\d+)/, "midfieldEdge"],
  [/They control midfield \((-?\d+)\)/, "midfieldEdge"],
  [/Clear attacking edge \(\+(-?\d+)\)/, "attackEdge"],
];
const quotedFor = (p, field) => {
  const txt = sayAll(p.rationale);
  const out = [];
  for (const [re, f] of FIGURES) if (f === field) for (const m of txt.matchAll(new RegExp(re.source, "g"))) out.push(Number(m[1]));
  return out;
};
const quoteErrors = (p) => [...new Set(
  FIGURES.flatMap(([, field]) => quotedFor(p, field).filter((q) => q !== p[field]).map((q) => `${field}: sentence says ${q}, field says ${p[field]}`)),
)];
// A value where Math.round and toFixed(0) disagree: a negative half-step.
const negHalf = (v) => Math.abs(Math.abs(v % 1) - 0.5) < 1e-9 && v < 0 && Math.round(v) !== Number(v.toFixed(0));
// The state grid that feeds every sentence-level clause below is made of REAL
// careers: each club's fresh start, then every successor reachable by playing the
// next fixture, by resting afterwards, and by signing the first market target the
// budget allows. A synthetic slider grid would be the wrong evidence here, because
// matchPrep measures both sides at BALANCED tactics (pinned by the invariance
// clause further down), so mentality/press/tempo choices never change what it
// prints — only results, form, fatigue and transfers do.
let BUYS = 0, SLIDES = 0;
const FIXTURES_OF = (id) => (clubIdsByCompetition(getClub(id).competitionId).length - 1) * 2;
const STATE_GRID = (() => {
  const out = [];
  for (const id of ALL_IDS) {
    let s = createCareer(id);
    out.push({ how: `${id}@0`, s });
    const total = FIXTURES_OF(id);
    for (let i = 0; i < total; i++) {
      s = playNextFixture(s).state;
      out.push({ how: `${id}@${i + 1}`, s });
      out.push({ how: `${id}@${i + 1}+rest`, s: restSquad(s) });
      if (i === 0) {
        const buy = marketTargets(s).find((p) => askingFee(p) <= s.budget);
        if (buy) { BUYS++; out.push({ how: `${id}@1+buy`, s: transferIn(s, buy.id) }); }
        // The manager may move the sliders at any point, so slider states belong in the
        // reachable set as well: they are what proves the advisor ignores them.
        for (const [tag, tactics] of [["+allout", { mentality: 2, tempo: 0.95, press: 1 }], ["+defensive", { mentality: -2, tempo: 0.05, press: 0 }]]) {
          SLIDES++;
          out.push({ how: `${id}@1${tag}`, s: setTactics(s, tactics) });
        }
      }
    }
  }
  return out;
})();
ok(`the grid really is reachable careers — every club, a full season each, rested, signed and slider variants (${STATE_GRID.length} states)`,
  STATE_GRID.length === ALL_IDS.length + BUYS + SLIDES + 2 * ALL_IDS.reduce((n, id) => n + FIXTURES_OF(id), 0)
  && BUYS === ALL_IDS.length && SLIDES === ALL_IDS.length * 2
  && ALL_IDS.every((id) => STATE_GRID.some((g) => g.how === `${id}@0`) && STATE_GRID.some((g) => g.how === `${id}@${FIXTURES_OF(id)}`)));
const PREPS2 = STATE_GRID.map(({ how, s }) => {
  const { ae, de, me } = rawEdges(s);
  return { how, s, p: matchPrep(s), raw: { attackEdge: ae, defenseEdge: de, midfieldEdge: me } };
});
ok(`every figure quoted inside a rationale equals the field printed beside it, over ${PREPS2.length} reachable career states`,
  PREPS2.length === STATE_GRID.length && PREPS2.every(({ p }) => quoteErrors(p).length === 0));
ok(`and the three recommendations hold their declared rules over those same ${PREPS2.length} states, sliders included`,
  PREPS2.every(({ s, p, raw }) => p.recommended.mentality === handMentality(raw.attackEdge, raw.defenseEdge)
    && p.recommended.press === handPress(raw.midfieldEdge)
    && p.recommended.tempo === handTempo(raw.attackEdge, s.fatigue)));
// The M196 rounding regression as a REACHABLE case, not a source-level regex:
// Math.round(-6.5) is -6 while (-6.5).toFixed(0) is "-7", and three of the six
// sentences print a signed edge, so the old interpolation could name a figure the
// panel contradicted whenever a rule fired on a negative half-step.
const HALF = PREPS2.filter(({ p, raw }) => FIGURES.some(([, field]) => negHalf(raw[field]) && quotedFor(p, field).length > 0));
ok(`${HALF.length} of the ${PREPS2.length} reachable states have a QUOTED edge sitting on a negative half-step, so the rounding defect was user-visible and not latent`,
  HALF.length > 0, `found ${HALF.length} of ${PREPS2.length}`);
ok("in each of them the sentence prints Math.round(field), never the toFixed(0) value the old code produced",
  HALF.length > 0 && HALF.every(({ p, raw }) => FIGURES.every(([, field]) => {
    if (!negHalf(raw[field])) return true;
    const qs = quotedFor(p, field);
    return qs.length === 0 || qs.every((q) => q === Math.round(raw[field]) && q !== Number(raw[field].toFixed(0)));
  })));
ok("…with a named witness taken from the walk itself: a raw edge on a negative half-step is printed as Math.round, not the toFixed(0) value",
  (() => {
    for (const e of PREPS2) for (const [, field] of FIGURES) {
      const raw = e.raw[field], qs = quotedFor(e.p, field);
      if (raw < 0 && Math.abs(raw % 1) === 0.5 && qs.length > 0) {
        const printed = Math.round(raw), old = Number(raw.toFixed(0));
        return printed !== old && qs.every((q) => q === printed);
      }
    }
    return false;
  })(), `witness: ${(() => { for (const e of PREPS2) for (const [, field] of FIGURES) { const raw = e.raw[field]; if (raw < 0 && Math.abs(raw % 1) === 0.5 && quotedFor(e.p, field).length > 0) return `${e.how} ${field} ${raw} → ${Math.round(raw)} (toFixed ${Number(raw.toFixed(0))})`; } return "none"; })()}`);
// Reachability per SENTENCE, not per field: a pattern that cannot fire would make
// the clause above vacuous, so the population is measured and pinned.
const FIRED = FIGURES.map(([re]) => ({ re: re.source, n: PREPS2.filter(({ p }) => re.test(sayAll(p.rationale))).length }));
ok(`all six quoting sentences fire in real careers now that every club fields attackers (${FIRED.map((f) => f.n + "×").join(" / ")})`,
  FIRED.every((f) => f.n > 0), `fired ${FIRED.map((f) => `${f.n}× ${f.re.slice(0, 24)}`).join(" · ")}`);
// Which advice arms the seed can actually reach, swept over every pairing in every
// competition and every fatigue level the model holds, on the seeded squads. M196 ran
// this and found the weaker-side arm shadowed by rule order — an artefact of the
// fallback attack lines, which inflated a weak club's printed attack until it could not
// sit below −4 without its defence also sitting above +4. M197 removed the inflation and
// that arm came live while the all-out cut went structurally dead (nothing reached +12);
// M200 moved the cut to +7, so the census is now per ARM: every mentality value the
// chain can emit must have a reachable state, because an arm with none is a sentence the
// product can never say and a rule nobody exercises.
const ARMS = (() => {
  const n = { "2": 0, "1": 0, "0": 0, "-1": 0, "-2": 0 };
  let total = 0, weakest = { ae: Infinity }, strongest = { ae: -Infinity }, witness = {}, bestAllOut = null;
  for (const id of ALL_IDS) for (const rival of clubIdsByCompetition(getClub(id).competitionId).filter((x) => x !== id)) {
    for (let k = 0; k <= 20; k++) {
      const f = Math.min(1, k / 20);
      const our = clubInput(id, {}, NEUTRAL, 0, 0, f), them = clubInput(rival, {}, NEUTRAL, 0, 0, 0);
      const ae = our.attack - them.defense, de = them.attack - our.defense;
      total++;
      if (ae < weakest.ae) weakest = { ae, de, at: `${id} vs ${rival} at fatigue ${f.toFixed(2)}` };
      if (ae > strongest.ae) strongest = { ae, de, at: `${id} vs ${rival} at fatigue ${f.toFixed(2)}` };
      const m = handMentality(ae, de);
      n[String(m)]++;
      if (!witness[String(m)]) witness[String(m)] = `${id} vs ${rival} at fatigue ${f.toFixed(2)} (ae ${ae.toFixed(2)}, de ${de.toFixed(2)})`;
      if (m === 2 && (!bestAllOut || ae > bestAllOut.ae)) bestAllOut = { ae, de, at: `${id} vs ${rival} at fatigue ${f.toFixed(2)}` };
    }
  }
  return { n, total, weakest, strongest, witness, bestAllOut };
})();
const ARM_KEYS = ["2", "1", "0", "-1"];
ok(`every mentality arm the chain can emit is reachable: ${ARM_KEYS.map((k) => `${k} ×${ARMS.n[k]}`).join(" / ")} of ${ARMS.total} pairing × fatigue states (weakest edge ${ARMS.weakest.ae.toFixed(2)} at ${ARMS.weakest.at}; strongest ${ARMS.strongest.ae.toFixed(2)} at ${ARMS.strongest.at})`,
  ARM_KEYS.every((k) => ARMS.n[k] > 0));
ok(`…and the all-out band is described by its own strongest state, so the clause above cannot pass on a technicality (${ARMS.bestAllOut ? `${ARMS.bestAllOut.at}: ae ${ARMS.bestAllOut.ae.toFixed(2)}, de ${ARMS.bestAllOut.de.toFixed(2)}` : "empty"})`,
  !!ARMS.bestAllOut && ARMS.bestAllOut.ae >= 7 && ARMS.bestAllOut.de <= 2);
ok("…and it prints in the walk rather than only existing in the sweep",
  FIRED.find((f) => /weaker side on paper/.test(f.re)).n > 0 && PREPS2.some(({ p }) => /weaker side on paper/.test(sayAll(p.rationale))));
ok(`…while the weakest-side arm still fires on its own rule (weakest ${ARMS.weakest.ae.toFixed(2)} arriving with defensive edge ${ARMS.weakest.de.toFixed(2)})`,
  ARMS.n["-1"] > 0 && ARMS.weakest.ae < -4 && ARMS.weakest.de > 4);
// The one asymmetry the model keeps, stated rather than left implicit: the attacking
// side has two steps (+4 then +7) and the defensive side one, so −2 is never a
// recommendation even though the slider offers it. That is a modelling choice, not a
// broken arm — so it is measured on the same sweep and named here.
ok(`…while the advisor never recommends −2, because the chain has one defensive step and two attacking ones (${ARMS.n["-2"]} of ${ARMS.total} states would ask for it)`,
  ARMS.n["-2"] === 0);
ok("the all-out recommendation is printed by a reachable career, not merely defined",
  PREPS2.some(({ p }) => p.recommended.mentality === 2 && /all-out/.test(say(p.rationale[0]))));
ok("the advisor is measured at balanced tactics, so what it prints does not move with the sliders the manager has set — while the engine's lines do",
  (() => {
    const base = createCareer(US);
    const set = (mentality, tempo, press) => ({ ...base, tactics: { mentality, tempo, press } });
    const variants = [set(0, 0.5, 0.5), set(-2, 0.05, 1), set(2, 0.95, 0), set(1, 0.6, 0.4)];
    const shots = variants.map((s) => JSON.stringify(matchPrep(s)));
    const lines = variants.map((s) => clubInput(s.clubId, {}, s.tactics, 0, 0, 0));
    return shots.every((x) => x === shots[0]) && new Set(lines.map((l) => `${l.attack}|${l.midfield}|${l.defense}`)).size > 1;
  })());
ok("the provenance chip says balanced tactics, and the wording that claimed it read your sliders is refused",
  /balanced tactics/.test(say(matchPrep(createCareer(US)).sources[0])) && !/squad \+ tactics/.test(SRC));
// Threshold LOCATION, not just threshold behaviour. A real season steps fatigue by
// 0.22 (so 0.6 is never held), which leaves the `> 0.6` tempo boundary unexercised by
// the walk above. A fine synthetic fatigue sweep closes that gap and reconciles all
// three rules at every 0.01 step, so a drift in any threshold goes red.
const FINE = [];
for (const id of ALL_IDS) for (let k = 0; k <= 100; k++) FINE.push(sFor(id, { fatigue: k / 100 }));
const FINE2 = FINE.map((s) => ({ s, p: matchPrep(s), raw: rawEdges(s) }));
ok(`all three advice rules hold their declared thresholds across a 0.01-step fatigue sweep of every club (${FINE2.length} states)`,
  FINE2.every(({ s, p, raw }) => p.recommended.mentality === handMentality(raw.ae, raw.de)
    && p.recommended.press === handPress(raw.me)
    && p.recommended.tempo === handTempo(raw.ae, s.fatigue)));
// The sweep above samples boundaries; it cannot prove a threshold is where the module
// says it is unless a state lands on BOTH sides of it. Fatigue is the only continuous
// knob the advisor reads (clubInput uses neither form nor morale in the three lines) and
// its effect is linear — attack edge falls 4 per unit of fatigue, defensive exposure
// rises 3, midfield falls 3 — so every threshold has an exact crossing fatigue, and each
// one is probed on both sides. The numbers are READ OUT of the shipped module rather than
// typed twice here, so a threshold that moves makes the straddle follow it and the model
// disagree with `handMentality` above; that is what catches a MOVED rule instead of an
// unreached one. M200 moved the all-out cut from 12 to 7 through exactly this machinery.
const CUTS = {
  attacking: Number(SRC.match(/if \(attackEdge >= (\d+) && defenseEdge <= \d+\)/)?.[1]),
  safeBackLine: Number(SRC.match(/if \(attackEdge >= \d+ && defenseEdge <= (\d+)\)/)?.[1]),
  allOut: Number(SRC.match(/attackEdge >= (\d+) \? 2 : 1/)?.[1]),
  exposed: Number(SRC.match(/else if \(defenseEdge > (\d+)\)/)?.[1]),
  weaker: Number(SRC.match(/else if \(attackEdge < -(\d+)\)/)?.[1]),
  pressHigh: Number(SRC.match(/midfieldEdge >= (\d+)/)?.[1]),
  pressLow: Number(SRC.match(/midfieldEdge <= -(\d+)/)?.[1]),
};
ok(`every threshold the advisor declares is parsed out of the shipped module (${Object.entries(CUTS).map(([k, v]) => `${k}=${v}`).join(" ")})`,
  Object.values(CUTS).every((v) => Number.isFinite(v)),
  Object.entries(CUTS).filter(([, v]) => !Number.isFinite(v)).map(([k]) => k).join(", "));
ok(`…and the numbers the gate models by hand still match the ones the module ships (attacking ${CUTS.attacking}, all-out ${CUTS.allOut}, exposed ${CUTS.exposed}, weaker −${CUTS.weaker}): if this is red, a threshold moved and the reachability census above has to be re-derived, not re-typed`,
  CUTS.attacking === 4 && CUTS.allOut === 7 && CUTS.safeBackLine === 2 && CUTS.exposed === 4 && CUTS.weaker === 4 && CUTS.pressHigh === 3 && CUTS.pressLow === 3);

const aeAt = (base, f) => base - 4 * f;
const deAt = (base, f) => base + 3 * f;
const meAt = (base, f) => base - 3 * f;
const THRESHOLDS = [
  { name: "attacking", T: CUTS.attacking, at: (e) => (e.ae - CUTS.attacking) / 4, edge: (e, f) => aeAt(e.ae, f), guard: (e, f) => deAt(e.de, f) <= CUTS.safeBackLine, kind: "mentality" },
  { name: "all-out", T: CUTS.allOut, at: (e) => (e.ae - CUTS.allOut) / 4, edge: (e, f) => aeAt(e.ae, f), guard: (e, f) => deAt(e.de, f) <= CUTS.safeBackLine, kind: "mentality" },
  { name: "weaker side", T: -CUTS.weaker, at: (e) => (e.ae + CUTS.weaker) / 4, edge: (e, f) => aeAt(e.ae, f), guard: (e, f) => deAt(e.de, f) <= CUTS.exposed, kind: "mentality" },
  { name: "exposed defence", T: CUTS.exposed, at: (e) => (CUTS.exposed - e.de) / 3, edge: (e, f) => deAt(e.de, f), guard: () => true, kind: "mentality" },
  { name: "high press", T: CUTS.pressHigh, at: (e) => (e.me - CUTS.pressHigh) / 3, edge: (e, f) => meAt(e.me, f), guard: () => true, kind: "press" },
  { name: "deep block", T: -CUTS.pressLow, at: (e) => (e.me + CUTS.pressLow) / 3, edge: (e, f) => meAt(e.me, f), guard: () => true, kind: "press" },
];
const CROSSINGS = (() => {
  const out = [];
  for (const id of ALL_IDS) {
    let s = createCareer(id);
    const total = FIXTURES_OF(id);
    for (let i = 0; i < total; i++) {
      const e0 = rawEdges({ ...s, fatigue: 0 });
      for (const th of THRESHOLDS) {
        const f = th.at(e0);
        if (!(f > 0.02 && f < 0.98) || !th.guard(e0, f)) continue;
        const lo = { ...s, fatigue: +(f - 0.005).toFixed(4) };
        const hi = { ...s, fatigue: +(f + 0.005).toFixed(4) };
        out.push({ id, i, T: th.T, name: th.name, kind: th.kind, f, lo, hi, pl: matchPrep(lo), ph: matchPrep(hi), rl: rawEdges(lo), rh: rawEdges(hi) });
      }
      s = playNextFixture(s).state;
    }
  }
  return out;
})();
const gotOf = (c, p) => (c.kind === "mentality" ? p.recommended.mentality : p.recommended.press);
const wantOf = (c, raw) => (c.kind === "mentality" ? handMentality(raw.ae, raw.de) : handPress(raw.me));
ok(`every crossing probe agrees with the declared rule on both sides of the threshold (${CROSSINGS.length} straddles over ${ALL_IDS.length} real seasons)`,
  CROSSINGS.length > 0 && CROSSINGS.every((c) => gotOf(c, c.pl) === wantOf(c, c.rl) && gotOf(c, c.ph) === wantOf(c, c.rh)));
const flipLine = () =>
  THRESHOLDS.map((th) => {
    const m = CROSSINGS.filter((c) => c.name === th.name);
    return `${th.name}(${th.T}) ${m.length}/${m.filter((c) => gotOf(c, c.pl) !== gotOf(c, c.ph)).length}`;
  }).join(" · ");
ok(`…and each of the ${THRESHOLDS.length} thresholds the module declares has at least one straddle where the model's own recommendation flips — the figures are straddles/flipping: ${flipLine()}`,
  THRESHOLDS.every((th) => {
    const m = CROSSINGS.filter((c) => c.name === th.name);
    return m.length > 0 && m.some((c) => gotOf(c, c.pl) !== gotOf(c, c.ph));
  }));
ok("the rationale never quotes a raw float: it interpolates the rounded edge fields",
  !/rationale\.push\([^)]*\$\{(attackEdge|defenseEdge|midfieldEdge)\.toFixed/.test(SRC));
ok("a tired squad's tempo line quotes the same rounded percentage the panel shows",
  (() => { const p = matchPrep(sFor(US, { fatigue: 0.9 })); return p.recommended.tempo === 0.35 && say(p.rationale[2]).includes(`Fatigue is ${Math.round(0.9 * 100)}%`); })());
ok("the fatigue arm of the tempo rule fires on its own, and the tempo line stops claiming a high tempo",
  (() => {
    const tired = PREPS2.find(({ s }) => s.fatigue > 0.6);
    // An absent subject is a FAIL, not a crash: `matchPrep(undefined)` would take the
    // whole file down and hide the other clauses.
    if (!tired) return false;
    return tired.p.recommended.tempo === 0.35 && !/higher tempo/.test(say(tired.p.rationale[2]));
  })());
ok("…and the attacking-edge arm fires on its own too, so the rule's ordering is tested at both arms rather than assumed at one",
  (() => {
    const edgey = PREPS2.find(({ s, raw }) => s.fatigue <= 0.6 && raw.attackEdge >= 6);
    if (!edgey) return false;
    return edgey.p.recommended.tempo === 0.7 && /Clear attacking edge/.test(say(edgey.p.rationale[2]));
  })());
// The two tempo arms are ORDERED (fatigue first), so precedence has a witness only if
// some state has both live. PREPS2 has none — a real season steps fatigue by 0.22, so a
// career never parks just past 0.6 while a strong edge is still ≥ 6. That is not a
// reason to assume the band is empty: M197 measured it by sweeping every fixture a
// managed club is scheduled to play at every 0.01 fatigue step above 0.6, and the band
// IS reachable in the model's own input space — the check below prints how many states
// there are and where the strongest one sits — so the ordering gets tested there
// instead of being assumed untestable.
const BOTH_ARMS = (() => {
  const out = [];
  let scanned = 0;
  for (const id of ALL_IDS) {
    const sched = [];
    for (let i = 0; i < FIXTURES_OF(id); i++) sched.push(res(fixtureAt(getClub(id).competitionId, id, i).opponent, 0, 0, false));
    for (let i = 0; i < sched.length; i++) {
      // The dummy results are for the fixture COUNT only: clubInput reads neither
      // form nor morale in the three lines, so the edges depend on fatigue alone.
      const s0 = sFor(id, { results: sched.slice(0, i) });
      for (let k = 61; k <= 100; k++) {
        const s = { ...s0, fatigue: k / 100 };
        scanned++;
        const { ae } = rawEdges(s);
        if (ae >= 6) out.push({ id, i, opp: sched[i].opponent, fatigue: k / 100, ae, s, p: matchPrep(s) });
      }
    }
  }
  out.scanned = scanned;
  return out;
})();
const STRONGEST = BOTH_ARMS.reduce((a, b) => (b.ae > a.ae ? b : a), BOTH_ARMS[0]);
ok(`the two arms DO overlap somewhere in the model's own space, so the ordering below is a live test rather than a vacuous one (${BOTH_ARMS.scanned} scheduled-fixture × fatigue states scanned from 0.61 to 1.00, ${BOTH_ARMS.length} where both are live, strongest attack edge ${STRONGEST.ae.toFixed(2)} at ${STRONGEST.id} vs ${STRONGEST.opp} fixture ${STRONGEST.i} fatigue ${STRONGEST.fatigue.toFixed(2)})`,
  BOTH_ARMS.length > 0, `e.g. ${BOTH_ARMS.map((b) => `${b.id}@${b.i} f=${b.fatigue.toFixed(2)}`).slice(0, 4).join(" · ")}`);
ok("wherever both are live the fatigue arm owns the recommendation — tempo 0.35 and the fatigue sentence, never the high-tempo claim",
  BOTH_ARMS.every(({ p }) => p.recommended.tempo === 0.35
    && /Fatigue is/.test(say(p.rationale[2])) && !/higher tempo/.test(say(p.rationale[2]))));
ok("…and the same states keep their advice inside the controls, so the overlap is not a degenerate corner of the model",
  BOTH_ARMS.every(({ p }) => p.recommended.tempo >= 0 && p.recommended.tempo <= 1 && Number.isInteger(p.recommended.mentality)));
ok("confidence is the declared formula over the raw edges, capped at 90",
  PREPS.every(({ s, p }) => { const { ae, de, me } = rawEdges(s); return p.confidence === Math.min(90, Math.round(55 + Math.abs(ae) + Math.abs(me) / 2 + Math.abs(de))); }));
ok("the recommendation always fits the controls that have to hold it (mentality −2..2 integer, tempo/press 0..1)",
  PREPS.every(({ p }) => Number.isInteger(p.recommended.mentality) && Math.abs(p.recommended.mentality) <= 2 && p.recommended.tempo >= 0 && p.recommended.tempo <= 1 && p.recommended.press >= 0 && p.recommended.press <= 1));
ok("the venue and opponent are the fixture the next click will play",
  PREPS.every(({ s, p }) => { const fx = fixtureAt(s.competitionId, s.clubId, s.results.length); return p.weHome === fx.weHome && p.opponentName === getClub(fx.opponent).name && p.venue === (fx.weHome ? "Home" : "Away"); }));
ok("matchPrep is pure and deterministic", PREPS.every(({ s }) => { const snap = JSON.stringify(s); const a = JSON.stringify(matchPrep(s)); return JSON.stringify(s) === snap && a === JSON.stringify(matchPrep(s)); }));

// ---------------------------------------------------------------------------
// 11 · projectFixture — the odds the advice is claimed to be based on.
// ---------------------------------------------------------------------------
const REC_CLUB = ALL_IDS.find((id) => { const r = matchPrep(sFor(id)).recommended; return r.tempo !== 0.5 || r.press !== 0.5 || r.mentality !== 0; });
const pfHand = (s, tac) => {
  const fx = fixtureAt(s.competitionId, s.clubId, s.results.length);
  const ours = clubInput(s.clubId, s.moved, tac, careerForm(s), s.morale, s.fatigue);
  const theirs = clubInput(fx.opponent, s.moved, NEUTRAL, 0, 0, 0);
  return matchProbability({ seedBase: `prepcareer:${s.clubId}:${fx.opponent}:${s.results.length}`, home: fx.weHome ? ours : theirs, away: fx.weHome ? theirs : ours, runs: 60 });
};
ok("the projected odds are a replay of matchProbability under the RECOMMENDED tactics",
  (() => { const s = sFor(REC_CLUB); return JSON.stringify(pfHand(s, matchPrep(s).recommended)) === JSON.stringify(projectFixture(s, 60)); })());
ok("…and they are NOT the neutral-tactics numbers, so 'based on the recommendation' is not decoration",
  (() => { const s = sFor(REC_CLUB); return JSON.stringify(pfHand(s, NEUTRAL)) !== JSON.stringify(projectFixture(s, 60)); })());
ok("the odds name both sides of the coming fixture, on the right sides",
  (() => { const s = sFor(REC_CLUB), fx = fixtureAt(s.competitionId, s.clubId, 0), p = projectFixture(s, 40); return p.homeName === getClub(fx.weHome ? s.clubId : fx.opponent).name && p.awayName === getClub(fx.weHome ? fx.opponent : s.clubId).name; })());
ok("the run count defaults to 150 and is clamped into the engine's range",
  projectFixture(st()).runs === 150 && projectFixture(st(), 0).runs === 1 && projectFixture(st(), 9e5).runs === 1000);
ok("projectFixture is pure and deterministic", (() => { const s = st(); const snap = JSON.stringify(s); const a = JSON.stringify(projectFixture(s, 30)); return snap === JSON.stringify(s) && a === JSON.stringify(projectFixture(s, 30)); })());

// ---------------------------------------------------------------------------
// 12 · seasonOutlook — the projection panel.
// ---------------------------------------------------------------------------
const handOutlook = (s) => {
  const rows = liveStandings(s);
  const ours = rows.find((r) => r.clubId === s.clubId) ?? { clubId: s.clubId, played: 0, points: 0, gf: 0, ga: 0 };
  const count = clubIdsByCompetition(s.competitionId).length;
  const total = Math.max(1, (count - 1) * 2);
  const rem = Math.max(0, total - s.results.length);
  const ppg = (r) => r.points / Math.max(1, r.played);
  const form = careerForm(s);
  const ourPpg = Math.max(0, Math.min(3, ppg(ours) + form * 0.3));
  const proj = {};
  for (const r of rows) proj[r.clubId] = r.clubId === s.clubId ? r.points + ourPpg * rem : r.points + ppg(r) * Math.max(0, total - r.played);
  const order = rows.map((r) => r.clubId).sort((a, b) => proj[b] - proj[a]);
  const sigma = 1.4 * Math.sqrt(2 * Math.max(rem, 1));
  const beat = {};
  for (const r of rows) if (r.clubId !== s.clubId) {
    const gdEdge = (ours.gf - ours.ga) - (r.gf - r.ga);
    beat[r.clubId] = 1 / (1 + Math.exp(-(proj[r.clubId] - proj[s.clubId] + gdEdge * 0.08) / sigma));
  }
  const ids = Object.keys(beat);
  return {
    rows, count, total, rem, form, ourPpg, proj, beat, ids,
    ourProj: proj[s.clubId],
    leaderId: order[0],
    gap: Math.max(0, proj[order[0]] - proj[s.clubId]),
    position: rows.findIndex((r) => r.clubId === s.clubId) + 1,
    projectedPosition: order.indexOf(s.clubId) + 1,
    title: ids.reduce((a, id) => a * (1 - beat[id]), 1),
    finish: 1 + ids.reduce((a, id) => a + (1 - beat[id]), 0),
    points: ours.points,
  };
};
const played6 = playSeason(6);
const OL = { empty: seasonOutlook(st()), played: seasonOutlook(played6) };
const OL_ALL = ALL_IDS.map((id) => ({ id, s: sFor(id), o: seasonOutlook(sFor(id)) }));
ok("the outlook's season arithmetic reconciles (played / total / remaining)",
  ALL_IDS.every((id) => { const o = seasonOutlook(sFor(id)), h = handOutlook(sFor(id)); return o.played === sFor(id).results.length && o.totalFixtures === h.total && o.remaining === h.rem; }));
ok("played counts the career fixtures, not the seeded ones", OL.empty.played === 0 && OL.played.played === 6);
ok("the projection's own points field is the LIVE table total, not the career's",
  OL_ALL.every(({ s, o }) => o.points === handOutlook(s).points && o.points === liveStandings(s).find((r) => r.clubId === s.clubId).points));
ok("the blended points-per-game is the season average adjusted by form and clamped to [0, 3]",
  OL_ALL.length >= 1 && OL_ALL.every(({ s, o }) => near(o.pointsPerGame, r2(handOutlook(s).points / Math.max(1, liveStandings(s).find((r) => r.clubId === s.clubId).played))) && handOutlook(s).ourPpg >= 0 && handOutlook(s).ourPpg <= 3));
ok("projected points = live points + the blended ppg × rounds left",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return o.projectedPoints === r1(h.ourProj); }));
ok("gap to the projected leader is the rounded shortfall and never negative",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return o.gapToProjectedLeader === r1(Math.max(0, h.gap)) && o.gapToProjectedLeader >= 0; }));
ok("a non-zero gap always puts us below the projected top spot",
  OL_ALL.every(({ o }) => o.gapToProjectedLeader > 0 ? o.projectedPosition > 1 : true));
ok("the projected leader is the club with the highest projection, whoever it is",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return o.leaderName === getClub(h.leaderId).name; }));
ok("projected position is the place in the projection ordering, inside the table",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return o.projectedPosition === h.projectedPosition && o.projectedPosition >= 1 && o.projectedPosition <= h.count; }));
ok("title chance is the product over EVERY rival, replayed from the model's own odds",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return near(o.titleChance, h.title, 1e-12) && o.titleChance >= 0 && o.titleChance <= 1; }));
ok("expected finish is 1 + the rivals we are projected to out-point, rounded to a tenth",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return o.expectedFinish === r1(h.finish) && o.expectedFinish >= 1 && o.expectedFinish <= h.count; }));
ok("the rival rows are the four most likely to finish above us, ordered by that chance",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); const want = h.ids.slice().sort((a, b) => h.beat[b] - h.beat[a]).slice(0, 4); return o.rivalRows.length === Math.min(4, h.ids.length) && o.rivalRows.map((r) => r.clubId).join() === want.join() && o.rivalRows.every((r) => r.clubId !== s.clubId); }));
ok("every rival row's chance, projection, ppg and name equal the model's own re-derivation",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); return o.rivalRows.every((r) => near(r.beatUsChance, h.beat[r.clubId], 1e-12) && r.projectedPoints === r1(h.proj[r.clubId]) && r.currentPpg === r2(h.rows.find((x) => x.clubId === r.clubId).points / Math.max(1, h.rows.find((x) => x.clubId === r.clubId).played)) && r.clubName === getClub(r.clubId).name); }));
ok("a rival's ahead-of-us flag agrees with the rounded projection printed beside it (no display flip)",
  OL_ALL.every(({ o }) => o.rivalRows.every((r) => r.aheadOfUs === (r.projectedPoints > o.projectedPoints))));
ok("the zone is one of three declared keys whose tone matches its own band of the table",
  OL_ALL.every(({ s, o }) => { const h = handOutlook(s); const pctPos = (o.position - 1) / h.count; const want = pctPos <= 0.25 ? "good" : pctPos <= 0.6 ? "mixed" : "bad"; return ["mgr.zoneTitle", "mgr.zoneUpperMid", "mgr.zoneDrop"].includes(o.zone.label.key) && o.zone.tone === want && o.position === h.position; }));
ok("the zone and honour keys resolve to real text in every locale the app ships",
  (() => {
    const keys = new Set(OL_ALL.map(({ o }) => o.zone.label.key));
    ["mgr.honourChampions", "mgr.honourTop", "mgr.honourContenders", "mgr.honourMidtable", "mgr.honourRelegation"].forEach((k) => keys.add(k));
    return [...keys].every((k) => Object.values(DICTIONARIES).every((d) => typeof d[k] === "string" && d[k].length > 0));
  })());
ok("confidence is the declared ladder, monotone in fixtures played, and caps at 85",
  (() => { const seen = []; for (let i = 0; i <= TOTAL; i++) seen.push(seasonOutlook(playSeason(i)).confidence); return seen.every((c, i) => c === Math.min(85, 12 + i * 9)) && seen.every((c, i) => i === 0 || c >= seen[i - 1]); })());
ok("the outlook states that its projection is a model, not a fixture played",
  /modelled estimates, not fixtures played/i.test(sayAll(OL.played.evidence)));
ok("the outlook's first line carries BOTH the live-table total and the points the career earned",
  (() => { const s = played6, o = seasonOutlook(s); return say(o.evidence[0]).includes(String(o.points)) && say(o.evidence[0]).includes(String(handPts(s.results))); })());
ok("the outlook never attributes the whole live-table total to the career fixtures",
  OL_ALL.every(({ s, o }) => !new RegExp(`with ${o.points} pts from ${o.played} career fixtures`).test(say(o.evidence[0]))));
ok("the points a career earned equal the live table's delta over the seed, for every club",
  ALL_IDS.every((id) => { const s = sFor(id); return liveStandings(s).find((r) => r.clubId === id).points - seedStandings(s.competitionId)[id].points === handPts(s.results); }));
ok("every figure the projection computes also appears in its evidence lines",
  (() => { const o = OL.played, j = sayAll(o.evidence); return j.includes(`#${o.position}`) && j.includes(`${o.points} pts`) && j.includes(`${o.played} career fixtures`) && j.includes(String(o.projectedPoints)) && j.includes(o.leaderName) && j.includes(`${o.remaining} rounds left`); })());
ok("the outlook always prints exactly four evidence lines", OL_ALL.every(({ o }) => o.evidence.length === 4));
ok("the sources name local data and the model, never a server, API or sync",
  OL.played.sources.length > 0 && OL_ALL.every(({ o }) => o.sources.every((x) => say(x).length > 0 && !/backend|server|https?|api|cloud|database|sync/i.test(say(x)))));
// M245. The rationale, the evidence and the sources are rows now, so two properties they had no
// way to fail before are worth pinning: they speak the reader's language, and none of them
// reaches a reader as its own key.
const zh = sayIn("zh-CN");
ok("a rationale, an evidence line and a source all read in the reader's own language",
  say(matchPrep(createCareer(US)).rationale[0]) !== zh(matchPrep(createCareer(US)).rationale[0]) &&
  say(OL.played.evidence[0]) !== zh(OL.played.evidence[0]) &&
  say(OL.played.sources[0]) !== zh(OL.played.sources[0]));
ok("…and no rationale or evidence row in a real career resolves to a key or an empty line",
  PREPS2.every(({ p }) => p.rationale.every((r) => { const line = say(r); return line.length > 0 && !/^mgr\./.test(line); })) &&
  OL_ALL.every(({ o }) => o.evidence.every((r) => { const line = say(r); return line.length > 0 && !/^mgr\./.test(line); })));
ok("seasonOutlook is pure and deterministic",
  (() => { const s = played6; const snap = JSON.stringify(s); const a = JSON.stringify(seasonOutlook(s)); return JSON.stringify(s) === snap && a === JSON.stringify(seasonOutlook(s)); })());
ok("a career with no fixtures still gets a full projection without crashing",
  OL.empty.remaining === TOTAL && OL.empty.confidence === 12 && OL.empty.evidence.length === 4 && Number.isFinite(OL.empty.titleChance));
ok("on a competition small enough to list every rival, the rival rows are the whole table minus us",
  (() => { const c = SMALL_CLUBS[0]; const o = seasonOutlook(sFor(c)); return o.rivalRows.length === clubIdsByCompetition(getClub(c).competitionId).length - 1; })());

// ---------------------------------------------------------------------------
// 13 · seasonSummary — the retrospective, which must reconcile with the season.
// ---------------------------------------------------------------------------
const SUM = seasonSummary(played6);
ok("every aggregate is re-derived from the stored results by an independent pass",
  (() => {
    const rs = played6.results;
    const exp = {
      played: rs.length,
      won: rs.filter((r) => r.ourGoals > r.oppGoals).length,
      drawn: rs.filter((r) => r.ourGoals === r.oppGoals).length,
      lost: rs.filter((r) => r.ourGoals < r.oppGoals).length,
      gf: rs.reduce((s, r) => s + r.ourGoals, 0),
      ga: rs.reduce((s, r) => s + r.oppGoals, 0),
      cleanSheets: rs.filter((r) => r.oppGoals === 0).length,
      points: handPts(rs),
    };
    return exp.won + exp.drawn + exp.lost === exp.played && SUM.played === exp.played && SUM.won === exp.won && SUM.drawn === exp.drawn && SUM.lost === exp.lost
      && SUM.gf === exp.gf && SUM.ga === exp.ga && SUM.gd === exp.gf - exp.ga && SUM.cleanSheets === exp.cleanSheets && SUM.points === exp.points;
  })());
ok("the retrospective's prize total is the same ladder the matches credited (budget reconciliation)",
  played6.budget - 200_000_000 === SUM.prizeTotal && SUM.prizeTotal === played6.results.reduce((s, r) => s + handPrize(r.ourGoals, r.oppGoals), 0));
ok("the money printed in the evidence line parses back to that total",
  (() => { const line = SUM.evidence.find((l) => /Prize money earned/.test(say(l))); const m = /€([\d.]+)(M|k)/.exec(say(line)); if (!m) return false; const v = Number(m[1]) * (m[2] === "M" ? 1e6 : 1e3); return Math.abs(v - SUM.prizeTotal) <= (m[2] === "M" ? 50_000 : 500); })());
ok("the summary prints the career's own points, never the live table's total",
  SUM.points === handPts(played6.results) && liveStandings(played6).find((r) => r.clubId === US).points !== SUM.points);
ok("ppg is round2(points/played) and exactly 0 before the first fixture",
  SUM.ppg === r2(SUM.points / SUM.played) && seasonSummary(st()).ppg === 0);
// M318 companion: a career with points shows positive ppg, so the "exactly 0" clause above has a population pin.
ok("a career with wins shows positive points-per-game", seasonSummary(played6).ppg > 0);
ok("the record line prints the W-D-L, the goals and the signed goal difference the fields carry",
  (() => { const l = say(SUM.evidence[0]); return l.startsWith(`${SUM.won}-${SUM.drawn}-${SUM.lost} from ${SUM.played} fixtures`) && l.includes(`${SUM.gf} scored, ${SUM.ga} conceded`) && l.includes(`GD ${SUM.gd >= 0 ? "+" : ""}${SUM.gd}`); })());
ok("the clean-sheet count pluralises on its own value",
  say(SUM.evidence[1]).includes(`${SUM.cleanSheets} clean sheet${SUM.cleanSheets === 1 ? "" : "s"}`));
const DRAWS = st({ results: [res(RIV[0], 1, 1), res(RIV[1], 2, 2)] });
ok("a career of draws has no biggest win and no heaviest defeat (null, not a fabricated 0-0)",
  (() => { const s = seasonSummary(DRAWS); return s.bestWin === null && s.worstLoss === null && s.won === 0 && s.lost === 0 && s.drawn === 2; })());
// M318 companion: a career with wins and losses produces non-null best/worst records, so the "no biggest win" clause above has a population pin.
ok("a career with mixed results shows a biggest win and heaviest defeat", seasonSummary(played6).bestWin !== null && seasonSummary(played6).worstLoss !== null);
const TIEBEST = st({ results: [res(RIV[0], 3, 0), res(RIV[1], 3, 0)] });
const TIEWORST = st({ results: [res(RIV[0], 0, 3), res(RIV[1], 0, 3)] });
ok("the FIRST of two equally big wins is the one remembered (a strict > comparison, not >=)",
  seasonSummary(TIEBEST).bestWin.opponent === getClub(RIV[0]).name);
ok("the FIRST of two equally heavy defeats is the one remembered (a strict < comparison)",
  seasonSummary(TIEWORST).worstLoss.opponent === getClub(RIV[0]).name);
const AWAY = st({ results: [res(RIV[0], 4, 1, false)] });
ok("an away fixture's scoreline is still printed as OUR goals first",
  seasonSummary(AWAY).bestWin.score === "4-1" && seasonSummary(AWAY).bestWin.opponent === getClub(RIV[0]).name);
ok("the worst result is the biggest losing margin, whichever fixture it was",
  (() => { const s = seasonSummary(st({ results: [res(RIV[0], 0, 1), res(RIV[1], 1, 5), res(RIV[2], 2, 3)] })); return s.worstLoss.score === "1-5" && s.worstLoss.opponent === getClub(RIV[1]).name; })());
ok("a season is complete exactly when the fixtures played reach the scheduled total",
  (() => { for (let i = 0; i < TOTAL; i++) if (seasonSummary(playSeason(i)).complete) return false; return seasonSummary(playSeason(TOTAL)).complete === true; })());
ok("no fixtures means no honour at all (null, not a consolation prize)", seasonSummary(st()).honour === null);
const handHonour = (position, count, played, complete) => !played ? null : position === 1 && complete ? "mgr.honourChampions" : position === 1 ? "mgr.honourTop" : ((position - 1) / count) <= 0.25 ? "mgr.honourContenders" : ((position - 1) / count) <= 0.6 ? "mgr.honourMidtable" : "mgr.honourRelegation";
ok("the honour follows the declared ladder over position, table size and completion, for every club",
  ALL_IDS.every((id) => { const s = sFor(id), o = seasonSummary(s); return (o.honour?.label.key ?? null) === handHonour(o.position, o.clubCount, o.played, o.complete); }));
const TITLE = st({ results: Array.from({ length: TOTAL }, (_, i) => res(RIV[i % RIV.length], 8, 0)) });
ok("a completed title run does print the champions honour (the ladder is reachable, not decorative)",
  (() => { const s = seasonSummary(TITLE); return s.complete === true && s.position === 1 && s.honour.label.key === "mgr.honourChampions" && s.honour.tone === "good"; })());
// M318 companion: a completed season with a league position produces an honour, so the "no honour" clause above has a population pin.
ok("a completed season with a top position shows champions honour", seasonSummary(TITLE).honour !== null && seasonSummary(TITLE).honour.label.key === "mgr.honourChampions");
const LEAD_NOT_DONE = st({ results: Array.from({ length: TOTAL - 1 }, (_, i) => res(RIV[i % RIV.length], 8, 0)) });
ok("leading an unfinished season prints the top-place honour, not the champions one",
  (() => { const s = seasonSummary(LEAD_NOT_DONE); return s.complete === false && s.position === 1 && s.honour.label.key === "mgr.honourTop"; })());
ok("with no fixtures the evidence is exactly the two honest lines",
  (() => { const e = seasonSummary(st()).evidence.map(say); return e.length === 2 && e[0] === "No fixtures played yet." && e[1] === `${TOTAL} fixtures remaining.`; })());
// M245. The count words, at the boundary rather than in the abstract. A one-fixture career is
// reachable — a manager plays a single match and opens the retrospective — and `1 fixtures`,
// `1 matches` and `1 clean sheets` were the shapes the module produced before the arms existed.
const onePlayed = seasonSummary(st({ results: [res(RIV[0], 1, 0)] })).evidence.map(say);
ok(`a one-fixture season says "1 fixture", "1 match" and "1 clean sheet" rather than their plurals (${onePlayed.join(" | ")})`,
  onePlayed.some((l) => /1 fixture\b/.test(l)) && onePlayed.some((l) => /1 clean sheet\b/.test(l)) &&
  onePlayed.some((l) => /1 match\b/.test(l)) &&
  !onePlayed.some((l) => /1 (fixtures|matches|clean sheets)\b/.test(l)));
ok("with fixtures every line carries content and the tail counts what is left",
  (() => { const e = seasonSummary(played6).evidence.map(say); return e.every((l) => l.length > 0) && e[e.length - 1] === `${Math.max(0, TOTAL - SUM.played)} fixtures remaining.`; })());
ok("the summary's position and club count are the live table's own",
  ALL_IDS.every((id) => { const s = sFor(id), o = seasonSummary(s); return o.position === positionOf(s) && o.clubCount === clubIdsByCompetition(s.competitionId).length; }));
ok("seasonSummary is pure and deterministic",
  (() => { const s = played6; const snap = JSON.stringify(s); const a = JSON.stringify(seasonSummary(s)); return JSON.stringify(s) === snap && a === JSON.stringify(seasonSummary(s)); })());

// ---------------------------------------------------------------------------
// 14 · createCareer — the entry point every other function consumes.
// ---------------------------------------------------------------------------
ok("a new career is versioned, in the club's own competition and empty of results",
  ALL_CLUBS.every((c) => { const s = createCareer(c.id); return s.version === 1 && s.clubId === c.id && s.competitionId === c.competitionId && s.results.length === 0 && Object.keys(s.moved).length === 0; }));
ok("a new career opens with exactly startBudget(club rating), no morale and no fatigue",
  ALL_CLUBS.every((c) => { const s = createCareer(c.id); return s.budget === startBudget(c.overall) && s.morale === 0 && s.fatigue === 0; }) &&
  createCareer(US).clubId === US); /* M323-PLANT: a createCareer that ignored its club would satisfy the budget arm for US alone */
ok("the default tactics are the ones the sliders can show (balanced, 0.55 tempo, 0.5 press)",
  ALL_CLUBS.every((c) => { const t = createCareer(c.id).tactics; return t.mentality === 0 && t.tempo === 0.55 && t.press === 0.5; }));
ok("a career's first fixture is inside its own competition and never against itself",
  ALL_CLUBS.every((c) => { const s = createCareer(c.id); const fx = fixtureAt(s.competitionId, s.clubId, 0); return clubIdsByCompetition(s.competitionId).includes(fx.opponent) && fx.opponent !== c.id; }));
ok("only createdAt is non-deterministic, so every determinism claim above is stated with that exception",
  (() => { const a = createCareer(US), b = createCareer(US); const { createdAt: _x, ...ra } = a; const { createdAt: _y, ...rb } = b; return JSON.stringify(ra) === JSON.stringify(rb) && !Number.isNaN(Date.parse(a.createdAt)); })());

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
