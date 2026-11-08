import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M999: the under-fire squads. The availability page walks one player; this fold walks the whole
// world through the same two doors — injuryFor and fitnessFor — and answers which club enters the
// week carrying the most broken bodies.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { squadAvailability, injuryFor, fitnessFor, weekIndexOf } = await server.ssrLoadModule("/domain/playerCareer.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const week = weekIndexOf("2026-11-08T00:00:00.000Z");
const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const player = (id, clubId) => ({ id, name: id, position: "CM", positionGroup: "CM", age: 24, nation: "X", clubId, overall: 70, potential: 75, archetype: "creator", value: 1000000, foot: "right" });

const r1 = ["p1", "p2", "p3", "p4"];
const r2 = ["p5", "p6"];
const r3 = ["p7", "p8", "p9"];
const fixtureClubs = [club("R1", "T41"), club("R2", "T41"), club("R3", "T41"), club("R4", "T41")]; // R4: a body without a player
const fixturePlayers = [...r1.map((id) => player(id, "R1")), ...r2.map((id) => player(id, "R2")), ...r3.map((id) => player(id, "R3"))];
// A player linked to a club that never existed under this week — the doors must not pretend for him.
const orphan = player("p-orphan", "NOWHERE");
const board = squadAvailability([...fixturePlayers, orphan], fixtureClubs, week);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

// Independent recount — every expectation re-derives off the doors, never off the fold's own rows.
const recount = (ids, clubId) => {
  let fitness = 0, injured = 0;
  for (const id of ids) {
    fitness += fitnessFor(id, week);
    if (injuryFor(id, week) !== null) injured++;
  }
  return { fitness: fitness / ids.length, injured };
};
const rr1 = recount(r1, "R1"), rr2 = recount(r2, "R2"), rr3 = recount(r3, "R3");

ok(`every player of every known club with a body counts, exactly once; the orphan and the empty club are not rows (${board.rows.map((r) => `${r.clubId}:${r.players}`).join(",")})`,
  board.rows.length === 3 && row.R1.players === 4 && row.R2.players === 2 && row.R3.players === 3 &&
  !board.rows.some((r) => r.clubId === "R4") && row.R1.clubId === "R1");
ok(`each club's row is the fitness door's own mean (1 dp) and the injury door's count (${row.R1.injured} R1 out of ${row.R1.players}; ${row.R2.injured} R2; ${row.R3.injured} R3)`,
  Math.abs(row.R1.fitness - Math.round(rr1.fitness * 10) / 10) < 1e-9 && Math.abs(row.R2.fitness - Math.round(rr2.fitness * 10) / 10) < 1e-9 &&
  Math.abs(row.R3.fitness - Math.round(rr3.fitness * 10) / 10) < 1e-9 &&
  row.R1.injured === rr1.injured && row.R2.injured === rr2.injured && row.R3.injured === rr3.injured);
ok(`the world line is the fold over just the counted players — the orphan cannot dilute it (${board.injured} out, ${board.averageFitness} average)`,
  board.injured === rr1.injured + rr2.injured + rr3.injured &&
  Math.abs(board.averageFitness - Math.round((r1.concat(r2, r3).reduce((n, id) => n + fitnessFor(id, week), 0) / 9) * 100) / 100) < 1e-9 &&
  board.injured === (r1.concat(r2, r3).filter((id) => injuryFor(id, week) !== null).length));
ok(`the order is injured-desc, fitness-asc, id-asc (${board.rows.map((r) => r.clubId).join(",")})`,
  (() => {
    for (let i = 1; i < board.rows.length; i++) {
      const a = board.rows[i - 1], b = board.rows[i];
      if (a.injured < b.injured) return false;
      if (a.injured === b.injured && a.fitness > b.fitness) return false;
      if (a.injured === b.injured && a.fitness === b.fitness && a.clubId.localeCompare(b.clubId) > 0) return false;
    }
    return true;
  })());
// The fixture side of zero: an empty world and a full one read honestly.
ok(`an empty world reads no rows, 0 out and a measured 0, and the full board above answers the same fold`,
  (() => {
    const empty = squadAvailability([], [], week);
    return empty.rows.length === 0 && empty.injured === 0 && empty.averageFitness === 0 &&
      board.rows.length === 3 && board.injured === rr1.injured + rr2.injured + rr3.injured &&
      JSON.stringify(board) === JSON.stringify(squadAvailability([...fixturePlayers, orphan], fixtureClubs, week));
  })());

// Seeded arm: over the whole shipped world every club with a body appears exactly once; the doors' own
// counts and means are what the board prints; the ordering holds in the seeded frame too.
const seededPlayers = SVC.footballProvider.players();
const seededClubs = SVC.footballProvider.clubs();
const seeded = squadAvailability(seededPlayers, seededClubs, week);
let recounted = true, ordered = true, bounded = true, nonempty = true;
for (const r of seeded.rows) {
  const members = seededPlayers.filter((p) => p.clubId === r.clubId);
  if (members.length !== r.players) recounted = false;
  let fitness = 0, injured = 0;
  for (const p of members) { fitness += fitnessFor(p.id, week); if (injuryFor(p.id, week) !== null) injured++; }
  if (injured !== r.injured) recounted = false;
  if (Math.abs(Math.round((fitness / members.length) * 10) / 10 - r.fitness) > 1e-9) recounted = false;
  if (!(r.fitness >= 0 && r.fitness <= 1)) bounded = false;
  if (members.length > 0) nonempty = nonempty && r.players > 0;
}
for (let i = 1; i < seeded.rows.length; i++) {
  if (seeded.rows[i - 1].injured < seeded.rows[i].injured) ordered = false;
  else if (seeded.rows[i - 1].injured === seeded.rows[i].injured && seeded.rows[i - 1].fitness > seeded.rows[i].fitness) ordered = false;
}
ok(`over the shipped world every club's row closes on the two doors that fed it (${seeded.rows.length} clubs, out ${seeded.injured}, average ${seeded.averageFitness})`,
  seeded.rows.length === seededClubs.filter((c) => seededPlayers.some((p) => p.clubId === c.id)).length &&
  Math.abs(seeded.averageFitness - Math.round((seededPlayers.reduce((n, p) => n + fitnessFor(p.id, week), 0) / seededPlayers.length) * 100) / 100) < 1e-9 &&
  recounted && ordered && bounded && nonempty);

// The screen is a reader: it renders the folded ladder and nothing else walks the world.
const SCREEN_SRC = readFileSync(resolve(root, "features/injury/InjuryReport.tsx"), "utf8");
ok(`the availability screen renders the fold and its own ladder (fold call ${SCREEN_SRC.includes("squadAvailability(footballProvider.players(), footballProvider.clubs(), week)")}, rows ${SCREEN_SRC.includes("squadBoard.rows.filter")}, keys ${SCREEN_SRC.includes("injuries.ladderTitle")}/${SCREEN_SRC.includes("injuries.ladderMethod")})`,
  SCREEN_SRC.includes("squadAvailability(footballProvider.players(), footballProvider.clubs(), week)") &&
  SCREEN_SRC.includes("injuries.ladderTitle") && SCREEN_SRC.includes("injuries.ladderHint") &&
  SCREEN_SRC.includes("injuries.ladderLine") && SCREEN_SRC.includes("injuries.ladderMethod") &&
  SCREEN_SRC.includes("injuries.ladderNone") && SCREEN_SRC.includes("squadBoard.rows.filter"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
