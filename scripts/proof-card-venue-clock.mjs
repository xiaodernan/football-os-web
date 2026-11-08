import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1003: the card venue clock. Same six windows as the xG clock, split to the end that earned
// the booking — yellow or red, home end or away end. The discipline page answers per club and
// per result; this page answers where and when.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { cardVenueClock } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});
const withEvents = (m, events) => ({ ...m, events });
const ev = (minute, type, side) => ({ minute, type, side, player: "P" });

// Hand count (see M1003 ledger) — T42 carries three bookings per end in a controlled mix.
const fx = [
  withEvents(match("f1", "T42", "H", "A", 2, 1, "2026-09-01"), [
    ev(10, "YELLOW", "home"), ev(50, "YELLOW", "away"), ev(82, "RED", "home"),
  ]),
  withEvents(match("f2", "T42", "H", "A", 1, 0, "2026-09-08"), [
    ev(25, "YELLOW", "home"), ev(31, "RED", "away"), ev(75, "YELLOW", "away"),
  ]),
  match("f3", "T42", "H", "A", 0, 0, "2026-09-15"),          // no events — must not disturb the fold
  match("f4", "T42", "H", "A", null, null, "2026-10-06", "SCHEDULED"), // scheduled — not counted
  withEvents(match("x1", "T43", "Q", "W", 4, 3, "2026-09-01"), [
    ev(12, "RED", "home"), ev(33, "RED", "away"),
  ]),                                                      // outside comp — not counted
];
const T42 = ["H", "A"].map((id) => club(id, "T42"));
const board = cardVenueClock("T42", fx, T42);

ok(`each window kept its own tally by end (home ${board.homeWindows.join(",")}, away ${board.awayWindows.join(",")}, totals ${board.home}/${board.away})`,
  board.homeWindows.join(",") === "1,1,0,0,0,1" && board.awayWindows.join(",") === "0,0,1,1,1,0" &&
  board.home === 3 && board.away === 3);
// The scheduled fixture and the outside comp are noise the fold steps over.
ok(`another competition carries its own board and the T42 fold is a separate board (${JSON.stringify(board) !== JSON.stringify(cardVenueClock("T43", fx, [club("Q", "T43"), club("W", "T43")]))})`,
  cardVenueClock("T43", fx, [club("Q", "T43"), club("W", "T43")]).home === 1 &&
  cardVenueClock("T43", fx, [club("Q", "T43"), club("W", "T43")]).away === 1);

// Empty arm with the positive companion from the working fold above.
ok(`an empty competition reads all-zero windows and no counted fixture, while the T42 fold above reads six`,
  (() => {
    const empty = cardVenueClock("T99", [], []);
    return empty.homeWindows.join(",") === "0,0,0,0,0,0" && empty.awayWindows.join(",") === "0,0,0,0,0,0" &&
      empty.home === 0 && empty.away === 0 && board.home + board.away === 6 &&
      JSON.stringify(board) === JSON.stringify(cardVenueClock("T42", fx, T42));
  })());

// Seeded arm: over every competition the world ships, totals close against a second recount straight off the doors.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
let closes = true;
for (const c of comps) {
  const a2 = cardVenueClock(c.id, world, seededClubs);
  const yellowAndRed = world.filter((m) => m.competitionId === c.id && m.status === "FINISHED")
    .flatMap((m) => m.events ?? []).filter((e) => e.type === "YELLOW" || e.type === "RED");
  if (a2.home + a2.away !== yellowAndRed.length) closes = false;
}
ok(`over all ${comps.length} seeded competitions the fold's world line closes on the raw event recount (${closes})`,
  closes);

// The screen is a reader: it renders the folded cards and nothing else counts.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/VenueSplit.tsx"), "utf8");
ok(`the venue screen renders the fold and its own board (fold call ${SCREEN_SRC.includes("cardVenueClock(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("cardRows.map")}, keys ${SCREEN_SRC.includes("venue.cardClockTitle")}/${SCREEN_SRC.includes("venue.cardClockHome")})`,
  SCREEN_SRC.includes("cardVenueClock(compId, matches, clubs)") && SCREEN_SRC.includes("cardRows.map") &&
  SCREEN_SRC.includes("venue.cardClockTitle") && SCREEN_SRC.includes("venue.cardClockHint") &&
  SCREEN_SRC.includes("venue.cardClockHome") && SCREEN_SRC.includes("venue.cardClockAway") &&
  SCREEN_SRC.includes("cardClock.homeWindows") && SCREEN_SRC.includes("cardClock.awayWindows"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
