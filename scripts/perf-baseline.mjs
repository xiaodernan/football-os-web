// M460's baseline, finished as a gate (M462). What the app costs to ship and what the simulation
// engines cost to run — measured, pinned, and REFUSED when it regresses. The first version of
// this file only recorded a baseline and overwrote it on every run, so it could never fail; this
// one carries ceilings.
//
// The claims, each a number with a ceiling:
//   1. The bundle ships inside its recorded gzip baseline (tests/perf/baseline.json — the first
//      run records, every later run must stay inside it; growth is a decision, not a drift).
//   2. A full world season and a single match simulate inside their caps. The caps are generous
//      on purpose: they catch an order-of-magnitude regression, not a noisy 10% wobble.
//   3. The engines are deterministic no matter how the work is scheduled: a batch run at any
//      concurrency (PERF_CONCURRENCY, default 4) answers exactly what the serial run answers.
//      Performance work must not be able to change a result — that is the invariant here.
// Run: node scripts/perf-baseline.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASELINE_FILE = "tests/perf/baseline.json";
const WORLD_CAP_MS = 400;
const MATCH_CAP_MS = 15;

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// ---- 1. The bundle against its recorded baseline. ----------------------------------------------
const assetsDir = "dist/assets";
let jsGzip = 0, cssGzip = 0, files = 0;
if (existsSync(assetsDir)) {
  for (const f of readdirSync(assetsDir)) {
    if (!f.endsWith(".js") && !f.endsWith(".css")) continue;
    const g = gzipSync(readFileSync(`${assetsDir}/${f}`)).length;
    if (f.endsWith(".js")) jsGzip += g; else cssGzip += g;
    files++;
  }
}
const totalKb = Math.round((jsGzip + cssGzip) / 1024);
let baselines = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, "utf8")) : {};
const recorded = typeof baselines.build?.totalGzipKB === "number" ? baselines.build.totalGzipKB : null;
if (recorded === null) {
  baselines.build = {
    recordedAt: new Date().toISOString().slice(0, 10),
    totalGzipKB: totalKb,
    jsGzipKB: Math.round(jsGzip / 1024),
    cssGzipKB: Math.round(cssGzip / 1024),
    fileCount: files,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(baselines, null, 2) + "\n");
  console.log(`     (gzip baseline recorded: ${totalKb} KB — later runs must stay inside it)`);
}
ok(`the bundle ships inside its recorded gzip baseline (${totalKb} KB across ${files} assets; baseline ${baselines.build.totalGzipKB} KB, recorded ${baselines.build.recordedAt})`,
  files >= 20 && totalKb <= baselines.build.totalGzipKB);

// ---- 2 & 3. The engines: timing, concurrency, determinism. ---------------------------------------
const server = await createServer({
  cacheDir: join(tmpdir(), `perf-baseline-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { runWorld } = await server.ssrLoadModule("/domain/worldEngine.ts");
const { simulateMatch } = await server.ssrLoadModule("/domain/matchEngine.ts");
const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");

const base = {
  players: [...footballProvider.players()],
  clubs: [...footballProvider.clubs()],
  competitions: [...footballProvider.competitions()],
};
const t0 = performance.now();
const world = runWorld(base, 1);
const worldMs = performance.now() - t0;
ok(`a full world season simulates inside the cap (${worldMs.toFixed(1)} ms, cap ${WORLD_CAP_MS} ms)`,
  worldMs < WORLD_CAP_MS && !!world);

const team = (name, bias) => ({
  name,
  overall: 80,
  attack: 80,
  midfield: 80,
  defense: 80,
  possessionBias: bias,
  press: 0.5,
  tempo: 0.5,
  fatigue: 0,
  morale: 0,
});
const matchInput = (seed) => ({ seed, home: team("Home", 0.6), away: team("Away", 0.4) });

const m0 = performance.now();
const match = simulateMatch(matchInput("perf-baseline"));
const matchMs = performance.now() - m0;
ok(`a match simulates inside the cap (${matchMs.toFixed(2)} ms, cap ${MATCH_CAP_MS} ms)`,
  matchMs < MATCH_CAP_MS && !!match);

// The batch: a configurable width (PERF_CONCURRENCY), and the invariant that scheduling cannot
// change a result — the same seeds answer the same matches serial or batched.
const CONCURRENCY = Math.max(1, Number(process.env.PERF_CONCURRENCY ?? 4));
const scoreline = (r) => `${r.homeGoals}-${r.awayGoals}`;
const SEEDS = Array.from({ length: 24 }, (_, i) => `perf-batch-${i}`);
const serial = SEEDS.map((s) => simulateMatch(matchInput(s)));
const serialKey = JSON.stringify(serial.map((r) => scoreline(r)));
const batched = [];
const b0 = performance.now();
for (let i = 0; i < SEEDS.length; i += CONCURRENCY) {
  const chunk = SEEDS.slice(i, i + CONCURRENCY).map((s) => Promise.resolve().then(() => simulateMatch(matchInput(s))));
  batched.push(...(await Promise.all(chunk)));
}
const batchMs = performance.now() - b0;
ok(`the batch answers what the serial run answers at width ${CONCURRENCY} (${SEEDS.length} matches in ${batchMs.toFixed(1)} ms, identical ${JSON.stringify(batched.map((r) => scoreline(r))) === serialKey})`,
  JSON.stringify(batched.map((r) => scoreline(r))) === serialKey && batched.length === SEEDS.length);

// And the engine is still deterministic across repeated calls: the same seed is the same match.
const repeat = simulateMatch(matchInput("perf-baseline"));
ok(`the engine is deterministic — the same seed replays the same match (${scoreline(match)} twice)`,
  JSON.stringify(repeat) === JSON.stringify(match));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
