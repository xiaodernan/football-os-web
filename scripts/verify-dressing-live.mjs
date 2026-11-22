// M1242 · ONE real-call witness for door 20, the Dressing Room. The offline proof gates never
// dial the network; this spends exactly one gpt-6.2-sol call through the SAME server proxy the
// browser uses, and checks that the model's briefing really is provable against one real
// opponent's own record — the directive names them, and every numeral rides the record law.
//
// Run (dev machine, server-only key in .env, real network + Clash proxy):
//   LLM_LIVE=1 node scripts/verify-dressing-live.mjs
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
const room = await vite.ssrLoadModule("/domain/dressingRoom.ts");
const brief = await vite.ssrLoadModule("/data/llm.ts");
const svc = await vite.ssrLoadModule("/data/footballService.ts");

// A real opponent with a real record: the club with the most finished fixtures in the world.
const matches = svc.footballProvider.matches().filter((m) => m.status === "FINISHED");
const tally = new Map();
for (const m of matches) {
  tally.set(m.homeClubId, (tally.get(m.homeClubId) ?? 0) + 1);
  tally.set(m.awayClubId, (tally.get(m.awayClubId) ?? 0) + 1);
}
const clubId = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
const club = svc.footballProvider.clubs().find((c) => c.id === clubId);
const opp = room.opponentRecord(clubId, club.name, svc.footballProvider.matches(), svc.footballProvider.players());
ok(`the witness's opponent is a real one — ${opp.clubName}: ${opp.played} played, ${opp.won}W ${opp.drawn}D ${opp.lost}L, ${opp.points} pts, form ${opp.form.join("")}, danger ${opp.bestPlayer} (${opp.bestOverall})`,
  opp !== null && opp.played > 0 && opp.form.length > 0);

const system = brief.withWorldBook([
  "You are the assistant coach writing the dressing-room briefing on THIS opponent and nothing else.",
  "Your FIRST line must be exactly: BRIEF:<id> with the id from THE OPPONENT above.",
  "Then 3-6 tight sentences in the visitor's language: their record, their recent form, and the danger their best player carries.",
  "Every numeral you write MUST appear in THE OPPONENT above (the record, the overall) or in the world book.",
  "Describe only what they have ALREADY done — never predict the coming match, never use a future tense about it.",
  "",
  "THE OPPONENT:",
  JSON.stringify({
    id: opp.clubId, club: opp.clubName,
    record: { played: opp.played, won: opp.won, drawn: opp.drawn, lost: opp.lost, gf: opp.gf, ga: opp.ga, points: opp.points },
    form: opp.form.join(""),
    bestPlayer: { name: opp.bestPlayer, overall: opp.bestOverall },
  }),
].join("\n"));
const ask = {
  messages: [{ role: "system", content: system }, { role: "user", content: "Write the dressing-room briefing on this opponent." }],
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

const parsed = room.parseDressingBrief(text, opp);
const law = room.verifyDressingText(text, opp);
console.log(`verifier: ${parsed.violations.concat(law).length === 0 ? "pass" : parsed.violations.concat(law).join(",")}`);
ok("the directive names the very opponent on the desk", parsed.ok && parsed.violations.length === 0);
ok("every numeral in the briefing rides the opponent's own record law", law.length === 0);
ok("the briefing stays inside its budget", text.length <= room.BRIEF_MAX_CHARS + 60);

const committed = room.dressingCommit(room.dressingPrecommit(room.dressingBuild(room.dressingPreflight(room.createDressing(opp, "en"))), "pass"), text);
ok("a lawful briefing walks into a committed state",
  committed.status === "commit" && committed.trace.length >= 3);

// The refused arm is armed: a planted wrong opponent and a planted invented figure are charged.
const wrong = room.parseDressingBrief("BRIEF:no-such-club\nA briefing.", opp);
const invented = room.verifyDressingText("BRIEF:" + opp.clubId + "\nThey have 987654 points.", opp);
ok("the parser charges a planted wrong opponent and the law charges a planted invented figure",
  !wrong.ok && wrong.violations.includes("wrongOpponent") && invented.includes("offRecord"));

await vite.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
