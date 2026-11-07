import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M975: the fort. The event clock splits shots and saves per club — this ranks the split, dividing
// what a keeper faced by what he made of it. Composed on the fold rather than walking fixtures, so
// the numbers here cannot drift from the siege board above it.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { saveSeverity, eventClock } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });

const fx = [
  // A beat B — B faces four, stops two; A faces one.
  withEvents(match("f1", "T20", "A", "B", 2, 1, "2026-09-01"), [
    { type: "SHOT", side: "home", minute: 10, player: "A1" },
    { type: "SAVE", side: "home", minute: 10, player: "A1" },
    { type: "SHOT", side: "home", minute: 20, player: "A1" },
    { type: "SAVE", side: "home", minute: 20, player: "A1" },
    { type: "SHOT", side: "away", minute: 30, player: "B1" },
  ]),
  // A draw where both keepers had to work — C faces two and stops one, D faces three stops two.
  withEvents(match("f2", "T20", "C", "D", 1, 1, "2026-09-08"), [
    { type: "SAVE", side: "home", minute: 40, player: "C1" },
    { type: "SAVE", side: "away", minute: 50, player: "D1" },
    { type: "SAVE", side: "home", minute: 60, player: "C1" },
    { type: "SHOT", side: "away", minute: 70, player: "D1" },
    { type: "SHOT", side: "home", minute: 80, player: "C1" },
  ]),
  // F beat E — E faces one and stops it, F faces one and does not.
  withEvents(match("f3", "T20", "E", "F", 0, 1, "2026-09-15"), [
    { type: "SAVE", side: "away", minute: 15, player: "F1" },
    { type: "SHOT", side: "home", minute: 45, player: "E1" },
  ]),
  // G beat H — G faces one and stops it, H faces two and does not.
  withEvents(match("f4", "T20", "G", "H", 3, 0, "2026-09-22"), [
    { type: "SHOT", side: "home", minute: 20, player: "G1" },
    { type: "SHOT", side: "home", minute: 90, player: "G1" },
    { type: "SAVE", side: "away", minute: 60, player: "H1" },
  ]),
  // A stalemate — A faces one more and stops it.
  withEvents(match("f5", "T20", "A", "B", 0, 0, "2026-09-29"), [
    { type: "SAVE", side: "away", minute: 25, player: "B1" },
  ]),
  // f6: scheduled noise.
  match("f6", "T20", "C", "A", null, null, "2026-10-06", "SCHEDULED"),
];
const t20Clubs = ["A", "B", "C", "D", "E", "F", "G", "H"].map((id) => club(id, "T20"));
const fort = saveSeverity("T20", fx, t20Clubs);
const byId = Object.fromEntries(fort.rows.map((r) => [r.clubId, r]));
const clock = Object.fromEntries(eventClock("T20", fx, t20Clubs).rows.map((r) => [r.clubId, r]));

ok(`saveSeverity composes the event clock's own rows, not a second walk (${fort.rows.length} rows, league ${fort.league}, A ${clock.A.faced}/${clock.A.stops})`,
  fort.rows.length === 8 && fort.league === 50 && clock.A.faced === 2 && clock.A.stops === 1 &&
  fort.rows.every((r) => r.faced > 0));
ok(`the board is ranked by the stop share, then the stops made, then the faced load, then the id (${fort.rows.map((r) => r.clubId).join(",")})`,
  fort.rows.map((r) => r.clubId).join(",") === "E,G,D,B,A,C,H,F");
ok(`the shares are hand-counted (E ${byId.E.stopShare}=1/1, G ${byId.G.stopShare}=1/1, D ${byId.D.stopShare}=2/3, B ${byId.B.stopShare}=2/4, F ${byId.F.stopShare}=0/1, H ${byId.H.stopShare}=0/2)`,
  byId.E.stopShare === 100 && byId.G.stopShare === 100 && byId.D.stopShare === 66.67 &&
  byId.B.stopShare === 50 && byId.A.stopShare === 50 && byId.C.stopShare === 50 &&
  byId.F.stopShare === 0 && byId.H.stopShare === 0 &&
  byId.A.faced === 2 && byId.A.stops === 1 &&
  byId.C.faced === 2 && byId.C.stops === 1 &&
  byId.F.faced === 1 && byId.F.stops === 0);
ok(`an empty competition reads no board and a measured zero, while the same fold reads a full one above`,
  saveSeverity("T99", [], [club("Q", "T99")]).rows.length === 0 &&
  saveSeverity("T99", [], [club("Q", "T99")]).league === 0 &&
  fort.rows.some((r) => r.stopShare === 100) &&
  JSON.stringify(fort) === JSON.stringify(saveSeverity("T20", fx, t20Clubs)));

// Seeded arm: over every competition the world ships, every row closes on the clock it was composed
// from, every row faces at least one, and the league figure is the whole stop share.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const matches = SVC.footballProvider.matches();
let closes = true, facesSomething = true, ordered = true;
for (const c of comps) {
  const f2 = saveSeverity(c.id, matches, seededClubs);
  const derived = eventClock(c.id, matches, seededClubs);
  const rowMap = new Map(derived.rows.map((r) => [r.clubId, r]));
  for (const r of f2.rows) {
    const src = rowMap.get(r.clubId);
    if (!src || r.faced !== src.faced || r.stops !== src.stops || r.stopShare !== src.stopShare) closes = false;
    if (r.faced <= 0) facesSomething = false;
  }
  for (let i = 1; i < f2.rows.length; i++) {
    if (f2.rows[i - 1].stopShare < f2.rows[i].stopShare) ordered = false;
  }
}
ok(`over all ${comps.length} seeded competitions the board closes on its clock, rows only exist for the faced, and the ordering holds (counts ${closes}, faced ${facesSomething}, ordered ${ordered})`,
  closes && facesSomething && ordered);

// The screen is a reader: the fort panel renders the folded board and nothing else divides.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/EventClock.tsx"), "utf8");
ok(`the event clock screen reads the fold and its own panel (fold call ${SCREEN_SRC.includes("saveSeverity(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("forts.rows.map")}, league ${SCREEN_SRC.includes("envelope(forts.league)") || SCREEN_SRC.includes("forts.league")}, keys ${SCREEN_SRC.includes("clock.fortTitle")}/${SCREEN_SRC.includes("clock.fortRow")})`,
  SCREEN_SRC.includes("saveSeverity(compId, matches, clubs)") && SCREEN_SRC.includes("forts.rows.map") &&
  SCREEN_SRC.includes("forts.league") && SCREEN_SRC.includes("forts.rows.length === 0") &&
  SCREEN_SRC.includes("clock.fortTitle") && SCREEN_SRC.includes("clock.fortHint") &&
  SCREEN_SRC.includes("clock.fortLeague") && SCREEN_SRC.includes("clock.fortRow"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
