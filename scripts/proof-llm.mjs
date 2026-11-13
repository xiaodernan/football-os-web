// M1078: the live LLM tie-in — proofs for the contract the browser↔proxy split promises.
//
// The Football AI chat used to be a sealed simulator: askIntelligence replays seeded-dev rows
// onto the screen with a fake 420ms pause. M1078 adds a LIVE path — a real model, grounded only
// in this frozen world — and the one risk that makes or breaks it is where the key lives:
//   (1) Vite inlines every import.meta.env.VITE_* into the PUBLIC bundle. A VITE_-prefixed key
//       is therefore readable by any visitor out of dist/assets/*.js. The key must live ONLY on
//       the server, in a NON-prefixed var, reached through the same-origin /api/llm/chat proxy.
//   (2) A briefing that hallucinates names/clubs the seed doesn't contain would teach the model
//       fiction as football. The briefing must name only real entities.
//   (3) A real API key must never be committed (the repo harness force-pushes public history).
//
// This proof pins all three WITHOUT calling the network (a gate that dials a secret is not a
// gate on a frozen world — that is the live witness's job, verify-llm-live.mjs). Every family
// carries a planted defect the reader must charge:
//   · front-end key smuggling (VITE_ key read / external URL / hardcoded sk- token)
//   · proxy: no-key degrade, timeout, input bounds, key never echoed, non-VITE_ env
//   · vite wiring: loadEnv("") on dev + preview, secret never handed to the client
//   · briefing grounding: real clubs/players/leagues, zero invented entities
//   · .env hygiene: gitignored, .env.example has no key prefix, neither scans untracked
//
// Run: node scripts/proof-llm.mjs

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// ── 1 · the module loads cleanly; config is built only from NON-secret public signals ──────
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
const DATA = await server.ssrLoadModule("/data/llm.ts");
const { LLM_CONFIG, WORLD_BRIEFING, callLlmStream, windowHistory, HISTORY_CAP, HISTORY_TRIM_BLOCK } = DATA;
const LLM = read("data/llm.ts");

ok(`LLM_CONFIG exposes only a same-origin endpoint, a boolean enable flag, and a model name (endpoint=${LLM_CONFIG.endpoint}, enabled=${LLM_CONFIG.enabled}, model=${LLM_CONFIG.model})`,
  LLM_CONFIG.endpoint === "/api/llm/chat" &&
  typeof LLM_CONFIG.enabled === "boolean" &&
  typeof LLM_CONFIG.model === "string" && LLM_CONFIG.model.length >= 3 &&
  LLM_CONFIG.model === (process.env.VITE_LLM_MODEL ?? "gpt-6-sol"));

// ── 2 · the browser module CANNOT see the key: no VITE_ key read, no sk- literal, no external host ──
// The whole security argument is source-level: what the client bundle can reference is bounded.
ok(`the browser module never reads a VITE_ key and carries no sk- token`,
  !/import\.meta\.env\.VITE_[A-Z_]*KEY/.test(LLM) &&
  !/sk-[A-Za-z0-9]{12,}/.test(LLM));
ok(`the browser module never names a third-party host or provider path — it only POSTs to the same-origin proxy`,
  !/https?:\/\//.test(LLM) &&
  (LLM.match(/\/api\/llm\/chat/g) ?? []).length >= 2 &&
  /fetch\(LLM_CONFIG\.endpoint/.test(LLM));
// planted: a future hand-edit that reintroduces a VITE_ key read, an external URL or a token
const plantedKeyRead = "const k = import.meta.env.VITE_LLM_API_KEY;";
const plantedUrl = "fetch('https://wkapi.pro/v1/chat/completions'";
const plantedToken = "const k = 'sk-" + "A".repeat(30) + "';";
const detector = (s) => /import\.meta\.env\.VITE_[A-Z_]*KEY/.test(s) || /https?:\/\//.test(s) || /sk-[A-Za-z0-9]{12,}/.test(s);
ok(`the smuggling detector charges all three planted defects (VITE_ key read, external URL, hardcoded token) while the shipped module is clean`,
  detector(plantedKeyRead) && detector(plantedUrl) && detector(plantedToken) && !detector(LLM));

// ── 3 · the disabled path is a literal, deterministic refusal with zero network cost ──────
// The gate is source-level and must sit BEFORE the fetch; hasKey is derived only from the public
// enable flag, so "disabled" is provably a no-wire path regardless of what this machine's .env
// happens to say. (A runtime call here would depend on the author's transient env — that is a
// live-witness concern, not a frozen-world gate.)
ok(`callLlmStream refuses before fetch when the live path is not armed, and the gate is the public enable flag`,
  LLM.includes('if (!LLM_CONFIG.hasKey) return { ok: false, error: "no key configured" }') &&
  LLM.indexOf("if (!LLM_CONFIG.hasKey)") < LLM.indexOf("fetch(LLM_CONFIG.endpoint") &&
  /hasKey:\s*Boolean\(import\.meta\.env\.VITE_LLM_ENABLED\)/.test(LLM));
ok(`the only browser-visible signals are a boolean enable flag and a model name — neither a secret`,
  /\benabled:\s*Boolean\(import\.meta\.env\.VITE_LLM_ENABLED\)/.test(LLM) &&
  /model:\s*import\.meta\.env\.VITE_LLM_MODEL/.test(LLM) &&
  !/import\.meta\.env\.VITE_[A-Z_]*KEY/.test(LLM));
const { execSync } = await import("node:child_process");

// ── 4 · the server proxy is where the key lives — and it never leaves ──────────────────────
const PROXY = read("scripts/llm-proxy.mjs");
ok(`the proxy reads a NON-VITE_ key from the server env and never echoes it`,
  /env\.LLM_API_KEY/.test(PROXY) &&
  !/VITE_LLM_API_KEY/.test(PROXY) &&
  !/body[^\n]*key/i.test(PROXY) &&
  /authorization: `Bearer \$\{cfg\.key\}`/.test(PROXY));
ok(`the proxy degrades without a key, bounds input, caps messages and times out the model call`,
  /if \(!cfg\?\.key\)[\s\S]{0,80}server_llm_unconfigured/.test(PROXY) &&
  /MAX_MESSAGES/.test(PROXY) && /MAX_CONTENT/.test(PROXY) &&
  /AbortController/.test(PROXY) && /TIMEOUT_MS/.test(PROXY) &&
  /AbortError[\s\S]{0,40}model_timeout/.test(PROXY));
ok(`the proxy validates roles, rejects bad JSON and maps non-2xx / empty answers to degraded responses`,
  /invalid_json/.test(PROXY) && /invalid_messages/.test(PROXY) &&
  /model_\$\{r\.status\}/.test(PROXY) && /empty_model_response/.test(PROXY) &&
  /catch[\s\S]{0,120}model_unreachable|model_unreachable/.test(PROXY));
ok(`the proxy normalises the base URL to end in /v1 (the user's endpoint requires it)`,
  /export function normaliseBase/.test(PROXY) && /\/v1\$/i.test(PROXY) && /chat\/completions/.test(PROXY));
// exercise the core handler directly with a fabricated server key and a stubbed fetch — no network
const { handleLlmStream, ...PROXY_MOD } = await import("../scripts/llm-proxy.mjs");
const noKey = await PROXY_MOD.handleLlmRequest({ key: "" }, { messages: [{ role: "user", content: "hi" }] });
ok(`handleLlmRequest with no key returns 503 + server_llm_unconfigured (no fetch attempted)`,
  noKey.status === 503 && noKey.body.ok === false && noKey.body.error === "server_llm_unconfigured");
const badBody = await PROXY_MOD.handleLlmRequest({ key: "test-key" }, "not json");
ok(`handleLlmRequest rejects malformed JSON before any model call (status ${badBody.status})`,
  badBody.status === 400 && badBody.body.error === "invalid_json");

// ── 4b · M1079: the cache wire twin — the fold's three mechanisms on the newest wire ────────
// The frozen world is deterministic, so an identical grounded ask must not pay twice. The proxy's
// cache is the BIT-PARITY twin of domain/cache.ts (LRU + single-flight + seeded full jitter), not a
// second dialect: proof loads the TS originals through Vite and charges any drift. Nothing here
// dials the network — a fabricated key + a stubbed global fetch measure every mechanism.
const { hashString: nodeHash, makeRng: nodeRng, expiryWithJitter: nodeJitter,
        cacheKey, createLlmCache, handleLlmRequest, llmCacheStats, LLM_CACHE_POLICY } = PROXY_MOD;
const TS_RNG = await server.ssrLoadModule("/lib/rng.ts");
const TS_CACHE = await server.ssrLoadModule("/domain/cache.ts");

const paritySeeds = ["", "a", "football-os", "中文测试", "seed:key:1700000000", "gpt-6-sol"];
ok(`M1079 hashString is BIT-PARITY with lib/rng.ts across ${paritySeeds.length} seeds (FNV-1a uint32)`,
  paritySeeds.every((s) => nodeHash(s) === TS_RNG.hashString(s)));
ok(`M1079 makeRng is BIT-PARITY with lib/rng.ts (20 exact doubles × ${paritySeeds.length} seeds, mulberry32)`,
  paritySeeds.every((s) => { const a = nodeRng(s), b = TS_RNG.makeRng(s); for (let i = 0; i < 20; i++) if (a() !== b()) return false; return true; }));
const jitterVectors = [["k1", 1700000000, 600, 120, "football-os"], ["中文", 1700000123, 60, 24, "football-os"], ["x", 0, 10, 5, "seed"], ["z", 999999999, 0, 0, "football-os"]];
ok(`M1079 expiryWithJitter is BIT-PARITY with domain/cache.ts (seconds-in/out, ${jitterVectors.length} vectors)`,
  jitterVectors.every(([k, n, t, j, s]) => nodeJitter(k, n, t, j, s) === TS_CACHE.expiryWithJitter(k, n, t, j, s)));
ok(`M1079 policy seed '${LLM_CACHE_POLICY.seed}' aligns with domain CACHE_POLICY (the M1076 Java twin too)`,
  LLM_CACHE_POLICY.seed === TS_CACHE.CACHE_POLICY.seed && LLM_CACHE_POLICY.seed === "football-os");
// planted: a millisecond signature or a drifted multiplier must be charged by the parity detector
const parityDetector = (impl) => jitterVectors.some(([k, n, t, j, s]) => impl(k, n, t, j, s) !== TS_CACHE.expiryWithJitter(k, n, t, j, s));
ok(`the parity detector charges a planted drift (×1000 ms-signature and a +1 multiplier), while the shipped twin is clean`,
  parityDetector((k, n, t, j, s) => nodeJitter(k, n * 1000, t, j, s)) &&
  parityDetector((k, n, t, j, s) => nodeJitter(k, n, t, j + 1, s)) &&
  !parityDetector(nodeJitter));

// The cache key is derived ONLY from public input (model + cleaned messages) — the server key can
// never enter it, or a visitor could fingerprint the secret by colliding the digest.
const cleanMsgs = [{ role: "system", content: "DEMO WORLD briefing" }, { role: "user", content: "who is strongest?" }];
const key1 = cacheKey("gpt-6-sol", cleanMsgs);
ok(`M1079 cacheKey is stable, sensitive to model+content, a uint32 hex, and NEVER contains the server key`,
  key1 === cacheKey("gpt-6-sol", cleanMsgs) &&
  key1 !== cacheKey("other-model", cleanMsgs) &&
  key1 !== cacheKey("gpt-6-sol", [{ role: "system", content: "DEMO WORLD briefing" }, { role: "user", content: "different" }]) &&
  /^[0-9a-f]{8}$/.test(key1) && !key1.includes("SECRET"));

// Stub the model call. A fabricated key never leaves this process; no network is dialled.
// ─── M1096 · the same SSE frame the real upstream emits, so the fake exercises the real parser ──
// Two frames + [DONE]: a delta carrying the full seeded answer, a terminal usage frame whose
// cached_tokens guides nothing except honesty of the envelope.
const sseFrame = (text) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n` +
  `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { prompt_tokens: 1424, prompt_tokens_details: { cached_tokens: 196 } } })}\n\n` +
  "data: [DONE]\n\n";
const FAKE = { key: "sk-" + "S".repeat(40), baseUrl: "https://wkapi.pro/v1", model: "gpt-6-sol" };
const askBody = JSON.stringify({ messages: cleanMsgs, model: "gpt-6-sol" });
const realFetch = globalThis.fetch;
let modelCalls = 0;
globalThis.fetch = async () => { modelCalls++; await new Promise((r) => setTimeout(r, 8)); return { ok: true, text: async () => sseFrame("Manchester City 89") }; };
try {
  const coldCache = createLlmCache();
  const cold = await handleLlmRequest(FAKE, askBody, coldCache);
  const warm = await handleLlmRequest(FAKE, askBody, coldCache);
  ok(`M1079 read-through: cold = 200 miss (1 model call), identical ask = 200 hit (0 new model call), text identical`,
    cold.status === 200 && cold.body.cached === false && cold.headers["X-FootballOS-LLM-Cache"] === "miss" &&
    warm.status === 200 && warm.body.cached === true && warm.body.text === cold.body.text &&
    warm.headers["X-FootballOS-LLM-Cache"] === "hit" && modelCalls === 1);
  ok(`M1079 a hit cannot leak the key: no cache response body or header carries the fabricated token`,
    ![cold, warm].some((r) => JSON.stringify(r).includes(FAKE.key.slice(0, 12))));

  const sfCache = createLlmCache(); const before = modelCalls;
  const burst = await Promise.all(Array.from({ length: 6 }, () => handleLlmRequest(FAKE, askBody, sfCache)));
  ok(`M1079 single-flight: 6 concurrent cold asks collapse to ONE model call (stampede/breakdown defence)`,
    modelCalls - before === 1 &&
    burst.filter((r) => r.headers["X-FootballOS-LLM-Cache"] === "miss").length === 1 &&
    burst.filter((r) => r.headers["X-FootballOS-LLM-Cache"] === "coalesced").length === 5 &&
    burst.every((r) => r.status === 200 && r.body.text === "Manchester City 89"));
  const sfStats = llmCacheStats(sfCache);
  ok(`M1079 measured stats: misses=1 coalesced=5 stores=1 size=1 (counters are MEASURED, not hardcoded)`,
    sfStats.misses === 1 && sfStats.coalesced === 5 && sfStats.stores === 1 && sfStats.size === 1);
  // planted: a leaky stat that counted coalesced siblings as misses would report misses===6 and fail here
  const leakyMisses = sfStats.coalesced + sfStats.misses; // 6 if a future edit double-counts
  ok(`M1079 misses counts ONLY real model round-trips (1), never the 5 coalesced siblings (planted double-count=${leakyMisses} is refused)`,
    sfStats.misses === 1 && leakyMisses === 6 && leakyMisses !== sfStats.misses);

  // errors must NEVER be cached — a transient 503 must be retried, not memoized into a denial
  const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { modelCalls++; return { ok: false, status: 503 }; };
  const errCache = createLlmCache();
  const e1 = await handleLlmRequest(FAKE, askBody, errCache);
  const e2 = await handleLlmRequest(FAKE, askBody, errCache);
  globalThis.fetch = savedFetch;
  ok(`M1079 degraded model 503 is NEVER cached: two asks → 502 model_503 twice, cache stays empty (planted cached-error charged)`,
    e1.status === 502 && e1.body.error === "model_503" && e2.body.error === "model_503" && errCache.entries.size === 0 &&
    !(e1.body.cached || e2.body.cached));

  // seeded full jitter: TTLs land in [ttl, ttl+jitter] and scatter, never expire as one herd
  const baseSec = 1700000000;
  const ttls = Array.from({ length: 40 }, (_, i) => nodeJitter("k" + i, baseSec, 600, 120, "football-os") - baseSec);
  const plantedHerd = Array.from({ length: 40 }, () => 600); // the foil: no jitter
  ok(`M1079 seeded full jitter: 40 TTLs all in [600,720] and scattered (${new Set(ttls).size} buckets) — planted fixed-TTL herd charged`,
    ttls.every((t) => t >= 600 && t <= 720) && new Set(ttls).size > 1 && new Set(plantedHerd).size === 1);

  // LRU is BOUNDED: a runaway visitor cannot grow server memory without limit (hardware fit)
  const small = createLlmCache({ ...LLM_CACHE_POLICY, capacity: 4 });
  for (let i = 0; i < 6; i++) small.write("key" + i, { text: "t", model: "m", expiresAt: baseSec * 1000 + 999999 }, baseSec * 1000);
  ok(`M1079 LRU is bounded: capacity 4 + 6 writes → size 4, evictions 2 measured, no O(n) scan`,
    small.entries.size === 4 && small.stats.evictions === 2 && LLM_CACHE_POLICY.capacity > 0);
  const expiring = createLlmCache();
  expiring.write("k", { text: "t", model: "m", expiresAt: baseSec * 1000 - 1 }, baseSec * 1000);
  ok(`M1079 an expired entry is evicted on read (fresh TTL, honest miss — planted stale-hit charged)`,
    expiring.read("k", baseSec * 1000) === null && expiring.stats.expired === 1 && !(expiring.entries.has("k")));

  // the no-key door still precedes any cache lookup: an unconfigured server is a 503, never a hit
  const noKeyBefore = modelCalls;
  const warmSeed = createLlmCache();
  warmSeed.write(key1, { text: "Manchester City 89", model: "gpt-6-sol", expiresAt: Date.now() + 999999 }, Date.now());
  const noKeyCold = await handleLlmRequest({ key: "" }, askBody, warmSeed);
  ok(`M1079 the no-key 503 door precedes the cache: even a pre-seeded hit cannot serve without a key, 0 model calls`,
    noKeyCold.status === 503 && noKeyCold.body.error === "server_llm_unconfigured" && noKeyCold.body.cached === undefined &&
    warmSeed.entries.size === 1 && modelCalls === noKeyBefore);
  // cache can be disabled (static-host / privacy posture) → EVERY ask is a fresh cold model call
  globalThis.fetch = async () => { modelCalls++; return { ok: true, text: async () => sseFrame("fresh") }; };
  const offCache = createLlmCache({ ...LLM_CACHE_POLICY, enabled: false });
  const offBefore = modelCalls;
  const off1 = await handleLlmRequest(FAKE, askBody, offCache);
  const off2 = await handleLlmRequest(FAKE, askBody, offCache);
  ok(`M1079 cache can be disabled: enabled=false → 2 asks = 2 model calls, both uncached/miss, size 0`,
    modelCalls - offBefore === 2 && off1.body.cached === false && off2.body.cached === false &&
    off1.headers["X-FootballOS-LLM-Cache"] === "miss" && off2.headers["X-FootballOS-LLM-Cache"] === "miss" &&
    offCache.entries.size === 0 && offCache.stats.stores === 0);
} finally {
  globalThis.fetch = realFetch;
}

// ── 4c · M1079: the cache mechanisms are actually WIRED, not just exported ──────────────────
ok(`M1079 the proxy declares a seeded, bounded, jittered cache policy (ttl/jitter/capacity/seed present)`,
  LLM_CACHE_POLICY.enabled === true && LLM_CACHE_POLICY.ttlSeconds > 0 &&
  LLM_CACHE_POLICY.jitterSeconds >= 0 && LLM_CACHE_POLICY.capacity > 0 && !!LLM_CACHE_POLICY.seed);
ok(`M1096 PROMPT_CACHE_KEY is exported, STABLE at "football-os", and the upstream call carries it with stream:true`,
  PROXY_MOD.PROMPT_CACHE_KEY === "football-os" &&
  PROXY_MOD.PROMPT_CACHE_KEY.length >= 8 &&
  PROXY.includes("stream: true") &&
  PROXY.includes("prompt_cache_key: PROMPT_CACHE_KEY") &&
  !/stream_options/.test(PROXY));

ok(`M1079 the middleware owns a single cache for the server lifetime and the handler takes it as a 3rd arg`,
  /llmProxyMiddleware\(configFor = \(\) => serverConfig\(\), cache = createLlmCache\(\)\)/.test(PROXY) &&
  /handleLlmRequest\(cfg, requestBody, cache = null\)/.test(PROXY) &&
  /handleLlmRequest\(configFor\(\), raw, cache\)/.test(PROXY));
ok(`M1079 the cache key, measured stats and jitter primitives are exported for the proof and the live witness`,
  /export function (cacheKey|createLlmCache|llmCacheStats|hashString|makeRng|expiryWithJitter)/.test(PROXY) &&
  (PROXY.match(/export function /g) ?? []).length >= 8);

// ── 5 · vite wiring mounts the proxy on BOTH dev and preview, loading server env wholesale ──
const VITE_CFG = read("vite.config.ts");
ok(`vite config loads the full env (empty prefix) for the server, mounts the proxy on dev AND preview, and does not expose the key to the client`,
  /loadEnv\(mode,/.test(VITE_CFG) && /,\s*""\s*\)/.test(VITE_CFG) &&
  /configureServer/.test(VITE_CFG) && /configurePreviewServer/.test(VITE_CFG) &&
  /llmProxyMiddleware/.test(VITE_CFG) && /serverConfig\(env\)/.test(VITE_CFG) &&
  !/VITE_LLM_API_KEY/.test(VITE_CFG));

// ── 6 · briefing grounding: every named entity exists in the frozen seed ───────────────────
const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");
const clubNames = new Set(footballProvider.clubs().map((c) => c.name));
const playerNames = new Set(footballProvider.players().map((p) => p.name));
const compNames = new Set(footballProvider.competitions().map((c) => c.name));
const brief = WORLD_BRIEFING;
const clubMentioned = [...clubNames].filter((n) => brief.includes(n));
const playerMentioned = [...playerNames].filter((n) => brief.includes(n));
const compMentioned = [...compNames].filter((n) => brief.includes(n));
ok(`the briefing mentions ${clubMentioned.length} real clubs (≥ 4) and ${playerMentioned.length} real players (≥ 8)`,
  clubMentioned.length >= 4 && playerMentioned.length >= 8 &&
  clubMentioned.every((n) => clubNames.has(n)) && playerMentioned.every((n) => playerNames.has(n)));
ok(`the briefing mentions ${compMentioned.length} / 15 real leagues`,
  compMentioned.length >= 12 && compMentioned.every((n) => compNames.has(n)));
const fictionalClubs = ["Atlantis FC", "Real Madrid Nova", "FC Teutonia", "Moonraker United", "FC Busan"];
const contamination = fictionalClubs.filter((n) => brief.toLowerCase().includes(n.toLowerCase()));
ok(`the briefing invents no club — ${contamination.length === 0 ? "none" : "CONTAMINATED"} of ${fictionalClubs.length} planted fictions`,
  contamination.length === 0);
// planted: a hand-edited briefing naming a stranger must be charged
const plantedBrief = brief + "\nAlso: Atlantis FC are the champions.";
ok(`the grounding detector charges a planted invented club in the briefing`,
  fictionalClubs.some((n) => plantedBrief.toLowerCase().includes(n.toLowerCase())) && contamination.length === 0);

// ── 7 · .env hygiene: gitignored, template has no key, no committed file leaks a token ──────
// Both zero-ish clauses below carry a planted companion so the reader is proven non-vacuous: a
// planted template WITH a token, and a planted tracked blob WITH a token, must each be charged.
const tokenRe = /sk-[A-Za-z0-9]{20,}/;
const plantedTemplate = "LLM_API_KEY=sk-" + "A".repeat(30);
const templateClean = read(".env.example");
ok(`.env is gitignored, .env.example uses a NON-VITE_ key name and holds 0 tokens (planted template charged=${tokenRe.test(plantedTemplate)})`,
  read(".gitignore").includes(".env") && existsSync(resolve(root, ".env.example")) &&
  /^LLM_API_KEY=/m.test(templateClean) &&
  !tokenRe.test(templateClean) && tokenRe.test(plantedTemplate));
const tracked = execSync("git ls-files", { encoding: "utf8", cwd: root }).trim().split(/\r?\n/).filter(Boolean);
const committedKeys = [];
for (const p of tracked) {
  let text;
  try { text = read(p); } catch { continue; } // skip binary / unreadable tracked blobs
  const m = text.match(tokenRe);
  if (m) committedKeys.push(`${p}: ${m[0].slice(0, 10)}…`);
}
// plant: feed the SAME scanner a blob that does carry a token and prove it is charged.
const plantedBlob = "export const k = 'sk-" + "B".repeat(30) + "';";
const plantedCharged = tokenRe.test(plantedBlob);
ok(`0 of ${tracked.length} tracked files carry an sk- token, and the scanner charges 1 planted leaking blob (planted=${plantedCharged ? "CHARGED" : "BLIND"})`,
  tracked.length >= 100 && committedKeys.length === 0 && plantedCharged);

// M969 - the history window is GROWING and block-trimmed (the provider-cache prefix fix).
// The provider's prompt cache matches the longest common prefix of consecutive requests. A
// sliding window shifted the history every turn, so the only stable prefix was the system
// briefing; a growing window keeps request N+1's prefix equal to all of request N.
const growing = Array.from({ length: HISTORY_CAP }, (_, i) => ({ role: "user", content: "m" + i }));
ok("M969 windowHistory is a no-op under the cap: " + HISTORY_CAP + " messages in, identity out (prefix stable turn over turn)",
  windowHistory(growing) === growing && HISTORY_CAP >= 10 && HISTORY_TRIM_BLOCK >= 4);
const over = [...growing, ...Array.from({ length: 6 }, (_, i) => ({ role: "user", content: "x" + i }))];
const trimmed = windowHistory(over);
ok("M969 over the cap the trim is BLOCK-ALIGNED: 6 over drops a whole block of " + HISTORY_TRIM_BLOCK + " in one step (overshooting by design), never one per turn",
  (over.length - trimmed.length) === HISTORY_TRIM_BLOCK && trimmed.length === over.length - HISTORY_TRIM_BLOCK &&
  trimmed[0].content === "m12");
const oldSlide = over.slice(-6);
ok("M969 the old sliding window is charged as the defect: 6 over it drops ALL " + (over.length - 6) + " old messages in one turn (the prompt rebuilds from the briefing alone)",
  over.length - oldSlide.length === over.length - 6 && oldSlide[0].content === "x0" &&
  (over.length - oldSlide.length) > HISTORY_TRIM_BLOCK * 2);
const reqN = [...windowHistory(growing.slice(0, 30)), { role: "user", content: "qN" }];
const grown2 = [...growing.slice(0, 30), { role: "assistant", content: "aN" }];
const reqN1 = [...windowHistory([...grown2, { role: "user", content: "m30" }]), { role: "user", content: "qN1" }];
const common = reqN1.filter((m, i) => i < reqN.length && reqN[i].content === m.content).length;
ok("M969 consecutive requests share the whole prior prompt (common prefix = all of request N except its trailing question, not just the briefing)",
  common === reqN.length - 1 && common === 30 && reqN.length === 31);
// M969b - the streaming path forwards the model's own deltas as NDJSON frames.
const sse = (frames) => new ReadableStream({
  start(c) { for (const f of frames) c.enqueue(new TextEncoder().encode(f)); c.close(); },
});
const streamCache = createLlmCache();
const streamDecoder = new TextDecoder();
const upstreamFrames = [
  'data: {"choices":[{"delta":{"content":"Man"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":"chester City"}}]}\n\n',
  'data: {"choices":[{"delta":{"content":" 89"}}]}\n\n',
  'data: [DONE]\n\n',
];
const realStreamFetch = globalThis.fetch;
globalThis.fetch = async () => ({ ok: true, status: 200, body: sse(upstreamFrames) });
const streamAsk = await handleLlmStream(FAKE, askBody, streamCache);
const collected = [];
for await (const chunk of streamAsk.stream) {
  for (const line of streamDecoder.decode(chunk, { stream: true }).split("\n")) {
    if (line.trim()) collected.push(JSON.parse(line));
  }
}
ok("M969b the stream path forwards the deltas as frames and writes the assembled answer to the memo (deltas: " + collected.filter((f) => f.t === "delta").map((f) => f.d).join("|") + ")",
  collected[0].t === "delta" && collected[0].d === "Man" &&
  collected.filter((f) => f.t === "delta").length === 3 &&
  collected[collected.length - 1].t === "end" && collected[collected.length - 1].ok === true &&
  streamCache.entries.size === 1);
globalThis.fetch = async () => { modelCalls++; return { ok: true, status: 200, body: sse(["data: {}\n\n"]) }; };
const beforeHit = modelCalls;
const hitFrames = await handleLlmStream(FAKE, askBody, streamCache);
ok("M969b a memo hit streams the whole answer as ONE frame and makes zero model calls (calls before/after: " + beforeHit + "/" + modelCalls + ")",
  Array.isArray(hitFrames.frames) && hitFrames.frames.length === 2 && hitFrames.frames[1].cached === true && modelCalls === beforeHit);
globalThis.fetch = realStreamFetch;
ok("M969b the middleware routes a stream:true ask to the streaming path over an ndjson content type",
  PROXY.includes("handleLlmStream") && PROXY.includes("wantsStream") && PROXY.includes("application/x-ndjson"));
console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
