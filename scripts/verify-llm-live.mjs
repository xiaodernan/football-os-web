// M1078 — the LIVE tie-in witness: a REAL model answers, grounded only in the frozen world,
// through the SAME server-side proxy the browser uses, with the key never crossing to the client.
//
// `proof-llm.mjs` is the portable floor: it reads source, re-derives the proxy contract, and NEVER
// dials the network (a gate that reads a secret is not a gate on a frozen world). This script is
// the complementary LIVE truth, the fifth witness beside the Redis/Rabbit ones:
//   · END-TO-END SAME-ORIGIN PATH: it starts a real Node HTTP server on a project-owned port,
//     mounts the EXACT llmProxyMiddleware the Vite dev/preview server mounts, and POSTs to it the
//     way the browser does. No Vite, no bundle — the wire path is exercised as shipped.
//   · REAL MODEL: with the server-only LLM_API_KEY from .env, gpt-6-sol actually answers a question
//     about the seeded world (Manchester City / Real Madrid, 89 overall) — measured, not asserted
//     from a fixture. A refusal of an out-of-world question is observed and reported honestly.
//   · DEGRADE CONTRACT: unconfigured key → 503, bad JSON → 400, oversized/empty messages → 400,
//     GET → 405, and the key NEVER appears in any response body.
//   · HONESTY: no key present → the live legs are reported UNVERIFIED and the witness still proves
//     the full degrade contract (it never fabricates a model answer). A static host with no proxy
//     degrades the browser to the deterministic briefing — exactly what this degrade floor pins.
//
// PORT HYGIENE: binds ONLY 127.0.0.1:8791, a project-owned non-default port. It is an ephemeral
// in-process server, closed in finally and on SIGINT; no Docker, no broker, no default port is
// ever touched. The third-party API host is contacted by the SERVER proxy only, exactly as in dev.
//
// Run from the repo root (needs network + a server-only key in .env):
//   node scripts/verify-llm-live.mjs
//   node scripts/verify-llm-live.mjs --clean   # no-op here; kept for parity with the other witnesses
//
// NOT part of `npm run proof` (it spends real tokens and needs a key). It is the runnable truth
// dev/platform-runbook.md and PLAN-LONGTERM.md point at.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { llmProxyMiddleware, serverConfig, handleLlmRequest, PROXY_ROUTE } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const CLEAN = argv.includes("--clean");

const PORT = 8791;                 // project-owned, non-default; NOT a broker, NOT the app's 5199
const HOST = "127.0.0.1";
const BASE = `http://${HOST}:${PORT}`;
const TOP_CLUB = "Manchester City"; // a real entity from the frozen seed (proof-llm pins grounding)
const MODEL = "gpt-6-sol";

if (PORT === 6379 || PORT === 5672 || PORT === 5199 || PORT === 8083) {
  console.error(`FAIL verify-llm-live targets a reserved/foreign port; got ${PORT}`);
  process.exit(2);
}

let pass = 0, fail = 0, unverified = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const note = (name) => { unverified++; console.log("UNVERIFIED  " + name); };
const ms = () => Date.now();

// Read the server-only key from .env WITHOUT printing it. This process is the server; the browser
// never gets these values. Only non-secret shape (presence, length) is ever logged.
function readServerEnv() {
  const env = { ...process.env };
  const p = resolve(root, ".env");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !Object.prototype.hasOwnProperty.call(env, m[1])) env[m[1]] = m[2];
    }
  }
  return env;
}
const cfg = serverConfig(readServerEnv());
const HAS_KEY = Boolean(cfg.key);

const post = async (path, body, init = {}) => {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(30000),
    ...init,
  });
  return { status: r.status, text: await r.text() };
};

// The EXACT middleware the Vite dev/preview server mounts (vite.config.ts), on a real HTTP server.
const server = createServer(llmProxyMiddleware(() => cfg));
await new Promise((res, rej) => { server.once("error", rej); server.listen(PORT, HOST, res); });
ok(`the same-origin proxy listens ONLY on ${HOST}:${PORT} (project-owned non-default port)`, server.listening === true);

try {
  // ── 1 · degrade contract, fully exercised even without a key ────────────────────────────
  const getRes = await fetch(`${BASE}${PROXY_ROUTE}`, { signal: AbortSignal.timeout(10000) });
  ok(`a non-POST to the proxy route is refused with 405 + Allow: POST (got ${getRes.status})`,
    getRes.status === 405 && (getRes.headers.get("allow") || "").includes("POST"));

  const badJson = await post(PROXY_ROUTE, "not-json");
  ok(`malformed JSON degrades to 400 + invalid_json (status ${badJson.status})`,
    badJson.status === 400 && JSON.parse(badJson.text).error === "invalid_json");

  const empty = await post(PROXY_ROUTE, JSON.stringify({ messages: [] }));
  ok(`an empty message list degrades to 400 + invalid_messages (status ${empty.status})`,
    empty.status === 400 && JSON.parse(empty.text).error === "invalid_messages");

  const many = await post(PROXY_ROUTE, JSON.stringify({ messages: Array.from({ length: 20 }, (_, i) => ({ role: "user", content: "x" + i })) }));
  ok(`an oversized message list is bounded (400 + invalid_messages, status ${many.status})`,
    many.status === 400 && JSON.parse(many.text).error === "invalid_messages");

  // direct core handler with no key → 503, and the key is never echoed in any body
  const noKey = await handleLlmRequest({ key: "" }, { messages: [{ role: "user", content: "hi" }] });
  ok(`an unconfigured server key degrades to 503 + server_llm_unconfigured (status ${noKey.status})`,
    noKey.status === 503 && noKey.body.error === "server_llm_unconfigured");

  // ── 2 · the live path: real model through the real same-origin server ───────────────────
  if (!HAS_KEY) {
    note(`no server-only LLM_API_KEY in .env — live model legs UNVERIFIED (degrade floor above still proven)`);
  } else {
    const system = "You answer ONLY about the demo world below. Be brief.\nDEMO WORLD: 73 clubs, 15 leagues. Strongest clubs by overall: Manchester City 89, Real Madrid 89, Inter 88. If asked about real-world football outside this list, say you are not briefed on real football and do not guess.";
    const ask = { messages: [{ role: "system", content: system }, { role: "user", content: "Which club is strongest by overall in this demo world, and what is its rating?" }], model: MODEL };
    const t0 = ms();
    const live = await post(PROXY_ROUTE, JSON.stringify(ask));
    const dt = ms() - t0;
    let body = {};
    try { body = JSON.parse(live.text); } catch { /* handled below */ }
    ok(`the real model answers through the same-origin proxy: 200 + non-empty text (status ${live.status}, ${dt}ms)`,
      live.status === 200 && body.ok === true && typeof body.text === "string" && body.text.trim().length > 0);
    ok(`the answer is grounded: it names a real top club (${TOP_CLUB} / Real Madrid / Inter / 89) — not a fabricated entity`,
      /Manchester City|Real Madrid|Inter|89/i.test(body.text || ""));
    ok(`the proxy echoes the model name, not the key (model=${body.model})`,
      body.model === MODEL && !live.text.includes(cfg.key.slice(0, 12)));
    ok(`the live round-trip is bounded (< 25s, measured ${dt}ms)`, dt > 0 && dt < 25000);

    // out-of-world question: observe that the guardrails hold (answer acknowledges the boundary
    // or declines to fabricate) — a soft, reported observation, not a brittle phrase match.
    const oow = await post(PROXY_ROUTE, JSON.stringify({
      messages: [{ role: "system", content: system }, { role: "user", content: "Who won the real 2024 UEFA Champions League final? Give the exact score." }],
      model: MODEL,
    }));
    let oowBody = {};
    try { oowBody = JSON.parse(oow.text); } catch { /* handled below */ }
    const guarded = /not briefed|demo world|don.t know|cannot|can.t|no data|not in|frozen|unable/i.test(oowBody.text || "");
    console.log(`     out-of-world probe: ${guarded ? "GUARDED" : "ANSWERED"} — ${(oowBody.text || "").slice(0, 160).replace(/\s+/g, " ")}`);
    ok(`an out-of-world question still returns a non-empty, key-free answer (guarded=${guarded})`,
      oow.status === 200 && typeof oowBody.text === "string" && oowBody.text.length > 0 && !oow.text.includes(cfg.key.slice(0, 12)));

    // key hygiene across every live response
    ok(`no live response body leaked the server key prefix`, ![live, oow].some((r) => r.text.includes(cfg.key.slice(0, 12))));
  }

  // ── 3 · the browser bundle must not carry the key (build-artifact check, measured) ──────
  const { readdirSync, statSync } = await import("node:fs");
  const assetsDir = resolve(root, "dist", "assets");
  if (existsSync(assetsDir)) {
    let scanned = 0, leaked = [];
    for (const f of readdirSync(assetsDir)) {
      if (!/\.js$/.test(f)) continue;
      const p = resolve(assetsDir, f);
      if (statSync(p).size > 4 * 1024 * 1024) continue;
      scanned++;
      const txt = readFileSync(p, "utf8");
      if (/sk-[A-Za-z0-9]{20,}/.test(txt)) leaked.push(f);
    }
    ok(`the built browser bundle (${scanned} JS assets) carries no sk- token${leaked.length ? ` — LEAKED: ${leaked.join(", ")}` : ""}`,
      scanned > 0 && leaked.length === 0);
  } else {
    note("no dist/assets build present — bundle key-leak check UNVERIFIED (run npm run build first)");
  }
} finally {
  await new Promise((res) => server.close(res));
}

const total = pass + fail;
console.log(`\n${pass}/${total} checks passed${unverified ? ` · ${unverified} UNVERIFIED (honest, no key fabricated)` : ""}${CLEAN ? " · --clean (no containers to remove)" : ""}`);
process.exit(fail ? 1 : 0);
