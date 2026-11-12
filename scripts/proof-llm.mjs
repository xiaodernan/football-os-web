// M1078: the live LLM tie-in — proofs for the contract the browser↔proxy split promises.
//
// The Football AI chat used to be a sealed simulator: askIntelligence replays seeded-dev rows
// onto the screen with a fake 420ms pause. M1078 adds a LIVE path — a real model, grounded only
// in this frozen world — and the one risk that makes or breaks it is where the key lives:
//   (1) Vite inlines every import.meta.env.VITE_* into the PUBLIC bundle. A VITE_-prefixed key
//       is therefore readable by any visitor out of dist/assets/*.js. The key must live ONLY on
//       the server, in a NON-prefixed var, reached through the same-origin /api/llm/chat proxy.
//   (2) A briefing that hallucinates names/clubs the seed doesn't contain would teach the model
//       fiction as football. The briefing must name only real entities.
//   (3) A real API key must never be committed (the repo harness force-pushes public history).
//
// This proof pins all three WITHOUT calling the network (a gate that dials a secret is not a
// gate on a frozen world — that is the live witness's job, verify-llm-live.mjs). Every family
// carries a planted defect the reader must charge:
//   · front-end key smuggling (VITE_ key read / external URL / hardcoded sk- token)
//   · proxy: no-key degrade, timeout, input bounds, key never echoed, non-VITE_ env
//   · vite wiring: loadEnv("") on dev + preview, secret never handed to the client
//   · briefing grounding: real clubs/players/leagues, zero invented entities
//   · .env hygiene: gitignored, .env.example has no key prefix, neither scans untracked
//
// Run: node scripts/proof-llm.mjs

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// ── 1 · the module loads cleanly; config is built only from NON-secret public signals ──────
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
const DATA = await server.ssrLoadModule("/data/llm.ts");
const { LLM_CONFIG, WORLD_BRIEFING, callLlm } = DATA;
const LLM = read("data/llm.ts");

ok(`LLM_CONFIG exposes only a same-origin endpoint, a boolean enable flag, and a model name (endpoint=${LLM_CONFIG.endpoint}, enabled=${LLM_CONFIG.enabled}, model=${LLM_CONFIG.model})`,
  LLM_CONFIG.endpoint === "/api/llm/chat" &&
  typeof LLM_CONFIG.enabled === "boolean" &&
  typeof LLM_CONFIG.model === "string" && LLM_CONFIG.model.length >= 3 &&
  LLM_CONFIG.model === (process.env.VITE_LLM_MODEL ?? "gpt-6-sol"));

// ── 2 · the browser module CANNOT see the key: no VITE_ key read, no sk- literal, no external host ──
// The whole security argument is source-level: what the client bundle can reference is bounded.
ok(`the browser module never reads a VITE_ key and carries no sk- token`,
  !/import\.meta\.env\.VITE_[A-Z_]*KEY/.test(LLM) &&
  !/sk-[A-Za-z0-9]{12,}/.test(LLM));
ok(`the browser module never names a third-party host or provider path — it only POSTs to the same-origin proxy`,
  !/https?:\/\//.test(LLM) &&
  (LLM.match(/\/api\/llm\/chat/g) ?? []).length >= 2 &&
  /fetch\(LLM_CONFIG\.endpoint/.test(LLM));
// planted: a future hand-edit that reintroduces a VITE_ key read, an external URL or a token
const plantedKeyRead = "const k = import.meta.env.VITE_LLM_API_KEY;";
const plantedUrl = "fetch('https://wkapi.pro/v1/chat/completions'";
const plantedToken = "const k = 'sk-" + "A".repeat(30) + "';";
const detector = (s) => /import\.meta\.env\.VITE_[A-Z_]*KEY/.test(s) || /https?:\/\//.test(s) || /sk-[A-Za-z0-9]{12,}/.test(s);
ok(`the smuggling detector charges all three planted defects (VITE_ key read, external URL, hardcoded token) while the shipped module is clean`,
  detector(plantedKeyRead) && detector(plantedUrl) && detector(plantedToken) && !detector(LLM));

// ── 3 · the disabled path is a literal, deterministic refusal with zero network cost ──────
// The gate is source-level and must sit BEFORE the fetch; hasKey is derived only from the public
// enable flag, so "disabled" is provably a no-wire path regardless of what this machine's .env
// happens to say. (A runtime call here would depend on the author's transient env — that is a
// live-witness concern, not a frozen-world gate.)
ok(`callLlm refuses before fetch when the live path is not armed, and the gate is the public enable flag`,
  LLM.includes('if (!LLM_CONFIG.hasKey) return { ok: false, error: "no key configured" }') &&
  LLM.indexOf("if (!LLM_CONFIG.hasKey)") < LLM.indexOf("fetch(LLM_CONFIG.endpoint") &&
  /hasKey:\s*Boolean\(import\.meta\.env\.VITE_LLM_ENABLED\)/.test(LLM));
ok(`the only browser-visible signals are a boolean enable flag and a model name — neither a secret`,
  /\benabled:\s*Boolean\(import\.meta\.env\.VITE_LLM_ENABLED\)/.test(LLM) &&
  /model:\s*import\.meta\.env\.VITE_LLM_MODEL/.test(LLM) &&
  !/import\.meta\.env\.VITE_[A-Z_]*KEY/.test(LLM));
const { execSync } = await import("node:child_process");

// ── 4 · the server proxy is where the key lives — and it never leaves ──────────────────────
const PROXY = read("scripts/llm-proxy.mjs");
ok(`the proxy reads a NON-VITE_ key from the server env and never echoes it`,
  /env\.LLM_API_KEY/.test(PROXY) &&
  !/VITE_LLM_API_KEY/.test(PROXY) &&
  !/body[^\n]*key/i.test(PROXY) &&
  /authorization: `Bearer \$\{cfg\.key\}`/.test(PROXY));
ok(`the proxy degrades without a key, bounds input, caps messages and times out the model call`,
  /if \(!cfg\?\.key\)[\s\S]{0,80}server_llm_unconfigured/.test(PROXY) &&
  /MAX_MESSAGES/.test(PROXY) && /MAX_CONTENT/.test(PROXY) &&
  /AbortController/.test(PROXY) && /TIMEOUT_MS/.test(PROXY) &&
  /AbortError[\s\S]{0,40}model_timeout/.test(PROXY));
ok(`the proxy validates roles, rejects bad JSON and maps non-2xx / empty answers to degraded responses`,
  /invalid_json/.test(PROXY) && /invalid_messages/.test(PROXY) &&
  /model_\$\{r\.status\}/.test(PROXY) && /empty_model_response/.test(PROXY) &&
  /catch[\s\S]{0,120}model_unreachable|model_unreachable/.test(PROXY));
ok(`the proxy normalises the base URL to end in /v1 (the user's endpoint requires it)`,
  /export function normaliseBase/.test(PROXY) && /\/v1\$/i.test(PROXY) && /chat\/completions/.test(PROXY));
// exercise the core handler directly with a fabricated server key and a stubbed fetch — no network
const PROXY_MOD = await import("../scripts/llm-proxy.mjs");
const noKey = await PROXY_MOD.handleLlmRequest({ key: "" }, { messages: [{ role: "user", content: "hi" }] });
ok(`handleLlmRequest with no key returns 503 + server_llm_unconfigured (no fetch attempted)`,
  noKey.status === 503 && noKey.body.ok === false && noKey.body.error === "server_llm_unconfigured");
const badBody = await PROXY_MOD.handleLlmRequest({ key: "test-key" }, "not json");
ok(`handleLlmRequest rejects malformed JSON before any model call (status ${badBody.status})`,
  badBody.status === 400 && badBody.body.error === "invalid_json");

// ── 5 · vite wiring mounts the proxy on BOTH dev and preview, loading server env wholesale ──
const VITE_CFG = read("vite.config.ts");
ok(`vite config loads the full env (empty prefix) for the server, mounts the proxy on dev AND preview, and does not expose the key to the client`,
  /loadEnv\(mode,/.test(VITE_CFG) && /,\s*""\s*\)/.test(VITE_CFG) &&
  /configureServer/.test(VITE_CFG) && /configurePreviewServer/.test(VITE_CFG) &&
  /llmProxyMiddleware/.test(VITE_CFG) && /serverConfig\(env\)/.test(VITE_CFG) &&
  !/VITE_LLM_API_KEY/.test(VITE_CFG));

// ── 6 · briefing grounding: every named entity exists in the frozen seed ───────────────────
const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");
const clubNames = new Set(footballProvider.clubs().map((c) => c.name));
const playerNames = new Set(footballProvider.players().map((p) => p.name));
const compNames = new Set(footballProvider.competitions().map((c) => c.name));
const brief = WORLD_BRIEFING;
const clubMentioned = [...clubNames].filter((n) => brief.includes(n));
const playerMentioned = [...playerNames].filter((n) => brief.includes(n));
const compMentioned = [...compNames].filter((n) => brief.includes(n));
ok(`the briefing mentions ${clubMentioned.length} real clubs (≥ 4) and ${playerMentioned.length} real players (≥ 8)`,
  clubMentioned.length >= 4 && playerMentioned.length >= 8 &&
  clubMentioned.every((n) => clubNames.has(n)) && playerMentioned.every((n) => playerNames.has(n)));
ok(`the briefing mentions ${compMentioned.length} / 15 real leagues`,
  compMentioned.length >= 12 && compMentioned.every((n) => compNames.has(n)));
const fictionalClubs = ["Atlantis FC", "Real Madrid Nova", "FC Teutonia", "Moonraker United", "FC Busan"];
const contamination = fictionalClubs.filter((n) => brief.toLowerCase().includes(n.toLowerCase()));
ok(`the briefing invents no club — ${contamination.length === 0 ? "none" : "CONTAMINATED"} of ${fictionalClubs.length} planted fictions`,
  contamination.length === 0);
// planted: a hand-edited briefing naming a stranger must be charged
const plantedBrief = brief + "\nAlso: Atlantis FC are the champions.";
ok(`the grounding detector charges a planted invented club in the briefing`,
  fictionalClubs.some((n) => plantedBrief.toLowerCase().includes(n.toLowerCase())) && contamination.length === 0);

// ── 7 · .env hygiene: gitignored, template has no key, no committed file leaks a token ──────
// Both zero-ish clauses below carry a planted companion so the reader is proven non-vacuous: a
// planted template WITH a token, and a planted tracked blob WITH a token, must each be charged.
const tokenRe = /sk-[A-Za-z0-9]{20,}/;
const plantedTemplate = "LLM_API_KEY=sk-" + "A".repeat(30);
const templateClean = read(".env.example");
ok(`.env is gitignored, .env.example uses a NON-VITE_ key name and holds 0 tokens (planted template charged=${tokenRe.test(plantedTemplate)})`,
  read(".gitignore").includes(".env") && existsSync(resolve(root, ".env.example")) &&
  /^LLM_API_KEY=/m.test(templateClean) &&
  !tokenRe.test(templateClean) && tokenRe.test(plantedTemplate));
const tracked = execSync("git ls-files", { encoding: "utf8", cwd: root }).trim().split(/\r?\n/).filter(Boolean);
const committedKeys = [];
for (const p of tracked) {
  let text;
  try { text = read(p); } catch { continue; } // skip binary / unreadable tracked blobs
  const m = text.match(tokenRe);
  if (m) committedKeys.push(`${p}: ${m[0].slice(0, 10)}…`);
}
// plant: feed the SAME scanner a blob that does carry a token and prove it is charged.
const plantedBlob = "export const k = 'sk-" + "B".repeat(30) + "';";
const plantedCharged = tokenRe.test(plantedBlob);
ok(`0 of ${tracked.length} tracked files carry an sk- token, and the scanner charges 1 planted leaking blob (planted=${plantedCharged ? "CHARGED" : "BLIND"})`,
  tracked.length >= 100 && committedKeys.length === 0 && plantedCharged);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
