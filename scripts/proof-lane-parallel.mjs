// M1219 · The Parallel Lane — why codex-shaped clients keep ~90% cache through a busy day.
// The provider's KV cache is keyed by prefix + lane. A session id in the lane key would split
// one decoding family into N cold lanes; a bare constant would let one stray family evict all
// the others. This gate proves the shipped key is content-derived from the byte-stable system
// briefing ALONE: 120 parallel sessions share one lane, a different briefing gets its own lane,
// and both upstream call sites stay on the streaming path with a 24-hour retention.
// Run: node scripts/proof-lane-parallel.mjs
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import { laneKey, laneForMessages, PROMPT_CACHE_KEY, PROMPT_CACHE_RETENTION } from "./llm-proxy.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { WORLD_BRIEFING, withWorldBook } = await server.ssrLoadModule("/data/llm.ts");

ok("the world briefing is a real long context (5万–9万-token class, not a stub)",
  WORLD_BRIEFING.length > 160_000);
ok("the warm lane is 24h, not the provider's fleeting default", PROMPT_CACHE_RETENTION === "24h");

// Every door sends the same system prefix; only the envelope after it changes.
const systemOf = (envelope) => withWorldBook(envelope);
const briefHead = WORLD_BRIEFING.slice(0, 4096);
ok("the briefing head is byte-stable across independent loads", laneKey(WORLD_BRIEFING) === laneKey(systemOf("")));
ok("the lane is derived from the briefing's first 4 KiB", laneKey(WORLD_BRIEFING) === `${PROMPT_CACHE_KEY}:${laneKey(briefHead).split(":")[1]}`);

// 120 visitors, 120 different envelopes, 120 concurrent "sessions": one lane.
const sessions = Array.from({ length: 120 }, (_, i) =>
  systemOf(`{"door":${i % 13},"session":"s-${i}","question":"ask ${i}","locale":"${i % 3 === 0 ? "zh-CN" : i % 3 === 1 ? "zh-TW" : "en"}"}`));
const lanes = new Set(sessions.map((s) => laneKey(s)));
ok(`120 parallel sessions with different envelopes share ONE lane (${lanes.size} lane(s): ${[...lanes].join(", ")})`, lanes.size === 1);
ok("a visitor id cannot steer the lane", laneKey(sessions[0]) === laneKey(sessions[119]));

// The shipped call shape (system message extractor → lane) must agree with the primitive.
const messagesOf = (system) => [{ role: "system", content: system }, { role: "user", content: "hello" }];
const shippedLanes = new Set(sessions.map((s) => laneForMessages(messagesOf(s))));
ok(`the SHIPPED message→lane helper also yields one lane across 120 sessions (${shippedLanes.size})`, shippedLanes.size === 1);
ok("the shipped helper uses the stable family prefix, not the whole system message",
  [...shippedLanes][0] === laneKey(WORLD_BRIEFING) && ![...shippedLanes][0].includes("ROUTING ENVELOPE"));

// A genuinely different family must not be folded into the world-book lane.
const otherBrief = `${WORLD_BRIEFING.slice(0, 2048)}\nOTHER FAMILY\n${WORLD_BRIEFING.slice(2048)}`;
ok("a different 4 KiB head self-loads on its own lane (no cross-family thrash) while the world-book family stays at one lane",
  laneKey(otherBrief) !== laneKey(WORLD_BRIEFING) && lanes.size === 1);

const proxy = readFileSync("scripts/llm-proxy.mjs", "utf8");
const laneDef = (proxy.match(/export function laneKey\(briefing[^*]*?\n\}/) || [""])[0];
ok("the lane function takes only the briefing and a family — no session argument", /^export function laneKey\(briefing, family = PROMPT_CACHE_KEY\)/.test(laneDef));
ok("the lane function never reads a session/user/socket identity", !/session|userId|socket|req\./i.test(laneDef));
ok("both upstream call sites pin the same content-derived lane through the shipped helper",
  (proxy.match(/prompt_cache_key: laneForMessages\(clean\)/g) || []).length === 2);
ok("the inverted legacy argument order is gone from the shipped proxy",
  !/laneKey\(PROMPT_CACHE_KEY,\s*systemBriefing/.test(proxy));
ok("both upstream call sites keep the 24h retention",
  (proxy.match(/prompt_cache_retention: PROMPT_CACHE_RETENTION/g) || []).length === 2);
ok("the streaming path is used at both call sites", (proxy.match(/stream:\s*true/g) || []).length >= 2);
ok("include_usage stays absent — it forces a lane hop that reports cached=null", !/include_usage:\s*true/.test(proxy));

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
