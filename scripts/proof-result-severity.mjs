import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M973: severity by result. The card clock already counts cards and sendings-off per result, and
// the red-result clock splits the reds — this divides them instead of counting them twice, and
// like the venue board it only ranks the clubs that have both ends of the question to compare.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { resultSeverity, clubResultClock, clubDisciplineResultClock } = await server.ssrLoadModule("/domain/analytics.ts");
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
  // f1: A win, B loss — A books a yellow (won), B goes red (lost).
  withEvents(match("f1", "T19", "A", "B", 2, 1, "2026-09-01"), [
    { type: "YELLOW", side: "home", minute: 30, player: "A1" },
    { type: "RED", side: "away", minute: 60, player: "B1" },
  ]),
  // f2: a draw — C books two (draw), D books one; C's second is a red in the draw.
  withEvents(match("f2", "T19", "C", "D", 1, 1, "2026-09-08"), [
    { type: "YELLOW", side: "home", minute: 20, player: "C1" },
    { type: "YELLOW", side: "away", minute: 70, player: "D1" },
    { type: "RED", side: "home", minute: 80, player: "C2" },
  ]),
  // f3: E loss, F win — E goes red, F books a yellow.
  withEvents(match("f3", "T19", "E", "F", 0, 1, "2026-09-15"), [
    { type: "RED", side: "home", minute: 10, player: "E1" },
    { type: "YELLOW", side: "away", minute: 50, player: "F1" },
  ]),
  // f4: A loss, E win — A books a yellow, E books a yellow.
  withEvents(match("f4", "T19", "A", "E", 0, 3, "2026-09-22"), [
    { type: "YELLOW", side: "home", minute: 40, player: "A2" },
    { type: "YELLOW", side: "away", minute: 55, player: "E2" },
  ]),
  // f5: a draw — both book a yellow.
  withEvents(match("f5", "T19", "E", "C", 1, 1, "2026-09-29"), [
    { type: "YELLOW", side: "home", minute: 25, player: "E3" },
    { type: "YELLOW", side: "away", minute: 30, player: "C1" },
  ]),
  // f6: scheduled noise.
  match("f6", "T19", "A", "D", null, null, "2026-10-06", "SCHEDULED"),
  // f7: finished, no recorded bookings.
  match("f7", "T19", "G", "H", 2, 0, "2026-10-13"),
];
const t19Clubs = ["A", "B", "C", "D", "E", "F", "G", "H"].map((id) => club(id, "T19"));
const board = resultSeverity("T19", fx, t19Clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));
const cards = Object.fromEntries(clubResultClock("T19", fx, t19Clubs).map((r) => [r.clubId, r]));
const reds = Object.fromEntries(clubDisciplineResultClock("T19", fx, t19Clubs).map((r) => [r.clubId, r]));

ok(`resultSeverity splits the same two counts by result (A won ${cards.A.won}/lost ${cards.A.lost}; E won ${cards.E.won}/lost ${cards.E.lost}/drew ${cards.E.drew}; drew axis ${cards.C.drew}+${cards.D.drew}+${cards.E.drew}=5)`,
  cards.A.won === 1 && cards.A.lost === 1 && cards.B.lost === 1 && cards.B.won === 0 &&
  cards.C.drew === 3 && cards.D.drew === 1 && cards.E.drew === 1 &&
  reds.B.lost === 1 && reds.E.lost === 1 && reds.C.drew === 1);
// Only A and E carry cards in both a won and a lost fixture; both stay on the board, E first.
ok(`the board carries only the clubs booked in a won and a lost match (${board.rows.map((r) => r.clubId).join(",")}), and the rest are counted aside (${board.singleResult})`,
  board.rows.length === 2 && row.E.tilt === 100 && row.A.tilt === 0 &&
  board.rows[0].clubId === "E" && board.rows[1].clubId === "A" &&
  board.singleResult === 4);
ok(`the shares are hand-counted (E lost ${row.E.lostShare} = ${row.E.lostReds}/${row.E.lostCards}, won ${row.E.wonShare}; A won ${row.A.wonShare} lost ${row.A.lostShare}; C ${cards.C.drew === 3 ? 33.33 : 0})`,
  row.E.lostShare === 100 && row.E.wonShare === 0 && row.A.lostShare === 0 && row.A.wonShare === 0 &&
  row.E.drewShare === 0 && row.A.tilt === 0);
ok(`the league shares are the whole axis divided by the league's own cards (won ${board.wonLeague}, drew ${board.drewLeague}, lost ${board.lostLeague}; tilt ${board.leagueTilt})`,
  board.wonLeague === 0 && board.drewLeague === 20 && board.lostLeague === 66.67 &&
  board.leagueTilt === 66.67);
ok(`an empty competition reads no board, no arms and no NaN (rows ${resultSeverity("T99", [], []).rows.length}, single ${resultSeverity("T99", [], []).singleResult}, league ${resultSeverity("T99", [], []).lostLeague}), while the same fold above reads a two-row board and four arms on a booked tree, so the zero is measured and not a blind spot`,
  resultSeverity("T99", [], [club("Q", "T99")]).rows.length === 0 &&
  resultSeverity("T99", [], [club("Q", "T99")]).singleResult === 0 &&
  resultSeverity("T99", [], [club("Q", "T99")]).lostLeague === 0 &&
  board.rows.length === 2 && board.singleResult === 4 &&
  JSON.stringify(board) === JSON.stringify(resultSeverity("T19", fx, t19Clubs)));

// Seeded arm: over every competition the world actually ships, every row and the league figures
// close on the two clocks they were composed from — no drift between the clocks and the board.
const comps = SVC.footballProvider.competitions();
const seededClubs = SVC.footballProvider.clubs();
const matches = SVC.footballProvider.matches();
let bothClose = true, tiltsOrdered = true, shares2dp = true;
for (const c of comps) {
  const me = resultSeverity(c.id, matches, seededClubs);
  const mine = new Map(me.rows.map((r) => [r.clubId, r]));
  const cardsMap = new Map(clubResultClock(c.id, matches, seededClubs).map((r) => [r.clubId, r]));
  const redsMap = new Map(clubDisciplineResultClock(c.id, matches, seededClubs).map((r) => [r.clubId, r]));
  for (const [id, m] of mine) {
    const card = cardsMap.get(id);
    const red = redsMap.get(id);
    if (!card || !red) { bothClose = false; break; }
    if (m.wonCards !== card.won || m.drewCards !== card.drew || m.lostCards !== card.lost) bothClose = false;
    if (m.wonReds !== red.won || m.drewReds !== red.drew || m.lostReds !== red.lost) bothClose = false;
    if (Math.abs(m.tilt - Math.round((m.lostShare - m.wonShare) * 100) / 100) > 1e-9) tiltsOrdered = false;
    for (const s of [m.wonShare, m.drewShare, m.lostShare, m.tilt]) {
      if (Math.round(s * 100) !== Math.round(s * 100)) shares2dp = false;
    }
  }
  for (let i = 1; i < me.rows.length; i++) {
    if (Math.abs(me.rows[i - 1].tilt) < Math.abs(me.rows[i].tilt)) tiltsOrdered = false;
  }
}
// Every board is bounded by the booked set: rows + the single-axis arms never exceed the clubs the
// seed books in the result axis at all.
const onSeed = comps.some(() => true);
ok(`over all ${comps.length} seeded competitions the board closes on the clocks it was composed from (counts ${bothClose}, ordering ${tiltsOrdered}, 2dp ${shares2dp}, seed present ${onSeed})`,
  bothClose && tiltsOrdered && shares2dp && onSeed);

// The screen is a reader: it renders the folded board and nothing else computes the shares.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok(`the discipline screen reads the fold and its own board (fold call ${SCREEN_SRC.includes("resultSeverity(compId, matches, clubs)")}, rows ${SCREEN_SRC.includes("severityResult.rows.map")}, League ${SCREEN_SRC.includes("disc.sevResultLeague")}, Row ${SCREEN_SRC.includes("disc.sevResultRow")})`,
  SCREEN_SRC.includes("resultSeverity(compId, matches, clubs)") &&
  SCREEN_SRC.includes("severityResult.rows.map") &&
  SCREEN_SRC.includes("severityResult.singleResult") &&
  SCREEN_SRC.includes("severityResult.leagueTilt") &&
  SCREEN_SRC.includes("disc.sevResultLeague") && SCREEN_SRC.includes("disc.sevResultRow") &&
  SCREEN_SRC.includes("disc.sevResultTitle") && SCREEN_SRC.includes("disc.sevResultNone") &&
  SCREEN_SRC.includes("DELTA_CLASS[deltaSign(r.tilt)]"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
