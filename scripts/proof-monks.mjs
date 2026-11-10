import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1054: the monks. The same stats-block fold as the yellow-kings boards, read ascending —
// a board of absence: the clubs that went through their season without a booking. This
// proof is the sixth-directional sibling: desc by default (M1010 poll), asc here.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { statsBlockKings } = await server.ssrLoadModule("/domain/analytics.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const side = (yellows, fouls) => ({ corners: 0, duels: 0, yellows, fouls, shots: 0, passes: 0, tackles: 0, onTarget: 0 });
const match = (id, comp, home, away, hg, ag, kickoff, stats, status = "FINISHED") => ({
  id, competitionId: comp, homeClubId: home, awayClubId: away, kickoff, round: 1, status,
  homeGoals: status === "FINISHED" ? hg : null, awayGoals: status === "FINISHED" ? ag : null,
  stats,
});

const fx = [
  match("first", "T94", "A", "B", 2, 0, "2026-10-01T18:00:00.000Z",
    { home: side(1, 4), away: side(7, 9) }),
  match("second", "T94", "B", "C", 1, 1, "2026-10-08T18:00:00.000Z",
    { home: side(2, 3), away: side(0, 1) }),
  match("third", "T94", "A", "C", 1, 0, "2026-10-15T18:00:00.000Z",
    { home: side(0, 2), away: side(0, 0) }),
  // Scheduled noise — must never be counted.
  match("upcoming", "T94", "A", "D", null, null, "2026-11-01T18:00:00.000Z",
    { home: side(99, 99), away: side(99, 99) }, "SCHEDULED"),
];
const board = statsBlockKings(fx, [{ id: "A" }, { id: "B" }, { id: "C" }].map((c) => ({
  id: c.id, name: c.id, short: c.id, competitionId: "T94", nation: "T", overall: 70, colors: ["#111", "#fff"], stadium: "S",
})), "yellows", "asc");

ok("the crafted fixture ranks C first (never booked), then A (1/2 = 0.50), then B (9/2 = 4.5)",
  board.rows.length === 3 && board.rows[0].clubId === "C" && board.rows[0].perMatch === 0 &&
  board.rows[1].clubId === "A" && board.rows[1].perMatch === 0.5 &&
  board.rows[2].clubId === "B" && board.rows[2].perMatch === 4.5);
const desc = statsBlockKings(fx, [{ id: "A" }, { id: "B" }, { id: "C" }].map((c) => ({
  id: c.id, name: c.id, short: c.id, competitionId: "T94", nation: "T", overall: 70, colors: ["#111", "#fff"], stadium: "S",
})), "yellows");
ok("the descending arm is byte-for-byte the fold's own order (B, A, C) — default order untouched",
  desc.rows[0].clubId === "B" && desc.rows[1].clubId === "A" && desc.rows[2].clubId === "C");
ok("the world-wide league rate is the same either way round (the asc arm is a sort, not a fold)",
  desc.league === board.league && board.league > 0);
ok("an empty world reads no rows, measured zero and the same fold exactly twice",
  statsBlockKings([], [], "yellows", "asc").rows.length === 0 &&
  statsBlockKings([], [], "yellows", "asc").league === 0 &&
  JSON.stringify(board) === JSON.stringify(statsBlockKings(fx, [{ id: "A" }, { id: "B" }, { id: "C" }].map((c) => ({
    id: c.id, name: c.id, short: c.id, competitionId: "T94", nation: "T", overall: 70, colors: ["#111", "#fff"], stadium: "S",
  })), "yellows", "asc")));

// Seeded arm: recount against the world with the shared door, both orders verified independently.
const world = SVC.footballProvider.matches();
const clubs = SVC.footballProvider.clubs();
const monks = statsBlockKings(world, clubs, "yellows", "asc");
const aced = new Map();
for (const m of world) {
  if (m.status !== "FINISHED" || !m.stats) continue;
  for (const sid of ["home", "away"]) {
    const id = sid === "home" ? m.homeClubId : m.awayClubId;
    const s = m.stats[sid];
    if (!s) continue;
    const cur = aced.get(id) ?? { total: 0, games: 0 };
    cur.total += s.yellows ?? 0;
    cur.games++;
    aced.set(id, cur);
  }
}
const expect = [...aced.entries()].map(([clubId, v]) => ({ clubId, played: v.games, perMatch: Math.round(v.total * 100 / v.games) / 100 }));
expect.sort((a, b) => a.perMatch - b.perMatch || a.clubId.localeCompare(b.clubId));
ok(`over the shipped world the ascending read recounts exactly (${monks.rows.length} rows; ${aced.size} clubs commit ≥1 yellow or ≥1 game)`,
  monks.rows.length === expect.length && monks.rows.every((r, i) => r.clubId === expect[i].clubId && r.perMatch === expect[i].perMatch));
ok("the rows keep their order (ascending perMatch, then club id) and the board keeps the bank's own rate",
  monks.rows.every((r, i, a) => i === 0 || (a[i - 1].perMatch < r.perMatch || (a[i - 1].perMatch === r.perMatch && a[i - 1].clubId <= r.clubId))) &&
  monks.rows.every((r) => r.played >= 1));

// The screen is a reader: it renders the fold and its keys and nothing else guesses.
const SCREEN_SRC = readFileSync(resolve(root, "features/analytics/Discipline.tsx"), "utf8");
ok("the discipline screen renders the asc arm and its keys (fold call true, keys true/true)",
  SCREEN_SRC.includes("statsBlockKings(matches, clubs, \"yellows\", \"asc\")") && SCREEN_SRC.includes("monkBoard.rows.slice(0, 6).map") &&
  SCREEN_SRC.includes("disc.monkTitle") && SCREEN_SRC.includes("disc.monkHint") &&
  SCREEN_SRC.includes("disc.monkNone") && SCREEN_SRC.includes("disc.monkWorld") &&
  SCREEN_SRC.includes("disc.monkShare") && SCREEN_SRC.includes("disc.monkMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
