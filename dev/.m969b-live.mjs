import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleLlmStream, serverConfig } from "../scripts/llm-proxy.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function readServerEnv() {
  const env = { ...process.env };
  const p = resolve(root, ".env");
  if (existsSync(p)) for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2];
  }
  return env;
}
const cfg = serverConfig(readServerEnv());
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { WORLD_BRIEFING, windowHistory } = await server.ssrLoadModule("/data/llm.ts");
const history = [];
const questions = [
  "Who leads the Premier League table in this demo world?",
  "And how many points do they have over the chasing pack?",
];
let deltas = 0;
let firstDeltaAt = 0;
const t0 = Date.now();
for (const q of questions) {
  history.push({ role: "user", content: q });
  const out = await handleLlmStream(cfg, { messages: [{ role: "system", content: WORLD_BRIEFING }, ...windowHistory(history)], model: cfg.model, stream: true }, null);
  if (!out.stream) { console.log("NO-STREAM:", out.status, JSON.stringify(out.body).slice(0, 120)); continue; }
  const reader = out.stream.getReader();
  let text = "";
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const f = JSON.parse(line);
        if (f.t === "delta") { deltas++; if (!firstDeltaAt) firstDeltaAt = Date.now() - t0; text += f.d; }
        if (f.t === "end") console.log(`  end frame: ok=${f.ok} usage=${f.usage ? "present" : "omitted"}`);
      } catch {}
    }
  }
  console.log(`turn "${q.slice(0, 32)}…" → deltas=${deltas} chars=${text.length} first-delta≈${firstDeltaAt}ms`);
  console.log("  answer:", JSON.stringify(text.slice(0, 140)));
  history.push({ role: "assistant", content: text });
}
console.log(`TOTAL deltas across turns: ${deltas} (streaming reaches the browser boundary)`);
await server.close();
