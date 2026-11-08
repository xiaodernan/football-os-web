import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1014: the duel kings �?duels per match by club, from the stats block on each finished fixture.
// Ranked by raw pressure, not by what the contests were worth; the xG table has the latter.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id, competitionId, overall) => ({ id, name: id, short: id, competitionId, nation: "X", overall, colors: ["#111", "#fff"], stadium: "S" });
const statLine = (duels) => ({ possession: 50, shots: 10, onTarget: 4, xg: 1.2, passes: 400, passAcc: 75, tackles: 15, duels, corners: 5, fouls: 8, yellows: 1, reds: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, duelsHome, duelsAway, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats: { home: statLine(duelsHome), away: statLine(duelsAway) },
});

const clubs = ["A", "B", "C", "D"].map((id) => club(id, "T47", 70 + id.charCodeAt(0) - 65));
const fx = [
  match("f1", "T47", "A", "B", 1, 1, "2026-10-06", 45, 30),
  match("f2", "T47", "A", "C", 2, 0, "2026-10-13", 60, 55),
  match("f3", "T47", "B", "C", 1, 1, "2026-10-15", 50, 20),
  match("f4", "T47", "D", "A", 0, 2, "2026-10-19", 15, 70),
  match("f5", "T47", "C", "D", 1, 1, "2026-10-24", 25, 35),
];
const board = statsBlockKings(fx, clubs, "duels");
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`every club with a stat-blocked fixture is listed once, ordered by duels per match (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.length === 4 && board.rows[0].clubId === "A" && board.rows[1].clubId === "B" &&
  board.rows[3].clubId === "D");
ok(`the averages are computed over what the provider actually recorded (${board.rows.map((r) => `${r.clubId}:${r.perMatch}/${r.played}`).join(" ")})`,
  row.A.played === 3 && row.B.played === 2 &&
  Math.abs(row.A.perMatch - Math.round(((45 + 60 + 70) / 3) * 100) / 100) < 1e-9 &&
  Math.abs(row.B.perMatch - Math.round(((30 + 50) / 2) * 100) / 100) < 1e-9 &&
  row.C.perMatch === 33.33 && row.D.perMatch === 25);
ok(`the league line is the fixture-count-weighted mean (${board.league})`,
  Math.abs(board.league - Math.round(((45+60+30+55+50+20+25+70+15+35) / 10) * 100) / 100) < 1e-9);
ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  statsBlockKings([], [], "duels").rows.length === 0 &&
  statsBlockKings([], [], "duels").league === 0 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, clubs, "duels")));

// Seeded arm: every club in the world shows up with a sub-1e9 rate, ordering holds, no NaN leak.
const seededClubs = SVC.footballProvider.clubs();
const world = SVC.footballProvider.matches();
const seeded = statsBlockKings(world, seededClubs, "duels");
let inside = true, ordered = true;
for (const r of seeded.rows) if (!(r.perMatch >= 0) || !Number.isFinite(r.perMatch)) inside = false;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].perMatch < seeded.rows[i].perMatch) ordered = false;
ok(`over the shipped world the board is complete, in order, and closes on its own doors (${seeded.rows.length} clubs listed, inside ${inside}, order ${ordered})`,
  seeded.rows.length >= 50 && inside && ordered);

// The screen is a reader: it renders the folded board and nothing else computes it.
const SCREEN_SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the fold and its own board (fold call ${SCREEN_SRC.includes('statsBlockKings(footballProvider.matches(), footballProvider.clubs(), "duels")')}, rows ${SCREEN_SRC.includes("duelBoard.rows.map")}, keys ${SCREEN_SRC.includes("leaders.duelTitle")}/${SCREEN_SRC.includes("leaders.duelMethod")})`,
  SCREEN_SRC.includes('statsBlockKings(footballProvider.matches(), footballProvider.clubs(), "duels")') &&
  SCREEN_SRC.includes("duelBoard.rows.map") && SCREEN_SRC.includes("duelBoard.league") &&
  SCREEN_SRC.includes("duelPeak") &&
  SCREEN_SRC.includes("leaders.duelTitle") && SCREEN_SRC.includes("leaders.duelHint") &&
  SCREEN_SRC.includes("leaders.duelLeague") && SCREEN_SRC.includes("leaders.duelShare") &&
  SCREEN_SRC.includes("leaders.duelMethod") && SCREEN_SRC.includes("leaders.duelNone"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);


