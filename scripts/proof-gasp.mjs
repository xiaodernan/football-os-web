import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1044: the last-gasp kings. The archive's most volatile read — a decided fixture whose winner
// struck at minute ≥ 76. The fold replays each fixture's clock under the same replay discipline
// as the rescued results (per-side goal counts must match the printed scoreline), then walks the
// winner's events once: the earliest 76+ goal that left the winner level or ahead strikes, and
// the fixture mints one last-gasp count. This proof re-derives every claim by hand.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { lastGaspKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const goal = (side, minute) => ({ id: `g-${side}-${minute}-${Math.random()}`, type: "GOAL", side, minute });
const match = (id, comp, home, away, hg, ag, kickoff, events, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  events,
});

const fx = [
  // The flagship: home trailed 0-1, levelled at 55′, and won it at 80′ — the winner enjoys a
  // decisive goal inside the late window. Counted (own ≥ opp at the strike: 2-1).
  match("flagship", "T80", "H1", "A1", 2, 1, "2026-10-01T18:00:00.000Z", [
    goal("away", 20), goal("home", 55), goal("home", 80),
  ]),
  // The away end did it: home led at 55′, away levelled at 78′ and won it at 85′. Counted for the away club.
  match("away-comeback", "T80", "H2", "A2", 1, 2, "2026-10-08T18:00:00.000Z", [
    goal("home", 30), goal("away", 78), goal("away", 85),
  ]),
  // A comfortable 2-0 decided inside the first hour — not last-gasp by definition.
  match("boring", "T80", "H3", "A3", 2, 0, "2026-10-15T18:00:00.000Z", [
    goal("home", 15), goal("home", 40),
  ]),
  // A winner padding a lead at 90′ still counts under the documented rule — the winner scored
  // at ≥ 76 and never trailed after it. The method line says so; this fixture is here so the proof
  // names the padding arm instead of pretending the clock only holds drama.
  match("padding", "T80", "H4", "A4", 3, 0, "2026-10-22T18:00:00.000Z", [
    goal("home", 10), goal("home", 52), goal("home", 90),
  ]),
  // The unreplayable fixture: one hidden goal — not judged at all.
  match("unreplayable", "T80", "H5", "A5", 2, 1, "2026-10-29T18:00:00.000Z", [
    goal("home", 15), goal("away", 60),
  ]),
  // Scheduled noise.
  match("upcoming", "T80", "H6", "A6", null, null, "2026-11-05T18:00:00.000Z", [], "SCHEDULED"),
];
const board = lastGaspKings(fx);

ok("the flagship fixture mints exactly one last-gasp for its 2-1 winner (the 80′ strike, not the 55′ leveller)",
  board.rows.length > 0 && (() => {
    const h = board.rows.find((r) => r.clubId === "H1");
    return h !== undefined && h.lastGasp === 1;
  })());
ok("the comeback counts the away club — the winner scored or equalized at minute ≥ 76",
  (() => {
    const a = board.rows.find((r) => r.clubId === "A2");
    return a !== undefined && a.lastGasp === 1;
  })());
ok("the comfortable first-hour win and the unreplayable scoreline are both absent from the board",
  board.rows.every((r) => r.clubId !== "H3" && r.clubId !== "H5" && r.clubId !== "H6"));
ok("the padding arm is counted once and is named as such, and the unreplayed fixture never reaches the fold",
  (() => {
    const h4 = board.rows.find((r) => r.clubId === "H4");
    return h4 !== undefined && h4.lastGasp === 1 && board.replayed === 4 && board.lastGasp === 3;
  })());
ok("the board keeps its order (last-gasp count, then club id) and an empty world reads no rows and repeats exactly",
  board.rows.length === 3 && board.lastGasp === 3 && board.share === 75 &&
  board.rows.every((r, i, a) => i === 0 || (a[i - 1].lastGasp > r.lastGasp || (a[i - 1].lastGasp === r.lastGasp && a[i - 1].clubId <= r.clubId))) &&
  lastGaspKings([]).rows.length === 0 && lastGaspKings([]).replayed === 0 && lastGaspKings([]).lastGasp === 0 &&
  lastGaspKings([]).share === 0 && JSON.stringify(board) === JSON.stringify(lastGaspKings(fx)));

// Seeded arm: an independent recount — replayed fixtures must match the frozen contract's
// finishedMatches, and the 126 figure must come from the same replay the fold runs.
const world = SVC.footballProvider.matches();
const seeded = lastGaspKings(world);
let replayed = 0, lastGasp = 0;
for (const m of world) {
  if (m.status !== "FINISHED" || typeof m.homeGoals !== "number" || typeof m.awayGoals !== "number") continue;
  const goals = (m.events ?? []).filter((e) => e.type === "GOAL").slice().sort((a, b) => a.minute - b.minute);
  if (goals.filter((e) => e.side === "home").length !== m.homeGoals) continue;
  if (goals.filter((e) => e.side === "away").length !== m.awayGoals) continue;
  replayed++;
  const winner = m.homeGoals > m.awayGoals ? "home" : m.awayGoals > m.homeGoals ? "away" : null;
  if (!winner) continue;
  let own = 0, opp = 0, struck = false;
  for (const e of goals) {
    if (e.side === winner) own++; else opp++;
    if (e.side === winner && e.minute >= 76 && own >= opp) { struck = true; break; }
  }
  if (struck) lastGasp++;
}
const share = Math.round((lastGasp / Math.max(replayed, 1)) * 10000) / 100;
ok(`over the shipped world the fold's replay count, last-gasp count and share match the hand run (${seeded.replayed}/${replayed} replayed, ${seeded.lastGasp}/${lastGasp} last-gasp, ${seeded.share}/${share})`,
  seeded.replayed === replayed && seeded.lastGasp === lastGasp && seeded.share === share);
ok("every club's last-gasp count is a real fixture count and the board keeps its order across every row",
  seeded.rows.length <= seeded.lastGasp && seeded.rows.length === new Set(seeded.rows.map((r) => r.clubId)).size &&
  seeded.rows.every((r, i, a) => i === 0 || a[i - 1].lastGasp > r.lastGasp ||
    (a[i - 1].lastGasp === r.lastGasp && a[i - 1].clubId <= r.clubId)) &&
  seeded.rows.every((r) => r.lastGasp >= 1));

// The screen is a reader: it renders the fold and the keys and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok("the leaders screen renders the fold and its own board (fold call true, keys true/true)",
  SCREEN_SRC.includes("lastGaspKings(footballProvider.matches()") && SCREEN_SRC.includes("gaspBoard.rows.slice(0, 6).map") &&
  SCREEN_SRC.includes("leaders.gaspTitle") && SCREEN_SRC.includes("leaders.gaspHint") &&
  SCREEN_SRC.includes("leaders.gaspNone") && SCREEN_SRC.includes("leaders.gaspLeague") &&
  SCREEN_SRC.includes("leaders.gaspShare") && SCREEN_SRC.includes("leaders.gaspMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
