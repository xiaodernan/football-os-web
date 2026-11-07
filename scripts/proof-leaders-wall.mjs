import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M976: the wall. The table hands each club's clean sheets to two pages and never ranks them;
// this fold is that ranking, and the screen is the only place it renders.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { leagueWall } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId) => ({ id, name: id, short: id, competitionId, nation: "X", overall: 70, colors: ["#111", "#fff"], stadium: "S" });
const match = (id, comp, home, away, hg, ag, kickoff, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
});

const fx = [
  match("f1", "T21", "A", "B", 2, 1, "2026-09-01"),
  // 1-0 for C; C keeps a sheet, D concedes and keeps none.
  match("f2", "T21", "C", "D", 1, 0, "2026-09-08"),
  // 0-0 for E; both keep a sheet.
  match("f3", "T21", "E", "F", 0, 0, "2026-09-15"),
  // 2-0 for G; G keeps a sheet, H concedes two and keeps none.
  match("f4", "T21", "G", "H", 2, 0, "2026-09-22"),
  // A keeps one at home; D concedes again.
  match("f5", "T21", "A", "D", 3, 0, "2026-09-29"),
  // 0-0 for B; both keep a sheet.
  match("f6", "T21", "B", "E", 0, 0, "2026-10-06"),
  // 1-1 between D and A; neither keeps one.
  match("f7", "T21", "D", "A", 1, 1, "2026-10-13"),
  // F beat G; both conceded, neither keeps a sheet.
  match("f8", "T21", "F", "G", 2, 1, "2026-10-20"),
  // C beat B 4-0; C keeps a sheet, B concedes four and keeps none.
  match("f9", "T21", "C", "B", 4, 0, "2026-10-27"),
  // f10: scheduled noise.
  match("f10", "T21", "H", "A", null, null, "2026-11-03", "SCHEDULED"),
];
const t21Clubs = ["A", "B", "C", "D", "E", "F", "G", "H"].map((id) => club(id, "T21"));
const wall = leagueWall(fx, t21Clubs);
const row = Object.fromEntries(wall.rows.map((r) => [r.clubId, r]));

ok(`the wall ranks on clean sheets per club, ranked by rate, then sheets, then id (${wall.rows.map((r) => r.clubId).join(",")})`,
  wall.rows.map((r) => r.clubId).join(",") === "C,E,F,G,A,B,D,H");
ok(`the hand counts agree — C and E keep all their sheets, F and G one of two, A and B one of three, D and H none (${wall.rows.filter((r) => ["C", "E", "F", "G"].includes(r.clubId)).map((r) => `${r.clubId}:${r.cleanSheets}/${r.played}@${r.rate}`).join(" ")})`,
  row.C.cleanSheets === 2 && row.C.played === 2 && row.C.rate === 100 &&
  row.E.cleanSheets === 2 && row.E.played === 2 && row.E.rate === 100 &&
  row.F.cleanSheets === 1 && row.F.played === 2 && row.F.rate === 50 &&
  row.G.cleanSheets === 1 && row.G.played === 2 && row.G.rate === 50 &&
  row.A.cleanSheets === 1 && row.A.played === 3 && row.A.rate === 33.33 &&
  row.B.cleanSheets === 1 && row.B.played === 3 && row.B.rate === 33.33 &&
  row.D.cleanSheets === 0 && row.D.played === 3 && row.D.rate === 0 &&
  row.H.cleanSheets === 0 && row.H.played === 1 && row.H.rate === 0);
ok(`the league figure is sheets over appearances, and the fixture count is the finished count (matches ${wall.matches}, league ${wall.league})`,
  wall.matches === 9 && wall.league === 44.44);
ok(`an empty world reads no rows and a measured zero, while the same fold reads eight above`,
  leagueWall([], []).rows.length === 0 &&
  leagueWall([], []).league === 0 &&
  leagueWall([], []).matches === 0 &&
  wall.rows.reduce((n, r) => n + r.cleanSheets, 0) === 8 &&
  JSON.stringify(wall) === JSON.stringify(leagueWall(fx, t21Clubs)));

// Seeded arm: over the shipped world, every row closes on an independent recount, rates carry the
// 2dp door's own rounding, and the teams' figure is sheets over appearances.
const clubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const worldWall = leagueWall(world, clubs);
const ranked = new Set(clubs.map((c) => c.id));
let independent = 0, appearances = 0, counted = 0;
for (const m of world) {
  if (m.status !== "FINISHED" || typeof m.homeGoals !== "number" || typeof m.awayGoals !== "number") continue;
  counted++;
  if (m.awayGoals === 0 && ranked.has(m.homeClubId)) independent++;
  if (m.homeGoals === 0 && ranked.has(m.awayClubId)) independent++;
  if (ranked.has(m.homeClubId)) appearances++;
  if (ranked.has(m.awayClubId)) appearances++;
}
const rowsTotal = worldWall.rows.reduce((n, r) => n + r.cleanSheets, 0);
const rate2dp = worldWall.rows.every((r) => r.rate === Math.round(r.rate * 100) / 100);
const rateMatches = worldWall.rows.every((r) => r.rate === Math.round((r.cleanSheets / r.played) * 10000) / 100);
ok(`over the whole shipped world the wall closes on an independent recount (rows ${worldWall.rows.length}, sheets ${rowsTotal}, recount ${independent}, appearances ${appearances}, matches ${worldWall.matches}, rate2dp ${rate2dp}, rates ${rateMatches})`,
  rowsTotal === independent && worldWall.matches === counted && worldWall.rows.length <= clubs.length &&
  worldWall.rows.every((r) => r.played > 0) && appearances === counted * 2 && rate2dp && rateMatches);

// The screen is a reader: it renders the folded wall and nothing else re-derives it.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen reads the fold and its own panel (fold call ${SCREEN_SRC.includes("leagueWall(footballProvider.matches(), footballProvider.clubs())")}, rows ${SCREEN_SRC.includes("wall.rows.map")}, keys ${SCREEN_SRC.includes("leaders.sheetsTitle")}/${SCREEN_SRC.includes("leaders.sheetsLine")})`,
  SCREEN_SRC.includes("leagueWall(footballProvider.matches(), footballProvider.clubs())") &&
  SCREEN_SRC.includes("wall.rows.map") && SCREEN_SRC.includes("wall.matches") &&
  SCREEN_SRC.includes("leaders.sheetsTitle") && SCREEN_SRC.includes("leaders.sheetsHint") &&
  SCREEN_SRC.includes("leaders.sheetsLine") && SCREEN_SRC.includes("leaders.sheetsMethod") &&
  SCREEN_SRC.includes("leaders.sheetsNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
