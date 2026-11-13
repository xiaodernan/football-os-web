import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

// M1104: the Spring fleet probe — ONE same-origin route (/api/spring/fleet) that reads SEVEN
// server-only env vars (SPRING_<ID>_BASE), probes each armed service's /actuator/health in PARALLEL
// (1.2s abort per probe), and NEVER echoes a base URL into the response. An unset service is reported
// as { configured: false, up: null } — the /platform panel prints "not armed", never a fabricated green.
//
// This proof stays offline: the handler accepts an injectable fetch, so the arms below use stubs —
// they prove the wiring and degrade semantics, not the network. The live reactor itself is covered by
// verify-services.mjs (run in CI on registry-healthy runners), never by this proof.

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const PROXY = await import(pathToFileURL(join(root, "scripts/llm-proxy.mjs")).href);
const { springFleetHandler, springFleetMiddleware, SPRING_FLEET_ROUTE, SPRING_FLEET_SERVICES } = PROXY;

// ── 1 · the route constant and the seven ids, bound to the descriptor ────────────────────────────
ok(`SPRING_FLEET_ROUTE is exactly /api/spring/fleet`, SPRING_FLEET_ROUTE === "/api/spring/fleet");

const SEVEN = ["registry", "config", "gateway", "league", "discipline", "cache", "messaging"];
const descriptorSource = read("domain/platform.ts");
const sevenInDescriptor = SEVEN.every((id) => new RegExp(`id: "${id}"`).test(descriptorSource));
ok(`SPRING_FLEET_SERVICES is exactly the seven descriptor ids in topological order (${Array.isArray(SPRING_FLEET_SERVICES) ? SPRING_FLEET_SERVICES.join(",") : "not an array"}); all seven appear in domain/platform.ts`,
  Array.isArray(SPRING_FLEET_SERVICES) && SPRING_FLEET_SERVICES.length === 7 &&
  SPRING_FLEET_SERVICES.join(",") === SEVEN.join(",") && sevenInDescriptor);

// ── 2 · .env.example documents the seven switches, empty, key-free ──────────────────────────────
const envExample = read(".env.example");
const sevenDocumented = SEVEN.every((id) => new RegExp(`^SPRING_${id.toUpperCase()}_BASE=$`, "m").test(envExample));
ok(`.env.example documents all seven SPRING_<ID>_BASE switches, ALL EMPTY (placeholder, never a real URL)`,
  sevenDocumented && !/SPRING_[A-Z]+_BASE=\S/m.test(envExample));

// ── 3 · unconfigured env: 503, every tile not-armed, fetch NOT called ────────────────────────────
let stubCalls = 0;
const counting = async () => { stubCalls++; return { ok: true, status: 200, json: async () => ({ status: "UP" }) }; };
const out0 = await springFleetHandler({}, counting);
ok(`an unconfigured server returns 503 + reason unconfigured — every tile not armed, stub fetch called ${stubCalls} time(s)`,
  out0.status === 503 && out0.body?.reason === "unconfigured" && out0.body?.ok === false &&
  Array.isArray(out0.body.services) && out0.body.services.length === 7 &&
  out0.body.services.every((s) => s.configured === false && s.up === null) && stubCalls === 0);

// ── 4 · all seven UP: 200, ok, reason ok, one probe per service, parallel ids in order ───────────
stubCalls = 0;
const sevenBases = Object.fromEntries(SEVEN.map((id) => [`SPRING_${id.toUpperCase()}_BASE`, `http://127.0.0.1:0/${id}`]));
const allUp = async () => { stubCalls++; return { ok: true, status: 200, json: async () => ({ status: "UP" }) }; };
const out1 = await springFleetHandler(sevenBases, allUp);
ok(`an all-UP reactor returns 200 + reason ok + seven tiles UP with numeric ms — exactly ${stubCalls} probes fired for 7 armed services`,
  out1.status === 200 && out1.body?.ok === true && out1.body?.reason === "ok" &&
  Array.isArray(out1.body?.services) && out1.body.services.length === 7 &&
  out1.body.services.every((s) => s.configured === true && s.up === true && typeof s.ms === "number" && s.ms >= 0) &&
  out1.body.services.map((s) => s.id).join(",") === SEVEN.join(",") && stubCalls === 7);

// ── 4b · the probes run in PARALLEL — seven 120ms stubs beat a sequential 840ms ────────────────
const until = async (ms) => new Promise((r) => setTimeout(r, ms));
const slowStub = async () => { await until(120); return { ok: true, status: 200, json: async () => ({ status: "UP" }) }; };
const started = Date.now();
const outParallel = await springFleetHandler(sevenBases, slowStub);
const elapsed = Date.now() - started;
ok(`the seven probes run in parallel — ${elapsed}ms elapsed for 7 × 120ms stubs (a sequential fold would take ≥840ms)`,
  elapsed < 700 && outParallel.body?.ok === true);

// ── 5 · a broker-deprived service answers Spring's honest 503: reported down, reason preserved ──
const degraded = async (url) => url.includes("messaging")
  ? { ok: false, status: 503, json: async () => ({ status: "DOWN" }) }
  : { ok: true, status: 200, json: async () => ({ status: "UP" }) };
const out2 = await springFleetHandler(sevenBases, degraded);
const messaging = out2.body?.services?.find((s) => s.id === "messaging");
ok(`a broker-deprived messaging service (Spring answers 503 + status DOWN) reads as down · status_down — the probe never editorialises (ok=${out2.body?.ok}, reason=${out2.body?.reason}, messaging up=${messaging?.up} ${messaging?.reason})`,
  out2.status === 200 && out2.body?.ok === false && out2.body?.reason === "degraded" &&
  messaging && messaging.configured === true && messaging.up === false && messaging.reason === "status_down");

// ── 6 · the network throws: down · unreachable; an AbortError maps to timeout ────────────────────
const throwsWith = (name) => async () => { const e = new Error("boom"); e.name = name; throw e; };
const out3 = await springFleetHandler(sevenBases, throwsWith("TypeError"));
const allUnreachable = out3.body?.services?.every((s) => s.up === false && s.reason === "unreachable");
ok(`a throwing fetch reports every armed tile down · unreachable — never a crash, never a partial JSON`,
  out3.status === 200 && out3.body?.ok === false && out3.body?.reason === "degraded" && allUnreachable === true);

const out4 = await springFleetHandler(sevenBases, throwsWith("AbortError"));
const allTimeout = out4.body?.services?.every((s) => s.up === false && s.reason === "timeout");
ok(`an AbortError (1.2s exceeded) maps reason=timeout — the 1.2s bound is part of the contract`,
  out4.status === 200 && out4.body?.reason === "degraded" && allTimeout === true);

// ── 7 · the response NEVER echoes a base URL (secrets stay on the server) ───────────────────────
const sentinelEnv = { ...sevenBases, SPRING_CACHE_BASE: "http://10.9.8.7:9999/super-sentinel-path" };
const out5 = await springFleetHandler(sentinelEnv, allUp);
const serialized = JSON.stringify(out5.body);
ok(`the envelope never echoes a base URL — the sentinel host and path appear ${serialized.includes("10.9.8.7") || serialized.includes("super-sentinel") ? "YES (BAD)" : "nowhere"}`,
  !serialized.includes("10.9.8.7") && !serialized.includes("super-sentinel") && !serialized.includes("9999"));

// ── 8 · middleware behaviour: 405 for non-GET, next() for foreign routes, 200 through ───────────
const mw = springFleetMiddleware(sevenBases, allUp);
let mwRes = null;
await new Promise((res) => {
  const req = { url: "/api/spring/fleet", method: "POST" };
  const r = { statusCode: 0, setHeader: () => {}, end: (body) => { mwRes = { statusCode: r.statusCode, body }; res(); } };
  mw(req, r, () => { mwRes = { calledNext: true }; res(); });
});
ok(`the middleware refuses non-GET with 405 + Allow: GET (${mwRes?.statusCode})`, mwRes?.statusCode === 405);

let nextCalled = false;
await new Promise((res) => {
  const req = { url: "/api/elsewhere", method: "GET" };
  const r = { statusCode: 0, setHeader: () => {}, end: () => res() };
  mw(req, r, () => { nextCalled = true; res(); });
});
ok(`the middleware passes foreign routes through to next()`, nextCalled === true);

let mwJson = null, mwStatus = 0;
await new Promise((res) => {
  const req = { url: "/api/spring/fleet", method: "GET" };
  const r = { statusCode: 0, setHeader: () => {}, end: (body) => { mwStatus = r.statusCode; try { mwJson = JSON.parse(body); } catch { mwJson = null; } res(); } };
  mw(req, r, () => res());
});
ok(`the GET path serves the seven tiles through the middleware (status ${mwStatus}, ok=${mwJson?.ok}, reason=${mwJson?.reason})`,
  mwStatus === 200 && mwJson?.ok === true && Array.isArray(mwJson?.services) && mwJson.services.length === 7);

// ── 9 · vite mounts the probe on BOTH dev and preview ───────────────────────────────────────────
const VITE_CFG = read("vite.config.ts");
const fleetMounts = (VITE_CFG.match(/springFleetMiddleware\(env\)/g) ?? []).length;
ok(`vite.config mounts springFleetMiddleware(env) on BOTH dev and preview (${fleetMounts} mounts)`,
  fleetMounts === 2 && /configureServer/.test(VITE_CFG) && /configurePreviewServer/.test(VITE_CFG) &&
  VITE_CFG.includes("springFleetMiddleware"));

// ── 10 · d.mts alignment ────────────────────────────────────────────────────────────────────────
const dmts = read("scripts/llm-proxy.d.mts");
const dmtsFound = ["SPRING_FLEET_ROUTE", "SPRING_FLEET_SERVICES", "springFleetHandler", "springFleetMiddleware", "SpringFleetService", "SpringFleetBody"].filter((s) => dmts.includes(s));
ok(`the .d.mts exports align with runtime (${dmtsFound.length}/6)`, dmtsFound.length === 6);

// ── 11 · the screen polls exactly once and carries the honest fallback keys ────────────────────
const screenSrc = read("features/platform/PlatformAtlas.tsx");
const fleetFetchCalls = (screenSrc.match(/\/api\/spring\/fleet/g) ?? []).length;
const totalFetchCalls = (screenSrc.match(/\bfetch\s*\(/g) ?? []).length;
ok(`the /platform screen carries exactly one fleet fetch (${fleetFetchCalls} path mention(s), ${totalFetchCalls} total fetch(es)) and the honest set of fallback keys`,
  fleetFetchCalls >= 1 && totalFetchCalls === 1 &&
  screenSrc.includes("fleetLoading") && screenSrc.includes("fleetUnconfigured") &&
  screenSrc.includes("fleetNotArmed") && screenSrc.includes("fleetUp") && screenSrc.includes("fleetDown") &&
  screenSrc.includes("fleetSummary") && screenSrc.includes("fleetBoundary"));

// ── 12 · all nine fleet keys resolve in all three dictionaries ─────────────────────────────────
const dict = read("i18n/dictionaries.ts");
const FLEET_KEYS = ["fleetTitle", "fleetHint", "fleetLoading", "fleetUnconfigured", "fleetNotArmed", "fleetUp", "fleetDown", "fleetSummary", "fleetBoundary"];
ok(`platform.fleet* resolve in all three locales`,
  FLEET_KEYS.every((k) => 3 === (dict.match(new RegExp(`"platform\\.${k}":`, "g")) || []).length));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
