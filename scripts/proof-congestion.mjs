// M1232 · The Congested Calendar: proof for the fixture spacing fold.
// Run: node scripts/proof-congestion.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

// A private cacheDir and no dep discovery: a read-only census must not race a concurrent build
// or the dep scanner.
const cacheDir = join(tmpdir(), `football-os-proof-congestion-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/congestion.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const { fixtureCongestion, THREE_CROWDED_DAYS } = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

const club = (id) => ({ id, name: id.toUpperCase(), short: id.toUpperCase(), competitionId: "c1", nation: "x", overall: 70, colors: ["#111", "#222"], stadium: "s" });
const at = (day, hour = 12) => `2026-08-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`;
const game = (id, homeId, awayId, kickoff) => ({ id, competitionId: "c1", homeClubId: homeId, awayClubId: awayId, kickoff, round: 1, status: "FINISHED", homeGoals: 1, awayGoals: 0 });

// The hand-counted world: A turns around in 2 and 6 days, B in 4 and 1, C has a single fixture.
// Each filler club appears in exactly one match, so only A and B have a spacing to read.
const clubs = [club("a"), club("b"), club("c")];
for (let i = 1; i <= 11; i++) clubs.push(club("d" + i));
const matches = [
  game("m1", "a", "d1", at(1, 15)),
  game("m2", "a", "d2", at(3, 20)),
  game("m3", "a", "d3", at(10)),
  game("m4", "b", "d4", at(2)),
  game("m5", "b", "d5", at(6)),
  game("m6", "b", "d6", at(7)),
  game("m7", "c", "d7", at(5)),
];
const fold = fixtureCongestion(matches, clubs);

ok(`the hand-counted world reads A 2/4.00/1 and B 1/2.50/1, and C with one fixture takes no row (rows ${fold.rows.map((r) => `${r.clubId}:${r.minRest}/${r.avgRest}/${r.crowded}`).join(", ")})`,
  fold.rows.length === 2 &&
  fold.rows.find((r) => r.clubId === "a").minRest === 2 && fold.rows.find((r) => r.clubId === "a").avgRest === 4 &&
  fold.rows.find((r) => r.clubId === "a").crowded === 1 &&
  fold.rows.find((r) => r.clubId === "b").minRest === 1 && fold.rows.find((r) => r.clubId === "b").avgRest === 2.5 &&
  fold.rows.find((r) => r.clubId === "b").crowded === 1);

ok(`rows rank tightest-first and the world's mean is over every gap walked (order ${fold.rows.map((r) => r.clubId).join(",")}, tightest ${fold.tightest?.clubId}, leagueAvg ${fold.leagueAvg}, gaps ${fold.gaps})`,
  fold.rows[0].clubId === "b" && fold.rows[1].clubId === "a" &&
  fold.tightest?.clubId === "b" && fold.leagueAvg === 3.25 && fold.gaps === 4);

// The whole-day floor: 1 day 5 hours is a 1-day turn, not a 2-day one.
const hours = fixtureCongestion([game("h1", "a", "d8", at(1, 15)), game("h2", "a", "d9", at(2, 20))], clubs);
ok(`a turnaround is whole days — 1 day 5 hours reads 1, not 2 (${hours.rows.find((r) => r.clubId === "a")?.minRest})`,
  hours.rows.find((r) => r.clubId === "a")?.minRest === 1);

// The three-day boundary is exact.
const edge = fixtureCongestion([
  game("e1", "a", "d8", at(1)), game("e2", "a", "d9", at(4)), game("e3", "a", "d10", at(8)),
  game("e4", "b", "d11", at(1)), game("e5", "b", "d1", at(5)),
], clubs);
ok(`a three-day turn counts as crowded and a four-day one does not (A ${edge.rows.find((r) => r.clubId === "a")?.crowded}, B ${edge.rows.find((r) => r.clubId === "b")?.crowded}, threshold ${THREE_CROWDED_DAYS})`,
  edge.rows.find((r) => r.clubId === "a")?.crowded === 1 && edge.rows.find((r) => r.clubId === "b")?.crowded === 0);

// The empty world and the unreadable kickoff.
const empty = fixtureCongestion([], clubs);
const badKick = fixtureCongestion([game("x1", "a", "d2", ""), game("x2", "b", "d3", at(2)), game("x3", "b", "d4", at(6))], clubs);
ok(`an empty world reads empty rather than NaN, and an unreadable kickoff is a record skipped — its club takes no row from it (empty ${empty.rows.length}/${empty.tightest === null}/${empty.leagueAvg}/${empty.gaps}, bad-kick rows ${badKick.rows.map((r) => r.clubId).join(",")})`,
  empty.rows.length === 0 && empty.tightest === null && empty.leagueAvg === 0 && empty.gaps === 0 &&
  badKick.rows.length === 1 && badKick.rows[0].clubId === "b" && badKick.rows[0].fixtures === 2);

// A full tie falls to the id, so two equally-congested clubs never reorder between runs.
const tie = fixtureCongestion([
  game("t1", "a", "d5", at(1)), game("t2", "a", "d6", at(4)),
  game("t3", "b", "d7", at(1)), game("t4", "b", "d8", at(4)),
], clubs);
ok(`a full tie falls to the club id (of a/b the first is ${tie.rows[0].clubId})`,
  tie.rows.length === 2 && tie.rows[0].clubId === "a" && tie.rows[1].clubId === "b");

// The screen reads the catalogue and every key is trilingual with agreeing placeholders.
const screen = readFileSync(join(process.cwd(), "features/congestion/CongestedCalendar.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\("(con\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
const nav = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const route = readFileSync(join(process.cwd(), "src/App.tsx"), "utf8");
const vars = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
ok(`the screen's ${keys.length} labels and the nav entry are dictionary keys in all three locales with agreeing placeholders, and the route is mounted (${keys.join(",")})`,
  keys.length >= 10 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))) &&
  nav.includes('to: "/congestion"') && route.includes('path === "/congestion"') &&
  locales.every((l) => typeof D[l]["nav.congestion"] === "string"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
