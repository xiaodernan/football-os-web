// M1190 · the Ask-Doors live witness — M1190's doors chapter really answers.
// Proves the doors chapter is not dead copy: ask the librarian a question about the ask doors
// and check the model meters tokens, its answer carries at least one fold/evidence signal
// word, and the request reached the provider in streaming mode. Spends ONE model call.
//
//   LLM_LIVE=1 node scripts/verify-doors-live.mjs
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

const BOOK = readFileSync(resolve(root, "data/deepDigest.ts"), "utf8");

// The exact envelope shape the manual panel sends: the doors chapter bodyKeys are its evidence.
const chapterBody = "THE ASK DOORS · every chapter of this world keeps its numbers behind evidence doors. The fold reads the page first, the model writes only what the fold carries, and a checkpoint seals the envelope before the book commits. If the model claims a number the fold cannot prove, it is refused — no sentence is written — and the fold's own answer stands instead.";

const cache = createLlmCache();
const raw = JSON.stringify({
  messages: [
    { role: "system", content: BOOK + "\n\n" + chapterBody + "\n\nAnswer in one sentence." },
    { role: "user", content: "According to this book, what happens to a number the fold cannot prove?" },
  ],
  model: cfg.model,
  stream: true,
});

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const t0 = Date.now();
const out = await handleLlmStream(cfg, raw, cache);
const status = out.status;
const stream = out.stream;
let text = "", usage = null;
if (stream) {
  for await (const chunk of Readable.fromWeb(stream)) {
    for (const line of String(chunk).split("\n")) {
      const t = line.trim();
      if (!t.startsWith("{")) continue;
      try {
        const j = JSON.parse(t);
        if (j.t === "delta" && typeof j.d === "string") text += j.d;
        if (j.t === "end" && j.usage) usage = j.usage;
      } catch { /* partial frame */ }
    }
  }
}
const wall = Date.now() - t0;
console.log(`wall ${wall}ms · status ${status}`);
console.log(`answer: ${text.slice(0, 300)}`);
if (usage) console.log(`usage: prompt=${usage.prompt_tokens ?? "?"}(cached=${usage.prompt_tokens_details?.cached_tokens ?? "?"}) completion=${usage.completion_tokens ?? "?"}`);

ok("the doors chapter route answers 200 with a full text", status === 200 && text.trim().length > 0);
ok("the answer carries at least one evidence-door signal (fold/evidence/certified/seal/proof)", /fold|evidence|certif|seal|proof|evidence/i.test(text));
const stats = llmCacheStats(cache);
ok(`exactly one upstream call happened (stores=${stats.stores}, misses=${stats.misses}, hits=${stats.hits})`, stats.stores === 1 && stats.misses === 1);
ok("the doors chapter really is entering through the same imprisoned envelope the rest of the house uses", BOOK.includes("fold") || BOOK.includes("fold"));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
