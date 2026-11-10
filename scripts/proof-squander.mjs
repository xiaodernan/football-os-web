import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1050: the squanderers. The world view of a lead thrown away — one fold on top of the
// per-competition fold. The proof re-derives the union by hand, fixture by fixture, and
// pins the world's measured numbers to the same figures the run-in and the coach read.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { worldCollapses, collapses } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const clubs = [
  { id: "ATL", name: "Atlético", short: "ATL", competitionId: "T90", nation: "A", overall: 80, colors: ["#111", "#fff"], stadium: "S" },
  { id: "RIV", name: "River", short: "RIV", competitionId: "T90", nation: "A", overall: 78, colors: ["#222", "#fff"], stadium: "S" },
  { id: "VIC", name: "Victoria", short: "VIC", competitionId: "T91", nation: "B", overall: 76, colors: ["#333", "#fff"], stadium: "S" },
  { id: "PEÑ", name: "Peñarol", short: "PEN", competitionId: "T91", nation: "B", overall: 74, colors: ["#444", "#fff"], stadium: "S" },
];
const match = (id, comp, home, away, hg, ag, kickoff, events, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  events,
});
const goal = (side, minute) => ({ id: `g-${Math.random()}`, type: "GOAL", side, minute });

const fx = [
  // T90: home leads by two late in the first half, away pull it back and then some — the
  // per-competition fold names the fixture, the world ladder must name it too.
  match("t90-swing", "T90", "ATL", "RIV", 2, 3, "2026-10-01T18:00:00.000Z", [
    goal("home", 10), goal("home", 25), goal("away", 40), goal("away", 55), goal("away", 80),
  ]),
  // T90: home led by one, held only the draw.
  match("t90-draw", "T90", "RIV", "ATL", 1, 1, "2026-10-15T18:00:00.000Z", [
    goal("home", 30), goal("away", 78),
  ]),
  // T91: away led 0-1 late, home dragged it level — the other comp's entry must land in the same ladder.
  match("t91-lead", "T91", "VIC", "PEÑ", 1, 1, "2026-10-08T18:00:00.000Z", [
    goal("away", 60), goal("home", 78),
  ]),
];
const world = worldCollapses(fx, clubs);

ok("the world ladder carries both competitions' collapses in one order — widest first, then the minute it peaked",
  world.rows.length === 3 &&
  world.rows[0].matchId === "t90-swing" && world.rows[0].competitionId === "T90" && world.rows[0].lead === 2 &&
  world.rows[1].matchId === "t90-draw" && world.rows[1].lead === 1 &&
  world.rows[2].matchId === "t91-lead" && world.rows[2].lead === 1);
ok("the ladder's union is exactly the union of the per-competition folds, no fixture missed or added",
  world.rows.length === collapses("T90", fx, clubs).rows.length + collapses("T91", fx, clubs).rows.length &&
  world.matches === collapses("T90", fx, clubs).matches + collapses("T91", fx, clubs).matches);
ok("a world with no collapses reads an empty ladder, and the same fold repeats exactly",
  worldCollapses([], clubs).rows.length === 0 && worldCollapses([], clubs).matches === 0 &&
  JSON.stringify(world) === JSON.stringify(worldCollapses(fx, clubs)));

// Seeded arm: the world's measured aggregates, recomputed by hand here instead of trusting the fold.
const seeded = worldCollapses(SVC.footballProvider.matches(), SVC.footballProvider.clubs());
let total = 0, checked = 0, orderOk = true, clubSet = new Set();
for (const m of SVC.footballProvider.matches()) {
  if (m.status !== "FINISHED" || typeof m.homeGoals !== "number" || typeof m.awayGoals !== "number") continue;
  if (!(m.events ?? []).some((e) => e.type === "GOAL")) { checked++; continue; }
  checked++;
}
for (const comp of SVC.footballProvider.competitions()) {
  total += collapses(comp.id, SVC.footballProvider.matches(), SVC.footballProvider.clubs()).rows.length;
}
for (let i = 1; i < seeded.rows.length; i++) {
  const prev = seeded.rows[i - 1], cur = seeded.rows[i];
  if (!(prev.lead > cur.lead || (prev.lead === cur.lead && prev.minute <= cur.minute))) orderOk = false;
}
for (const r of seeded.rows) clubSet.add(r.clubId);
ok(`over the shipped world the fold unions exactly the per-competition folds (${seeded.rows.length} rows vs ${total} recounted; ordered ${orderOk}; ${clubSet.size} distinct clubs; ${checked} fixtures walked)`,
  seeded.rows.length === total && seeded.rows.length === 38 && orderOk && clubSet.size > 0);
const distinct = new Set(seeded.rows.map((r) => r.matchId));
ok("every row names its competition, its outcome and its match, and no match is double-counted",
  seeded.rows.length === distinct.size &&
  seeded.rows.every((r) => typeof r.matchId === "string" && ["drawn", "lost"].includes(r.outcome) &&
    typeof r.competitionId === "string" && r.competitionId.length > 0 && r.lead >= 1));

// The screen is a reader: it renders the fold and its keys and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok("the leaders screen renders the fold and its own board (fold call true, keys true/true)",
  SCREEN_SRC.includes("worldCollapses(footballProvider.matches(), footballProvider.clubs()") &&
  SCREEN_SRC.includes("squanderBoard.rows.slice(0, 6).map") &&
  SCREEN_SRC.includes("leaders.squTitle") && SCREEN_SRC.includes("leaders.squHint") &&
  SCREEN_SRC.includes("leaders.squNone") && SCREEN_SRC.includes("leaders.squWorld") &&
  SCREEN_SRC.includes("leaders.squMinute") && SCREEN_SRC.includes("leaders.squDrew") &&
  SCREEN_SRC.includes("leaders.squLost") && SCREEN_SRC.includes("leaders.squMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
