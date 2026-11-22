// Proof for the Warm Lane (M1184): the dev-time heartbeat that keeps the book's warm KV lane
// hot between bursts of asks. The lane refreshes when the provider sees the briefing again;
// the app must not pay a cold prefill at the start of every burst. Run: node scripts/proof-warm-lane.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";

const PROXY = readFileSync("scripts/llm-proxy.mjs", "utf8");
const VITE = readFileSync("vite.config.ts", "utf8");
const envEx = readFileSync(".env.example", "utf8");
const llmConfig = { model: "test-model", key: "fake-key-for-proof-only", baseUrl: "https://example.invalid/v1" };

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const mod = await server.ssrLoadModule("/scripts/llm-proxy.mjs");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

ok("attachWarmLane is exported and empty-env is OFF with no side-effects",
  typeof mod.attachWarmLane === "function" &&
  mod.attachWarmLane(null, { LLM_KEEPWARM_SECONDS: "0" }, llmConfig) === null &&
  mod.attachWarmLane(null, { LLM_KEEPWARM_SECONDS: "" }, llmConfig) === null &&
  mod.attachWarmLane(null, {}, llmConfig) === null);

ok("the cadence clamps to MIN 30 / MAX 900 / junk to 0 (defaults are OFF, never surprise-armed)",
  mod.clampKeepWarm("") === 0 && mod.clampKeepWarm("-5") === 0 && mod.clampKeepWarm("abc") === 0 &&
  mod.clampKeepWarm("10") === 30 && mod.clampKeepWarm("45") === 45 && mod.clampKeepWarm("9999") === 900);

ok("double-start is refused silently",
  mod.attachWarmLane({ __fo_warm: true }, { LLM_KEEPWARM_SECONDS: "45" }, llmConfig) === null);

ok("the tick goes through the same proxy stack — same bytes, same lane, never a fabricated path",
  PROXY.includes('ssrLoadModule("/data/llm.ts")') && PROXY.includes("handleLlmRequest(cfg, ask, cache ?? null)"));

ok("the tick is degrade-not-throw — errors log and move on, the dev server never crashes",
  /catch \(e\)[^]*?degrade, not throw/.test(PROXY));

ok("the timer is unref'd so the dev process exits cleanly when the user is done",
  /setInterval\(tick, sec \* 1000\)[^]*?id\.unref\?\.\(\)/.test(PROXY) &&
  /setTimeout\(tick, 1000\)\.unref\?\.\(\)/.test(PROXY));

ok("the vite config wires it on BOTH configureServer and configurePreviewServer, after every proxy mount",
  /configureServer[^]*?attachWarmLane\(server, env, llmConfig, llmCache\)/.test(VITE) &&
  /configurePreviewServer[^]*?attachWarmLane\(server, env, llmConfig, llmCache\)/.test(VITE));

ok(".env.example documents the opt-in warm lane with honest cost and token warning (no VITE_ prefix)",
  envEx.includes("LLM_KEEPWARM_SECONDS") && envEx.includes("Costs real") && !envEx.includes("VITE_KEEPWARM"));

ok("a planted fake tick cannot hide — the tick returns nothing meaningful to any caller",
  mod.attachWarmLane({ __fo_warm: false, ssrLoadModule: () => Promise.resolve({ WORLD_BRIEFING: "x" }) },
    { LLM_KEEPWARM_SECONDS: "" }, llmConfig) === null);

// M1246 The Prompt Budget found the heartbeat firing inside every proof: a proof boots a
// middlewareMode Vite server, so `configureServer` armed a tick that loaded the 235 KB world book
// on a transport that was already closing. The stack printed AFTER green tallies (the suite read it
// as evidence of a crash) and, with the live arm closed, every process paid a doomed upstream try.
const harness = { config: { server: { middlewareMode: true } }, ssrLoadModule: async () => ({ WORLD_BRIEFING: "x" }) };
ok("M1246 a headless middlewareMode harness is refused the heartbeat, and is never marked armed",
  mod.attachWarmLane(harness, { LLM_KEEPWARM_SECONDS: "45" }, llmConfig) === null &&
  harness.__fo_warm === undefined);

ok("M1246 the shipped source stops the tick when its server closes (structural read: a close listener sets the flag the tick reads and clears the interval)",
  /server\.httpServer\?\.once\?\.\("close"/.test(PROXY) &&
  /closed = true;\s*clearInterval\(id\);/.test(PROXY) &&
  /if \(closed\) return;/.test(PROXY));

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
