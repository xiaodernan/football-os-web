// M1237 · The Talent Map: proof for the nation fold.
// Run: node scripts/proof-nations.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const cacheDir = join(tmpdir(), `football-os-proof-nations-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/nations.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { talentMap } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

const p = (id, nation, overall) => ({ id, name: `P ${id}`, position: "CM", positionGroup: "CM", age: 25, nation, clubId: "c", overall, potential: 90, archetype: "a", value: 1, foot: "R" });

// The hand-counted world: Brazil 3 players (best 91, avg 82), Spain 2 (best 88, avg 81.5),
// Japan 1 (best 70).
const players = [
  p("b1", "Brazil", 91), p("b2", "Brazil", 80), p("b3", "Brazil", 75),
  p("s1", "Spain", 88), p("s2", "Spain", 75),
  p("j1", "Japan", 70),
];
const fold = talentMap(players);

ok(`the hand-counted world reads Brazil 3/91/82.00, Spain 2/88/81.50, Japan 1/70/70.00 (${fold.rows.map((r) => `${r.nation}:${r.players}/${r.best}/${r.avg}`).join(", ")})`,
  fold.rows.length === 3 &&
  fold.rows.find((r) => r.nation === "Brazil").players === 3 &&
  fold.rows.find((r) => r.nation === "Brazil").best === 91 &&
  fold.rows.find((r) => r.nation === "Brazil").avg === 82 &&
  fold.rows.find((r) => r.nation === "Spain").avg === 81.5 &&
  fold.rows.find((r) => r.nation === "Japan").avg === 70);

ok(`rows rank by the best overall then the depth then the name, the headline reads are the extremes, and the world's mean is over every player (order ${fold.rows.map((r) => r.nation).join(",")}, strongest ${fold.strongest?.nation}, deepest ${fold.deepest?.nation}, world ${fold.worldAvg}, ${fold.nations} nations / ${fold.players} players)`,
  fold.rows[0].nation === "Brazil" && fold.rows[1].nation === "Spain" && fold.rows[2].nation === "Japan" &&
  fold.strongest?.nation === "Brazil" && fold.deepest?.nation === "Brazil" &&
  fold.worldAvg === 79.83 && fold.nations === 3 && fold.players === 6);

// The best player's NAME is carried, so a row can point at a person.
ok(`each row carries its best player's name for the row to point at (Brazil -> ${fold.rows.find((r) => r.nation === "Brazil").bestName})`,
  fold.rows.find((r) => r.nation === "Brazil").bestName === "P b1");

// A blank nation is a record skipped, not an empty row; the empty world reads empty.
const blank = talentMap([...players, p("x1", "", 60)]);
const empty = talentMap([]);
ok(`a blank nation is skipped rather than an empty row, and an empty world reads empty (rows with blank ${blank.rows.length}, empty ${empty.rows.length}/${empty.strongest === null}/${empty.worldAvg})`,
  blank.rows.length === 3 && blank.players === 7 &&
  empty.rows.length === 0 && empty.strongest === null && empty.deepest === null && empty.worldAvg === 0 && empty.nations === 0);

// A full tie falls to the name, so two equal nations never reorder between runs.
const tie = talentMap([p("t1", "Zed", 85), p("t2", "Alpha", 85)]);
ok(`a full tie falls to the nation name (of Zed/Alpha the first is ${tie.rows[0].nation})`,
  tie.rows.length === 2 && tie.rows[0].nation === "Alpha" && tie.rows[1].nation === "Zed");

// The screen reads the catalogue and every key is trilingual with agreeing placeholders.
const screen = readFileSync(join(process.cwd(), "features/nations/TalentMap.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\("(nat\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
const nav = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const route = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
ok(`the screen's ${keys.length} labels and the nav entry are dictionary keys in all three locales with agreeing placeholders, and the route is mounted (${keys.join(",")})`,
  keys.length >= 10 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))) &&
  nav.includes('to: "/nations"') && route.includes('path === "/nations"') &&
  locales.every((l) => typeof D[l]["nav.nations"] === "string"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
