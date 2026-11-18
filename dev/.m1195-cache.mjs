// M1195 cache probe — the counsel door's warm lane, measured. Three IDENTICAL counsel asks with a
// fresh server memo each time: ask 1 is the cold write; asks 2/3 must read the provider's prefix cache.
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
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { WORLD_BRIEFING } = await server.ssrLoadModule("/data/llm.ts");
const counsel = await server.ssrLoadModule("/domain/counsel.ts");

const facts = { liveMatchId: null, nextMatchId: "fx-1", nextMatchInMinutes: 90, plannedSessions: 2, filmClips: 0, badgeWaiting: false, watchlist: 1 };
const system = `${WORLD_BRIEFING}\nYou are the counsel of Football OS — an imprisoned advisor.\nAnswer the visitor's next-step question ONLY from the FACTS_ENVELOPE below and THE WORLD BOOK above.\nEvery numeral you print must be one of the numbers in FACTS_ENVELOPE.\nAt most three sentences, in the visitor's language.\n\nFACTS_ENVELOPE:\n${counsel.counselEnvelope(facts)}`;

const ask = async (i) => {
  const out = await handleLlmStream(cfg, {
    messages: [
      { role: "system", content: system },
      { role: "user", content: "What should I step into next? One or two sentences, grounded ONLY in my facts." },
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
      try { const j = JSON.parse(t); if (j.t === "delta") text += j.d; if (j.t === "end" && j.usage) usage = j.usage; } catch {}
    }
  }
  console.log(`ask ${i}: cached=${usage?.prompt_tokens_details?.cached_tokens ?? "null"} prompt=${usage?.prompt_tokens ?? "null"} | ${JSON.stringify(text.slice(0, 60))}…`);
  return usage;
};

for (let i = 1; i <= 3; i++) await ask(i);
await server.close();
