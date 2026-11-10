import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1049: the taxmen — cards per 100 fouls. An independent hand-run in parallel with the fold,
// plus an empty arm and a shared door order check.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { cardPerFoulKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const side = (fouls, yellows, reds) => ({ fouls, yellows, reds });
const match = (id, comp, home, away, hg, ag, kickoff, stats, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats,
});

const fx = [
  // The flagship fixture: each side pays differently per infraction.
  match("taxed", "T90", "A", "B", 2, 0, "2026-10-01T18:00:00.000Z",
    { home: side(10, 1, 0), away: side(20, 0, 1) }),
  // A clean sweeper fixture: the away side never fouled — it must not appear on the board.
  match("clean", "T90", "C", "D", 1, 0, "2026-10-08T18:00:00.000Z",
    { home: side(0, 0, 0), away: side(0, 1, 0) }),
  // A scheduled fixture — not judged at all.
  match("upcoming", "T90", "E", "F", null, null, "2026-10-15T18:00:00.000Z",
    { home: side(100, 9, 0), away: side(100, 0, 0) }, "SCHEDULED"),
];
const board = cardPerFoulKings(fx);

ok("the flagship fixture mints its two rate rows — A at 10 cards / 100 fouls, B at 5",
  board.rows.length === 2 &&
  board.rows[0].clubId === "A" && board.rows[0].perFoul === 10 &&
  board.rows[1].clubId === "B" && board.rows[1].perFoul === 5);
ok("world recounts both fixtures' cards and fouls and the world rate lands on the same door",
  board.fouls === 30 && board.cards === 3 && board.world === 10);
ok("the club that never committed a foul has no row at all; a scheduled fixture is not judged",
  board.rows.every((r) => r.clubId !== "C" && r.clubId !== "E" && r.clubId !== "F"));
ok("the board keeps its order and an empty world reads no rows, measured zeros and repeats exactly",
  board.rows.length === 2 && board.rows[0].fouls === 10 && board.rows[1].fouls === 20 &&
  cardPerFoulKings([]).rows.length === 0 && cardPerFoulKings([]).fouls === 0 &&
  cardPerFoulKings([]).world === 0 && JSON.stringify(board) === JSON.stringify(cardPerFoulKings(fx)));

// Seeded arm: an independent walk, by hand here in the proof, over the shipped world.
const world = SVC.footballProvider.matches();
const seeded = cardPerFoulKings(world);
let fouls = 0, cards = 0;
const byClub = new Map();
for (const m of world) {
  if (m.status !== "FINISHED" || !m.stats) continue;
  const entries = [["home", m.homeClubId], ["away", m.awayClubId]];
  for (const [side, clubId] of entries) {
    const s = m.stats[side];
    if (!s) continue;
    const f = s.fouls ?? 0;
    const c = (s.yellows ?? 0) + (s.reds ?? 0);
    fouls += f; cards += c;
    if (f > 0) byClub.set(clubId, (byClub.get(clubId) ?? 0) + f);
  }
}
const seededClubs = new Set();
for (const m of world) {
  if (m.status !== "FINISHED" || !m.stats) continue;
  for (const side of ["home", "away"]) {
    const s = m.stats[side];
    if (s && (s.fouls ?? 0) > 0) seededClubs.add(side === "home" ? m.homeClubId : m.awayClubId);
  }
}
ok(`over the shipped world the fold recounts the same totals the hand-run counts (${seeded.fouls} fouls, ${seeded.cards} cards; every listed club has committed at least one foul: ${seeded.rows.length} of ${seededClubs.size})`,
  seeded.fouls === fouls && seeded.cards === cards && seeded.rows.length === seededClubs.size &&
  seeded.rows.every((r) => r.fouls > 0));
ok("every row's charge rate is recomputable from its own two columns, to the same 2dp",
  seeded.rows.every((r) => r.cards * 100 / r.fouls !== undefined &&
    Math.abs(r.perFoul - Math.round(r.cards * 10000 / r.fouls) / 100) < 1e-9 &&
    r.perFoul >= 0 && r.fouls > 0 &&
    seeded.rows.filter((r) => r.perFoul === 0).every((r) => r.cards === 0)));

// The screen is a reader: it renders the fold and its keys and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok("the discipline screen renders the fold and its own board (fold call true, keys true/true)",
  SCREEN_SRC.includes("cardPerFoulKings(matches)") && SCREEN_SRC.includes("taxBoard.rows.slice(0, 8).map") &&
  SCREEN_SRC.includes("disc.taxTitle") && SCREEN_SRC.includes("disc.taxHint") &&
  SCREEN_SRC.includes("disc.taxNone") && SCREEN_SRC.includes("disc.taxWorld") &&
  SCREEN_SRC.includes("disc.taxShare") && SCREEN_SRC.includes("disc.taxMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
