// M1072 (parallel lane): the rules-swing kings — an independent proof of domain/league.ts's
// rulesSwingBoard fold. The fold names, per competition and per historic win/draw/loss triplet,
// the single club that triplet moves furthest up or down the table. This proof re-derives every
// number with plain loops (no call into the fold's own mover-selection), hand-counts a small
// fixture where the draw-heavy club collapses when draws stop paying, closes against an
// independent recount of all 15 seeded competitions, and pins the screen as a real reader.

import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const L = await server.ssrLoadModule("/domain/league.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const { rulesSwingBoard, STANDARD_RULES, TWO_ONE_ZERO_RULES, ALL_OR_NOTHING_RULES } = L;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id) => ({ id, name: id, short: id, competitionId: "T61", nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const m = (id, h, a, hg, ag) => ({ id, competitionId: "T61", homeClubId: h, awayClubId: a, kickoff: "2026-09-01", round: 1, status: "FINISHED", homeGoals: hg, awayGoals: ag });
const clubs = ["A", "B", "C", "D", "E"].map(club);
// 5-team single round robin. A wins big; B banks 4 draws and no wins; C wins once and loses twice.
// Under 3-1-0 B (4 pts, gd 0) edges C (4 pts, gd -1) for 3rd. Under 3-0-0 B's draws evaporate to
// 0 pts and it drops to 4th while C's lone win lifts it to 3rd — a real, signed swing.
const matches = [
  m("1", "A", "B", 0, 0), m("2", "A", "C", 1, 0), m("3", "A", "D", 2, 0), m("4", "A", "E", 2, 0),
  m("5", "B", "C", 0, 0), m("6", "B", "D", 0, 0), m("7", "B", "E", 0, 0),
  m("8", "C", "D", 1, 0), m("9", "C", "E", 0, 1), m("10", "D", "E", 0, 1),
];
const comps = [{ id: "T61", name: "Test League" }];
const board = rulesSwingBoard(comps, matches, clubs, 4);

// Independent recount: standings by raw loops (points, goal difference, goals for, clubId), then
// the widest-|sway| mover per competition. Deliberately does NOT call customPointsTable or the
// fold's mover loop — it is a second reader of the same fixtures.
const byId = Object.fromEntries(clubs.map((c) => [c.id, c]));
function recount(compId, rules) {
  const acc = new Map();
  for (const g of matches) {
    if (g.competitionId !== compId || g.status !== "FINISHED" || g.homeGoals == null) continue;
    for (const side of [g.homeClubId, g.awayClubId]) {
      if (!byId[side]) continue;
      const ours = side === g.homeClubId ? g.homeGoals : g.awayGoals;
      const theirs = side === g.homeClubId ? g.awayGoals : g.homeGoals;
      const v = acc.get(side) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      v.gf += ours; v.ga += theirs;
      if (ours > theirs) v.w += 1; else if (ours === theirs) v.d += 1; else v.l += 1;
      acc.set(side, v);
    }
  }
  const rank = (trip) => [...acc.entries()]
    .map(([id, v]) => ({ id, pts: v.w * trip.win + v.d * trip.draw + v.l * trip.loss, gd: v.gf - v.ga, gf: v.gf }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id));
  const std = rank(STANDARD_RULES), alt = rank(rules);
  const stdPos = new Map(std.map((r, i) => [r.id, i + 1]));
  let best = null;
  alt.forEach((r, i) => {
    const pos = i + 1, sway = stdPos.get(r.id) - pos;
    if (best === null || Math.abs(sway) > Math.abs(best.sway) || (Math.abs(sway) === Math.abs(best.sway) && r.id < best.id)) {
      best = { id: r.id, sway, std: stdPos.get(r.id), alt: pos };
    }
  });
  return best;
}

// Family 1 — hand-counted fixture: the draw-heavy club collapses only when draws stop paying.
const allT61 = board.all.find((e) => e.compId === "T61");
ok(`all-or-nothing names the draw-heavy club B falling one place (mover=${allT61?.moverId}, sway=${allT61?.sway}, ${allT61?.standardPosition}->${allT61?.rulesPosition}, 1 entry)`,
  board.all.length === 1 && allT61.moverId === "B" && allT61.sway === -1 &&
  allT61.standardPosition === 3 && allT61.rulesPosition === 4 && allT61.compName === "Test League");
ok(`two-one-zero keeps every club's place on this fixture, so its swing arm reads empty while the all arm stays populated (two=${board.two.length}, all=${board.all.length})`,
  board.two.length === 0 && board.all.length === 1);
ok(`the mover is a signed position swing, not a points shift (B sway ${allT61.sway} = std ${allT61.standardPosition} - rules ${allT61.rulesPosition})`,
  allT61.sway === allT61.standardPosition - allT61.rulesPosition && allT61.sway < 0);
ok(`a |sway| tie between B and C is decided by clubId ascending, naming B (B<C: ${"B" < "C"})`,
  recount("T61", ALL_OR_NOTHING_RULES).id === "B" && "B" < "C");

// Family 2 — independent recount on the hand fixture agrees field for field with the fold.
const wantAll = recount("T61", ALL_OR_NOTHING_RULES);
ok(`the independent recount reproduces the all arm's mover, sign and both positions (B/-1/3/4)`,
  wantAll.id === "B" && wantAll.sway === -1 && wantAll.std === 3 && wantAll.alt === 4);
ok(`the independent recount of the two arm also finds a zero swing, matching the fold's empty arm (B stays 3rd)`,
  recount("T61", TWO_ONE_ZERO_RULES).sway === 0 && board.two.length === 0);

// Family 3 — empty world and repeatability. The fold must read deterministic zeroes without
// inventing a mover and be byte-identical across two calls. The limit floor/cap is measured on
// a population that actually has movers (the seed world, Family 4), not on fixture arms whose
// sway is all zero — `Math.max(1, floor(limit))` bounds a slice, it cannot manufacture a mover.
const empty = rulesSwingBoard(comps, [], clubs, 4);
ok(`an empty world yields two empty arms (measured populations two=${empty.two.length}, all=${empty.all.length})`,
  empty.two.length === 0 && empty.all.length === 0);
ok(`the fold is repeatable: two calls read byte-identical boards`,
  JSON.stringify(rulesSwingBoard(comps, matches, clubs, 4)) === JSON.stringify(board));

// Family 4 — seeded world, independent recount of all 15 competitions for both triplets.
const seededClubs = SVC.footballProvider.clubs();
const seededMatches = SVC.footballProvider.matches();
const seededComps = SVC.footballProvider.competitions();
const seededBoard = rulesSwingBoard(seededComps, seededMatches, seededClubs, 4);
const seededById = Object.fromEntries(seededClubs.map((c) => [c.id, c]));
function seededRecount(compId, rules) {
  const acc = new Map();
  for (const g of seededMatches) {
    if (g.competitionId !== compId || g.status !== "FINISHED" || g.homeGoals == null) continue;
    for (const side of [g.homeClubId, g.awayClubId]) {
      if (!seededById[side]) continue;
      const ours = side === g.homeClubId ? g.homeGoals : g.awayGoals;
      const theirs = side === g.homeClubId ? g.awayGoals : g.homeGoals;
      const v = acc.get(side) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      v.gf += ours; v.ga += theirs;
      if (ours > theirs) v.w += 1; else if (ours === theirs) v.d += 1; else v.l += 1;
      acc.set(side, v);
    }
  }
  const rank = (trip) => [...acc.entries()]
    .map(([id, v]) => ({ id, pts: v.w * trip.win + v.d * trip.draw + v.l * trip.loss, gd: v.gf - v.ga, gf: v.gf }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id));
  const std = rank(STANDARD_RULES), alt = rank(rules);
  const stdPos = new Map(std.map((r, i) => [r.id, i + 1]));
  let best = null;
  alt.forEach((r, i) => {
    const sway = stdPos.get(r.id) - (i + 1);
    if (best === null || Math.abs(sway) > Math.abs(best.sway) || (Math.abs(sway) === Math.abs(best.sway) && r.id < best.id)) {
      best = { id: r.id, sway, std: stdPos.get(r.id), alt: i + 1 };
    }
  });
  return best;
}
let seededOk = true, seededOrder = true, seededCap = true;
for (const [arm, rules] of [["two", TWO_ONE_ZERO_RULES], ["all", ALL_OR_NOTHING_RULES]]) {
  const entries = seededBoard[arm];
  const recomputed = seededComps
    .map((c) => ({ compId: c.id, compName: c.name, ...seededRecount(c.id, rules) }))
    .filter((e) => e.sway !== 0)
    .sort((a, b) => Math.abs(b.sway) - Math.abs(a.sway) || a.compId.localeCompare(b.compId))
    .slice(0, 4);
  if (entries.length !== recomputed.length) { seededOk = false; continue; }
  if (entries.length > 4) seededCap = false;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i], w = recomputed[i];
    if (e.compId !== w.compId || e.compName !== w.compName || e.moverId !== w.id ||
        e.sway !== w.sway || e.rulesPosition !== w.alt || e.standardPosition !== w.std) seededOk = false;
    if (i > 0 && (Math.abs(entries[i - 1].sway) < Math.abs(e.sway) ||
        (Math.abs(entries[i - 1].sway) === Math.abs(e.sway) && entries[i - 1].compId.localeCompare(e.compId) > 0))) seededOrder = false;
  }
}
ok(`over all ${seededComps.length} seeded competitions both arms close against an independent recount (two=${seededBoard.two.length}, all=${seededBoard.all.length}, field-match=${seededOk})`,
  seededComps.length === 15 && seededOk && seededBoard.two.length === 4 && seededBoard.all.length === 4);
ok(`the seeded arms are ordered by |sway| descending then compId ascending, capped at 4 (order=${seededOrder}, cap=${seededCap})`,
  seededOrder && seededCap);
ok(`the seeded world actually moves tables under both historic triplets (two head=${seededBoard.two[0]?.moverId}/${seededBoard.two[0]?.sway}, all head=${seededBoard.all[0]?.moverId}/${seededBoard.all[0]?.sway})`,
  seededBoard.two.every((e) => Math.abs(e.sway) > 0) && seededBoard.all.every((e) => Math.abs(e.sway) > 0));
const lim0 = rulesSwingBoard(seededComps, seededMatches, seededClubs, 0);
const lim99 = rulesSwingBoard(seededComps, seededMatches, seededClubs, 99);
ok(`the limit floor pins each populated arm to one mover at limit=0 (two=${lim0.two.length}, all=${lim0.all.length})`,
  lim0.two.length === 1 && lim0.all.length === 1);
ok(`a generous limit is capped by the number of competitions that actually move (two=${lim99.two.length}, all=${lim99.all.length}, comps=${seededComps.length})`,
  lim99.two.length > 1 && lim99.two.length <= seededComps.length &&
  lim99.all.length > 1 && lim99.all.length <= seededComps.length);

// Family 5 — the screen is a real reader: it calls the fold and renders both arms with their keys.
const SCREEN = readFileSync(resolve(root, "features/league/LeagueRules.tsx"), "utf8");
ok(`the rules screen calls the fold and renders both arms with all seven swing keys`,
  SCREEN.includes("rulesSwingBoard(competitions, matches, clubs)") &&
  SCREEN.includes("swing.two") && SCREEN.includes("swing.all") &&
  SCREEN.includes("rules.swingTitle") && SCREEN.includes("rules.swingHint") &&
  SCREEN.includes("rules.swingTwo") && SCREEN.includes("rules.swingAll") &&
  SCREEN.includes("rules.swingComp") && SCREEN.includes("rules.swingPlaces") &&
  SCREEN.includes("rules.swingNone") && SCREEN.includes("arm.entries.map") &&
  SCREEN.includes("PANEL_CLASS.panelMuted"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
