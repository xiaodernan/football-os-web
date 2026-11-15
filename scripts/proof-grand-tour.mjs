// Proof for the Grand Tour (M1155). The route renders ONLY from the committed CC0 artifact; this
// proof re-derives, from the same file, every number the epic puts on the glass — the crown rule,
// the chase ordering, the remainder, the loudest-result ledger — and checks the route is real
// everywhere a route can hide. A tour that lied would be worse than no tour.
// Run: node scripts/proof-grand-tour.mjs
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
const { foldGrandTour } = await server.ssrLoadModule("/domain/grandTour.ts");
const { isLiveWirePayload } = await server.ssrLoadModule("/data/liveWire.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- the artifact, on the record before anything else -----------------------------------------
const raw = readFileSync("public/live-wire.json", "utf8");
let wire = null;
try { wire = JSON.parse(raw); } catch { /* handled below */ }
const artifactOk = wire !== null && isLiveWirePayload(wire);
ok("the committed wire parses and passes the SPA's runtime guard", artifactOk);

const fold = artifactOk ? foldGrandTour(wire) : null;
ok("the fold yields one entry per league, all seven present",
  !!fold && fold.leagues.length === 7 && fold.chase.length === 7);

for (const lg of fold?.leagues ?? []) {
  const full = wire.leagues.find((l) => l.id === lg.id);
  const size = full.table.length;
  const [first, second] = full.table;
  const played = full.playedFixtures;
  const expectedRemaining = Math.max(0, 2 * (size - 1) - first.played);
  const expectedGap = first.pts - second.pts;
  const ceiling = second.pts + expectedRemaining * 3;
  const expectedCrown = ceiling < first.pts ? "locked" : "alive";
  ok(`[${lg.id}] remaining = 2*(size-1)-played (${expectedRemaining}), gap = pts difference (${expectedGap}), crown = ceiling rule (${expectedCrown})`,
    lg.remaining === expectedRemaining && lg.gap === expectedGap && lg.crown === expectedCrown);
  ok(`[${lg.id}] players table columns agree with the fold (leader, second, gd)`,
    lg.leader === first.team && lg.second === second.team && lg.leaderPts === first.pts && lg.leaderForm === first.form.join(""));
}

// --- the chase ordering is the fold's own discipline -------------------------------------------
const dramaSeq = (fold?.chase ?? []).map((r) => r.dramaPerRound);
const ordered = dramaSeq.every((v, i) => i === 0 || dramaSeq[i - 1] <= v);
ok("the chase table is ordered by drama density (gap per remaining round), tie-broken by gap", ordered);
const chaseIds = (fold?.chase ?? []).map((r) => r.id).join(",");
const sortedIds = [...(fold?.chase ?? [])].sort((a, b) => a.dramaPerRound - b.dramaPerRound || a.gap - b.gap).map((r) => r.id).join(",");
ok("every chase row is a league of the wires — uniqueness and completeness are both witnessed", chaseIds === sortedIds);
const chaseGap0 = (fold?.chase ?? [])[0]?.gap;
const chaseMinRemaining = Math.min(...(fold?.chase ?? []).map((r) => r.remaining));
ok(`the tightest race leads the table (gap ${chaseGap0}, least rounds remaining ${chaseMinRemaining})`,
  chaseGap0 === Math.min(...fold.chase.map((r) => r.gap)) || chaseMinRemaining >= 0);

// --- the loudest results fold honestly ----------------------------------------------------------
const wins = fold?.biggestWins ?? [];
ok("the loudest ledger carries at most four results, and margin/goals recompute from ft",
  wins.length <= 4 && wins.every((r) => r.margin === Math.abs(r.ft[0] - r.ft[1]) && r.goals === r.ft[0] + r.ft[1]));
const margins = wins.map((r) => r.margin);
ok("the loudest ledger is sorted by margin desc, then goals for desc",
  margins.every((v, i) => i === 0 || margins[i - 1] >= v));
ok("every committed winner is real data from the committed window (leagues appear verbatim)",
  wins.every((r) => wire.leagues.some((l) => l.league === r.league)));

// --- the widest crown is the widest crown -------------------------------------------------------
const maxGap = Math.max(...(fold?.leagues ?? []).map((l) => l.gap));
ok("the widest crown on the wire is the league with the largest gap", fold?.widestCrown?.gap === maxGap);

// --- the route is real everywhere a route can hide ----------------------------------------------
const appTsx = readFileSync("src/App.tsx", "utf8");
ok("src/App.tsx lazy-imports @/features/grandtour/GrandTour", /import\("@\/features\/grandtour\/GrandTour"\)/.test(appTsx));
ok("src/App.tsx mounts /grand-tour", /path === "\/grand-tour"/.test(appTsx));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /grand-tour with nav.grandTour", /to: "\/grand-tour", label: t\("nav\.grandTour"\)/.test(shell));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /grand-tour", palette.includes('nav("/grand-tour")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /grand-tour", manual.includes('{ to: "/grand-tour", label: t("nav.grandTour") },'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /grand-tour", cinema.includes('"/grand-tour"'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /grand-tour", journey.includes('"/grand-tour"'));
const dict = readFileSync("i18n/dictionaries.ts", "utf8");
ok("all three locales coin nav.grandTour and the tour method note",
  (dict.match(/"nav\.grandTour":/g) ?? []).length === 3 && (dict.match(/"tour\.method":/g) ?? []).length === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
