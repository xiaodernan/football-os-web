// M1218 · long-context witness — TWO real calls, never three: one cold write of the
// enlarged world-book prefix, one byte-identical read. Prints only token counts and a
// short answer fragment; the key is never read by name, echoed, or logged.
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleLlmStream, serverConfig } from "../scripts/llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readServerEnv = () => {
  const env = { ...process.env };
  const p = resolve(root, ".env");
  if (existsSync(p)) for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2];
  }
  return env;
};

const cfg = serverConfig(readServerEnv());
if (!cfg.key) { console.error("UNVERIFIED — no server-only LLM_API_KEY"); process.exit(78); }
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let system;
try {
  const { withWorldBook } = await vite.ssrLoadModule("/data/llm.ts");
  system = withWorldBook(JSON.stringify({ lens: "crown", mode: "long-context-witness" }));
} finally {
  await vite.close();
}
console.log(`world-book system prefix: ${system.length} chars ≈ ${Math.round(system.length / 4)} tokens (estimate)`);

const ask = async (i) => {
  const out = await handleLlmStream(cfg, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: "From THE COMPLETE TAPE only: name one finished fixture and its exact score. One short sentence." },
    ],
    model: cfg.model,
    stream: true,
  }, null);
  const reader = out.stream.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "", usage = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("{")) continue;
      try {
        const j = JSON.parse(t);
        if (j.t === "delta") text += j.d;
        if (j.t === "end" && j.usage) usage = j.usage;
      } catch { /* partial frame */ }
    }
  }
  const cached = usage?.prompt_tokens_details?.cached_tokens ?? null;
  const prompt = usage?.prompt_tokens ?? null;
  console.log(`ask ${i}: status=${out.status} cached=${cached ?? "null"} prompt=${prompt ?? "null"} share=${typeof cached === "number" && prompt ? (100 * cached / prompt).toFixed(1) + "%" : "n/a"} | ${JSON.stringify(text.slice(0, 120))}`);
  return { cached, prompt, text };
};

const a = await ask(1);
const b = await ask(2);
console.log(`verdict: ${typeof b.cached === "number" && b.cached > 0 ? "provider prefix cache carried the enlarged book" : "no cached_tokens reported — measurement hole, not a claim"}`);
console.log(`byte-identical answer: ${a.text === b.text}`);
