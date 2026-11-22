// M1239 · The cache-service live wire — the FIRST offline proof of the Spring cache-service probe.
// The service carries TWO caches (the league summary and the league tables read-through), so the
// wire reads BOTH /stats endpoints. This proof is offline-deterministic: it stubs the global
// fetch with a recorder, so the arms below prove wiring and degrade semantics — never the
// network. The live service path is a booted service's job, not this proof's.
//
// Run: node scripts/proof-cache-wire.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const PROXY = await import(pathToFileURL(join(root, "scripts/llm-proxy.mjs")).href);
const { cacheServiceMiddleware, CACHE_SERVICE_ROUTE } = PROXY;

const GOOD_STATS = { requests: 12, hits: 10, misses: 2, hitRate: 83.33, originLoads: 2, coalesced: 1 };
const GOOD_TABLES = { requests: 7, hits: 6, misses: 1, hitRate: 85.71, originLoads: 1, coalesced: 0 };
const SENTINEL = "sentinel-cache-host.local";

// A fetch recorder: routes by path, records every call, and can fail in every documented way.
const installFetch = (arms) => {
  const calls = [];
  let inFlight = 0;
  let maxInFlight = 0;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    calls.push(u);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      await new Promise((r) => setTimeout(r, arms.delayMs ?? 0));
      const arm = u.includes("/actuator/health") ? arms.health
        : u.includes("/cache/league/table/stats") ? arms.tables
        : arms.summary;
      if (arm === "throw") throw new Error("boom");
      if (arm === "abort") { const e = new Error("aborted"); e.name = "AbortError"; throw e; }
      if (arm === "badshape") return { ok: true, json: async () => { throw new Error("not json"); } };
      const status = typeof arm === "number" ? arm : 200;
      const body = typeof arm === "object" && arm !== null ? arm : GOOD_STATS;
      return { ok: status >= 200 && status < 300, status, json: async () => body };
    } finally {
      inFlight--;
    }
  };
  return { calls, peak: () => maxInFlight };
};

const runRoute = async (env) => {
  const mw = cacheServiceMiddleware(env);
  return await new Promise((done) => {
    const req = { url: CACHE_SERVICE_ROUTE, method: "GET" };
    const res = {
      statusCode: 0,
      setHeader: () => {},
      end: (body) => done({ statusCode: res.statusCode, body: body ? JSON.parse(body) : null }),
    };
    mw(req, res, () => done({ calledNext: true }));
  });
};

const realFetch = globalThis.fetch;
const base = `http://${SENTINEL}:8083`;

// 1 · the route constant
ok(`CACHE_SERVICE_ROUTE is exactly /api/cache/service`, CACHE_SERVICE_ROUTE === "/api/cache/service");

// 2 · unconfigured: 503, fetch NOT called, both censuses null
{
  const rec = installFetch({ health: 200, summary: GOOD_STATS, tables: GOOD_TABLES });
  const out = await runRoute({});
  ok(`unconfigured answers 503 + unconfigured and never dials (${out.statusCode} ${out.body?.reason}, ${rec.calls.length} calls)`,
    out.statusCode === 503 && out.body?.ok === false && out.body?.reason === "unconfigured" &&
    out.body?.stats === null && out.body?.tables === null && rec.calls.length === 0);
}

// 3 · health down: 503 + upstream_down
{
  const rec = installFetch({ health: 503, summary: GOOD_STATS, tables: GOOD_TABLES });
  const out = await runRoute({ CACHE_SERVICE_BASE: base });
  ok(`a down health endpoint answers 503 + upstream_down and stops there (${out.statusCode} ${out.body?.reason}, ${rec.calls.length} calls)`,
    out.statusCode === 503 && out.body?.reason === "upstream_down" && rec.calls.length === 1);
}

// 4 · both good: 200 with BOTH censuses carried, and the two stats legs ran in parallel
{
  const rec = installFetch({ health: 200, summary: GOOD_STATS, tables: GOOD_TABLES, delayMs: 30 });
  const out = await runRoute({ CACHE_SERVICE_BASE: base });
  ok(`both caches healthy answers 200 with the summary AND the tables censuses (${out.statusCode}, requests ${out.body?.stats?.requests}/${out.body?.tables?.requests}, hit-rate ${out.body?.stats?.hitRate}/${out.body?.tables?.hitRate})`,
    out.statusCode === 200 && out.body?.ok === true && out.body?.service === "football-os-cache" &&
    out.body?.stats?.requests === 12 && out.body?.tables?.requests === 7 && rec.calls.length === 3);
  ok(`the two stats legs run in PARALLEL — the wall clock is the slowest leg, not the sum (peak in-flight ${rec.peak()})`,
    rec.peak() >= 2);
}

// 5 · an honest partial: the tables leg 500s, the summary still reads
{
  installFetch({ health: 200, summary: GOOD_STATS, tables: 500 });
  const out = await runRoute({ CACHE_SERVICE_BASE: base });
  ok(`a tables leg that 500s is carried as null while the summary still reads (tables ${out.body?.tables}, stats ${out.body?.stats?.requests})`,
    out.statusCode === 200 && out.body?.tables === null && out.body?.stats?.requests === 12);
}

// 6 · a bad-shape leg is null, not a crash
{
  installFetch({ health: 200, summary: "badshape", tables: GOOD_TABLES });
  const out = await runRoute({ CACHE_SERVICE_BASE: base });
  ok(`a leg whose body will not parse reads null rather than crashing the probe (stats ${out.body?.stats}, tables ${out.body?.tables?.requests})`,
    out.statusCode === 200 && out.body?.stats === null && out.body?.tables?.requests === 7);
}

// 7 · the two failure shapes
{
  installFetch({ health: "abort", summary: GOOD_STATS, tables: GOOD_TABLES });
  const aborted = await runRoute({ CACHE_SERVICE_BASE: base });
  ok(`an aborted leg answers 503 + timeout (${aborted.statusCode} ${aborted.body?.reason})`,
    aborted.statusCode === 503 && aborted.body?.reason === "timeout");
}
{
  installFetch({ health: "throw", summary: GOOD_STATS, tables: GOOD_TABLES });
  const thrown = await runRoute({ CACHE_SERVICE_BASE: base });
  ok(`an unreachable service answers 503 + unreachable (${thrown.statusCode} ${thrown.body?.reason})`,
    thrown.statusCode === 503 && thrown.body?.reason === "unreachable");
}

// 8 · the envelope never echoes the configured base (sentinel zero-echo)
{
  installFetch({ health: 200, summary: GOOD_STATS, tables: GOOD_TABLES });
  const out = await runRoute({ CACHE_SERVICE_BASE: base });
  const raw = JSON.stringify(out.body);
  ok(`the response never echoes the configured base URL (sentinel present: ${raw.includes(SENTINEL)})`,
    !raw.includes(SENTINEL) && !raw.includes("8083"));
}

// 9 · the middleware contract: 405 for non-GET, next() for other routes
{
  const mw = cacheServiceMiddleware({ CACHE_SERVICE_BASE: base });
  let mwRes = null;
  await new Promise((done) => {
    const req = { url: CACHE_SERVICE_ROUTE, method: "POST" };
    const res = { statusCode: 0, setHeader: () => {}, end: (body) => { mwRes = { statusCode: res.statusCode, body }; done(); } };
    mw(req, res, () => { mwRes = { calledNext: true }; done(); });
  });
  ok(`the middleware refuses non-GET with 405 + Allow: GET (${mwRes?.statusCode})`, mwRes?.statusCode === 405);
  let nextCalled = false;
  await new Promise((done) => {
    const req = { url: "/elsewhere", method: "GET" };
    const res = { statusCode: 0, setHeader: () => {}, end: () => done() };
    mw(req, res, () => { nextCalled = true; done(); });
  });
  ok(`the middleware passes other routes to next()`, nextCalled === true);
}

// 10 · the Java side really exposes the second stats route
const tablesCtl = read("services/cache-service/src/main/java/com/footballos/cache/LeagueTablesController.java");
ok(`the cache-service really exposes the tables stats route the wire reads (${/table\/stats/.test(tablesCtl)})`,
  /@GetMapping\((?:\s*")?\/?stats/.test(tablesCtl) && /\/table\/stats/.test(read("scripts/llm-proxy.mjs")));

// 11 · the screen reads BOTH censuses now
const screen = read("features/cache/CacheObservatory.tsx");
ok(`the observatory reads and renders both censuses (tables in state: ${screen.includes("body?.tables")}, rendered: ${screen.includes("live.tables")}, labels: ${screen.includes("cache.springLiveTables")})`,
  screen.includes("body?.tables ?? null") && screen.includes("live.tables") && screen.includes("t(\"cache.springLiveTables\")"));

// 12 · the d.mts still aligns
const DMTS = read("scripts/llm-proxy.d.mts");
ok(`the .d.mts exports align with the runtime (${["CACHE_SERVICE_ROUTE", "cacheServiceMiddleware"].filter((s) => DMTS.includes(s)).length}/2)`,
  DMTS.includes("CACHE_SERVICE_ROUTE") && DMTS.includes("cacheServiceMiddleware"));

globalThis.fetch = realFetch;
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
