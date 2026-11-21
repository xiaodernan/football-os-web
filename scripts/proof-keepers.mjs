// M1231 · The Keepers' Union: proof for the fold that names the world's goalkeepers.
// Run: node scripts/proof-keepers.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

// A private cacheDir and no dep discovery: a read-only census must not race a concurrent build
// or the dep scanner.
const cacheDir = join(tmpdir(), `football-os-proof-keepers-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/keepers.ts");
const analytics = await server.ssrLoadModule("/domain/analytics.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { keeperUnion } = m;
const { leagueWall } = analytics;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

const club = (id) => ({ id, name: id.toUpperCase(), short: id.toUpperCase(), competitionId: "c1", nation: "x", overall: 70, colors: ["#111", "#222"], stadium: "s" });
const gk = (id, clubId, overall, potential = 90) => ({ id, name: `Keeper ${id}`, position: "GK", positionGroup: "GK", age: 28, nation: "n", clubId, overall, potential, archetype: "a", value: 1_000_000, foot: "R" });
const fin = (homeId, awayId, hg, ag) => ({ id: `${homeId}-${awayId}`, competitionId: "c1", homeClubId: homeId, awayClubId: awayId, kickoff: "2026-08-01T15:00:00Z", round: 1, status: "FINISHED", homeGoals: hg, awayGoals: ag });

// The hand-counted world: A and B keep clean sheets, C keeps none. A carries two keepers.
const clubs = [club("a"), club("b"), club("c")];
const players = [gk("k1", "a", 85), gk("k2", "a", 80), gk("k3", "b", 88)];
const matches = [fin("a", "b", 0, 0), fin("a", "c", 2, 0), fin("b", "c", 1, 3)];
const fold = keeperUnion(players, clubs, matches);

ok(`the fold names one keeper per club that has one, and counts the world's keepers (rows ${fold.rows.length}: ${fold.rows.map((r) => `${r.clubId}:${r.playerId}@${r.overall}`).join(", ")}; keepers ${fold.keepers}, clubs ${fold.clubs})`,
  fold.rows.length === 2 && new Set(fold.rows.map((r) => r.clubId)).size === 2 &&
  fold.keepers === 3 && fold.clubs === 2 &&
  fold.rows.find((r) => r.clubId === "a").playerId === "k1" &&   // the 85 beats the 80
  fold.rows.find((r) => r.clubId === "b").playerId === "k3");

// The hand count: A 2/2 = 100, B 1/2 = 50, C none.
ok(`each row carries its club's hand-counted clean-sheet record (A ${fold.rows.find((r) => r.clubId === "a").cleanSheets}/${fold.rows.find((r) => r.clubId === "a").played} @ ${fold.rows.find((r) => r.clubId === "a").rate}%, B ${fold.rows.find((r) => r.clubId === "b").cleanSheets}/${fold.rows.find((r) => r.clubId === "b").played} @ ${fold.rows.find((r) => r.clubId === "b").rate}%)`,
  fold.rows.find((r) => r.clubId === "a").cleanSheets === 2 && fold.rows.find((r) => r.clubId === "a").rate === 100 &&
  fold.rows.find((r) => r.clubId === "b").cleanSheets === 1 && fold.rows.find((r) => r.clubId === "b").rate === 50);

// The sheets come from the shared wall fold, never a second sweep: every row must equal the
// wall's own row for the same club.
const wall = leagueWall(matches, clubs);
const wallByClub = new Map(wall.rows.map((r) => [r.clubId, r]));
ok(`every row's sheets are the shared wall fold's own numbers — a second sweep cannot drift from the leaders' wall board (${fold.rows.every((r) => { const w = wallByClub.get(r.clubId); return w && w.cleanSheets === r.cleanSheets && w.played === r.played && w.rate === r.rate; })})`,
  fold.rows.every((r) => { const w = wallByClub.get(r.clubId); return w && w.cleanSheets === r.cleanSheets && w.played === r.played && w.rate === r.rate; }));

// The order and the two headline reads.
ok(`rows rank by overall then the club's rate then the id, the best keeper is the first row, and the best wall is the best rate among clubs that kept a sheet (order ${fold.rows.map((r) => r.playerId).join(",")}, best ${fold.best?.playerId}@${fold.best?.overall}, bestWall ${fold.bestWall?.clubId}@${fold.bestWall?.rate})`,
  fold.rows[0].playerId === "k3" && fold.rows[1].playerId === "k1" &&
  fold.best?.playerId === "k3" && fold.bestWall?.clubId === "a" && fold.bestWall?.rate === 100);

// A club with no keeper takes no row; a world with no keepers reads empty, not crashed.
const noKeeper = keeperUnion([gk("k9", "a", 70)], clubs, matches);
const empty = keeperUnion([], clubs, matches);
const noSheets = keeperUnion(players, clubs, [fin("a", "b", 1, 1), fin("a", "c", 2, 2)]);
ok(`a club with no goalkeeper takes no row, an empty world reads empty, and a world with no clean sheets has no best wall (c-only rows ${noKeeper.rows.map((r) => r.clubId).join(",")}, empty ${empty.rows.length}/${empty.best === null}/${empty.bestWall === null}, no-sheets bestWall ${noSheets.bestWall})`,
  noKeeper.rows.length === 1 && noKeeper.rows[0].clubId === "a" &&
  empty.rows.length === 0 && empty.best === null && empty.bestWall === null &&
  noSheets.bestWall === null && noSheets.rows.every((r) => r.cleanSheets === 0));

// The tie-break is a total order: equal overall reads potential, then the id.
const tie = keeperUnion([gk("kb", "a", 85, 88), gk("ka", "a", 85, 88), gk("kc", "a", 85, 90)], [club("a")], []);
ok(`the number one is a total order — equal overall reads potential, then the id (of kb/ka@88 and kc@90 the number one is ${tie.rows[0].playerId})`,
  tie.rows.length === 1 && tie.rows[0].playerId === "kc");
const idTie = keeperUnion([gk("zz", "a", 85, 90), gk("aa", "a", 85, 90)], [club("a")], []);
ok(`a full tie falls to the id, so two equally-rated keepers never reorder between runs (${idTie.rows[0].playerId})`,
  idTie.rows[0].playerId === "aa");

// The screen reads the catalogue and every key is trilingual with agreeing placeholders.
const screen = readFileSync(join(process.cwd(), "features/keepers/KeepersUnion.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\("(keep\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
const nav = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const route = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
ok(`the screen's ${keys.length} labels and the nav entry are dictionary keys in all three locales with agreeing placeholders, and the route is mounted (${keys.join(",")})`,
  keys.length >= 10 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))) &&
  nav.includes('to: "/keepers"') && route.includes('path === "/keepers"') &&
  locales.every((l) => typeof D[l]["nav.keepers"] === "string"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
