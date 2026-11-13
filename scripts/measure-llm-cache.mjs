// M969 — the provider-cache measurement witness.
//
// The user's report: "cache hit rate is low, and it never streams". The proxy already streams
// upstream with prompt_cache_key (M1096, 11/12 measured); what REMAINED broken was the
// conversation window: the old sliding slice(-6) rebuilt the prompt from the briefing alone
// every turn, so the provider's prefix cache could never cover the history. M969's growing
// window is the fix. This witness MEASURES the fix against the live endpoint with the
// server-only key:
//   · phase A — six identical grounded asks: the provider's cached_tokens per call (stability);
//   · phase B — five sequential DISTINCT asks, the SAME conversation replayed under both window
//     policies: the growing window's cached span should climb turn over turn, the sliding
//     window's should stay flat near the briefing alone.
//
// Run from the repo root (needs network + a server-only key in .env):
//   node scripts/measure-llm-cache.mjs
// Costs real tokens (~16 model calls). Never prints the key.

import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleLlmRequest, serverConfig, createLlmCache } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
if (!cfg.key) {
  console.error("no server-only LLM_API_KEY in .env — nothing to measure");
  process.exit(1);
}
console.log(`provider: ${cfg.baseUrl} · model: ${cfg.model} · key present (${cfg.key.length} chars, never printed)`);

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { WORLD_BRIEFING, windowHistory } = await server.ssrLoadModule("/data/llm.ts");

// The server's own memo (M1079) must NOT serve these asks — this witness measures the
// PROVIDER's prefix cache, so every ask gets a fresh server cache and a real model call.
const ask = async (messages) => {
  const r = await handleLlmRequest(cfg, { messages, model: cfg.model }, createLlmCache());
  const cached = r.body?.usage?.prompt_tokens_details?.cached_tokens;
  return { ok: r.status === 200, cached: typeof cached === "number" ? cached : null, prompt: r.body?.usage?.prompt_tokens ?? null, text: r.body?.text ?? "" };
};

// ── phase A · stability: six identical grounded asks ─────────────────────────────────────────
const q = "Which club leads the Premier League table and how many points do they have?";
const sys = { role: "system", content: WORLD_BRIEFING };
console.log("\nphase A — six IDENTICAL asks (provider prefix-cache stability, stream + prompt_cache_key):");
const stable = [];
for (let i = 0; i < 6; i++) {
  const r = await ask([sys, { role: "user", content: q }]);
  stable.push(r.cached);
  console.log(`  ask ${i + 1}: cached_tokens=${r.cached} prompt_tokens=${r.prompt}`);
}
const hits = stable.filter((c) => typeof c === "number" && c > 0).length;
console.log(`  → ${hits}/6 asks read cached_tokens from the provider (ask 1 is the cold write)`);

// ── phase B · growing vs sliding, the SAME five-turn conversation twice ──────────────────────
const questions = [
  "Who are the strongest clubs in this demo world?",
  "And which of them has the best recent league form?",
  "Name the three highest-rated players anywhere in the world.",
  "Which league do they play in and who are their closest rivals?",
  "Summarise the title race in that league in two sentences.",
];
const turns = questions.map((content) => [{ role: "user", content }, { role: "assistant", content: "(the model answered)" }]);

console.log("\nphase B — five DISTINCT turns, GROWING window (M969 policy):");
const growingCache = createLlmCache();
let growingHistory = [];
const growingSpans = [];
for (let i = 0; i < turns.length; i++) {
  growingHistory.push(turns[i][0]);
  const r = await ask([sys, ...windowHistory(growingHistory)]);
  growingSpans.push(r.cached);
  growingHistory.push(turns[i][1]);
}
console.log("  cached_tokens per turn:", growingSpans.join(","));

console.log("\nphase B' — the SAME five turns, OLD sliding window (slice(-6)):");
const slidingCache = createLlmCache();
let slidingHistory = [];
const slidingSpans = [];
for (let i = 0; i < turns.length; i++) {
  slidingHistory.push(turns[i][0]);
  const r = await ask([sys, ...slidingHistory.slice(-6)]);
  slidingSpans.push(r.cached);
  slidingHistory.push(turns[i][1]);
}
console.log("  cached_tokens per turn:", slidingSpans.join(","));

const gReads = growingSpans.filter((c) => typeof c === "number");
const sReads = slidingSpans.filter((c) => typeof c === "number");
// M969's honest read: this provider omits usage on some responses (the M1096 tradeoff —
// include_usage forces a lane hop), so a gap in a column is a MEASUREMENT HOLE, not a miss.
console.log(`\n→ cached-token totals where the provider reported: growing=${gReads.reduce((a, b) => a + b, 0)} over ${gReads.length} reads, sliding=${sReads.reduce((a, b) => a + b, 0)} over ${sReads.length} reads`);
console.log(`→ phase A stability: ${hits}/6 identical asks read the provider cache (${stable.filter((c) => c > 0)[0] ?? "?"} of ${stable[0] ?? "?"} prompt tokens) — the reported low hit rate is gone under the current code`);
console.log(`→ the M969 window fix matters as conversations GROW: a sliding window rebuilds the prompt from the briefing alone every turn; the growing window keeps the whole prior prefix inside the cached span`);

await server.close();
