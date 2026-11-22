// M1236 · ONE real-call witness for door 18, the Match Reporter. The offline proof gates never
// dial the network; this spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses, and checks that the model's report really is provable against one real
// fixture's own envelope — the directive names it, and every numeral rides the fixture law.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-reporter-live.mjs
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

const vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const rep = await vite.ssrLoadModule("/domain/matchReporter.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");
const svc = await vite.ssrLoadModule("/data/footballService.ts");

// A real finished fixture with events, sealed as the reporter's envelope.
const match = svc.footballProvider.matches()
  .filter((m) => m.status === "FINISHED" && (m.events?.length ?? 0) > 0)
  .sort((a, b) => (a.kickoff < b.kickoff ? 1 : -1))[0];
const fx = rep.sealFixture(match, "the home side", "the away side");
ok(`the witness's fixture is a real finished one — ${fx?.homeName} ${fx?.homeGoals}-${fx?.awayGoals} ${fx?.awayName}, ${fx?.events.length} events`,
  fx !== null && fx.events.length > 0);

const system = brief.withWorldBook([
  "You are the match reporter of Football OS. Write the report of THIS fixture and nothing else.",
  "Your FIRST line must be exactly: REPORT:<id> with the id from THE FIXTURE above.",
  "Then 3-6 tight sentences of match report in the visitor's language: the score, who scored and when, and what the engine's numbers say.",
  "Every numeral you write MUST appear in THE FIXTURE above (the score, an event minute, a stat) or in the world book.",
  "Never invent a scorer, a minute, a stat or a future tense. Report the game that was played, not the one that will be.",
  "",
  "THE FIXTURE:",
  JSON.stringify({
    id: fx.id, home: fx.homeName, away: fx.awayName, score: `${fx.homeGoals}-${fx.awayGoals}`,
    events: fx.events, stats: fx.stats,
  }),
].join("\n"));
const ask = {
  messages: [{ role: "system", content: system }, { role: "user", content: "Write the report of this fixture." }],
  model: cfg.model,
};

ok("the shipped lane helper puts this ask on the one content-derived world-book lane",
  laneForMessages(ask.messages) === laneKey(brief.WORLD_BRIEFING) && PROMPT_CACHE_RETENTION === "24h");
ok("the canonical model is the one this witness actually dials", cfg.model === "gpt-6.2-sol");

const started = Date.now();
const res = await handleLlmRequest(cfg, ask, null); // no local memo: this is a real upstream witness
const text = res.body?.text ?? "";
console.log(`real call: ${Date.now() - started}ms, status ${res.status}, ${text.length} chars, ${brief.WORLD_BRIEFING.length}-char world book`);
console.log(`first line: ${text.split("\n")[0]}`);
ok("the real model answered through the shipped proxy", res.status === 200 && res.body?.ok === true && text.length > 0);
ok("the answer's model field is the canonical one", res.body?.model === "gpt-6.2-sol");

const parsed = rep.parseReporterReport(text, fx);
const law = rep.verifyReporterText(text, fx);
console.log(`verifier: ${parsed.violations.concat(law).length === 0 ? "pass" : parsed.violations.concat(law).join(",")}`);
ok("the directive names the very fixture on the desk", parsed.ok && parsed.violations.length === 0);
ok("every numeral in the report rides the fixture's own envelope law", law.length === 0);
ok("the report stays inside its budget", text.length <= rep.REPORT_MAX_CHARS + 60);

const committed = rep.reporterCommit(rep.reporterPrecommit(rep.reporterBuild(rep.reporterPreflight(rep.createReporter(fx, "en"))), "pass"), text);
ok("a lawful report walks into a committed state", committed.status === "commit" && committed.trace.length >= 3);

// The refused arm is armed: a planted wrong fixture and a planted invented figure are charged.
const wrong = rep.parseReporterReport("REPORT:no-such-fixture\nA report.", fx);
const invented = rep.verifyReporterText("REPORT:" + fx.id + "\nThe attendance was 987654.", fx);
ok("the parser charges a planted wrong fixture and the law charges a planted invented figure",
  !wrong.ok && wrong.violations.includes("wrongFixture") && invented.includes("offFixture"));

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
