// M1238 · ONE real-call witness for door 19, the Transfer Broker. The offline proof gates never
// dial the network; this spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses, and checks that the model's ruling really is provable against the deal on the
// table — one of three codes, the counter's money in the model's own figures, every numeral the
// dossier carries.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-broker-live.mjs
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
const brk = await vite.ssrLoadModule("/domain/broker.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");
const svc = await vite.ssrLoadModule("/data/footballService.ts");

// A real deal: the world's most valuable player, with a 1.3x fee on the table.
const player = [...svc.footballProvider.players()].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))[0];
const deal = {
  dossier: {
    playerName: player.name,
    clubName: "the selling club",
    overall: player.overall,
    age: player.age,
    value: player.value,
  },
  fee: Math.round((player.value * 1.3) / 1e6) * 1e6,
};
ok(`the witness's deal is a real one — ${deal.dossier.playerName}, value ${deal.dossier.value}, fee ${deal.fee} on the table`,
  deal.dossier.value > 0 && deal.fee > 0 && deal.fee !== deal.dossier.value);

const system = brief.withWorldBook([
  "You are the transfer broker of Football OS. Rule on THIS deal and nothing else.",
  "Your FIRST line must be exactly: RULING:accept, RULING:reject or RULING:counter.",
  "If you rule counter, your SECOND line must be exactly: FEE:<eur> with your counter-fee.",
  "Then two or three tight sentences in the visitor's language explaining the ruling.",
  "You may only use figures from THE DEAL above (the value, the overall, the age, the fee) or the world book.",
  "Never invent a fee, a value or a future tense.",
  "",
  "THE DEAL:",
  JSON.stringify({
    player: deal.dossier.playerName,
    club: deal.dossier.clubName,
    overall: deal.dossier.overall,
    age: deal.dossier.age,
    value: deal.dossier.value,
    feeOnTheTable: deal.fee,
  }),
].join("\n"));
const ask = {
  messages: [{ role: "system", content: system }, { role: "user", content: "Rule on this transfer deal." }],
  model: cfg.model,
};

ok("the shipped lane helper puts this ask on the one content-derived world-book lane",
  laneForMessages(ask.messages) === laneKey(brief.WORLD_BRIEFING) && PROMPT_CACHE_RETENTION === "24h");
ok("the canonical model is the one this witness actually dials", cfg.model === "gpt-6.2-sol");

const started = Date.now();
const res = await handleLlmRequest(cfg, ask, null); // no local memo: this is a real upstream witness
const text = res.body?.text ?? "";
console.log(`real call: ${Date.now() - started}ms, status ${res.status}, ${text.length} chars, ${brief.WORLD_BRIEFING.length}-char world book`);
console.log(`first two lines: ${text.split("\n").slice(0, 2).join(" / ")}`);
ok("the real model answered through the shipped proxy", res.status === 200 && res.body?.ok === true && text.length > 0);
ok("the answer's model field is the canonical one", res.body?.model === "gpt-6.2-sol");

const parsed = brk.parseBrokerRuling(text, deal);
const law = brk.verifyBrokerText(text, deal);
console.log(`verifier: ${parsed.violations.concat(law).length === 0 ? "pass" : parsed.violations.concat(law).join(",")}`);
ok("the model's ruling is lawful — one of the three codes, a counter carrying its own fee",
  parsed.ruling !== null && parsed.violations.length === 0 &&
  (parsed.ruling.code !== "counter" || (parsed.ruling.fee !== null && parsed.ruling.fee > 0)));
ok("the prose beside the ruling rides the deal numeral law", law.length === 0);

// The interesting question: does the model's ruling agree with the fold's arithmetic?
const fold = brk.foldRuling(deal);
console.log(`model ruled ${parsed.ruling?.code}${parsed.ruling?.fee ? " @ " + parsed.ruling.fee : ""}; the fold rules ${fold.code}${fold.fee ? " @ " + fold.fee : ""} (fee is ${(deal.fee / deal.dossier.value).toFixed(2)}x value)`);
ok("the two rulings are reported side by side — agreement or disagreement, both honest",
  typeof fold.code === "string" && parsed.ruling !== null);

const committed = brk.brokerCommit(brk.brokerPrecommit(brk.brokerBuild(brk.brokerPreflight(brk.createBroker(deal, "en"))), "pass"), text, parsed.ruling);
ok("a lawful ruling walks into a committed state carrying it",
  committed.status === "commit" && committed.ruling?.code === parsed.ruling?.code);

// The refused arm is armed: a planted bad code and a planted invented figure are charged.
const badCode = brk.parseBrokerRuling("RULING:maybe\nThinking about it.", deal);
const invented = brk.verifyBrokerText("RULING:accept\nThe fee is 987654.", deal);
ok("the parser charges a planted unknown code and the law charges a planted invented figure",
  badCode.ruling === null && badCode.violations.includes("badCode") && invented.includes("offDeal"));

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
