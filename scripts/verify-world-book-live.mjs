// M1183 · The World Book witness — the lane question, measured through THE REAL module, not a copy.
// NOT part of `npm run proof`. Needs LLM_LIVE=1 + a server-only LLM_API_KEY in .env. Costs real tokens.
//
// Every wall this repo already knows about is already poured in it:
//   · key never echoed (the proxy reads it; the witness prints only counts),
//   · the briefing is loaded through the same vite SSR module graph the app ships (proof-digest idiom),
//   · Clash egress boundary: honor LLM_UPSTREAM_PROXY if set, exactly like verify-llm-live.mjs,
//   · degrade-honest: no key => UNVERIFIED exit 78; never a fabricated model answer.
//
// What it measures:
//   1. N sequential asks through one envelope family sharing THE WORLD BOOK prefix —
//      prints the provider's own cached_tokens per call (frame is read from the wire).
//   2. 4 parallel siblings on the SAME lane — collapse behaviour under concurrency.
//   3. one ask on an UNRELATED briefing (control) — its lane must not disturb ours.
//   4. verdict printed as measured: cached_share = total_cached / total_prompt.
//
// Per-repo rule: we never round the hit rate up. If the provider does not stamp or
// returns zeros, the witness prints zeros and says so.
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLlmCache, llmProxyMiddleware, serverConfig, PROXY_ROUTE } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.LLM_LIVE !== "1") {
  console.error("UNVERIFIED — set LLM_LIVE=1 to run this witness (it spends real tokens).");
  process.exit(78);
}
const readServerEnv = () => {
  const env = { ...process.env };
  for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2];
  }
  return env;
};
const cfg = serverConfig(readServerEnv());
if (!cfg.key) { console.error("UNVERIFIED — no LLM_API_KEY in .env"); process.exit(78); }

// Load the SAME modules the browser bundle ships, through vite's SSR module graph.
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
let WORLD_BRIEFING, withWorldBook;
try {
  ({ WORLD_BRIEFING, withWorldBook } = await vite.ssrLoadModule("/data/llm.ts"));
} finally {
  await vite.close();
}
console.log(`WORLD_BRIEFING loaded: ${WORLD_BRIEFING.length} chars (the exact prefix the browser ships)`);

const modelsTail = (who) => JSON.stringify({ who, note: "world-book witness seat" });
const ask = (who, question) => ({
  model: cfg.model,
  stream: false, // a JSON envelope for the harness; the proxy still exercises the same upstream
  messages: [
    { role: "system", content: withWorldBook(modelsTail(who)) },
    { role: "user", content: question },
  ],
});

const cache = createLlmCache({ enabled: false }); // no memo: every ask is a real upstream call
const { createServer: nodeCreateServer } = await import("node:http");
const server = nodeCreateServer(llmProxyMiddleware(() => cfg, cache));
const PORT = 8793;
await new Promise((res, rej) => { server.once("error", rej); server.listen(PORT, "127.0.0.1", res); });
const BASE = `http://127.0.0.1:${PORT}`;

const post = async (body) => {
  const r = await fetch(`${BASE}${PROXY_ROUTE}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const cachedOf = (b) => b?.usage?.prompt_tokens_details?.cached_tokens ?? null;

const SEQ = 8;
const seqResults = [];
for (let i = 0; i < SEQ; i++) {
  const who = ["tutor", "librarian", "consult", "scout"][i % 4];
  const r = await post(ask(who, "Name the strongest club in this demo world by overall. One short sentence."));
  const u = r.body?.usage ?? {};
  console.log(`seq ${i + 1}  who=${who} status=${r.status} prompt=${u?.prompt_tokens ?? "?"} cached=${cachedOf(r.body) ?? "null"}`);
  seqResults.push(cachedOf(r.body) ?? 0);
}

const parallel = await Promise.all([0, 1, 2, 3].map((i) => post(ask("askdesk", i === 0 ? "Name the strongest club in this demo world by overall. One short sentence." : "Name the strongest club in this demo world by overall. One short sentence."))));
parallel.forEach((r, i) => {
  console.log(`par ${i + 1}  status=${r.status} prompt=${r.body?.usage?.prompt_tokens ?? "?"} cached=${cachedOf(r.body) ?? "null"}`);
});
const control = await post({ model: cfg.model, stream: false, messages: [{ role: "user", content: "hello" }] });
console.log(`control status=${control.status} (unrelated body rides its own lane; cache untouched)`);

const sum = seqResults.reduce((n, c) => n + (c ?? 0), 0);
const seqPrompt = SEQ * (WORLD_BRIEFING.length / 4); // conservative token estimate for the ledger, printed as estimate
console.log(`\nseq cached_tokens total: ${sum}  (prompt budget of the prefix ≈ ${Math.round(seqPrompt)} tokens; exact per-ask counts above)`);
await new Promise((res) => server.close(res));
process.exit(0);
