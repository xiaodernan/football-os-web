import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

// M1098: the cache probe — a tiny read-only view of the LLM proxy's own cache, mounted on both
// dev and preview. The observatory screen fetches it for the "live wire" panel. It exposes no
// secrets, no key, no author paths — just integer counters and the seeded policy.
//
// This proof checks the handler offline (no network):
//   · the route constant and path string are exported, the handler is exported;
//   · a 405 for anything but GET; the middleware returns next() for other routes;
//   · the handler returns stats with all seven fields (hits, misses, coalesced, evictions,
//     expired, stores, size), numbers, plus the seeded policy integers (ttl/jitter/capacity/seed);
//   · the middleware is mounted on BOTH configureServer and configurePreviewServer in vite.config.ts;
//   · the d.mts exports align with the runtime exports.

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const PROXY = await import(pathToFileURL(join(root, "scripts/llm-proxy.mjs")).href);
const { cachePingHandler, cachePingMiddleware, CACHE_PROBE_ROUTE, LLM_CACHE_POLICY, createLlmCache, llmCacheStats } = PROXY;

ok(`CACHE_PROBE_ROUTE is exactly /api/cache/ping`, CACHE_PROBE_ROUTE === "/api/cache/ping");

// zeros on a brand-new cache — counters defined, all zeros, size zero
const cache = createLlmCache();
const out = cachePingHandler(cache);
ok(`a fresh cache returns 200 + the seven measured zero stats + the seeded policy (stores=${out.body?.stats?.stores}, hits=${out.body?.stats?.hits}, size=${out.body?.stats?.size})`,
  out.status === 200 && out.body?.ok === true && out.body.stats?.stores === 0 && out.body.stats?.hits === 0 && out.body.stats?.misses === 0 && out.body.stats?.coalesced === 0 && out.body.stats?.evictions === 0 && out.body.stats?.expired === 0 && out.body.stats?.size === 0 && JSON.stringify(out.body.policy) === JSON.stringify(LLM_CACHE_POLICY));

// non-GET refused by the middleware
const mw = cachePingMiddleware(cache);
let mwRes = null;
await new Promise((res) => {
  const req = { url: "/api/cache/ping", method: "POST" };
  const res_ = { statusCode: 0, setHeader: () => {}, end: (body) => { mwRes = { statusCode: res_.statusCode, body }; res(); } };
  mw(req, res_, () => { mwRes = { calledNext: true }; res(); });
});
ok(`the middleware refuses non-GET with 405 + Allow: GET (${mwRes?.statusCode})`, mwRes?.statusCode === 405);

// other routes call next()
let nextCalled = false;
await new Promise((res) => {
  const req = { url: "/elsewhere", method: "GET" };
  const res_ = { statusCode: 0, setHeader: () => {}, end: () => res() };
  mw(req, res_, () => { nextCalled = true; res(); });
});
ok(`the middleware passes non-probe routes through to next()`, nextCalled === true);

// hits one in-memory read and records a hit
cache.write("k1", { text: "t", model: "m", expiresAt: Date.now() + 60_000 }, Date.now());
cache.read("k1", Date.now());
const out2 = cachePingHandler(cache);
ok(`after one read the probe reports a real hit and stores>=1 (hits=${out2.body?.stats?.hits}, stores=${out2.body?.stats?.stores}, size=${out2.body?.stats?.size})`,
  out2.body?.stats?.hits >= 1 && out2.body?.stats?.stores >= 1 && out2.body?.stats?.size >= 1);

// vite mounts the probe on BOTH dev and preview
const VITE_CFG = read("vite.config.ts");
ok(`vite.config mounts the LLM proxy AND the cache probe on BOTH dev and preview (configureServer + configurePreviewServer × cachePingMiddleware + cacheServiceMiddleware)`,
  /configureServer/.test(VITE_CFG) && /configurePreviewServer/.test(VITE_CFG) &&
  VITE_CFG.includes("cachePingMiddleware(llmCache)") && VITE_CFG.match(/cachePingMiddleware\(llmCache\)/g).length === 2 &&
  VITE_CFG.includes("cacheServiceMiddleware(env)") && VITE_CFG.match(/cacheServiceMiddleware\(env\)/g).length === 2 &&
  /createLlmCache\(\)/.test(VITE_CFG));

// d.mts alignment
const DMTS = read("scripts/llm-proxy.d.mts");
const exportsFound = ["CACHE_PROBE_ROUTE", "CACHE_SERVICE_ROUTE", "cachePingHandler", "cachePingMiddleware", "cacheServiceMiddleware"].filter((s) => DMTS.includes(s));
ok(`the .d.mts exports align with runtime (${exportsFound.length}/5)`, exportsFound.length === 5);

// the screen carries exactly the two documented fetch calls and the full honest set of fallback keys
const screenSrc = read("features/cache/CacheObservatory.tsx");
const cachePingCalls = (screenSrc.match(/\/api\/cache\/ping/g) ?? []).length;
const cacheServiceCalls = (screenSrc.match(/\/api\/cache\/service/g) ?? []).length;
const totalFetchCalls = (screenSrc.match(/\bfetch\s*\(/g) ?? []).length;
ok(`the observatory screen carries both live-wire fetches and their keys (${cachePingCalls} ping · ${cacheServiceCalls} service · ${totalFetchCalls} total fetches)`,
  cachePingCalls >= 1 && cacheServiceCalls >= 1 && totalFetchCalls === 2 &&
  screenSrc.includes("liveWireDown") && screenSrc.includes("liveWireCount") &&
  screenSrc.includes("springLiveUnconfigured") && screenSrc.includes("springLiveDown") && screenSrc.includes("springLiveLine"));

// the i18n dictionary carries the new keys in all three locales
const dict = read("i18n/dictionaries.ts");
ok(`cache.liveWire*/springLive* resolve in all three locales`,
  [
    "cache.liveWireTitle", "cache.liveWireDown", "cache.liveWireEmpty", "cache.liveWireCount",
    "cache.springLiveTitle", "cache.springLiveHint", "cache.springLiveLoading",
    "cache.springLiveUnconfigured", "cache.springLiveDown", "cache.springLiveLine",
  ].every((k) => 3 === (dict.match(new RegExp(`"${k.replace(/\./g, "\\.")}":`, "g")) || []).length));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
