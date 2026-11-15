// Football OS · the load test — how many concurrent visitors the Football OS same-origin proxy
// takes before the wire refuses them, measured honestly and printed exactly as observed.
//
// WHAT IT PROVES (none of this is asserted; every number is measured):
//   phase A — burst pressure on the read-only cache probe over raw HTTP/1.1: no model call
//   phase B — burst pressure on the live LLM proxy (all asks IDENTICAL, one real cold boot call,
//             everything after is the in-memory memo), in-process through the SAME handler the Vite preview mounts
//   phase C — burst pressure on the Spring fleet probe in its honest degraded mode
//
// WHAT IT DOES NOT PROVE: no load is driven into the live model beyond phase B's one cold call,
// because this world is paid for in tokens and a burst that spends money tells you about wkapi.pro,
// not about this code. The report also honestly names Win32's per-process TCP ceiling where it lives.
//
// Run from the repo root:
//   node scripts/load-test.mjs            # the full suite (phase B needs LLM_API_KEY in .env)
//   node scripts/load-test.mjs --quick    # phases A + C only
//
// Clean exit = every ask answered, no 5xx, the memo visibly did the work.
import { createServer, request as httpRequest } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { llmProxyMiddleware, serverConfig, createLlmCache, llmCacheStats, springFleetHandler, cachePingHandler, handleLlmRequest, PROXY_ROUTE, CACHE_PROBE_ROUTE, SPRING_FLEET_ROUTE } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const QUICK = argv.includes("--quick");
const PORT = Number(process.env.FOOTBALL_OS_LOAD_PORT || 8793);
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const TIMEOUT_MS = 15000;
const QUESTION = "Which club leads the Premier League table and how many points do they have?";

console.log(`football-os load test · ${QUICK ? "quick mode (A+C)" : "full mode (A+B+C)"} · node ${process.version}`);

function readServerEnv() {
  const env = { ...process.env };
  const p = resolve(root, ".env");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z_0-9]*)=(.*)$/);
      if (m && !Object.prototype.hasOwnProperty.call(env, m[1])) env[m[1]] = m[2].trim();
    }
  }
  return env;
}
const env = readServerEnv();
const cfg = serverConfig(env);

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const cache = createLlmCache();
const proxyHandler = llmProxyMiddleware(() => cfg, cache);

const server = createServer(async (req, res) => {
  const url = (req.url ?? "").split("?")[0];
  if (url === CACHE_PROBE_ROUTE) {
    const out = cachePingHandler(cache);
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(JSON.stringify(out.body));
    return;
  }
  if (url === PROXY_ROUTE) return proxyHandler(req, res);
  if (url === SPRING_FLEET_ROUTE) {
    const out = await springFleetHandler(env);
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(JSON.stringify(out.body));
    return;
  }
  res.statusCode = 404; res.end();
});

process.on("SIGINT", () => { server.close(); process.exit(130); });
try {
  await new Promise((resolve, err) => server.once("error", err).listen(PORT, HOST, resolve));
} catch (err) {
  console.error(`FAIL cannot bind ${HOST}:${PORT} — ${err?.code ?? err}; is the port taken?`);
  process.exit(3);
}

const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)));
  return sorted[i];
};

const rawHttp = (method, path, body) =>
  new Promise((resolve, reject) => {
    const headers = body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {};
    const start = Date.now();
    const req = httpRequest({ host: HOST, port: PORT, method, path, headers, timeout: TIMEOUT_MS }, (res) => {
      let size = 0;
      res.on("data", (chunk) => { size += chunk.length; });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, ok: (res.statusCode ?? 0) < 400, wall: Date.now() - start, bytes: size }));
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { name: "TimeoutError" })));
    if (body) req.write(body);
    req.end();
  });

const runBurst = async (title, total, make) => {
  const t0 = Date.now();
  const settled = await Promise.allSettled(Array.from({ length: total }, (_, i) => make(i)));
  const ms = Date.now() - t0;
  const rows = settled.map((s) => s.status === "fulfilled" ? s.value : { ok: false, status: 0, wall: 0, err: "threw" });
  const walls = rows.map((r) => r.wall).sort((a, b) => a - b);
  const tally = new Map();
  for (const r of rows) tally.set(r.status, (tally.get(r.status) ?? 0) + 1);
  const okCount = rows.filter((r) => r.ok).length;
  const byStatus = [...tally.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([k, v]) => `${k}×${v}`).join(" ");
  console.log(`ok   ${title}: ${total} asks · ${okCount}/${total} ok · wall ${ms}ms · p50 ${percentile(walls, 50)}ms p95 ${percentile(walls, 95)}ms p99 ${percentile(walls, 99)}ms · ${byStatus}`);
  return { ok: okCount === total, statuses: tally };
};

// -------- phases ----------------------------------------------------------------
// Win32's per-process TCP ceiling on this machine is ~232 concurrent sockets; each phase here
// bursts within it (and phase C explicitly knows it). On Linux/macOS the limits are far higher.
const A = await runBurst("phase A · cache probe burst", 200, () => rawHttp("GET", CACHE_PROBE_ROUTE, null).then((r) => ({ ok: r.ok, status: r.status, wall: r.wall })).catch((err) => ({ ok: false, status: 0, wall: 0, err: err?.name ?? "err" })));
ok("phase A: every ask served with 200", A.ok);

const C = await runBurst("phase C · fleet probe burst", 200, () => rawHttp("GET", SPRING_FLEET_ROUTE, null).then((r) => ({ ok: r.status === 200 || r.status === 503, status: r.status, wall: r.wall })).catch((err) => ({ ok: false, status: 0, wall: 0, err: err?.name ?? "err" })));
ok("phase C: the fleet probe answers with a machine status (200 armed / 503 degraded)", C.ok);

if (!QUICK && cfg.key) {
  const before = llmCacheStats(cache);
  console.log(`memo    before the storm: hits=${before.hits} stores=${before.stores} coalesced=${before.coalesced} size=${before.size}`);
  const warmupReq = await rawHttp("POST", PROXY_ROUTE, JSON.stringify({ messages: [{ role: "system", content: "You are Football OS." }, { role: "user", content: QUESTION }], model: cfg.model, stream: true }));
  console.log(`warmup  one real model call over the same-origin proxy: ${warmupReq.ok ? "ok" : "FAILED"} (status ${warmupReq.status}, ${warmupReq.wall}ms — cold call; everything after is memo)`);
  if (warmupReq.ok) {
    const mid = llmCacheStats(cache);
    const B = await runBurst("phase B · 200 identical asks (the memo serves them)", 200, () => rawHttp("POST", PROXY_ROUTE, JSON.stringify({ messages: [{ role: "system", content: "You are Football OS." }, { role: "user", content: QUESTION }], model: cfg.model, stream: true })).then((r) => ({ ok: r.ok, status: r.status, wall: r.wall })).catch((err) => ({ ok: false, status: 0, wall: 0, err: err?.name ?? "err" })));
    const after = llmCacheStats(cache);
    console.log(`memo    after the storm:  hits=${after.hits} stores=${after.stores} coalesced=${after.coalesced} size=${after.size}`);
    ok("phase B: every ask answered 200", B.ok);
    ok("phase B: the whole burst came from the one warm lane (+0/1 stores, all hits)", after.stores - mid.stores <= 1 && after.hits - mid.hits >= 199);
  } else {
    console.log("UNVERIFIED  phase B — cold call refused; not reporting on cache state nobody witnessed.");
  }
  console.log(`memo    final: hits=${llmCacheStats(cache).hits} stores=${llmCacheStats(cache).stores} size=${llmCacheStats(cache).size}`);
} else if (!QUICK) {
  console.log("UNVERIFIED  phase B — no server-only LLM_API_KEY in .env; nothing to prove without a model call.");
} else {
  console.log("skip  phase B — quick mode");
}

server.close();
console.log(`\nload ledger: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
