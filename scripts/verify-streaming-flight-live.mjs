// M1189 · the parallel-miss witness for the streaming path (LLM_LIVE arm).
//
// The user's exact suspicion, measured: "are several parallel sessions hammering this api at
// once, so the lane stops discriminating?" Before M1189, concurrent identical streamed asks on
// a cold lane each opened their own upstream stream — no coalescing on the streaming path. This
// witness fires six identical streamed asks CONCURRENTLY through the SAME machinery the Vite
// dev server mounts, and reads the memo's own census:
//   · stores === 1  — the owner, exactly one upstream round-trip
//   · coalesced === 5 — the five siblings re-emitted the one-frame answer
//   · hits === 0 / misses === 1 — only the owner counts a miss; no one else paid
// A seventh identical ask afterwards must be served from the memo (hits 2). Needs network and
// a server-only key in .env (Clash on 127.0.0.1:7897 or a direct route the upstream allows).
// Spends ONE real model call (~700 max tokens). Never prints the key.
//
//   LLM_LIVE=1 node scripts/verify-streaming-flight-live.mjs
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.LLM_LIVE !== "1") {
  console.log("skip — set LLM_LIVE=1 to arm this witness (it spends one real model call)");
  process.exit(0);
}

function readServerEnv() {
  const env = { ...process.env };
  const p = resolve(root, ".env");
  if (existsSync(p)) {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !Object.prototype.hasOwnProperty.call(env, m[1])) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

const { serverConfig, createLlmCache, handleLlmStream, llmCacheStats } = await import("./llm-proxy.mjs");
const cfg = serverConfig(readServerEnv());
if (!cfg.key) { console.error("no server-only LLM_API_KEY in .env — nothing to measure"); process.exit(1); }
console.log(`provider: ${cfg.baseUrl} · model: ${cfg.model} · key present (${cfg.key.length} chars, never printed)`);

const cache = createLlmCache();
const raw = JSON.stringify({
  messages: [
    { role: "system", content: "You are Football OS. Answer in five words." },
    { role: "user", content: "Name the windiest club in the PL in four words." },
  ],
  model: cfg.model,
  stream: true,
});

const ask = async () => {
  const out = await handleLlmStream(cfg, raw, cache);
  if (!out.stream) return { ok: false, text: "", error: String(out.body?.error ?? out.status) };
  let text = "";
  let endOk = false;
  for await (const chunk of Readable.fromWeb(out.stream)) {
    for (const line of String(chunk).split("\n")) {
      const t = line.trim();
      if (!t.startsWith("{")) continue;
      try {
        const j = JSON.parse(t);
        if (j.t === "delta" && typeof j.d === "string") text += j.d;
        if (j.t === "end") endOk = j.ok !== false;
      } catch { /* partial frame */ }
    }
  }
  return { ok: endOk, text: text.trim(), status: out.status };
};

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

console.time("six concurrent asks");
const t0 = Date.now();
const results = await Promise.all(Array.from({ length: 6 }, () => ask()));
const wall = Date.now() - t0;
console.timeEnd("six concurrent asks");
const texts = new Set(results.map((r) => r.text));
console.log(`  texts observed: ${[...texts].map((t) => JSON.stringify(t.slice(0, 80))).join(" | ")}`);
ok("every concurrent ask returned 200 with a full text", results.every((r) => r.ok && r.status === 200 && r.text.length > 0));
ok("all six concurrent siblings received the SAME assembled answer (single-flight, not five races)", texts.size === 1);
const after = llmCacheStats(cache);
console.log(`  memo after the storm: hits=${after.hits} misses=${after.misses} coalesced=${after.coalesced} stores=${after.stores} size=${after.size}`);
ok(`exactly ONE upstream call happened (stores=${after.stores}); the five siblings were coalesced (coalesced=${after.coalesced})`, after.stores === 1 && after.coalesced === 5 && after.misses === 1);
ok(`the parallel burst stayed under 45s (${wall}ms)`, wall < 45000);

const seventh = await ask();
const afterSeventh = llmCacheStats(cache);
ok(`the seventh identical ask is served from the memo (hits=${afterSeventh.hits}, stores stays ${afterSeventh.stores})`, afterSeventh.hits === 1 && afterSeventh.stores === 1 && seventh.text === results[0].text);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
