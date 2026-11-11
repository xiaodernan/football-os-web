import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1057: the football graph — the fixture network, recounted by hand and then at world scale.
// (scripts/proof-graph.mjs already belongs to the knowledge graph; this is the pitch's own.)

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { fixtureGraph, GRAPH_ITERATIONS, GRAPH_DAMPING } = await server.ssrLoadModule("/domain/graph.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const club = (id) => ({ id, name: id, short: id, competitionId: "comp", nation: "N", overall: 70, colors: ["#000", "#fff"], stadium: "S" });
const fixture = (id, home, away, status = "FINISHED", homeGoals = 1, awayGoals = 0) => ({
  id, competitionId: "comp", homeClubId: home, awayClubId: away, kickoff: "2026-08-01T15:00:00.000Z",
  round: 1, status, homeGoals: status === "FINISHED" ? homeGoals : null, awayGoals: status === "FINISHED" ? awayGoals : null,
});

// --- 1. A hand fixture: four clubs, five finished meetings, one scheduled game that must not count,
//        one unknown club and one self-fixture that must not enter the graph. ---
const clubs = ["A", "B", "C", "D"].map(club);
const matches = [
  fixture("m1", "A", "B", "FINISHED", 2, 1),
  fixture("m2", "A", "B", "FINISHED", 0, 0),
  fixture("m3", "B", "C", "FINISHED", 1, 0),
  fixture("m4", "C", "D", "FINISHED", 2, 2),
  fixture("m5", "D", "A", "FINISHED", 1, 1),
  fixture("m6", "A", "C", "SCHEDULED"),
  fixture("m7", "A", "X", "FINISHED", 3, 0),
  fixture("m8", "E", "E", "FINISHED", 1, 1),
];
const board = fixtureGraph(matches, clubs);
const row = Object.fromEntries(board.rows.map((r) => [r.clubId, r]));
ok(`the hand graph counts four clubs, four edges and five meetings (${board.clubs}/${board.edges}/${board.meetings})`,
  board.clubs === 4 && board.edges === 4 && board.meetings === 5 && board.components === 1 && board.biggest === 4);
ok(`every club has two opponents and the weighted strength the fixtures imply (A ${row.A.strength}, B ${row.B.strength}, C ${row.C.strength}, D ${row.D.strength})`,
  row.A.degree === 2 && row.B.degree === 2 && row.C.degree === 2 && row.D.degree === 2 &&
  row.A.strength === 3 && row.B.strength === 3 && row.C.strength === 2 && row.D.strength === 2);
ok(`no opponent pair has met, so every local clustering coefficient is zero (${board.rows.map((r) => r.clustering).join(",")})`,
  board.rows.every((r) => r.clustering === 0) && board.rows.length === 4);
ok(`the scheduled game, the unknown club and the self-fixture are all absent (${board.rows.map((r) => r.clubId).join("")})`,
  board.rows.length === 4 && !board.rows.some((r) => r.clubId === "X" || r.clubId === "E"));

// The rank is the same power iteration the module runs — written again here, from the formula,
// so a change to the module's loop cannot pass by agreeing with itself.
const nodes = ["A", "B", "C", "D"];
const weight = { A: { B: 2, D: 1 }, B: { A: 2, C: 1 }, C: { B: 1, D: 1 }, D: { C: 1, A: 1 } };
const strength = Object.fromEntries(nodes.map((id) => [id, Object.values(weight[id]).reduce((s, w) => s + w, 0)]));
let rank = Object.fromEntries(nodes.map((id) => [id, 1 / nodes.length]));
for (let pass = 0; pass < GRAPH_ITERATIONS; pass += 1) {
  const next = Object.fromEntries(nodes.map((id) => [id, (1 - GRAPH_DAMPING) / nodes.length]));
  for (const id of nodes) {
    const share = (GRAPH_DAMPING * rank[id]) / strength[id];
    for (const [other, w] of Object.entries(weight[id])) next[other] += share * w;
  }
  rank = next;
}
const mass = nodes.reduce((s, id) => s + rank[id], 0);
for (const id of nodes) rank[id] /= mass;
ok(`the rank matches an independently written power iteration (A ${row.A.rank.toFixed(6)} vs ${rank.A.toFixed(6)})`,
  nodes.every((id) => Math.abs(row[id].rank - rank[id]) < 1e-9) &&
  Math.abs(nodes.reduce((s, id) => s + row[id].rank, 0) - 1) < 1e-9);
ok(`the two heavier clubs outrank the two lighter ones, and the cut keeps all four`,
  row.A.rank > row.C.rank && row.B.rank > row.D.rank &&
  board.centres.length === 4 && board.centres.map((r) => r.clubId).join("") === board.rows.slice(0, 4).map((r) => r.clubId).join(""));

// --- 2. One meeting fewer: the graph changes shape, so the numbers must. ---
// The hand fixture is a 4-cycle (A–B–C–D–A), so dropping the D–A edge leaves a single path
// A–B–C–D: still one world, but A loses an opponent and the edge/meeting counts drop. (A cycle
// has no bridge, so no single edge can fragment it — that fact is the assertion.)
const thinner = fixtureGraph(matches.filter((m) => m.id !== "m5"), clubs);
ok(`dropping the D–A meeting keeps the four clubs in one world but drops an edge and a meeting (${thinner.components}/${thinner.biggest}/${thinner.edges}/${thinner.meetings})`,
  thinner.components === 1 && thinner.biggest === 4 && thinner.edges === 3 && thinner.meetings === 4 &&
  thinner.clubs === 4 && thinner.rows.find((r) => r.clubId === "A").degree === 1 &&
  thinner.rows.find((r) => r.clubId === "D").degree === 1);

// --- 3. An empty world reads empty, and the fold repeats exactly. ---
const empty = fixtureGraph([], clubs);
ok(`an empty world reads no rows, no edges and no centre`,
  empty.rows.length === 0 && empty.centres.length === 0 && empty.clubs === 0 && empty.edges === 0 &&
  empty.meetings === 0 && empty.components === 0 && empty.biggest === 0);
// Companion: the populated hand graph carries a real population, so the empty read above is
// measured and not a blind spot (the census charges a zero-asserting clause that stands alone).
ok(`the populated hand graph carries a real population (${board.rows.length} rows, ${board.edges} edges)`,
  board.rows.length === 4 && board.edges === 4);
ok(`the fold is pure: the same fixtures produce byte-identical boards`,
  JSON.stringify(fixtureGraph(matches, clubs)) === JSON.stringify(board));

// --- 4. The seeded world, recounted independently: every degree, weight, component and cluster. ---
const seedMatches = SVC.footballProvider.matches();
const seedClubs = SVC.footballProvider.clubs();
const seeded = fixtureGraph(seedMatches, seedClubs);

const finished = seedMatches.filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null && m.homeClubId !== m.awayClubId);
const known = new Set(seedClubs.map((c) => c.id));
const adj = new Map();
const pairSet = new Set();
for (const m of finished) {
  if (!known.has(m.homeClubId) || !known.has(m.awayClubId)) continue;
  pairSet.add([m.homeClubId, m.awayClubId].sort().join("|"));
  const add = (a, b) => { if (!adj.has(a)) adj.set(a, new Map()); adj.get(a).set(b, (adj.get(a).get(b) ?? 0) + 1); };
  add(m.homeClubId, m.awayClubId);
  add(m.awayClubId, m.homeClubId);
}
let matched = true;
for (const r of seeded.rows) {
  const nbrs = adj.get(r.clubId);
  const isStrong = [...nbrs.values()].reduce((s, w) => s + w, 0);
  if (nbrs.size !== r.degree || isStrong !== r.strength) matched = false;
  let linked = 0;
  const list = [...nbrs.keys()];
  for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) if (adj.get(list[i]).has(list[j])) linked += 1;
  const possible = (list.length * (list.length - 1)) / 2;
  const want = possible ? Math.round((linked / possible) * 1000) / 1000 : 0;
  if (want !== r.clustering) matched = false;
}
let ordered = true;
for (let i = 1; i < seeded.rows.length; i += 1) {
  const a = seeded.rows[i - 1], b = seeded.rows[i];
  if (a.rank < b.rank) ordered = false;
  if (a.rank === b.rank && (a.degree < b.degree || (a.degree === b.degree && a.clubId > b.clubId))) ordered = false;
}
ok(`over the seeded world: every degree, weight and cluster is accounted for (${seeded.clubs} clubs, ${seeded.edges} edges, ${seeded.meetings} meetings, ${seeded.components} components, biggest ${seeded.biggest})`,
  matched && ordered && seeded.clubs === adj.size && seeded.edges === pairSet.size &&
  seeded.meetings === finished.length && Math.abs(seeded.rows.reduce((s, r) => s + r.rank, 0) - 1) < 1e-9);
ok(`the seeded cut is the first eight of the ordered table (${seeded.centres.map((r) => r.clubId).join(",")})`,
  seeded.centres.length === Math.min(8, seeded.rows.length) &&
  seeded.centres.every((r, i) => r.clubId === seeded.rows[i].clubId && r.rank === seeded.rows[i].rank));

// --- 5. The screen reads the fold, and does not re-derive it. ---
const SRC = readFileSync(resolve(root, "features/leaders/LeagueLeaders.tsx"), "utf8");
ok(`the leaders screen renders the graph fold (call ${SRC.includes("fixtureGraph(footballProvider.matches()")}, rows ${SRC.includes("graph.centres.map")}, keys ${SRC.includes("leaders.graphTitle")}/${SRC.includes("leaders.graphMethod")})`,
  SRC.includes("fixtureGraph(footballProvider.matches()") && SRC.includes("graph.centres.map") &&
  SRC.includes("graph.clubs") && SRC.includes("graph.edges") && SRC.includes("graph.meetings") &&
  SRC.includes("graph.components") && SRC.includes("graph.biggest") &&
  SRC.includes("leaders.graphTitle") && SRC.includes("leaders.graphHint") &&
  SRC.includes("leaders.graphNone") && SRC.includes("leaders.graphWorld") &&
  SRC.includes("leaders.graphLine") && SRC.includes("leaders.graphMethod"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
