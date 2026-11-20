// M1225 · ONE real-call witness for the Prescription Council's model edge. Offline gates never dial
// the network; this script spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses. It asserts the strict RX:<id> first line, the SHARED sealed replay envelope, the
// shared numeral door, an explicit operator decision and a forecast graded by a later measured hour.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-rxcouncil-live.mjs
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
const rx = await vite.ssrLoadModule("/domain/rxCouncil.ts");
const replayM = await vite.ssrLoadModule("/domain/replay.ts");
const rxM = await vite.ssrLoadModule("/domain/prescription.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");

const ops = readFileSync(resolve(root, "features/ops/Ops.tsx"), "utf8");
const LAW = "Write only numerals printed in the sealed replay envelope. Keep measured and simulated apart; never invent a figure, a cause, a route or a future promise.";
ok("the witness uses the exact law shipped by the panel", ops.includes(`const COUNCIL_LAW = "${LAW}"`));
ok("the witness uses the exact first-line grammar shipped by the panel",
  ops.includes("FIRST LINE: exactly RX:<id>") && ops.includes("Or write ABSTAIN alone"));

const now = 1_800_000_000_000;
const visits = [
  { path: "/", at: now - 3_000_000, dwellMs: 1_000 },
  { path: "/football", at: now - 2_900_000, dwellMs: 40_000 },
  { path: "/library", at: now - 2_800_000, dwellMs: 20_000 },
  { path: "/", at: now - 900_000, dwellMs: 2_000 },
  { path: "/ops", at: now - 800_000, dwellMs: 1_000 },
];
const snap = replayM.replayFold(visits, now);
const offerings = rx.offerPrescriptions(rxM.foldPrescription(snap.recorded));
ok("the sealed replay envelope offers a real prescription shelf", offerings.length > 0);
const envelope = rx.councilEnvelope(snap, offerings, LAW);

const system = brief.withWorldBook([
  "You are the Prescription Council of Football OS. Propose ONE concrete next move for the operator.",
  "FIRST LINE: exactly RX:<id> using one of the offered ids below. Or write ABSTAIN alone when the envelope cannot support a move.",
  "AFTER THAT: at most 70 words, in the visitor's language, naming the measured or simulated figure that justifies this one move. Keep the two provenances distinct. Do not invent a numeral, a cause or a future promise.",
  "",
  "OFFERED PRESCRIPTIONS:",
  JSON.stringify(offerings.map((o) => ({ id: o.id, severity: o.severity, anomaly: o.anomaly, score: o.score, vars: o.vars })), null, 2),
  "",
  "REPLAY ENVELOPE:",
  JSON.stringify(envelope, null, 2),
].join("\n"));

const ask = { messages: [{ role: "system", content: system }, { role: "user", content: "propose the next move" }], model: cfg.model };
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

const directive = rx.parseCouncilDirective(text, offerings);
ok("the real answer's opening line is a usable graph directive", directive !== null);
if (!directive) { await vite.close(); process.exit(1); }

const desk0 = rx.councilBuild(rx.councilPreflight(rx.createCouncil("en"), offerings));
let desk;
if (directive.route === "abstain" || directive.id === null) {
  desk = rx.councilAbstained(desk0, "ABSTAIN is an honest graph edge.");
} else {
  const prose = rx.stripCouncilDirective(text);
  const found = replayM.verifyReplayText(prose, envelope);
  console.log(`shared numeral verifier: ${found.length === 0 ? "pass" : found.join(",")}`);
  ok("the real proposal survives the shared replay numeral door", found.length === 0);
  const s1 = rx.councilModelProposed(desk0, directive.id);
  desk = found.length === 0
    ? rx.councilVerified(s1)
    : rx.councilProposalRefused(s1, "fold");
}
ok("the graph terminated in a real FSM status", desk.status === "commit" || desk.status === "refused");
console.log(`final graph status ${desk.status}, note ${desk.trace.at(-1).note}, ${desk.trace.length} trace entries`);

if (desk.status === "commit" && desk.proposalId) {
  const chosen = offerings.find((o) => o.id === desk.proposalId);
  const adopted = rx.councilAdopt(desk, desk.answer);
  ok("the operator edge is explicit and produces a forecast for the next hour",
    adopted.decision === "adopt" && adopted.trace.at(-1).note === "adopted" && chosen !== undefined);
  const forecast = rx.forecastFrom(snap, chosen, "en");
  const later = { anomalies: [{ id: forecast.anomaly, measured: forecast.predicted }] };
  ok("the recorded forecast is gradeable by a later measured hour without a causal claim",
    rx.gradeForecast(forecast, later).verdict === "hit");
}

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
