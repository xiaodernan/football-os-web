// M1195 live witness — The Counselor, against the real provider.
// Arms the door exactly as Counselor.tsx does: the reader's own NextStepFacts folded into the
// envelope, the world book riding the lane, the model's words re-proved sentence by sentence
// against the same fold the reader sees. Any numeral the fold cannot vouch for, or any forecast,
// and the refusal arm stands: the fold's own reading, verbatim.
//
//   node dev/.m1195-live.mjs   (needs network + the server-only key in .env; through Clash-verge if armed)

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
if (!cfg.key) {
  console.error("no server-only LLM_API_KEY in .env — nothing to prove");
  process.exit(1);
}

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { WORLD_BRIEFING } = await server.ssrLoadModule("/data/llm.ts");
const counsel = await server.ssrLoadModule("/domain/counsel.ts");

const facts = { liveMatchId: null, nextMatchId: "fx-1", nextMatchInMinutes: 90, plannedSessions: 2, filmClips: 0, badgeWaiting: false, watchlist: 1 };
const envelope = counsel.counselEnvelope(facts);

const withBook = [
  "You are the counsel of Football OS — an imprisoned advisor.",
  "Answer the visitor's next-step question ONLY from the FACTS_ENVELOPE below and THE WORLD BOOK above.",
  "Every numeral you print must be one of the numbers in FACTS_ENVELOPE. Never invent a match, a player, a club or a fixture. If the visitor asks beyond these facts, say so plainly; never guess. Never predict.",
  "At most three sentences, in the visitor's language — tight, concrete, grounded in the numbers below.",
  "",
  "FACTS_ENVELOPE:",
  envelope,
].join("\n");

console.log(`provider: ${cfg.baseUrl} · model: ${cfg.model} · facts: ${envelope}`);

const out = await handleLlmStream(cfg, {
  messages: [
    { role: "system", content: `${WORLD_BRIEFING}\n${withBook}` },
    { role: "user", content: "What should I step into next? One or two sentences, grounded ONLY in my facts." },
  ],
  model: cfg.model,
  stream: true,
}, null);

if (!out.stream) {
  console.error("NO-STREAM:", out.status, JSON.stringify(out.body).slice(0, 240));
  process.exit(1);
}
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
    if (!t || !t.startsWith("{")) continue;
    try {
      const j = JSON.parse(t);
      if (j.t === "delta" && typeof j.d === "string") text += j.d;
      if (j.t === "end" && j.usage) usage = j.usage;
    } catch { /* partial frame */ }
  }
}

const violations = counsel.verifyCounselText(text, facts);
console.log("answer:", JSON.stringify(text));
console.log("violations:", violations.length === 0 ? "none — the fold re-proves every numeral" : violations.join(", "));
console.log("usage:", usage ? `prompt=${usage.prompt_tokens} cached=${usage.prompt_tokens_details?.cached_tokens ?? "null"}` : "provider omitted usage (M1096 lane)");

await server.close();
process.exit(0);
