import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1031: the dynasties — every crown the simulated world handed out, counted pair by pair.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { dynastyTable } = await server.ssrLoadModule("/domain/dynasty.ts");
const { runWorld } = await server.ssrLoadModule("/domain/worldEngine.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// A hand-built history: three seasons, four championships, one repeated pair.
const champ = (clubId, clubName, compId, compName, points) => ({ clubId, clubName, compId, compName, points });
const history = [
  { index: 0, label: "2028", champions: [champ("a", "Alpha", "x", "Cup", 91), champ("b", "Beta", "y", "League", 84)], developments: [], declines: [], prospects: [], retired: [], avgOverall: 75, marketTotal: 9000000000 },
  { index: 1, label: "2029", champions: [champ("a", "Alpha", "x", "Cup", 88)], developments: [], declines: [], prospects: [], retired: [], avgOverall: 76, marketTotal: 9100000000 },
  { index: 2, label: "2030", champions: [champ("c", "Gamma", "y", "League", 82)], developments: [], declines: [], prospects: [], retired: [], avgOverall: 77, marketTotal: 9200000000 },
];
const board = dynastyTable(history);
const row = Object.fromEntries(board.rows.map((r) => [`${r.clubId}|${r.compId}`, r]));

ok(`the hand counts hold (${board.rows.map((r) => `${r.clubId}|${r.compId}:${r.titles}`).join(" ")})`,
  board.rows.length === 3 &&
  row["a|x"].titles === 2 && row["a|x"].clubName === "Alpha" && row["a|x"].compName === "Cup" &&
  row["b|y"].titles === 1 && row["c|y"].titles === 1 &&
  board.seasons === 3 && board.titles === 4);
ok(`rows order by TITLES then clubId then compId (${board.rows.map((r) => `${r.clubId}|${r.compId}`).join(",")})`,
  board.rows.map((r) => `${r.clubId}|${r.compId}`).join(",") === "a|x,b|y,c|y");
ok(`an empty world reads no rows and a measured zero, the same fold repeats exactly`,
  dynastyTable([]).rows.length === 0 &&
  dynastyTable([]).seasons === 0 && dynastyTable([]).titles === 0 &&
  JSON.stringify(board) === JSON.stringify(dynastyTable(history)));

// Seeded arm: run the seeded world forward one season and read the dynasties back — every crown
// handed out must appear exactly once, per (club, comp) pair.
const base = { players: SVC.footballProvider.players(), clubs: SVC.footballProvider.clubs(), competitions: SVC.footballProvider.competitions() };
const snap = runWorld(base, 2);
const seeded = dynastyTable(snap.history);
let handedOut = 0;
for (const step of snap.history) handedOut += step.champions.length;
let titleOk = handedOut > 0 && seeded.titles === handedOut;
let pairs = new Set();
for (const step of snap.history) for (const c of step.champions) pairs.add(`${c.clubId}|${c.compId}`);
titleOk = titleOk && seeded.rows.length === pairs.size && seeded.seasons === snap.history.length;
let ordered = true;
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].titles < seeded.rows[i].titles) ordered = false;
ok(`over the seeded world's sim: every crown handed out is accounted for (${handedOut} crowns, ${seeded.rows.length} pairs, order ${ordered})`,
  titleOk && ordered && snap.history.length === 2 && seeded.titles === 30);

// The screen is a reader: the fold renders and the panel keeps its doors.
const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok(`the world screen renders the fold and its own panel (fold call ${SCREEN_SRC.includes("dynastyTable(history)")}, rows ${SCREEN_SRC.includes("dynasties.rows.map")}, keys ${SCREEN_SRC.includes("world.dynastyTitle")}/${SCREEN_SRC.includes("world.dynastyMethod")})`,
  SCREEN_SRC.includes("dynastyTable(history)") && SCREEN_SRC.includes("dynasties.rows.map") &&
  SCREEN_SRC.includes("dynasties.seasons") && SCREEN_SRC.includes("dynasties.titles") &&
  SCREEN_SRC.includes("dynasties.rows.length") && SCREEN_SRC.includes("world.dynastyTitle") &&
  SCREEN_SRC.includes("world.dynastyHint") && SCREEN_SRC.includes("world.dynastyNone") &&
  SCREEN_SRC.includes("world.dynastyWorld") && SCREEN_SRC.includes("world.dynastyMethod") &&
  SCREEN_SRC.includes("r.titles"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
