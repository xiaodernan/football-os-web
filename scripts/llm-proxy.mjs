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

export const PROXY_ROUTE = "/api/llm/chat";
const DEFAULT_BASE = "https://wkapi.pro/v1";
const DEFAULT_MODEL = "gpt-6-sol";
const MAX_MESSAGES = 10;
const MAX_CONTENT = 8000;
const TIMEOUT_MS = 20000;

/** Normalise a provider base URL to end in exactly one /v1 (the user's endpoint requires it). */
export function normaliseBase(raw) {
  const base = String(raw || DEFAULT_BASE).trim().replace(/\/+$/, "");
  return /\/v1$/i.test(base) ? base : `${base}/v1`;
}

/**
 * The framework-agnostic core. `cfg` supplies { key, baseUrl, model } from the server env.
 * Returns a plain object { status, body } — no Response, so a Vite middleware, a Deno handler and
 * the witness can all consume it. Never throws: every failure becomes a degraded {ok:false}.
 */
export async function handleLlmRequest(cfg, requestBody) {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  const json = (status, body) => ({ status, body, headers });

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${normaliseBase(cfg.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model, messages: clean, max_tokens: 700, temperature: 0.55 }),
      signal: controller.signal,
    });
    if (!r.ok) return json(502, { ok: false, error: `model_${r.status}` });
    const body = await r.json();
    const text = body?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return json(502, { ok: false, error: "empty_model_response" });
    return json(200, { ok: true, text: text.trim(), model });
  } catch (err) {
    const reason = err?.name === "AbortError" ? "model_timeout" : "model_unreachable";
    return json(502, { ok: false, error: reason });
  } finally {
    clearTimeout(timer);
  }
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
 * from anything the browser controls.
 */
export function llmProxyMiddleware(configFor = () => serverConfig()) {
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
    const out = await handleLlmRequest(configFor(), raw);
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(JSON.stringify(out.body));
  };
}
