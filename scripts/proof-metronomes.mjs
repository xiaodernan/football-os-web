import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1039: the metronomes — pass accuracy weighted by the passes behind it, set beside the plain
// per-fixture average the passers board already ranks. The two readings must part company on a
// fixture that mixes a light, accurate night with a heavy, ordinary one.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { passingMetronomes, passingAccuracy } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const r2 = (n) => Math.round(n * 100) / 100;

const club = (id) => ({ id, name: id, short: id, competitionId: "T70", nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const line = (passAcc, passes) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.1, passes, passAcc, tackles: 12, duels: 80, corners: 4, fouls: 9, yellows: 1, reds: 0 });
const outsider = line(75, 300);
const match = (id, home, away, homeLine, awayLine, status = "FINISHED") => ({
  id, competitionId: "T70", homeClubId: home, awayClubId: away, kickoff: "2026-09-01", round: 1, status,
  homeGoals: status === "FINISHED" ? 1 : null, awayGoals: status === "FINISHED" ? 0 : null,
  stats: { home: homeLine, away: awayLine },
});

const clubs = [club("A"), club("B"), club("C"), club("D"), club("E")];
const fx = [
  match("f1", "A", "Z", line(50, 100), outsider),
  match("f2", "A", "Z", line(90, 900), outsider),
  match("f3", "B", "Z", line(80, 300), outsider),
  match("f4", "B", "Z", line(80, 700), outsider),
  match("f5", "C", "Z", line(95, 100), outsider),
  match("f6", "C", "Z", line(60, 100), outsider),
  match("f7", "D", "Z", line(77.5, 400), outsider),
  match("f8", "E", "Z", line(90, 100), outsider),
  match("f9", "E", "Z", line(70, 900), outsider),
];
const board = passingMetronomes(fx, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club is listed once, ordered by weighted accuracy then passes (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 5 &&
  board.rows.map((r) => r.clubId).join(",") === "A,B,D,C,E");

ok(`the hand counts hold (${board.rows.map((r) => `${r.clubId}:${r.weighted}/${r.plain}/${r.shift}/${r.passes}`).join(" ")})`,
  row.A.played === 2 && row.A.weighted === 86 && row.A.plain === 70 && row.A.shift === 16 && row.A.passes === 1000 &&
  row.B.weighted === 80 && row.B.plain === 80 && row.B.shift === 0 &&
  row.C.weighted === 77.5 && row.C.plain === 77.5 && row.C.passes === 200 &&
  row.D.weighted === 77.5 && row.D.passes === 400 &&
  row.E.weighted === 72 && row.E.plain === 80 && row.E.shift === -8);

ok(`the league prints both arms and they part company (${board.leagueWeighted} weighted / ${board.leaguePlain} plain)`,
  board.leagueWeighted === r2(284500 / 3600) && board.leagueWeighted === 79.03 &&
  board.leaguePlain === r2(692.5 / 9) && board.leaguePlain === 76.94);

// Planted: the plain arm the passers board ranks would crown B and floor A; this board crowns A.
// A second planted fold drops A's heavy night to a light one and must hand the crown to B.
const plainBoard = passingAccuracy(fx, clubs);
const mutated = fx.map((m) => (m.id === "f2" ? { ...m, stats: { ...m.stats, home: line(90, 100) } } : m));
const mutant = passingMetronomes(mutated, clubs);
ok(`planted: the plain arms would crown ${plainBoard.rows[0].clubId} and the weighted arms crown ${board.rows[0].clubId}; dropping A's heavy night hands the crown to ${mutant.rows[0].clubId} (A weighted ${mutant.rows[0].clubId === "B" ? board.rows[0].weighted : "?"} → ${mutant.rows.find((r) => r.clubId === "A").weighted})`,
  plainBoard.rows[0].clubId === "B" && board.rows[0].clubId === "A" &&
  mutant.rows[0].clubId === "B" && mutant.rows.find((r) => r.clubId === "A").weighted === 70);

ok(`an empty world reads no rows, measured zeros, and the same fold repeats exactly`,
  passingMetronomes([], []).rows.length === 0 &&
  passingMetronomes([], []).leagueWeighted === 0 && passingMetronomes([], []).leaguePlain === 0 &&
  JSON.stringify(board) === JSON.stringify(passingMetronomes(fx, clubs)));

const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = passingMetronomes(world, seededClubs);
const ranked = new Set(seededClubs.map((c) => c.id));
let ordered = true, matched = true, divergent = 0, maxShift = 0, weightedPasses = 0, accuracySum = 0, passes = 0, games = 0;
for (let i = 1; i < seeded.rows.length; i++) {
  const a = seeded.rows[i - 1], b = seeded.rows[i];
  if (a.weighted < b.weighted || (a.weighted === b.weighted && a.passes < b.passes)) ordered = false;
}
for (const r of seeded.rows) {
  const mine = world.filter((m) => m.status === "FINISHED" && m.stats && (m.homeClubId === r.clubId || m.awayClubId === r.clubId));
  let wsum = 0, asum = 0, psum = 0;
  for (const m of mine) {
    const s = m.homeClubId === r.clubId ? m.stats.home : m.stats.away;
    wsum += s.passAcc * s.passes;
    asum += s.passAcc;
    psum += s.passes;
  }
  if (r.weighted !== r2(wsum / psum) || r.plain !== r2(asum / mine.length) || r.shift !== r2(r.weighted - r.plain) || r.passes !== psum) matched = false;
  if (r.weighted !== r.plain) divergent++;
  if (Math.abs(r.shift) > maxShift) maxShift = Math.abs(r.shift);
}
for (const m of world) {
  if (m.status !== "FINISHED" || !m.stats) continue;
  for (const [side, id] of [["home", m.homeClubId], ["away", m.awayClubId]]) {
    if (!ranked.has(id)) continue;
    const s = m.stats[side];
    weightedPasses += s.passAcc * s.passes;
    accuracySum += s.passAcc;
    passes += s.passes;
    games++;
  }
}
ok(`over all 15 seeded competitions the board is complete and in order (${seeded.rows.length} clubs listed, ${passes} passes, ${divergent} clubs whose two arms differ, widest shift ${maxShift} at 2dp, league ${seeded.leagueWeighted}/${seeded.leaguePlain})`,
  seeded.rows.length >= 50 && ordered && matched && divergent > 0 && maxShift >= 0.5 &&
  passes > 100000 && seeded.leagueWeighted === r2(weightedPasses / passes) &&
  seeded.leaguePlain === r2(accuracySum / games));

const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
const screenFold = SCREEN_SRC.includes("passingMetronomes(footballProvider.matches(), footballProvider.clubs())");
const screenSix = SCREEN_SRC.includes("metroBoard.rows.slice(0, 6)");
ok(`the leaders screen renders the fold and its own board (fold call ${screenFold}, top six ${screenSix}, keys ${SCREEN_SRC.includes("leaders.metroTitle")}/${SCREEN_SRC.includes("leaders.metroMethod")})`,
  screenFold && screenSix &&
  SCREEN_SRC.includes("metroBoard.leagueWeighted") &&
  SCREEN_SRC.includes("metroBoard.leaguePlain") && SCREEN_SRC.includes("signed2(r.shift)") &&
  SCREEN_SRC.includes("leaders.metroTitle") && SCREEN_SRC.includes("leaders.metroHint") &&
  SCREEN_SRC.includes("leaders.metroNone") && SCREEN_SRC.includes("leaders.metroLeague") &&
  SCREEN_SRC.includes("leaders.metroShare") && SCREEN_SRC.includes("leaders.metroPlain") &&
  SCREEN_SRC.includes("leaders.metroShift") && SCREEN_SRC.includes("leaders.metroMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
