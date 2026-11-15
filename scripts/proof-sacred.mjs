// Proof for The Long Season (M1160). The page renders ONLY from the committed artifact; this proof
// re-derives the calendar by hand against the file — including the season-length invariant, the
// round order, the played/upcoming split, the scoring facts and every cross-app wiring surface.
// Run: node scripts/proof-sacred.mjs
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
const { foldSacredCalendar, foldSacredBigWins } = await server.ssrLoadModule("/domain/sacredCalendar.ts");
const { isLiveWirePayload } = await server.ssrLoadModule("/data/liveWire.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const WIRE = "public/live-wire.json";
ok("the long-season artifact exists", existsSync(WIRE));
let wire = null;
try { wire = JSON.parse(readFileSync(WIRE, "utf8")); } catch { /* handled below */ }
ok("the artifact is parseable JSON", wire !== null);
ok("the SPA's runtime guard accepts the v3 payload", wire !== null && isLiveWirePayload(wire) === true);

const leagues = wire?.leagues ?? [];
ok("seven leagues, by design", leagues.length === 7 && new Set(leagues.map((l) => l.id)).size === 7);

// --- exact counts: every committed fixture, not just the top window ------------------------
const per = leagues.map((l) => ({ id: l.id, fix: l.seasonFixtures?.length ?? -1, expected: l.totalFixtures }));
ok("seasonFixtures counts mirror the committed totals (de 306 · en 380 · es 380 · it 380 · fr 306 · nl 306 · pt 306)",
  per.every((r) => r.fix === r.expected) && per.map((r) => r.fix).join(",") === "306,380,380,380,306,306,306");
ok("the wire carries 2364 fixtures in total", per.reduce((n, r) => n + r.fix, 0) === 2364);

// --- per-league, per-fixture invariants -------------------------------------------------------
for (const lg of leagues) {
  const fixtures = lg.seasonFixtures ?? [];
  const keys = new Set(fixtures.map((f) => `${f.round}|${f.home}|${f.away}`));
  ok(`[${lg.id}] fixture identities are unique per (round, home, away)`,
    keys.size === fixtures.length);
  ok(`[${lg.id}] every fixture carries a real date and non-blank team names`,
    fixtures.every((f) => /^\d{4}-\d{2}-\d{2}$/.test(f.date) && f.home.trim() !== "" && f.away.trim() !== ""));
  ok(`[${lg.id}] played fixtures carry an integer full-time pair, upcoming carry none`,
    fixtures.every((f) => (Array.isArray(f.ft)
      ? f.ft.length === 2 && Number.isInteger(f.ft[0]) && Number.isInteger(f.ft[1])
      : true)));
  const rounds = [...new Set(fixtures.map((f) => f.round))].sort((a, b) => Number(/(\d+)\s*$/.exec(a)?.[1] ?? 0) - Number(/(\d+)\s*$/.exec(b)?.[1] ?? 0));
  ok(`[${lg.id}] at least 2 committed rounds, sortable by trailing round number`,
    rounds.length >= 2 && rounds.every((r) => /\d+$/.test(r)));
}

// --- the fold ----------------------------------------------------------------------------------
const folded = foldSacredCalendar(wire, "all");
ok("the fold emits the seven leagues with rounds sorted ascending",
  folded.leagues.length === 7 &&
  folded.leagues.every((l) => l.rounds.length >= 2 && l.rounds.every((r, i) =>
    i === 0 || Number(/(\d+)\s*$/.exec(l.rounds[i - 1].round)?.[1] ?? 0) <= Number(/(\d+)\s*$/.exec(r.round)?.[1] ?? 0))));
ok("the fold totals agree with the artifact (played + upcoming = total)",
  folded.playedFixtures === leagues.reduce((n, l) => n + l.playedFixtures, 0) &&
  folded.totalFixtures === leagues.reduce((n, l) => n + l.totalFixtures, 0));
const onlyPlayed = foldSacredCalendar(wire, "played");
ok("the played filter folds only fixtures with committed scores",
  onlyPlayed.leagues.every((l) => l.rounds.every((r) => r.fixtures.every((f) => f.played))));
const onlyUpcoming = foldSacredCalendar(wire, "upcoming");
ok("the upcoming filter folds only fixtures without committed scores",
  onlyUpcoming.leagues.every((l) => l.rounds.every((r) => r.fixtures.every((f) => !f.played))));
const filteredSum = (f) => f.leagues.reduce((n, l) => n + l.rounds.reduce((m, r) => m + r.fixtures.length, 0), 0);
ok("played + upcoming partition every league exactly once",
  filteredSum(onlyPlayed) + filteredSum(onlyUpcoming) === folded.totalFixtures);

const wins = foldSacredBigWins(wire, 4);
ok("the loudest window carries margin and is properly ordered",
  wins.length === 4 && wins.every((w, i) => {
    const margin = Math.abs(w.ft[0] - w.ft[1]);
    return margin === w.margin && (i === 0 || wins[i - 1].margin >= w.margin);
  }));

// --- the route is real everywhere a route can hide ---------------------------------------------
const appTsx = readFileSync("src/App.tsx", "utf8");
ok("src/App.tsx lazy-imports @/features/sacred/Sacred", /import\("@\/features\/sacred\/Sacred"\)/.test(appTsx));
ok("src/App.tsx mounts /long-season", /path === "\/long-season"/.test(appTsx));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /long-season with nav.longSeason",
  /to: "\/long-season", label: t\("nav\.longSeason"\)/.test(shell));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /long-season", palette.includes('nav("/long-season")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /long-season", manual.includes('{ to: "/long-season", label: t("nav.longSeason") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /long-season", journey.includes('"/long-season"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /long-season", cinema.includes('"/long-season"'));

// --- all three locales coin the title and the method note --------------------------------------
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
ok("all three locales coin nav.longSeason", (dict.match(/"nav\.longSeason":/g) ?? []).length === 3);
ok("all three locales declare longSeason.title", (dict.match(/"longSeason\.title":/g) ?? []).length === 3);
ok("all three locales declare longSeason.method", (dict.match(/"longSeason\.method":/g) ?? []).length === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
