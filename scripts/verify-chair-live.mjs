// M1233 · ONE real-call witness for door 16, the Selection Chair. The offline proof gates never
// dial the network; this spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses, and checks that the model's first line really is an XI the shipped verifier can
// prove against the pool — eleven distinct players, one keeper, nothing invented.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-chair-live.mjs
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

const vite = await createServer({ root, cacheDir: resolve(root, "node_modules/.vite"), server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const chair = await vite.ssrLoadModule("/domain/selectionChair.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");
const svc = await vite.ssrLoadModule("/data/footballService.ts");

// The pool the door ships with: the world's strongest sixty, cut with the digest's comparator.
const squad = { clubId: "world", players: chair.worldSquad(svc.footballProvider.players()) };
ok("the witness's pool is the shipped one — the world's strongest, with a keeper in it",
  squad.players.length === 60 && squad.players.some((p) => p.positionGroup === "GK"));

const system = brief.withWorldBook([
  "You are the selection chair of Football OS. Name a World XI from THE SQUAD above and nothing else.",
  "Your FIRST line must be exactly: XI:<id>,<id>,… with eleven squad ids, exactly one GK, no repeats, best-first.",
  "Then explain the shape in a few tight sentences in the visitor's language. You may only use figures the squad carries.",
  "Never name a player outside the squad; never predict the future.",
  "",
  "THE SQUAD (id, name, group, overall, age):",
  JSON.stringify(squad.players.map((p) => ({ id: p.id, name: p.name, group: p.positionGroup, overall: p.overall, age: p.age }))),
].join("\n"));
const ask = {
  messages: [{ role: "system", content: system }, { role: "user", content: "Name my World XI from this squad." }],
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

const parsed = chair.parseChairXi(text, squad);
const law = chair.verifyChairText(text, squad);
console.log(`verifier: ${parsed.violations.concat(law).length === 0 ? "pass" : parsed.violations.concat(law).join(",")}`);
ok("the model's XI is lawful — eleven distinct squad players, exactly one keeper",
  parsed.selection !== null && parsed.selection.ids.length === 11 &&
  parsed.selection.byPosition.GK.length === 1 && new Set(parsed.selection.ids).size === 11);
ok("the prose beside the XI rides the shared numeral law", law.length === 0);

const desk = chair.chairCommit(chair.chairPrecommit(chair.chairBuild(chair.chairPreflight(chair.createChair(squad, "en"))), "pass"), text, parsed.selection);
ok("a lawful answer walks into a committed state carrying the selection",
  desk.status === "commit" && desk.selection?.ids.length === 11);

// The refused arm is armed too: a planted ghost player is charged.
const planted = chair.parseChairXi("XI:g1,ghost-player,d1,d2,d3,d4,m1,m2,m3,a1,a2", squad);
ok("the parser charges a planted player outside the pool", planted.selection === null && planted.violations.includes("unknownPlayer"));

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
