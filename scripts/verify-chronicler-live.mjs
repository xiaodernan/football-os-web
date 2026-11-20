// M1224 · ONE real-call witness for door 15's model edge. Offline gates never dial the network;
// this script spends exactly one gpt-6.2-sol call through the SAME server proxy the browser uses.
// It asserts the strict CHAPTER first line, BOTH verifiers in order, the sealed tape-line envelope,
// and the warm 24h world-book lane (the complete tape is the shared prefix, not the suffix).
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-chronicler-live.mjs
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
const C = await vite.ssrLoadModule("/domain/chronicler.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");
const digest = await vite.ssrLoadModule("/data/deepDigest.ts");

const panel = readFileSync(resolve(root, "features/chronicle/LongChronicler.tsx"), "utf8");
const LAW = "Write only numerals printed in the chosen fixture's tape line. Never invent a score, a date, a club, a cause or a future promise.";
ok("the witness uses the exact law shipped by the panel", panel.includes(`const CHAPTER_LAW = "${LAW}"`));
ok("the witness uses the exact first-line grammar shipped by the panel",
  panel.includes("FIRST LINE: exactly CHAPTER:<id>") && panel.includes("Or write ABSTAIN alone"));

const fixtures = C.fixturesFromTape(digest.DEEP_DIGEST);
const offered = C.pickTapeFixtures(fixtures, 3);
ok("the real complete tape offers three sealed fixtures", offered.length === 3);

const system = brief.withWorldBook([
  "You are the Long-Context Chronicler of Football OS. The complete tape of every seeded fixture is in front of you.",
  "FIRST LINE: exactly CHAPTER:<id> using one of the fixture ids listed below. Or write ABSTAIN alone if none can carry a truthful chapter.",
  "AFTER THAT: exactly three sections in this order, each on its own line: SETTING:, TURN:, ECHO:. One or two tight sentences each, in the visitor's language.",
  LAW,
  "",
  "OFFERED FIXTURES FROM THE COMPLETE TAPE:",
  JSON.stringify(offered.map((f) => ({ id: f.id, line: f.line })), null, 2),
].join("\n"));

const ask = { messages: [{ role: "system", content: system }, { role: "user", content: "write the chapter from the complete tape" }], model: cfg.model };
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

const directive = C.parseChapterDirective(text, offered);
ok("the real answer's opening line is a usable graph directive", directive !== null);
if (!directive) { await vite.close(); process.exit(1); }

const chosen = offered.find((f) => f.id === directive.fixtureId);
const desk0 = C.chapterBuild(C.chapterPreflight(C.createChapter("en"), offered));
let desk;
if (directive.route === "abstain" || !chosen) {
  desk = C.chapterAbstained(desk0, "ABSTAIN is an honest graph edge.");
} else {
  const prose = C.stripChapterDirective(text);
  const structural = C.verifyChapterStructure(prose);
  console.log(`chosen fixture ${chosen.id} · structure verifier: ${structural.length === 0 ? "pass" : structural.join(",")}`);
  if (structural.length > 0) {
    desk = C.chapterStructureRefused(C.chapterModelChose(desk0, chosen.id), "fold");
  } else {
    const envelope = C.chronicleEnvelope(chosen, LAW);
    const found = C.verifyChapterNumerals(prose, envelope);
    console.log(`numeral verifier: ${found.length === 0 ? "pass" : found.join(",")}`);
    ok("the real chapter survives BOTH verifiers in order", found.length === 0);
    const s1 = C.chapterStructurePassed(C.chapterModelChose(desk0, chosen.id));
    desk = found.length === 0
      ? C.chapterCommit(C.chapterNumeralsPassed(s1), prose)
      : C.chapterNumeralsRefused(s1, "fold");
  }
}
ok("the graph terminated in a real FSM status", desk.status === "commit" || desk.status === "refused");
console.log(`final graph status ${desk.status}, note ${desk.trace.at(-1).note}, ${desk.trace.length} trace entries`);

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
