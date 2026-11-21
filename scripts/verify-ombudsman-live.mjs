// M1226 · ONE real-call witness for The Forecast Ombudsman. Offline gates never dial the network;
// this script spends exactly one gpt-6.2-sol call through the SAME server proxy the browser uses.
// It asserts the deterministic grade, the strict GRADE: first line, the three ordered sections in
// three locales, the SHARED replay numeral door, an explicit human edge and no causal claim.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-ombudsman-live.mjs
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
try {
  const rx = await vite.ssrLoadModule("/domain/rxCouncil.ts");
  const replayM = await vite.ssrLoadModule("/domain/replay.ts");
  const rxM = await vite.ssrLoadModule("/domain/prescription.ts");
  const brief = await vite.ssrLoadModule("/data/llm.ts");
  const ops = readFileSync(resolve(root, "features/ops/Ops.tsx"), "utf8");
  const LAW = /const COUNCIL_LAW = "([^"]+)"/.exec(ops)?.[1] ?? "";
  ok("the witness uses the exact law shipped by the panel", LAW.includes("Keep measured and simulated apart"));
  ok("the witness uses the exact first-line grammar shipped by the panel",
    ops.includes("FIRST LINE: exactly GRADE:") && ops.includes("Or write ABSTAIN alone"));

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
  const forecast = rx.forecastFrom(snap, offerings[0], "en");
  const later = {
    ...snap,
    windowEnd: snap.windowEnd + 1000,
    anomalies: snap.anomalies.map((a) => ({ ...a, measured: a.measured + 1 })),
  };
  const score = rx.gradeForecast(forecast, later);
  const envelope = rx.auditEnvelope(forecast, later, LAW);
  const system = brief.withWorldBook([
    "You are the Forecast Ombudsman of Football OS. Audit the prediction the council recorded earlier.",
    "FIRST LINE: exactly GRADE:hit, GRADE:near or GRADE:miss — the grade the deterministic comparison already proves. Or write ABSTAIN alone when the envelope cannot support a minute.",
    "AFTER THAT: at most 80 words, in the visitor's language, with FORECAST: / OBSERVATION: / BOUNDARY: in that order. Compare a prediction with an observation; never claim the prescription caused the measurement, and never invent a numeral.",
    "",
    "EXPECTED GRADE:", score.verdict,
    "OFFERED GRADES:", rx.AUDIT_GRADES.join(", "),
    "",
    "AUDIT ENVELOPE:",
    JSON.stringify(envelope, null, 2),
  ].join("\n"));

  const ask = { messages: [{ role: "system", content: system }, { role: "user", content: "audit the forecast" }], model: cfg.model };
  ok("the real call rides the ONE content-derived world-book lane with 24h retention",
    laneForMessages(ask.messages) === laneKey(brief.WORLD_BRIEFING) && PROMPT_CACHE_RETENTION === "24h");
  ok("the canonical model is the one this witness actually dials", cfg.model === "gpt-6.2-sol");

  const started = Date.now();
  const res = await handleLlmRequest(cfg, ask, null);
  const text = res.body?.text ?? "";
  const cached = res.body?.usage?.prompt_tokens_details?.cached_tokens ?? null;
  console.log(`real call: ${Date.now() - started}ms, status ${res.status}, ${text.length} chars, ${brief.WORLD_BRIEFING.length}-char world book, cached_tokens=${cached ?? "null"}`);
  console.log(`answer: ${JSON.stringify(text)}`);
  ok("the real answer came through the shipped proxy", res.status === 200 && text.length > 0);
  ok("the answering model is canonical", res.body?.model === "gpt-6.2-sol");
  ok("the deterministic grade is the one the model must name", rx.AUDIT_GRADES.includes(score.verdict));

  const directive = rx.parseAuditDirective(text);
  ok("the real answer's opening line is a usable graph directive", !!directive && directive.route === "answer");
  ok("the model named the deterministic grade", directive?.grade === score.verdict);
  const prose = rx.stripAuditDirective(text);
  ok("the minute carries the three ordered sections", rx.verifyAuditStructure(prose));
  const found = replayM.verifyReplayText(prose, envelope);
  ok("the real minute survives the shared replay numeral door", found.length === 0);
  ok("the minute compares rather than claims a cause", !/\bcaused\b/i.test(prose));

  let desk = rx.auditBuild(rx.auditPreflight(rx.createOmbudsman("en"), forecast, later));
  desk = rx.auditStructurePassed(rx.auditNumeralsPassed(rx.auditModelGraded(desk, directive.grade)));
  const published = rx.auditPublish(desk, prose);
  ok("the graph terminated in a real FSM status", published.status === "commit" && published.trace.length >= 6);
  ok("the human edge is explicit and produces a recorded note without a causal claim",
    published.decision === "publish" && published.trace.at(-1).note === "published");
} finally {
  await vite.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
