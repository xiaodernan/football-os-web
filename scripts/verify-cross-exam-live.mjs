// M1221 · TWO real-call witness for the second model-driven graph edge. The offline gates
// never dial the network; this script spends exactly two gpt-6.2-sol calls through the SAME
// server proxy the browser uses. Call one picks the first shelf; call two names a different
// shelf and the shared numeral verifier decides whether the claim is corroborated or contested.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-cross-exam-live.mjs
// NOT part of npm run proof. The key is read from .env by the server process and NEVER printed.
import { createServer } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { handleLlmRequest, serverConfig, laneForMessages, laneKey, PROMPT_CACHE_RETENTION } from "./llm-proxy.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.env.LLM_LIVE !== "1") {
  console.error("UNVERIFIED — set LLM_LIVE=1 to run this witness (it spends two real calls).");
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
const firstSystem = brief.withWorldBook([
  "You are the Cartographer of Football OS. You choose which lens the witness reads, then speak from it.",
  "FIRST LINE: exactly LENS:crown, LENS:chase or LENS:form — pick the lens whose sealed envelope best supports one truthful sentence. Or write ABSTAIN alone if none can.",
  "AFTER THAT: one plain paragraph, at most 90 words, in the visitor's language.",
  "Every numeral in the paragraph must appear in the CHOSEN envelope. Never invent a club, a competition, a result or a future tense.",
  "",
  "ROUTING ENVELOPE:",
  JSON.stringify(routingEnvelope, null, 2),
].join("\n"));

const call = async (system, user) => {
  const ask = { messages: [{ role: "system", content: system }, { role: "user", content: user }], model: cfg.model };
  ok("both real calls share the ONE content-derived world-book lane",
    laneForMessages(ask.messages) === laneKey(brief.WORLD_BRIEFING) && PROMPT_CACHE_RETENTION === "24h");
  const started = Date.now();
  const res = await handleLlmRequest(cfg, ask, null); // no local memo: these are real upstream witnesses
  const text = res.body?.text ?? "";
  console.log(`real call: ${Date.now() - started}ms, status ${res.status}, ${text.length} chars, ${brief.WORLD_BRIEFING.length}-char world book`);
  return { res, text };
};

ok("the canonical model is the one this witness actually dials", cfg.model === "gpt-6.2-sol");

const first = await call(firstSystem, "the model chooses the lens");
console.log(`first answer: ${JSON.stringify(first.text)}`);
ok("the first real answer came through the shipped proxy", first.res.status === 200 && first.res.body?.ok === true && first.text.length > 0);
ok("the answering model is canonical", first.res.body?.model === "gpt-6.2-sol");
const firstDirective = W.parseBenchDirective(first.text);
ok("the first answer's opening line is a usable graph directive", firstDirective !== null);
if (!firstDirective) { await vite.close(); process.exit(1); }

const claim = firstDirective.lens ? W.stripBenchDirective(first.text) : "ABSTAIN";
const firstDesk = W.benchBuild(W.benchPreflight(W.createBench(firstDirective.lens ?? "crown", "en")));
let desk = firstDirective.route === "abstain"
  ? W.benchAbstained(W.benchModel(firstDesk, "abstain"), claim)
  : W.benchCommit(W.benchPrecommit(W.benchModelChose(firstDesk, firstDirective.lens), "pass"), claim);

if (firstDirective.lens) {
  const found = W.verifyBenchText(claim, W.benchEnvelope(firstDirective.lens));
  console.log(`first lens ${firstDirective.lens}; verifier: ${found.length === 0 ? "pass" : found.join(",")}`);
  ok("the first claim rides the shared numeral verifier", found.length === 0);
}

const secondSystem = brief.withWorldBook([
  "You are the second witness of Football OS. A colleague made one claim from a sealed shelf.",
  "FIRST LINE: exactly CHECK:crown, CHECK:chase or CHECK:form — name a DIFFERENT shelf from the one the claim came from. Or write ABSTAIN alone if no other shelf can test it.",
  "AFTER THAT: at most 40 words, in the visitor's language, saying only what that second shelf shows. Never invent a numeral, a club, a result or a future tense.",
  "",
  "THE CLAIM UNDER TEST:",
  claim,
  "",
  "ALL SEALED SHELVES:",
  JSON.stringify(routingEnvelope, null, 2),
].join("\n"));

const second = await call(secondSystem, "cross-examine the claim");
console.log(`second answer: ${JSON.stringify(second.text)}`);
ok("the second real answer came through the shipped proxy", second.res.status === 200 && second.res.body?.ok === true && second.text.length > 0);
ok("the second answering model is canonical", second.res.body?.model === "gpt-6.2-sol");
const crossDirective = W.parseCrossDirective(second.text);
ok("the second answer's opening line is a usable cross directive", crossDirective !== null);
if (!crossDirective) { await vite.close(); process.exit(1); }

if (crossDirective.route === "abstain" || crossDirective.lens === null) {
  desk = W.benchCrossAbstained(desk, "ABSTAIN is an honest graph edge.");
  console.log("ABSTAIN on the cross edge; the graph recorded the contested arm.");
} else if (crossDirective.lens === firstDirective.lens) {
  desk = W.benchCrossRouteInvalid(desk, "a repeated shelf cannot cross-examine itself.");
  console.log("the model repeated the first shelf; the graph refused the cross route.");
} else {
  const other = crossDirective.lens;
  const secondProse = W.stripCrossDirective(second.text);
  const secondFound = W.verifyBenchText(secondProse, W.benchEnvelope(other));
  const claimFound = W.verifyBenchText(claim, W.benchEnvelope(other));
  console.log(`second shelf ${other}; second prose verifier: ${secondFound.length === 0 ? "pass" : secondFound.join(",")}; claim: ${claimFound.length === 0 ? "pass" : claimFound.join(",")}`);
  const chosen = W.benchCrossChose(desk, other);
  desk = secondFound.length === 0 && claimFound.length === 0
    ? W.benchCrossCorroborated(chosen, secondProse)
    : W.benchCrossContested(chosen, secondProse);
}
ok("the second edge walked a recorded cross arm", desk.trace.at(-1).note.startsWith("cross"));
ok("the second edge terminated in a real FSM status", desk.status === "commit" || desk.status === "refused");
console.log(`final graph status ${desk.status}, note ${desk.trace.at(-1).note}, ${desk.trace.length} trace entries`);

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
