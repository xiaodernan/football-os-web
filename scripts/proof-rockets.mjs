import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1056: the breakthroughs — the biggest single-season jumps the simulated world produced,
// one row per player, their best step. A hand-built history first, then the seeded
// forward-run, then the screen reader.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { rocketRises } = await server.ssrLoadModule("/domain/rockets.ts");
const { runWorld } = await server.ssrLoadModule("/domain/worldEngine.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const dev = (id, name, clubId, position, age, from, to, delta) => ({ id, name, clubId, position, age, from, to, delta });
const history = [
  { index: 0, label: "2028", champions: [], developments: [dev("p1", "Alpha", "c1", "ST", 21, 70, 74, 4), dev("p2", "Beta", "c2", "CM", 19, 66, 70, 4), dev("p3", "Charlie", "c1", "GK", 22, 60, 62, 2)], declines: [], prospects: [], retired: [], avgOverall: 74, marketTotal: 8000000000 },
  { index: 1, label: "2029", champions: [], developments: [dev("p1", "Alpha", "c1", "ST", 22, 74, 79, 5), dev("p9", "Iggy", "c3", "CB", 24, 68, 72, 4)], declines: [], prospects: [], retired: [], avgOverall: 75, marketTotal: 8100000000 },
  { index: 2, label: "2030", champions: [], developments: [dev("p1", "Alpha", "c1", "ST", 23, 79, 80, 1), dev("p_none", "Negative", "c4", "LW", 28, 72, 70, -2)], declines: [], prospects: [], retired: [], avgOverall: 75, marketTotal: 8200000000 },
];
const board = rocketRises(history);

ok("the hand-counted history gives Alpha exactly one row, and it is Alpha's biggest jump (+5), not his sum or latest",
  board.rows[0].id === "p1" && board.rows[0].delta === 5 && board.rows[0].season === 2 &&
  board.rows.length === 4 && board.rows[1].id === "p2" && board.rows[1].delta === 4);
ok("limit clips the board to the top 3 without disturbing the ordering underneath",
  rocketRises(history, 3).rows.map((r) => r.id).join(",") === "p1,p2,p9" &&
  rocketRises(history, 6).rows.length === 4);
ok("negatives are purged at the door and an empty world reads no rows and a measured zero, repeats exactly",
  board.rows.every((r) => r.id !== "p_none" && r.delta > 0) &&
  rocketRises([]).rows.length === 0 && rocketRises([]).seasons === 0 &&
  rocketRises([]).built === 0 && rocketRises([]).best === 0 &&
  JSON.stringify(board) === JSON.stringify(rocketRises(history)));

// Seeded arm: run the world forward two seasons and recompute from the raw developments.
const base = { players: SVC.footballProvider.players(), clubs: SVC.footballProvider.clubs(), competitions: SVC.footballProvider.competitions() };
const snap = runWorld(base, 2);
const seeded = rocketRises(snap.history);
const bestByPlayer = new Map();
let built = 0;
for (const step of snap.history) {
  for (const d of step.developments) {
    if (!(d.delta > 0)) continue;
    built++;
    const cur = bestByPlayer.get(d.id);
    if (!cur || d.delta > cur.delta) bestByPlayer.set(d.id, { id: d.id, name: d.name, clubId: d.clubId, position: d.position, age: d.age, season: step.index + 1, from: d.from, to: d.to, delta: d.delta });
  }
}
const expect = [...bestByPlayer.values()].sort(
  (a, b) => b.delta - a.delta || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
).slice(0, 6);
ok(`over the seeded world, two simulated seasons: every jumper named exactly once, delta-ordered (${seeded.rows.length} rows, ${built} developments, best +${seeded.best})`,
  seeded.built === built && seeded.best === seeded.rows[0].delta && seeded.seasons === snap.history.length &&
  seeded.rows.every((r, i) => r.id === expect[i].id && r.delta === expect[i].delta && r.season === expect[i].season && r.to === expect[i].to && r.from === expect[i].from));
ok("every row in the seeded board shares a frame shape (position, name, club, season ≥ 1, to > from)",
  seeded.rows.every((r) => typeof r.name === "string" && r.name.length > 0 && typeof r.position === "string" && r.position.length > 0 &&
    r.season >= 1 && r.to > r.from && r.delta === r.to - r.from));

// The screen is a reader: it renders the fold and its keys and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok("the world screen renders the fold and its own panel (fold call true, keys true/true)",
  SCREEN_SRC.includes("rocketRises(history)") && SCREEN_SRC.includes("rockets.rows.map") &&
  SCREEN_SRC.includes("world.rocketTitle") && SCREEN_SRC.includes("world.rocketHint") &&
  SCREEN_SRC.includes("world.rocketNone") && SCREEN_SRC.includes("world.rocketWorld") &&
  SCREEN_SRC.includes("world.rocketLine") && SCREEN_SRC.includes("world.rocketUp") &&
  SCREEN_SRC.includes("world.rocketMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
