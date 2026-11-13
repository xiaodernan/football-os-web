import { readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

// M1107: the messaging live wire — THIRD Spring live wire mounted on the dev/preview server.
// ONE same-origin route (/api/messaging/service) probes the messaging-service you arm with
// MESSAGING_SERVICE_BASE (server-only, never VITE_), reads that service's own /messaging/summary
// (whose `live` field is a real AMQP connection probe, not a self-report), and NEVER echoes a base
// URL into the response. Unset → honest "unconfigured".
//
// This proof is offline-deterministic: the handler takes an injectable fetch, so the arms below use
// stubs — they prove wiring and degrade semantics, not the network. The live broker path is the CI
// live witness's job (.github/workflows/spring-cloud-live.yml), never this proof's.

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const PROXY = await import(pathToFileURL(join(root, "scripts/llm-proxy.mjs")).href);
const { messagingServiceHandler, messagingServiceMiddleware, MESSAGING_SERVICE_ROUTE, MESSAGING_SERVICE_NAME, MESSAGING_SERVICE_ENVS } = PROXY;

const GOOD_SUMMARY = { exchange: "footballos.events", dlq: "footballos.events.dlq", shards: 8, maxAttempts: 5, binder: "rabbit", live: true };

// ── 1 · the route constant ────────────────────────────────────────────────────────────────────────
ok(`MESSAGING_SERVICE_ROUTE is exactly /api/messaging/service`, MESSAGING_SERVICE_ROUTE === "/api/messaging/service");

// ── 2 · .env.example documents the one switch, empty ─────────────────────────────────────────────
const envExample = read(".env.example");
ok(`.env.example documents MESSAGING_SERVICE_BASE == empty placeholder (the only env this wire reads)`,
  /^MESSAGING_SERVICE_BASE=$/m.test(envExample) && !/MESSAGING_SERVICE_BASE=\S/m.test(envExample) &&
  Array.isArray(MESSAGING_SERVICE_ENVS) && MESSAGING_SERVICE_ENVS.length === 1 && MESSAGING_SERVICE_ENVS[0] === "MESSAGING_SERVICE_BASE");

// ── 3 · unconfigured: 503, fetch NOT called ──────────────────────────────────────────────────────
let stubCalls = 0;
const counting = async () => { stubCalls++; return { ok: true, status: 200, json: async () => GOOD_SUMMARY }; };
const out0 = await messagingServiceHandler({}, counting);
ok(`an unconfigured server returns 503 + reason unconfigured — the stub fetch fired ${stubCalls} time(s)`,
  out0.status === 503 && out0.body?.reason === "unconfigured" && out0.body?.ok === false && stubCalls === 0);

// ── 4 · a live service: 200, summary fields echoed ───────────────────────────────────────────────
stubCalls = 0;
const armed = { MESSAGING_SERVICE_BASE: "http://127.0.0.1:8084" };
const good = async () => { stubCalls++; return { ok: true, status: 200, json: async () => GOOD_SUMMARY }; };
const out1 = await messagingServiceHandler(armed, good);
ok(`a live messaging service returns 200 + ok + reason ok + the six summary fields (live=${out1.body?.summary?.live}, shards=${out1.body?.summary?.shards}, binder=${out1.body?.summary?.binder})`,
  out1.status === 200 && out1.body?.ok === true && out1.body?.reason === "ok" && out1.body?.service === MESSAGING_SERVICE_NAME &&
  out1.body.summary?.live === true && out1.body.summary?.shards === 8 && out1.body.summary?.binder === "rabbit" &&
  out1.body.summary?.exchange === "footballos.events" && out1.body.summary?.dlq === "footballos.events.dlq" && out1.body.summary?.maxAttempts === 5 && stubCalls === 1);

// ── 5 · the broker is dead but Spring is honest (live:false): still 200, live false ──────────────
const brokerDown = async () => ({ ok: true, status: 200, json: async () => ({ ...GOOD_SUMMARY, live: false }) });
const out2 = await messagingServiceHandler(armed, brokerDown);
ok(`a broker-deprived messaging service reports live:false honestly — the wire does NOT editorialize`,
  out2.status === 200 && out2.body?.ok === true && out2.body?.summary?.live === false);

// ── 6 · upstream 5xx → upstream_down; malformed body → bad_shape ─────────────────────────────────
const upstream5xx = async () => ({ ok: false, status: 503, json: async () => ({}) });
const out3 = await messagingServiceHandler(armed, upstream5xx);
ok(`a 5xx upstream reads upstream_down (the wire never fakes the observe surface)`,
  out3.status === 503 && out3.body?.ok === false && out3.body?.reason === "upstream_down");
const badShape = async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } });
const out4 = await messagingServiceHandler(armed, badShape);
ok(`a malformed JSON body reads bad_shape — never a crash, never a fabricated summary`,
  out4.status === 503 && out4.body?.reason === "bad_shape");

// ── 7 · throw / AbortError → unreachable / timeout ───────────────────────────────────────────────
const throwsWith = (name) => async () => { const e = new Error("boom"); e.name = name; throw e; };
const out5 = await messagingServiceHandler(armed, throwsWith("TypeError"));
ok(`a throwing fetch reads unreachable — never a JSON without reason`,
  out5.status === 503 && out5.body?.reason === "unreachable" && out5.body?.ok === false);
const out6 = await messagingServiceHandler(armed, throwsWith("AbortError"));
ok(`an AbortError (1.2s exceeded) reads timeout — the bound is part of the contract`,
  out6.status === 503 && out6.body?.reason === "timeout");

// ── 8 · envelope never echoes the base URL ───────────────────────────────────────────────────────
const sentinel = { MESSAGING_SERVICE_BASE: "http://10.9.8.7:9999/super-sentinel-path" };
const out7 = await messagingServiceHandler(sentinel, good);
const serialized = JSON.stringify(out7.body);
ok(`the envelope never echoes the sentinel base URL or path`,
  !serialized.includes("10.9.8.7") && !serialized.includes("super-sentinel") && !serialized.includes("9999"));

// ── 9 · middleware: 405 for non-GET, next() for foreign routes, 200 through ──────────────────────
const mw = messagingServiceMiddleware(armed, good);
let mwRes = null;
await new Promise((res) => {
  const req = { url: "/api/messaging/service", method: "POST" };
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
  const req = { url: "/api/messaging/service", method: "GET" };
  const r = { statusCode: 0, setHeader: () => {}, end: (body) => { mwStatus = r.statusCode; try { mwJson = JSON.parse(body); } catch { mwJson = null; } res(); } };
  mw(req, r, () => res());
});
ok(`the GET path serves the observe surface through the middleware (status ${mwStatus}, ok=${mwJson?.ok}, live=${mwJson?.summary?.live})`,
  mwStatus === 200 && mwJson?.ok === true && mwJson?.summary?.live === true);

// ── 10 · vite mounts the probe on BOTH dev and preview ───────────────────────────────────────────
const VITE_CFG = read("vite.config.ts");
const mounts = (VITE_CFG.match(/messagingServiceMiddleware\(env\)/g) ?? []).length;
ok(`vite.config mounts messagingServiceMiddleware(env) on BOTH dev and preview (${mounts} mounts)`,
  mounts === 2 && VITE_CFG.includes("messagingServiceMiddleware"));

// ── 11 · d.mts alignment ─────────────────────────────────────────────────────────────────────────
const dmts = read("scripts/llm-proxy.d.mts");
const dmtsFound = ["MESSAGING_SERVICE_ROUTE", "MESSAGING_SERVICE_NAME", "MESSAGING_SERVICE_ENVS", "messagingServiceHandler", "messagingServiceMiddleware", "MessagingServiceBody"].filter((s) => dmts.includes(s));
ok(`the .d.mts exports align with runtime (${dmtsFound.length}/6)`, dmtsFound.length === 6);

// ── 12 · the screen polls exactly once and carries the honest fallback keys ─────────────────────
const screenSrc = read("features/messaging/QueueObservatory.tsx");
const pathMentions = (screenSrc.match(/\/api\/messaging\/service/g) ?? []).length;
const totalFetchCalls = (screenSrc.match(/\bfetch\s*\(/g) ?? []).length;
ok(`the messaging screen carries exactly one spring-live-wire fetch (${pathMentions} path mention(s), ${totalFetchCalls} total fetch(es)) and the honest fallback keys`,
  totalFetchCalls === 1 && pathMentions >= 1 &&
  screenSrc.includes("springLiveUnconfigured") && screenSrc.includes("springLiveDown") && screenSrc.includes("springLiveLine") && screenSrc.includes("springLiveLoading"));

// ── 13 · all seven keys resolve in all three dictionaries ───────────────────────────────────────
const dict = read("i18n/dictionaries.ts");
const KEYS = ["springLiveTitle", "springLiveHint", "springLiveLoading", "springLiveUnconfigured", "springLiveDown", "springLiveLine", "springLiveBoundary"];
ok(`messaging.springLive* resolve in all three locales`,
  KEYS.every((k) => 3 === (dict.match(new RegExp(`"messaging\\.${k}":`, "g")) || []).length));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
