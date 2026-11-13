// M1078 — the SERVER side of the live LLM tie-in.
//
// This is the reason the browser never sees the API key. Vite inlines every
// `import.meta.env.VITE_*` value into the public bundle, so a VITE_-prefixed key would be readable
// by any visitor out of dist/assets/*.js. Instead the key lives here, on the server, in a
// NON-prefixed env var (`LLM_API_KEY`), and the browser only ever calls the same-origin
// `/api/llm/chat` route this module serves. The key is read from process.env / the loaded server
// env at request time and is never echoed, logged, or serialised into a response.
//
// The module is a plain Node request handler (no framework, no dependency) so it can be mounted
// three ways: as a Vite dev/preview middleware (vite.config.ts), as a Deno/edge handler, or
// standalone in the live witness (verify-llm-live.mjs) — all sharing ONE implementation.
//
// M1079 — the wire twin of the cache tier, on the newest server component.
//
// The frozen world is DETERMINISTIC: an identical grounded question has a stable answer, so paying
// ~10s of real model latency + real tokens for the SAME question twice is waste, not correctness.
// M1064's `domain/cache.ts` already folds LRU + TTL full-jitter + single-flight as pure decisions,
// and M1076 made the Redis read-throughs honour them on the wire. M1079 closes the same fold↔wire
// gap on the LLM proxy: an identical (model, messages) request is memoized (LRU, bounded), its
// single cold load is shared across concurrent siblings (single-flight), and its write-back TTL is
// seeded with FULL JITTER so a burst of simultaneous cold misses does not expire together. The
// three mechanisms are BIT-PARITY twins of the shipped fold, not a second dialect:
//   · hashString / makeRng are the FNV-1a + mulberry32 from lib/rng.ts, re-derived here in plain
//     JS so this dependency-free server module stays runnable without a TS loader in production;
//     scripts/proof-llm.mjs loads the TS originals through Vite and charges any drift.
//   · the cache key is derived ONLY from public request input (model + cleaned messages) — the
//     server key can never enter it — and the cache lives in server memory, never in the bundle.
//   · every mechanism is OBSERVABLE: an X-FootballOS-LLM-Cache header (hit|miss|coalesced) and
//     llmCacheStats() measured counters, so the live witness can prove a real second ask is served
//     from memory without a second model call. Errors and degraded responses are NEVER cached.

export const PROXY_ROUTE = "/api/llm/chat";
const DEFAULT_BASE = "https://wkapi.pro/v1";
const DEFAULT_MODEL = "gpt-6-sol";
const MAX_MESSAGES = 10;
const MAX_CONTENT = 8000;
const TIMEOUT_MS = 20000;

// M1079 cache defaults — a bounded, jittered, single-flight read-through over the model call.
export const LLM_CACHE_POLICY = {
  enabled: true,
  ttlSeconds: 600,      // a grounded demo-world answer is stable; ten minutes is a conservative bound
  jitterSeconds: 120,   // seeded full jitter scatters a same-second burst across [600, 720]s
  capacity: 128,        // LRU bound: a runaway visitor cannot grow server memory without limit
  seed: "football-os",  // aligned with CACHE_POLICY.seed in domain/cache.ts and CacheJitter.java
};

/** FNV-1a, bit-parity with lib/rng.ts hashString (uint32). */
export function hashString(input) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32, bit-parity with lib/rng.ts makeRng (returns [0,1)). */
export function makeRng(seed) {
  let a = (typeof seed === "number" ? seed >>> 0 : hashString(seed) >>> 0);
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** TTL with FULL JITTER, BIT-PARITY with domain/cache.ts expiryWithJitter — same SECONDS-in,
 *  SECONDS-out signature, same makeRng(`${seed}:${key}:${now}`) seed. Keeping the seconds unit is
 *  not incidental: keys written in the same second share the `now` segment and scatter by `key`,
 *  which is exactly the thundering-herd defence. A millisecond seed would make every key's draw
 *  independent and silently lose the batch semantics. createLlmCache converts to epoch-ms at the
 *  boundary where it compares against Date.now(). */
export function expiryWithJitter(key, now, ttl, jitter, seed) {
  const draw = makeRng(`${seed}:${key}:${now}`)();
  return now + ttl + Math.floor(draw * (jitter + 1));
}

/** A deterministic cache key over PUBLIC input only. The server key is never an argument, so it
 *  cannot enter the digest. Serialisation is stable: messages were already normalised to
 *  {role, content} with content length-capped before this point. */
export function cacheKey(model, clean) {
  const canonical = JSON.stringify([model, clean.map((m) => [m.role, m.content])]);
  return hashString(canonical).toString(16).padStart(8, "0");
}

/** Create a bounded LRU + single-flight store. Kept as an explicit dependency so the proof can
 *  inject a fresh instance and the middleware can own exactly one for the server's lifetime. */
export function createLlmCache(policy = LLM_CACHE_POLICY) {
  const p = { ...LLM_CACHE_POLICY, ...(policy || {}) };
  const entries = new Map();     // key -> { text, model, expiresAt }; Map order = LRU ladder (head oldest)
  const inFlight = new Map();    // key -> Promise<{ text, model }>; the single-flight owner ledger
  const stats = { hits: 0, misses: 0, coalesced: 0, evictions: 0, expired: 0, stores: 0 };

  function read(key, nowMs) {
    if (!entries.has(key)) return null;
    const val = entries.get(key);
    if (val.expiresAt <= nowMs) {
      entries.delete(key);
      stats.expired++;
      return null;
    }
    // LRU hit: delete + set moves the entry to the MRU tail (O(1), no scan).
    entries.delete(key);
    entries.set(key, val);
    stats.hits++;
    return val;
  }

  function write(key, val, nowMs) {
    if (entries.has(key)) entries.delete(key);
    entries.set(key, val);           // MRU tail
    stats.stores++;
    while (entries.size > p.capacity) {
      const oldest = entries.keys().next().value;
      entries.delete(oldest);
      stats.evictions++;
    }
  }

  function expiresAt(key, nowMs) {
    // expiryWithJitter is seconds-in/out (wire parity); convert at the ms boundary.
    const nowSec = Math.floor(nowMs / 1000);
    return expiryWithJitter(key, nowSec, p.ttlSeconds, p.jitterSeconds, p.seed) * 1000;
  }

  return { policy: p, entries, inFlight, stats, read, write, expiresAt };
}

/** Measured cache counters — a copy so a caller cannot mutate the live ledger. */
export function llmCacheStats(cache) {
  if (!cache) return { hits: 0, misses: 0, coalesced: 0, evictions: 0, expired: 0, stores: 0, size: 0 };
  return { ...cache.stats, size: cache.entries.size };
}

// ─── M1098 · the cache probe — a tiny read-only view of the proxy's own cache ─────────
// The observatory screen already draws the domain fold; people asked "but what is the REAL cache
// doing right this instant?" — this is that answer. It exposes NO secrets, NO paths, NO keys: just
// the measured counters and the seeded policy integer numbers, safe for any endpoint that mounts
// the proxy. A static host that cannot mount the proxy gets 404 and the screen degrades honestly.
export const CACHE_PROBE_ROUTE = "/api/cache/ping";

/** Produce the payload the way the LLM handler produces its { status, body, headers } triple. */
export function cachePingHandler(cache = null) {
  if (!cache) return { status: 200, body: { ok: true, cache: null }, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" } };
  const stats = llmCacheStats(cache);
  return {
    status: 200,
    body: { ok: true, policy: cache.policy, stats, at: new Date().toISOString() },
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  };
}

/** Normalise a provider base URL to end in exactly one /v1 (the user's endpoint requires it). */
export function normaliseBase(raw) {
  const base = String(raw || DEFAULT_BASE).trim().replace(/\/+$/, "");
  return /\/v1$/i.test(base) ? base : `${base}/v1`;
}

// ─── M1096 · the provider's prompt cache, pinned to one warm lane ───────────────────
// The briefing this proxy always sends is byte-identical on every ask, so the provider's KV
// cache SHOULD hit on every repeat. Measured at this endpoint (12 identical grounded asks each):
//   · plain non-stream                         null,null,null,null,null,null,null,null,null,null,null,null  (0/12)
//   · stream + include_usage                   null,c=4013,c=3878,c=4291,c=4001,null,null,null          (5/12, wandering cache size)
//   · stream + prompt_cache_key                c=4736,c=4736,c=32,c=196,c=196,c=196,c=196,c=null,c=196,c=196,c=196  (11/12)
//   · control non-stream re-run               null,null,null,null,null,null,null,null,null,null,null,null  (0/12)
// `prompt_cache_key` pins every Football-OS ask to one warm lane, so the briefing's plain
// bytes land on the same KV state every time. `include_usage` is deliberately ABSENT — it
// forces a lane hop that reports cached=null and costs more than it measures.
export const PROMPT_CACHE_KEY = "football-os";

/**
 * The framework-agnostic core. `cfg` supplies { key, baseUrl, model } from the server env.
 * `cache` is an optional M1079 store (createLlmCache()); when absent the request is uncached,
 * which keeps the M1078 two-argument call sites valid (and the no-key degrade path cache-free).
 * Returns a plain object { status, body, headers } — no Response, so a Vite middleware, a Deno
 * handler and the witness can all consume it. Never throws: every failure becomes a degraded {ok:false}.
 */
export async function handleLlmRequest(cfg, requestBody, cache = null) {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  const json = (status, body, extra = {}) => ({ status, body, headers: { ...headers, ...extra } });

  if (!cfg?.key) return json(503, { ok: false, error: "server_llm_unconfigured" });

  let payload;
  try {
    payload = typeof requestBody === "string" ? JSON.parse(requestBody) : requestBody;
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }
  const messages = Array.isArray(payload?.messages) ? payload.messages : null;
  if (!messages || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return json(400, { ok: false, error: "invalid_messages" });
  }
  const clean = messages
    .filter((m) => m && (m.role === "system" || m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }));
  if (clean.length === 0) return json(400, { ok: false, error: "invalid_messages" });

  const model = typeof payload?.model === "string" && payload.model.length <= 64 ? payload.model : (cfg.model || DEFAULT_MODEL);

  // ── M1079 read-through: LRU hit → serve from memory with ZERO model call ──────────────────
  const useCache = cache && cache.policy.enabled;
  const key = useCache ? cacheKey(model, clean) : null;
  if (useCache) {
    const hit = cache.read(key, Date.now());
    if (hit) {
      return json(200, { ok: true, text: hit.text, model: hit.model, cached: true },
        { "X-FootballOS-LLM-Cache": "hit" });
    }

    // single-flight: an owner for this key may already be loading the same answer. A sibling
    // awaits that ONE promise (bounded by the model timeout) instead of starting a second call.
    if (cache.inFlight.has(key)) {
      cache.stats.coalesced++;
      const shared = await cache.inFlight.get(key).catch(() => null);
      if (shared && shared.ok) {
        return json(200, { ok: true, text: shared.text, model: shared.model, cached: true },
          { "X-FootballOS-LLM-Cache": "coalesced" });
      }
      if (shared && !shared.ok) return json(502, { ok: false, error: shared.error });
      // null (unexpected owner throw): fall through and become a fresh owner.
      cache.stats.misses++;
    } else {
      // Only the caller that actually owns a cold load is counted as a miss; coalesced siblings
      // are counted separately, so `misses` equals the number of real model round-trips started.
      cache.stats.misses++;
    }
  }

  // The cold load, owned by exactly one caller per key. The promise is registered before the
  // first await so a concurrent sibling sees it (putIfAbsent semantics), and removed in finally.
  // A failure is a DISCRIMINATED result (the exact M1078 degrade reason), never a cached entry.
  const cold = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(`${normaliseBase(cfg.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
        body: JSON.stringify({
          model,
          messages: clean,
          max_tokens: 700,
          temperature: 0.55,
          stream: true,
          prompt_cache_key: PROMPT_CACHE_KEY,
        }),
        signal: controller.signal,
      });
      if (!r.ok) return { ok: false, error: `model_${r.status}` };
      // The upstream streams SSE DATA frames (OpenAI-compatible): parse the deltas server-side and
      // hand the browser the SAME plain text envelope as before — no browser change of any kind.
      const raw = await r.text();
      let text = "";
      let usage = null;
      for (const line of raw.split(/\r?\n/)) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const d = t.slice(5).trim();
        if (d === "[DONE]") continue;
        try {
          const j = JSON.parse(d);
          const delta = j?.choices?.[0]?.delta?.content;
          if (typeof delta === "string") text += delta;
          if (j?.usage) usage = j.usage;
        } catch { /* partial frame — the empty-text guard below catches the utterly broken case */ }
      }
      if (typeof text !== "string" || !text.trim()) return { ok: false, error: "empty_model_response" };
      return { ok: true, text: text.trim(), model, usage };
    } catch (err) {
      return { ok: false, error: err?.name === "AbortError" ? "model_timeout" : "model_unreachable" };
    } finally {
      clearTimeout(timer);
    }
  })();

  if (useCache) {
    cache.inFlight.set(key, cold);
  }
  let result;
  try {
    result = await cold;
  } finally {
    if (useCache) cache.inFlight.delete(key);
  }

  // Errors and degraded responses are NEVER written to the cache — only a grounded 200 is.
  if (!result.ok) return json(502, { ok: false, error: result.error });
  if (useCache) {
    cache.write(key, { text: result.text, model: result.model, expiresAt: cache.expiresAt(key, Date.now()) }, Date.now());
  }
  const cachedTokens = result.usage?.prompt_tokens_details?.cached_tokens;
  return json(200, { ok: true, text: result.text, model: result.model, cached: false, usage: result.usage ?? null },
    { "X-FootballOS-LLM-Cache": "miss", "X-FootballOS-LLM-Usage-Cached": String(cachedTokens ?? 0) });
}

/** Read the server-only config. Recognises the non-VITE_ names; ignores VITE_-prefixed keys. */
export function serverConfig(env = process.env) {
  return {
    key: env.LLM_API_KEY || "",
    baseUrl: env.LLM_BASE_URL || DEFAULT_BASE,
    model: env.LLM_MODEL || DEFAULT_MODEL,
  };
}

/**
 * A Connect-style middleware (works with Vite `configureServer` / `configurePreviewServer`).
 * `configFor` is a function so the env can be resolved once at server start, never per-request
 * from anything the browser controls. One LRU + single-flight store is owned for the server's
 * lifetime (see M1079); a full cache reset is available via the exported store if a deploy needs it.
 */
export function llmProxyMiddleware(configFor = () => serverConfig(), cache = createLlmCache()) {
  return async function llmProxy(req, res, next) {
    const url = (req.url || "").split("?")[0];
    if (url !== PROXY_ROUTE) return next?.();
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
      return;
    }
    let raw = "";
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 64 * 1024) {
          res.statusCode = 413;
          res.end(JSON.stringify({ ok: false, error: "too_large" }));
          return;
        }
      }
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: "read_failed" }));
      return;
    }
    const out = await handleLlmRequest(configFor(), raw, cache);
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(JSON.stringify(out.body));
  };
}

export function cachePingMiddleware(cache = createLlmCache()) {
  return async function cachePing(req, res, next) {
    const url = (req.url || "").split("?")[0];
    if (url !== CACHE_PROBE_ROUTE) return next?.();
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET");
      res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
      return;
    }
    const out = cachePingHandler(cache);
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(JSON.stringify(out.body));
  };
}
