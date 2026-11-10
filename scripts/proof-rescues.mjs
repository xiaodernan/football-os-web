import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1041: the rescued results. The seed writes a scoreline and a goal clock for every fixture;
// this proof replays that clock by hand instead of trusting the fold, on three crafted fixtures
// and then over the shipped world end to end.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { worldRescues } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// The seed's own event shape: one GOAL event per goal, with side home/away and a minute.
const goal = (side, minute) => ({ id: `g-${side}-${minute}-${Math.random()}`, type: "GOAL", side, minute });
const match = (id, comp, home, away, hg, ag, kickoff, events, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  events,
});

const fx = [
  // A: the away side fell 0-2 down, then climbed level at 55' and won it — the winner trailed.
  match("rescued-win", "T99", "H1", "A1", 2, 3, "2026-10-01T18:00:00.000Z", [
    goal("home", 10), goal("home", 20), goal("away", 55), goal("away", 70), goal("away", 88),
  ]),
  // B: the fixture only held the draw — the away end fell 0-1 behind and climbed level late.
  match("rescued-draw", "T99", "H2", "A2", 1, 1, "2026-10-08T18:00:00.000Z", [
    goal("home", 15), goal("away", 78),
  ]),
  // C: a true both-ends swing — the home end trailed 0-1, then took the lead, and the away end
  // climbed back level. A drawn fixture with no single rescuer to name.
  match("swing-draw", "T99", "H3", "A3", 2, 2, "2026-10-15T18:00:00.000Z", [
    goal("away", 10), goal("home", 25), goal("home", 40), goal("away", 55),
  ]),
  // D: an ordinary match where nobody ever lost ground — home led from the first minute.
  match("comfortable", "T99", "H4", "A4", 2, 0, "2026-10-22T18:00:00.000Z", [
    goal("home", 30), goal("home", 66),
  ]),
  // E: the deciding fixture leaked a goal that its scoreline never tells — not replayed, not judged.
  match("unreplayable", "T99", "H5", "A5", 2, 1, "2026-10-29T18:00:00.000Z", [
    goal("home", 15), goal("away", 60),
  ]),
  // F: a win where the home end trailed and came all the way back — the decided fixture belongs
  // to its winner whenever the winner trailed.
  match("winner-trailed", "T99", "H6", "A6", 2, 1, "2026-11-05T18:00:00.000Z", [
    goal("away", 20), goal("home", 55), goal("home", 88),
  ]),
  // Scheduled noise cannot be judged at all.
  match("upcoming", "T99", "H7", "A7", null, null, "2026-11-12T18:00:00.000Z", [], "SCHEDULED"),
];
const board = worldRescues(fx);

ok(`the crafted decided fixture names the away end as the rescuer, the widest hole 2, level by minute 70, and not held`,
  board.rows.length >= 1 && (() => {
    const r = board.rows.find((x) => x.matchId === "rescued-win");
    return r !== undefined && r.rescuer === "away" && r.deficit === 2 && r.turnMinute === 70 && r.held === false;
  })());
ok(`the crafted draw names the late leveller, deficit 1, not won by either end — held`,
  (() => {
    const r = board.rows.find((x) => x.matchId === "rescued-draw");
    return r !== undefined && r.rescuer === "away" && r.deficit === 1 && r.turnMinute === 78 && r.held === true;
  })());
ok(`the decided fixture whose winner trailed belongs to the home end (level by the 55th minute)`,
  (() => {
    const r = board.rows.find((x) => x.matchId === "winner-trailed");
    return r !== undefined && r.rescuer === "home" && r.deficit === 1 && r.turnMinute === 55 && r.held === false;
  })());
ok(`the swing fixture with both ends trailing is replayed but named for no one; the comfortable win and the unreplayable scoreline read nothing`,
  board.rows.every((r) => r.matchId !== "swing-draw" && r.matchId !== "comfortable" && r.matchId !== "unreplayable" && r.matchId !== "upcoming") &&
  board.replayed === 5);

// Empty and determinism arms.
ok(`an empty world reads no rows and no share, and the same fold repeats exactly`,
  worldRescues([]).rows.length === 0 && worldRescues([]).replayed === 0 && worldRescues([]).rescued === 0 &&
  worldRescues([]).share === 0 && JSON.stringify(board) === JSON.stringify(worldRescues(fx)));

// The seeded arm: an independent recount, walked again by hand here instead of by the fold —
// every finished fixture whose goal clock replays to its own scoreline, and of those, the ones a
// side climbed out of from behind, sorted by deficit then the minute it climbed level.
const world = SVC.footballProvider.matches();
const seeded = worldRescues(world);
let replayed = 0, rescued = 0;
for (const m of world) {
  if (m.status !== "FINISHED" || typeof m.homeGoals !== "number" || typeof m.awayGoals !== "number") continue;
  const goals = (m.events ?? []).filter((e) => e.type === "GOAL")
    .slice().sort((a, b) => a.minute - b.minute);
  if (goals.filter((e) => e.side === "home").length !== m.homeGoals) continue;
  if (goals.filter((e) => e.side === "away").length !== m.awayGoals) continue;
  replayed++;
  const walk = (side) => {
    let own = 0, opp = 0, widest = 0;
    for (const e of goals) {
      if (e.side === side) own++;
      else opp++;
      if (opp - own > widest) widest = opp - own;
    }
    return widest;
  };
  const homeWide = walk("home"), awayWide = walk("away");
  let rescuer = null;
  if (m.homeGoals > m.awayGoals) rescuer = homeWide > 0 ? "home" : null;
  else if (m.awayGoals > m.homeGoals) rescuer = awayWide > 0 ? "away" : null;
  else if (homeWide > 0 && awayWide === 0) rescuer = "home";
  else if (awayWide > 0 && homeWide === 0) rescuer = "away";
  if (rescuer !== null) rescued++;
}
const sorted = seeded.rows.every((row, i, a) => i === 0 ||
  a[i - 1].deficit > row.deficit ||
  (a[i - 1].deficit === row.deficit && a[i - 1].turnMinute <= row.turnMinute) ||
  (a[i - 1].deficit === row.deficit && a[i - 1].turnMinute === row.turnMinute &&
    (a[i - 1].kickoff < row.kickoff || (a[i - 1].kickoff === row.kickoff && a[i - 1].matchId <= row.matchId))));
const share = Math.round((rescued / Math.max(replayed, 1)) * 10000) / 100;
ok(`over the shipped world the fold's replay count, rescue count and share match an independent hand-run recount (${seeded.replayed}/${replayed} replayed, ${seeded.rescued}/${rescued} rescued, ${seeded.share}/${share})`,
  seeded.replayed === replayed && seeded.rescued === rescued && seeded.share === share);

ok(`every rescue row is well-formed and the board keeps its order (widest hole first, then the earlier turn, then kickoff, then id) across ${seeded.rows.length} rows`,
  seeded.rows.length === rescued && sorted &&
  seeded.rows.every((r) => r.deficit > 0 && r.turnMinute >= 0 && r.turnMinute > 0 &&
    isFinite(r.turnMinute) && (r.held === (world.find((m) => m.id === r.matchId)?.homeGoals === world.find((m) => m.id === r.matchId)?.awayGoals))));

// The screen is a reader: it renders the fold and the three dictionary keys and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok(`the world screen renders the fold and its own panel (fold call ${SCREEN_SRC.includes("worldRescues(worldMatches")}, title ${SCREEN_SRC.includes("world.rescuesTitle")}, rows ${SCREEN_SRC.includes("rescues.rows.map")}, method ${SCREEN_SRC.includes("world.rescuesMethod")})`,
  SCREEN_SRC.includes("worldRescues(worldMatches") && SCREEN_SRC.includes("rescues.rows.map") &&
  SCREEN_SRC.includes("world.rescuesTitle") && SCREEN_SRC.includes("world.rescuesHint") &&
  SCREEN_SRC.includes("world.rescuesNone") && SCREEN_SRC.includes("world.rescuesWorld") &&
  SCREEN_SRC.includes("world.rescuesRow") && SCREEN_SRC.includes("world.rescuesMethod") &&
  SCREEN_SRC.includes("world.rescuesDrew") && SCREEN_SRC.includes("world.rescuesWon"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
