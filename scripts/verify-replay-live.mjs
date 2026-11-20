// M1222 · ONE real-call witness for the Replay Room's model edge. Offline gates never dial the
// network; this script spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses. It asserts the strict ANOMALY first line, the shared evidence-number law, the
// provenance-tagged envelope and the warm 24h world-book lane.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-replay-live.mjs
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
const R = await vite.ssrLoadModule("/domain/replay.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");

const opsSource = readFileSync(resolve(root, "features/ops/Ops.tsx"), "utf8");
const LAW = "Every figure below is tagged measured or simulated. Never swap the two. Answer in the visitor's language, at most 60 words, and use ONLY these figures.";
ok("the witness uses the exact law shipped by the panel", opsSource.includes(`const REPLAY_LAW = "${LAW}"`));
ok("the witness uses the exact first-line grammar shipped by the panel",
  opsSource.includes("FIRST LINE: exactly ANOMALY:entryBounce") && opsSource.includes("Or write ABSTAIN alone"));

const now = Date.now();
const visits = [
  { path: "/", at: now - 3_000_000, dwellMs: 1_000 },
  { path: "/football", at: now - 2_900_000, dwellMs: 40_000 },
  { path: "/library", at: now - 2_800_000, dwellMs: 20_000 },
  { path: "/", at: now - 900_000, dwellMs: 2_000 },
  { path: "/ops", at: now - 800_000, dwellMs: 1_000 },
];
const snap = R.replayFold(visits, now);
const envelope = R.replayEnvelope(snap, LAW);
ok("the envelope carries both provenance streams",
  envelope.recorded.visits.source === "measured" && envelope.predicted.visits.source === "simulated" &&
  envelope.anomalies.every((a) => a.measured.source === "measured" && a.simulated.source === "simulated"));

const system = brief.withWorldBook([
  "You are the Replay Examiner of Football OS. Choose ONE anomaly worth investigating.",
  "FIRST LINE: exactly ANOMALY:entryBounce, ANOMALY:deepExit, ANOMALY:loopDetour or ANOMALY:deadEnd. Or write ABSTAIN alone when the envelope cannot support a choice.",
  "AFTER THAT: at most 60 words, in the visitor's language, naming the measured and simulated figures of the chosen anomaly. Keep the two provenances distinct. Do not invent a numeral, a cause or a future promise.",
  "",
  "REPLAY ENVELOPE:",
  JSON.stringify(envelope, null, 2),
].join("\n"));

const ask = { messages: [{ role: "system", content: system }, { role: "user", content: "examine the replay" }], model: cfg.model };
ok("the real call rides the ONE content-derived world-book lane with 24h retention",
  laneForMessages(ask.messages) === laneKey(brief.WORLD_BRIEFING) && PROMPT_CACHE_RETENTION === "24h");
ok("the canonical model is the one this witness actually dials", cfg.model === "gpt-6.2-sol");

const started = Date.now();
const res = await handleLlmRequest(cfg, ask, null); // no local memo: this is a real upstream witness
const text = res.body?.text ?? "";
const cached = res.body?.usage?.prompt_tokens_details?.cached_tokens ?? null;
console.log(`real call: ${Date.now() - started}ms, status ${res.status}, ${text.length} chars, ${brief.WORLD_BRIEFING.length}-char world book, cached_tokens=${cached ?? "null"}`);
console.log(`answer: ${JSON.stringify(text)}`);

ok("the real answer came through the shipped proxy", res.status === 200 && res.body?.ok === true && text.length > 0);
ok("the answering model is canonical", res.body?.model === "gpt-6.2-sol");

const directive = R.parseReplayDirective(text);
ok("the real answer's opening line is a usable graph directive", directive !== null);
if (!directive) { await vite.close(); process.exit(1); }

const desk0 = R.replayBuild(R.replayPreflight(R.createReplay("en"), snap));
let desk;
if (directive.route === "abstain" || directive.anomaly === null) {
  desk = R.replayAbstained(desk0, "ABSTAIN is an honest graph edge.");
} else {
  const prose = R.stripReplayDirective(text);
  const found = R.verifyReplayText(prose, envelope);
  console.log(`chosen anomaly ${directive.anomaly}; evidence verifier: ${found.length === 0 ? "pass" : found.join(",")}`);
  ok("the real prose stays inside the provenance-tagged envelope", found.length === 0);
  desk = found.length === 0
    ? R.replayCommit(R.replayPrecommit(R.replayModelChose(desk0, directive.anomaly), "pass"), prose)
    : R.replayRefused(R.replayPrecommit(R.replayModelChose(desk0, directive.anomaly), "refused"), prose);
}
ok("the graph terminated in a real FSM status", desk.status === "commit" || desk.status === "refused");
console.log(`final graph status ${desk.status}, note ${desk.trace.at(-1).note}, ${desk.trace.length} trace entries`);

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
