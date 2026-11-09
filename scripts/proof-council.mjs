import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1033: the coaching council — which clubs' squads actually grew across the simulated run.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { devCouncil } = await server.ssrLoadModule("/domain/devCouncil.ts");
const { runWorld } = await server.ssrLoadModule("/domain/worldEngine.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const row = (clubId, delta, name, age = 20, fromOverall = 60, toOverall = 70) => ({ id: name, clubId, name, position: "ST", age, from: fromOverall, to: toOverall, delta });
const history = [
  { index: 0, label: "2028", champions: [], developments: [row("A", 3, "a1"), row("B", 5, "b1"), row("C", 2, "c1")], declines: [], prospects: [], retired: [], avgOverall: 70, marketTotal: 5000000000 },
  { index: 1, label: "2029", champions: [], developments: [row("A", 4, "a1"), row("A", 1, "a2"), row("B", 1, "b2"), row("C", 2, "c1")], declines: [row("A", -1, "a3")], prospects: [], retired: [], avgOverall: 71, marketTotal: 5200000000 },
];
const board = devCouncil(history);
const rows = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));

ok(`the members hand-count (${board.rows.map((r) => `${r.clubId}:${r.upDelta}/${r.developed}`).join(" ")})`,
  board.rows.length === 3 &&
  rows.A.upDelta === 8 && rows.A.developed === 3 && Math.abs(rows.A.avgDelta - Math.round((8 / 3) * 100) / 100) < 1e-9 && rows.A.bestName === "a1" && rows.A.bestDelta === 4 &&
  rows.B.upDelta === 6 && rows.B.developed === 2 && rows.B.avgDelta === 3 && rows.B.bestName === "b1" && rows.B.bestDelta === 5 &&
  rows.C.upDelta === 4 && rows.C.developed === 2 && rows.C.avgDelta === 2 && rows.C.bestName === "c1" && rows.C.bestDelta === 2 &&
  board.seasons === 2 && Math.abs(board.totalUp - 18) < 1e-9);
ok(`rows open by up-tick, then id (${board.rows.map((r) => r.clubId).join(",")})`,
  board.rows.map((r) => r.clubId).join(",") === "A,B,C");
ok(`an empty world reads no rows, a measured zero, and the same fold repeats exactly`,
  devCouncil([]).rows.length === 0 &&
  devCouncil([]).seasons === 0 && devCouncil([]).totalUp === 0 &&
  JSON.stringify(board) === JSON.stringify(devCouncil(history)));

const base = { players: SVC.footballProvider.players(), clubs: SVC.footballProvider.clubs(), competitions: SVC.footballProvider.competitions() };
const snap = runWorld(base, 2);
const seeded = devCouncil(snap.history);
let matched = true, ordered = true, total = 0;
for (const step of snap.history) for (const c of step.developments) total += c.delta;
const expected = new Map();
for (const step of snap.history) {
  for (const c of step.developments) {
    const cur = expected.get(c.clubId) ?? { up: 0, developed: 0 };
    cur.up += c.delta;
    cur.developed += 1;
    expected.set(c.clubId, cur);
  }
}
const rows2 = new Map(seeded.rows.map((r) => [r.clubId, r]));
for (const [clubId, want] of expected) {
  const r = rows2.get(clubId);
  if (!r) { matched = false; continue; }
  const upDelta = Math.round(want.up * 100) / 100;
  if (r.upDelta !== upDelta || r.developed !== want.developed) matched = false;
}
for (let i = 1; i < seeded.rows.length; i++) if (seeded.rows[i - 1].upDelta < seeded.rows[i].upDelta) ordered = false;
ok(`over the seeded world's sim: every club's growth accounted for (${expected.size} clubs, ${seeded.rows.length} rows, total ${total}, matched ${matched}, ordered ${ordered})`,
  matched && ordered && seeded.seasons === 2 && expected.size === seeded.rows.length &&
  Math.abs(seeded.totalUp - Math.round(total * 100) / 100) < 1e-9);

const SCREEN_SRC = readFileSync(resolve(root, "features/world/DynamicWorld.tsx"), "utf8");
ok(`the world screen renders the fold and its own panel (fold call ${SCREEN_SRC.includes("devCouncil(history)")}, rows ${SCREEN_SRC.includes("council.rows.map")}, keys ${SCREEN_SRC.includes("world.coachCouncilTitle")}/${SCREEN_SRC.includes("world.coachCouncilMethod")})`,
  SCREEN_SRC.includes("devCouncil(history)") && SCREEN_SRC.includes("council.rows.map") &&
  SCREEN_SRC.includes("council.seasons") && SCREEN_SRC.includes("council.totalUp") &&
  SCREEN_SRC.includes("council.rows.length") && SCREEN_SRC.includes("councilPeak") &&
  SCREEN_SRC.includes("world.coachCouncilTitle") && SCREEN_SRC.includes("world.coachCouncilHint") &&
  SCREEN_SRC.includes("world.coachCouncilNone") && SCREEN_SRC.includes("world.coachCouncilWorld") &&
  SCREEN_SRC.includes("world.coachLine") && SCREEN_SRC.includes("world.coachUp") &&
  SCREEN_SRC.includes("world.coachCouncilMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
