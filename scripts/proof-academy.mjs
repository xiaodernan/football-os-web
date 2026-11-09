import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1028: the academy line — the U-21 intake folded from the seeded world: the supply line
// (clubs ranked by summed headroom under the cut-off) and the world's U-21 elite.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { academyIntake, ageCurve } = await server.ssrLoadModule("/domain/academy.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, overall) => ({ id, name: id, short: id, competitionId: "T64", nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const player = (id, clubId, overall, potential, position, positionGroup, age) => ({ id, name: id, position, positionGroup, age, nation: "X", clubId, overall, potential, archetype: "Striker", value: 10000000, foot: "LEFT" });

const clubs = [club("A", 80), club("B", 70), club("C", 60), club("D", 50)];
const players = [
  player("p1", "A", 60, 89, "ST", "ST", 18),
  player("p2", "A", 74, 78, "AMC", "AM", 20),
  player("p3", "A", 50, 99, "GK", "GK", 19),
  player("p4", "B", 70, 82, "LB / RB", "FB", 19),
  player("p5", "B", 58, 90, "CM", "CM", 20),
  player("p6", "B", 85, 86, "ST", "ST", 25),
  player("p7", "C", 55, 94, "DM", "DM", 18),
  player("p9", "A", 65, 101, "LW / RW", "W", 19),
];
const board = academyIntake(clubs, players);
const supply = Object.fromEntries(board.supply.map((r) => [r.clubId, r]));

ok(`the supply line hand-counts (${board.supply.map((r) => `${r.clubId}:${r.upside}`).join(" ")})`,
  board.supply.length === 3 && supply.A.u21 === 4 && supply.A.upside === 118 &&
  supply.B.u21 === 2 && supply.B.upside === 44 && supply.C.u21 === 1 && supply.C.upside === 39 &&
  supply.D === undefined);
ok(`rows order by upside, jewel picked by potential then overall (${board.supply.map((r) => r.clubId).join(",")} / A:${supply.A.jewelId} B:${supply.B.jewelId})`,
  board.supply.map((r) => r.clubId).join(",") === "A,B,C" &&
  supply.A.jewelId === "p9" && supply.A.jewelPosition === "LW / RW" && supply.A.jewelOverall === 65 && supply.A.jewelAge === 19 &&
  supply.B.jewelId === "p5" && supply.C.jewelId === "p7");
ok(`the world's U-21 elite hand-counts (${board.elite.map((p) => p.playerId).join(",")})`,
  board.elite.map((p) => p.playerId).join(",") === "p9,p3,p7,p5,p1,p4,p2" &&
  board.elite[0].headroom === 36 && board.elite[5].headroom === 12 && board.elite[6].headroom === 4 &&
  board.players === 7);

ok(`an all-veterans world reads no rows and a measured zero everywhere, and the same fold repeats exactly`,
  academyIntake(clubs, [player("v1", "A", 80, 80, "ST", "ST", 30)]).supply.length === 0 &&
  academyIntake(clubs, [player("v1", "A", 80, 80, "ST", "ST", 30)]).elite.length === 0 &&
  academyIntake(clubs, [player("v1", "A", 80, 80, "ST", "ST", 30)]).players === 0 &&
  JSON.stringify(board) === JSON.stringify(academyIntake(clubs, players)));

const seededClubs = SVC.footballProvider.clubs();
const seededPlayers = SVC.footballProvider.players();
const seeded = academyIntake(seededClubs, seededPlayers);
let talents = 0, upsides = 0, seen = 0;
const byClub = new Map();
for (const p of seededPlayers) {
  if (p.age > 21) continue;
  seen++;
  talents += p.overall;
  upsides += p.potential - p.overall;
  const cur = byClub.get(p.clubId) ?? { u21: 0, upside: 0 };
  cur.u21++;
  cur.upside += p.potential - p.overall;
  byClub.set(p.clubId, cur);
}
let complete = true, matched = true;
const rows = new Map(seeded.supply.map((r) => [r.clubId, r]));
for (const [clubId, want] of byClub) {
  const r = rows.get(clubId);
  if (!r) { complete = false; continue; }
  if (r.u21 !== want.u21 || r.upside !== want.upside) matched = false;
}
// Totals match; the children are unique; the order holds.
let ordered = true;
for (let i = 1; i < seeded.supply.length; i++) if (seeded.supply[i - 1].upside < seeded.supply[i].upside) ordered = false;
for (let i = 1; i < seeded.elite.length; i++) if (seeded.elite[i - 1].potential < seeded.elite[i].potential) ordered = false;
ok(`over the seeded world the board closes on an independent recount (${seen} U-21 players seen; order holds ${ordered}; completeness and ledger ${matched && complete})`,
  complete && matched && ordered && seeded.players === 125 && seeded.supply.length === byClub.size);

// M1029: the squads-by-age pyramid — same population, three buckets.
const SCREEN_SRC = readFileSync(resolve(root, "features/academy/AcademyPage.tsx"), "utf8");
const pyramid = ageCurve(clubs, players);
const ageRow = Object.fromEntries(pyramid.rows.map((r) => [r.clubId, r]));
ok(`the age pyramid hand-counts (${pyramid.rows.map((r) => `${r.clubId}:${r.u19}/${r.u24}/${r.vets}`).join(" ")})`,
  pyramid.rows.length === 3 &&
  ageRow.A.u19 === 3 && ageRow.A.u24 === 1 && ageRow.A.vets === 0 &&
  Math.abs(ageRow.A.youthShare - 1) < 1e-9 && ageRow.A.avgOverall === 62.25 &&
  ageRow.B.u19 === 1 && ageRow.B.u24 === 1 && ageRow.B.vets === 1 &&
  Math.abs(ageRow.B.youthShare - Math.round((2 / 3) * 100) / 100) < 1e-9 && ageRow.B.avgOverall === 71 &&
  ageRow.C.u19 === 1 && ageRow.C.u24 === 0 && ageRow.C.vets === 0);
ok(`rows open by youth share, ties by club id (${pyramid.rows.map((r) => r.clubId).join(",")})`,
  pyramid.rows.map((r) => r.clubId).join(",") === "A,C,B");
ok(`the world's own totals are exact (${pyramid.world.u19}/${pyramid.world.u24}/${pyramid.world.vets} · ${pyramid.world.avgOverall})`,
  pyramid.world.u19 === 5 && pyramid.world.u24 === 2 && pyramid.world.vets === 1 &&
  Math.abs(pyramid.world.avgOverall - Math.round((517 / 8) * 100) / 100) < 1e-9);

// Same three buckets, recounted from the raw population with plain loops.
const seededPyramid = ageCurve(seededClubs, seededPlayers);
const seededSet = new Set(seededClubs.map((c) => c.id));
const recount = new Map();
let wu19 = 0, wu24 = 0, wvets = 0, wall = 0, wOverall = 0;
for (const p of seededPlayers) {
  if (!seededSet.has(p.clubId)) continue;
  const cur = recount.get(p.clubId) ?? { u19: 0, u24: 0, vets: 0, n: 0, overall: 0 };
  cur.n++;
  cur.overall += p.overall;
  wOverall += p.overall; wall++;
  if (p.age <= 19) { cur.u19++; wu19++; }
  else if (p.age <= 24) { cur.u24++; wu24++; }
  else { cur.vets++; wvets++; }
  recount.set(p.clubId, cur);
}
let ageMatched = true, ageOrdered = true;
for (let i = 1; i < seededPyramid.rows.length; i++) if (seededPyramid.rows[i - 1].youthShare < seededPyramid.rows[i].youthShare) ageOrdered = false;
const ageRows = new Map(seededPyramid.rows.map((r) => [r.clubId, r]));
for (const [clubId, want] of recount) {
  const r = ageRows.get(clubId);
  if (!r) { ageMatched = false; continue; }
  if (r.u19 !== want.u19 || r.u24 !== want.u24 || r.vets !== want.vets) ageMatched = false;
  if (r.youthShare !== (want.n ? Math.round(((want.u19 + want.u24) / want.n) * 100) / 100 : 0)) ageMatched = false;
}
ok(`over the seeded world the pyramid closes on an independent recount (order ${ageOrdered}, buckets ${ageMatched}, world ${wu19}/${wu24}/${wvets})`,
  ageMatched && ageOrdered &&
  seededPyramid.world.u19 === wu19 && seededPyramid.world.u24 === wu24 && seededPyramid.world.vets === wvets &&
  Math.abs(seededPyramid.world.avgOverall - Math.round((wOverall / wall) * 100) / 100) < 1e-9);

ok(`the academy screen renders the fold and its own boards (fold call ${SCREEN_SRC.includes("academyIntake(clubs, players)")}, pyramid ${SCREEN_SRC.includes("ageCurve(clubs, players)")}, supply ${SCREEN_SRC.includes("board.supply.map")}, elite ${SCREEN_SRC.includes("board.elite.map")}, keys ${SCREEN_SRC.includes("acad.supplyTitle")}/${SCREEN_SRC.includes("acad.eliteTitle")}/${SCREEN_SRC.includes("acad.ageTitle")})`,
  SCREEN_SRC.includes("academyIntake(clubs, players)") && SCREEN_SRC.includes("ageCurve(clubs, players)") &&
  SCREEN_SRC.includes("board.supply.map") && SCREEN_SRC.includes("board.elite.map") && SCREEN_SRC.includes("pyramid.rows.map") &&
  SCREEN_SRC.includes("board.elite[0]") && SCREEN_SRC.includes("elitePeak") && SCREEN_SRC.includes("supplyPeak") && SCREEN_SRC.includes("agePeak") &&
  SCREEN_SRC.includes("acad.title") && SCREEN_SRC.includes("acad.subtitle") && SCREEN_SRC.includes("acad.tileClubs") &&
  SCREEN_SRC.includes("acad.tilePlayers") && SCREEN_SRC.includes("acad.tileUpside") && SCREEN_SRC.includes("acad.tileJewel") &&
  SCREEN_SRC.includes("acad.noJewel") && SCREEN_SRC.includes("acad.worldLine") && SCREEN_SRC.includes("acad.supplyTitle") &&
  SCREEN_SRC.includes("acad.supplyHint") && SCREEN_SRC.includes("acad.rowLine") && SCREEN_SRC.includes("acad.supplyMethod") &&
  SCREEN_SRC.includes("acad.eliteTitle") && SCREEN_SRC.includes("acad.eliteHint") && SCREEN_SRC.includes("acad.eliteLine") &&
  SCREEN_SRC.includes("acad.eliteMethod") && SCREEN_SRC.includes("acad.noneTitle") && SCREEN_SRC.includes("acad.noneHint") &&
  SCREEN_SRC.includes("acad.ageTitle") && SCREEN_SRC.includes("acad.ageHint") && SCREEN_SRC.includes("acad.ageWorld") &&
  SCREEN_SRC.includes("acad.ageLine") && SCREEN_SRC.includes("acad.ageShare") && SCREEN_SRC.includes("acad.ageMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
