// Witness for the warm lane (M1184): ONE real call through the real proxy stack, then the
// IDENTICAL call must be served from the in-process LRU with zero upstream spend and byte-identical
// text. This is the concrete proof that the warm lane — once armed via LLM_KEEPWARM_SECONDS on
// the dev server — will really replay the book instead of re-buying it every burst.
// Run (dev machine, real key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-warm-lane-live.mjs
// NOT part of npm run proof. Spends exactly ONE real upstream call.
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleLlmRequest, createLlmCache, serverConfig } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.LLM_LIVE !== "1") {
  console.error("UNVERIFIED — set LLM_LIVE=1 to run this witness (it spends one real call).");
  process.exit(78);
}
const env = { ...process.env };
for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !(m[1] in env)) env[m[1]] = m[2];
}
const cfg = serverConfig(env);
if (!cfg.key) { console.error("UNVERIFIED — no LLM_API_KEY in .env"); process.exit(78); }

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const brief = await vite.ssrLoadModule("/data/llm.ts");
const ask = {
  messages: [
    { role: "system", content: brief.WORLD_BRIEFING },
    { role: "user", content: "." },
  ],
  model: cfg.model,
  max_tokens: 1,
};
const cache = createLlmCache();
console.log(`brief loaded: ${brief.WORLD_BRIEFING.length} chars (the exact prefix the dev server sends)`);

const coldStart = Date.now();
const cold = await handleLlmRequest(cfg, ask, cache);
const coldMs = Date.now() - coldStart;
ok(`cold call: 200 + ok:true (${coldMs}ms, cached=${cold.body?.cached})`,
  cold.status === 200 && cold.body?.ok === true);
console.log(`cold text head: ${(cold.body?.text ?? "").slice(0, 60)}`);

const r = await handleLlmRequest(cfg, ask, cache);
const stats = cache.stats;
ok(`warm call: 200 + cached=true (stores ${stats.stores}, hits ${stats.hits}, misses ${stats.misses})`,
  r.status === 200 && r.body?.ok === true && r.body?.cached === true && r.body?.text === cold.body?.text);
ok("the warm call did not spend an upstream round-trip (misses unchanged)",
  stats.misses === 1 && stats.hits === 1);

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed. cached_tokens on the cold call: ${cold.body?.usage?.prompt_tokens_details?.cached_tokens ?? "null"}`);
process.exit(fail ? 1 : 0);
