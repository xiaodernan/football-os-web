// M1235 · ONE real-call witness for door 17, the Training Desk. The offline proof gates never
// dial the network; this spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses, and checks that the model's two directive lines really are a prescription the
// shipped verifier can prove against the player's own dossier.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-desk-live.mjs
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
const desk = await vite.ssrLoadModule("/domain/trainingDesk.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");
const svc = await vite.ssrLoadModule("/data/footballService.ts");

// A real player from the seeded world, with their real attribute vector.
const player = svc.footballProvider.players().find((p) => p.attributes && p.positionGroup === "CB")
  ?? svc.footballProvider.players().find((p) => p.attributes);
const dossier = {
  playerName: player.name,
  group: player.positionGroup,
  age: player.age,
  loadZone: "optimal",
  attributes: Object.entries(player.attributes).map(([key, value]) => ({ key, value })),
};
ok(`the witness's dossier is a real player's — ${player.name}, ${dossier.attributes.length} attributes, a vector the desk may prescribe from`,
  dossier.attributes.length >= 20 && dossier.attributes.every((a) => Number.isFinite(a.value)));

const system = brief.withWorldBook([
  "You are the training desk for this ONE player. Prescribe their week from THE DOSSIER above and nothing else.",
  "Your FIRST line must be exactly: RX:<attrKey>,<attrKey>,<attrKey> — at most three attribute keys FROM THE DOSSIER, weakest first.",
  "Your SECOND line must be exactly: MIN:<n> with n one of 5,10,20,30,45,60,90, chosen for the load zone.",
  "Then two or three tight sentences in the visitor's language explaining the choice. You may only use figures the dossier carries.",
  "Never name an attribute outside the dossier; never predict the future.",
  "",
  "THE DOSSIER:",
  JSON.stringify({ player: dossier.playerName, group: dossier.group, loadZone: dossier.loadZone, attributes: dossier.attributes }),
].join("\n"));
const ask = {
  messages: [{ role: "system", content: system }, { role: "user", content: "Prescribe my training week from this dossier." }],
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

const parsed = desk.parseDeskRx(text, dossier);
const law = desk.verifyDeskText(text, dossier);
console.log(`verifier: ${parsed.violations.concat(law).length === 0 ? "pass" : parsed.violations.concat(law).join(",")}`);
ok("the model's prescription is lawful — at most three dossier attributes, one supported minutes value",
  parsed.prescription !== null && parsed.prescription.focusKeys.length <= 3 &&
  parsed.prescription.focusKeys.every((k) => dossier.attributes.some((a) => a.key === k)) &&
  [5, 10, 20, 30, 45, 60, 90].includes(parsed.prescription.minutes));
ok("the prose beside the prescription rides the shared numeral law", law.length === 0);

const committed = desk.deskCommit(desk.deskPrecommit(desk.deskBuild(desk.deskPreflight(desk.createDesk(dossier, "en"))), "pass"), text, parsed.prescription);
ok("a lawful prescription walks into a committed state carrying it",
  committed.status === "commit" && committed.prescription?.focusKeys.length === parsed.prescription.focusKeys.length);

// The refused arm is armed: a planted ghost attribute and a planted bad-minutes are charged.
const ghost = desk.parseDeskRx("RX:telekinesis,finishing\nMIN:45", dossier);
const badMin = desk.parseDeskRx("RX:finishing\nMIN:47", dossier);
ok("the parser charges a planted attribute outside the dossier and a planted unsupported minutes value",
  ghost.selection === undefined && ghost.prescription === null && ghost.violations.includes("unknownAttribute") &&
  badMin.prescription === null && badMin.violations.includes("badMinutes"));

// The fold's own prescription for the same dossier — the honest arm, computed here.
const fold = desk.foldRx(dossier);
ok(`the fold prescribes the dossier's weakest attributes and the zone's minutes (${fold?.focusKeys.join(",")} @ ${fold?.minutes})`,
  fold !== null && fold.focusKeys.length === 3 && [5, 10, 20, 30, 45, 60, 90].includes(fold.minutes));

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
