// M1219 · ONE real-call witness for door 14. The offline proof gates never dial the network;
// this script spends exactly one gpt-6.2-sol call through the SAME server proxy the browser uses,
// and checks that the model's first line really selected a lens the shared verifier can prove.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-cartographer-live.mjs
// NOT part of npm run proof. The key is read from .env by the server process and NEVER printed.
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleLlmRequest, serverConfig, laneForMessages, laneKey, PROMPT_CACHE_RETENTION } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.LLM_LIVE !== "1") {
  console.error("UNVERIFIED — set LLM_LIVE=1 to run this witness (it spends one real call).");
  process.exit(78);
}
const env = { ...process.env };
if (existsSync(resolve(root, ".env"))) {
  for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2];
  }
}
const cfg = serverConfig(env);
if (!cfg.key) { console.error("UNVERIFIED — no server-side LLM key in .env"); process.exit(78); }

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const W = await vite.ssrLoadModule("/domain/witnessBench.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");

const routingEnvelope = Object.fromEntries(W.WITNESS_LENSES.map((id) => [id, W.benchEnvelope(id)]));
const system = brief.withWorldBook([
  "You are the Cartographer of Football OS. You choose which lens the witness reads, then speak from it.",
  "FIRST LINE: exactly LENS:crown, LENS:chase or LENS:form — pick the lens whose sealed envelope best supports one truthful sentence. Or write ABSTAIN alone if none can.",
  "AFTER THAT: one plain paragraph, at most 90 words, in the visitor's language.",
  "Every numeral in the paragraph must appear in the CHOSEN envelope. Never invent a club, a competition, a result or a future tense.",
  "",
  "ROUTING ENVELOPE:",
  JSON.stringify(routingEnvelope, null, 2),
].join("\n"));
const ask = {
  messages: [{ role: "system", content: system }, { role: "user", content: "the model chooses the lens" }],
  model: cfg.model,
};

ok("the shipped lane helper puts this routing ask on the one content-derived world-book lane",
  laneForMessages(ask.messages) === laneKey(brief.WORLD_BRIEFING) && PROMPT_CACHE_RETENTION === "24h");
ok("the canonical model is the one this witness actually dials", cfg.model === "gpt-6.2-sol");

const started = Date.now();
const res = await handleLlmRequest(cfg, ask, null); // no local memo: this is a real upstream witness
const text = res.body?.text ?? "";
console.log(`real call: ${Date.now() - started}ms, status ${res.status}, ${text.length} chars, ${brief.WORLD_BRIEFING.length}-char world book`);
console.log(`answer: ${JSON.stringify(text)}`);
ok("the real model answered through the shipped proxy", res.status === 200 && res.body?.ok === true && text.length > 0);
ok("the answer's model field is the canonical one", res.body?.model === "gpt-6.2-sol");

const directive = W.parseBenchDirective(text);
console.log(`first line: ${directive ? (directive.lens ?? "ABSTAIN") : "NO DIRECTIVE"}`);
ok("the model's first line is a usable graph directive", directive !== null);
if (directive && directive.lens) {
  const prose = W.stripBenchDirective(text);
  const found = W.verifyBenchText(prose, W.benchEnvelope(directive.lens));
  console.log(`chosen lens ${directive.lens}; verifier: ${found.length === 0 ? "pass" : found.join(",")}`);
  ok("the prose beside the chosen lens rides the shared numeral verifier", found.length === 0);
  const desk = W.benchCommit(W.benchPrecommit(W.benchModelChose(
    W.benchBuild(W.benchPreflight(W.createBench(directive.lens, "en"))), directive.lens), "pass"), prose);
  ok("the model-chosen edge walks into a committed state with the model named as chooser",
    desk.status === "commit" && desk.chosenBy === "model" && desk.route === "answer");
} else {
  console.log("ABSTAIN is an honest graph edge; no prose is committed.");
}

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
