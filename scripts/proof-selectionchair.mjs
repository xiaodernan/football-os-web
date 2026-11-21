// M1233 · The Selection Chair: proof for the sixteenth door's pure half — the XI parser, the
// numeral law, the fold's own deterministic XI and the state machine.
// Run: node scripts/proof-selectionchair.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-selectionchair-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/selectionChair.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { createChair, parseChairXi, verifyChairText, foldXi, chairLine, worldSquad, chairPreflight, chairBuild, chairPrecommit, chairCommit, chairRefused } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

const p = (id, g, overall, age = 25) => ({ id, name: `P ${id}`, positionGroup: g, overall, age });
// The hand-counted squad: two keepers, five defenders, four midfielders, three attackers.
const squad = {
  clubId: "ars",
  players: [
    p("g1", "GK", 84), p("g2", "GK", 78),
    p("d1", "DEF", 83), p("d2", "DEF", 81), p("d3", "DEF", 79), p("d4", "DEF", 77), p("d5", "DEF", 74),
    p("m1", "MID", 85), p("m2", "MID", 80), p("m3", "MID", 76), p("m4", "MID", 72),
    p("a1", "ATT", 88), p("a2", "ATT", 82), p("a3", "ATT", 75),
  ],
};
const lawful = "XI:g1,d1,d2,d3,d4,m1,m2,m3,a1,a2,a3\nStart with the two strikers high and the eight behind the ball.";
const parsed = parseChairXi(lawful, squad);
ok(`a lawful XI parses into eleven ids grouped by position, one keeper first (${parsed.selection?.ids.join(",")}; GK ${parsed.selection?.byPosition.GK.length}, DEF ${parsed.selection?.byPosition.DEF.length}, MID ${parsed.selection?.byPosition.MID.length}, ATT ${parsed.selection?.byPosition.ATT.length}; violations ${parsed.violations.join(",") || "none"})`,
  parsed.selection !== null && parsed.violations.length === 0 &&
  parsed.selection.ids.length === 11 && parsed.selection.byPosition.GK.length === 1 &&
  parsed.selection.byPosition.DEF.length === 4 && parsed.selection.byPosition.MID.length === 3 && parsed.selection.byPosition.ATT.length === 3);

// Each way an unlawful answer is caught, by code.
const cases = [
  ["ten men", "XI:g1,d1,d2,d3,d4,m1,m2,m3,a1,a2", "notEleven"],
  ["twelve men", "XI:g1,d1,d2,d3,d4,m1,m2,m3,a1,a2,a3,g2", "notEleven"],
  ["a ghost", "XI:g1,d1,d2,d3,d4,m1,m2,m3,a1,a2,zz9", "unknownPlayer"],
  ["a repeat", "XI:g1,d1,d1,d3,d4,m1,m2,m3,a1,a2,a3", "duplicate"],
  ["no keeper", "XI:d1,d2,d3,d4,d5,m1,m2,m3,a1,a2,a3", "noKeeper"],
  ["two keepers", "XI:g1,g2,d1,d2,d3,m1,m2,m3,a1,a2,a3", "noKeeper"],
];
const caught = cases.map(([label, text, want]) => {
  const r = parseChairXi(text, squad);
  return `${label}:${r.violations.includes(want) && r.selection === null}`;
});
ok(`every unlawful XI is refused by code and returns no selection (${caught.join(" · ")})`,
  cases.every(([label, text, want]) => { const r = parseChairXi(text, squad); return r.selection === null && r.violations.includes(want); }));

// The numeral law over the prose.
const prose = [
  ["a squad figure passes", "a1 is the 88-rated striker and d3 is 79.", []],
  ["an invented figure is refused", "a1 is the 987654-rated striker.", ["offSquad"]],
  ["futurology is refused", "a1 will score twice next week.", ["prediction"]],
  ["small integers always pass", "eleven players, one keeper, four at the back.", []],
];
const proseOk = prose.every((row) => {
  const got = verifyChairText(row[1], squad).sort();
  return JSON.stringify(got) === JSON.stringify([...row[2]].sort());
});
ok(`the prose law passes the squad's own figures and refuses an invented one and futurology (${prose.map(([l]) => l).join(" · ")}: ${proseOk})`,
  proseOk && verifyChairText("a1 is the 987654-rated striker.", squad).includes("offSquad") &&
  verifyChairText("a1 is the 88-rated striker.", squad).length === 0 &&
  verifyChairText("a1 will score twice next week.", squad).includes("prediction"));

// The fold's own XI: the best-rated 4-3-3, deterministic, never a copy of the model's choice.
const fold = foldXi(squad);
ok(`the fold's XI is the best-rated 4-3-3 — g1, d1-d4, m1-m3, a1-a3 — and answers twice the same (${fold?.ids.join(",")})`,
  fold !== null && fold.ids.length === 11 &&
  JSON.stringify(fold.ids) === JSON.stringify(["g1", "d1", "d2", "d3", "d4", "m1", "m2", "m3", "a1", "a2", "a3"]) &&
  JSON.stringify(foldXi(squad)) === JSON.stringify(fold));

// A thin squad fills to eleven best-rated-first; an unselectable squad reads null.
// A genuinely thin squad: one player per line, seven more bodies of any position. The shape
// takes what each line has; the leftovers fill the XI to eleven, best-rated first.
const thin = { clubId: "ars", players: [
  p("g1", "GK", 84), p("d1", "DEF", 83), p("m1", "MID", 80), p("a1", "ATT", 88),
  p("x1", "ATT", 77), p("x2", "ATT", 76), p("x3", "ATT", 75), p("x4", "ATT", 74),
  p("x5", "ATT", 73), p("x6", "ATT", 72), p("x7", "ATT", 71), p("x8", "ATT", 70), p("x9", "ATT", 69),
] };
const thinFold = foldXi(thin);
const noGk = foldXi({ clubId: "ars", players: squad.players.filter((q) => q.positionGroup !== "GK") });
const short = foldXi({ clubId: "ars", players: squad.players.slice(0, 10) });
ok(`a thin squad still fills eleven — the keeper leads, the shape takes what each line has, the best-rated leftovers fill the rest — and a squad with no keeper or fewer than eleven reads null rather than a broken XI (thin ${thinFold?.ids.length}: ${thinFold?.ids.join(",")}; noGk ${noGk}; short ${short})`,
  thinFold !== null && thinFold.ids.length === 11 &&
  JSON.stringify(thinFold.ids) === JSON.stringify(["g1", "d1", "m1", "a1", "x1", "x2", "x3", "x4", "x5", "x6", "x7"]) &&
  noGk === null && short === null);

// The state machine: preflight, build, the two precommit arms, commit carries the selection, and a
// refusal carries the fold's XI openly.
let desk = chairBuild(chairPreflight(createChair(squad, "en")));
const committed = chairCommit(chairPrecommit(desk, "pass"), lawful, parsed.selection);
const refused = chairRefused(chairPrecommit(desk, "refused"), "The chair cannot back this XI.");
const thinDesk = chairPreflight(createChair({ clubId: "ars", players: squad.players.slice(0, 5) }, "en"));
ok(`the machine walks preflight -> build -> precommit -> commit with the selection carried, and a refusal carries the fold's own XI (commit ${committed.status} sel ${committed.selection?.ids.length}, refused ${refused.status} sel ${refused.selection?.ids.length}, thin-squad preflight ${thinDesk.status})`,
  committed.status === "commit" && committed.selection?.ids.length === 11 &&
  refused.status === "refused" && refused.selection?.ids.length === 11 &&
  thinDesk.status === "refused" && committed.trace.length >= 3 && refused.trace.length >= 3);

// The chair's pool is the world's strongest, cut with the digest's own comparator.
const worldPlayers = [
  { id: "w1", name: "One", position: "ST", positionGroup: "ST", age: 24, nation: "n", clubId: "c", overall: 91, potential: 95, archetype: "a", value: 1, foot: "R" },
  { id: "w2", name: "Two", position: "GK", positionGroup: "GK", age: 28, nation: "n", clubId: "c", overall: 89, potential: 91, archetype: "a", value: 1, foot: "R" },
  { id: "w3", name: "Three", position: "CB", positionGroup: "CB", age: 26, nation: "n", clubId: "c", overall: 87, potential: 90, archetype: "a", value: 1, foot: "R" },
  { id: "w4", name: "Four", position: "CM", positionGroup: "CM", age: 22, nation: "n", clubId: "c", overall: 86, potential: 93, archetype: "a", value: 1, foot: "R" },
];
const pool = worldSquad(worldPlayers, 3);
ok(`the chair's pool is the world's strongest by the digest's own comparator, mapped to the four lines (limit 3 of 4 -> ${pool.map((p) => `${p.id}@${p.overall}/${p.positionGroup}`).join(",")})`,
  pool.length === 3 && pool[0].id === "w1" && pool[0].positionGroup === "ATT" &&
  pool[1].id === "w2" && pool[1].positionGroup === "GK" &&
  pool[2].id === "w3" && pool[2].positionGroup === "DEF" &&
  worldSquad(worldPlayers, 0).length === 0 && worldSquad(worldPlayers).length === 4);

// The world's eight position groups map onto the board's four lines, once and classically.
const groups = { GK: "GK", CB: "DEF", FB: "DEF", DM: "MID", CM: "MID", AM: "MID", W: "ATT", ST: "ATT" };
ok(`the world's eight position groups map onto the four lines once and classically — keepers stay keepers, full-backs join the centre-backs, the attacking mid and wingers go up top (${Object.entries(groups).map(([g, l]) => `${g}>${chairLine(g)===l ? l : "WRONG"}`).join(" ")})`,
  Object.entries(groups).every(([g, l]) => chairLine(g) === l) && chairLine("GK") === "GK" && chairLine("CB") === "DEF");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
