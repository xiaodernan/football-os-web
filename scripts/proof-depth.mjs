// M1234 · The Cliff: proof for the squad depth fold.
// Run: node scripts/proof-depth.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-depth-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/depth.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { squadDepth } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

const club = (id) => ({ id, name: id.toUpperCase(), short: id.toUpperCase(), competitionId: "c1", nation: "x", overall: 70, colors: ["#111", "#222"], stadium: "s" });
const pl = (id, clubId, overall) => ({ id, name: `P ${id}`, position: "CM", positionGroup: "CM", age: 25, nation: "n", clubId, overall, potential: overall + 2, archetype: "a", value: 1, foot: "R" });

// The hand-counted world: A is top-heavy (best 90, eleventh 78 → cliff 12, bench avg 60),
// B is even (eleven players, 80..70, bench 0), C has one player and takes no row.
const clubs = [club("a"), club("b"), club("c")];
const players = [
  ...Array.from({ length: 11 }, (_, i) => pl(`a${i + 1}`, "a", 90 - i)),     // 90..80
  ...Array.from({ length: 4 }, (_, i) => pl(`ax${i + 1}`, "a", 60 - i)),      // bench 60,59,58,57
  ...Array.from({ length: 11 }, (_, i) => pl(`b${i + 1}`, "b", 80 - i)),      // 80..70
  pl("c1", "c", 75),
];
const fold = squadDepth(players, clubs);

ok(`the hand-counted world reads A cliff 10 / XI avg 85 / bench avg 58.5, B cliff 10 / XI avg 75 / bench 0, and C takes no row (${fold.rows.map((r) => `${r.clubId}:${r.cliff}/${r.xiAvg}/${r.benchAvg}`).join(", ")})`,
  fold.rows.length === 2 &&
  fold.rows.find((r) => r.clubId === "a").cliff === 10 &&
  fold.rows.find((r) => r.clubId === "a").xiAvg === 85 &&
  fold.rows.find((r) => r.clubId === "a").benchAvg === 58.5 &&
  fold.rows.find((r) => r.clubId === "b").cliff === 10 &&
  fold.rows.find((r) => r.clubId === "b").xiAvg === 75 &&
  fold.rows.find((r) => r.clubId === "b").benchAvg === 0);

ok(`rows rank steepest-first, the two headline reads are the extremes, and the world's mean is over the rows (order ${fold.rows.map((r) => r.clubId).join(",")}, steepest ${fold.steepest?.clubId}, shallowest ${fold.shallowest?.clubId}, league ${fold.leagueAvg})`,
  fold.rows[0].clubId === "a" && fold.rows[1].clubId === "b" &&
  fold.steepest?.clubId === "a" && fold.shallowest?.clubId === "b" && fold.leagueAvg === 10);

// A squad of exactly eleven reads a zero bench, not a division by zero; the empty world reads empty.
const exact = squadDepth(Array.from({ length: 11 }, (_, i) => pl(`e${i + 1}`, "a", 84 - i)), [club("a")]);
const empty = squadDepth([], clubs);
ok(`a squad that IS the eleven reads a zero bench rather than NaN, and an empty world reads empty (bench ${exact.rows[0].benchAvg}, cliff ${exact.rows[0].cliff}; empty ${empty.rows.length}/${empty.steepest === null}/${empty.leagueAvg})`,
  exact.rows[0].benchAvg === 0 && exact.rows[0].cliff === 10 && exact.rows[0].best === 84 &&
  empty.rows.length === 0 && empty.steepest === null && empty.shallowest === null && empty.leagueAvg === 0);

// A full tie falls to the id, so two equally-steep clubs never reorder between runs.
const tie = squadDepth([...Array.from({ length: 11 }, (_, i) => pl(`t1-${i + 1}`, "a", 90 - i)), ...Array.from({ length: 11 }, (_, i) => pl(`t2-${i + 1}`, "b", 90 - i))], clubs);
ok(`a full tie falls to the club id (of a/b the first is ${tie.rows[0].clubId})`,
  tie.rows.length === 2 && tie.rows[0].clubId === "a" && tie.rows[1].clubId === "b");

// The screen reads the catalogue and every key is trilingual with agreeing placeholders.
const screen = readFileSync(join(process.cwd(), "features/depth/SquadDepth.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\("(depth\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
const nav = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const route = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
ok(`the screen's ${keys.length} labels and the nav entry are dictionary keys in all three locales with agreeing placeholders, and the route is mounted (${keys.join(",")})`,
  keys.length >= 10 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))) &&
  nav.includes('to: "/depth"') && route.includes('path === "/depth"') &&
  locales.every((l) => typeof D[l]["nav.depth"] === "string"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
