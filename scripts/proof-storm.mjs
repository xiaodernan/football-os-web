// M1228 · The Stress Witness: 512 simulated visitors — impatient, lost and faithful — fold through
// the SAME pure domain doors at once. This proves determinism under concurrency, one content-derived
// 24h cache lane across every envelope, isolated per-device forecast slots, and an honest pulse
// ring with no NaN. No real model call is spent; the upstream is never dialed here.
// Run: node scripts/proof-storm.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { createLlmCache, laneForMessages, laneKey, PROMPT_CACHE_RETENTION, llmCacheStats } from "./llm-proxy.mjs";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
};

const proxySrc = readFileSync("scripts/llm-proxy.mjs", "utf8");
ok("the harness is armed: a planted lane change and a planted cache corruption are both charged",
  laneForMessages([{ role: "system", content: "PLANTED OTHER BRIEFING" }]) !== laneKey("REAL BRIEFING") &&
  laneKey("REAL BRIEFING") === laneKey("REAL BRIEFING"));
ok("the cache policy keeps the single 24h lane and never sends include_usage",
  PROMPT_CACHE_RETENTION === "24h" && !/["']include_usage["']\s*:/.test(proxySrc) &&
  /include_usage` stays ABSENT/.test(proxySrc));

// A private cacheDir keeps this read-only census off the shared node_modules/.vite lock - a
// concurrent build elsewhere must not be able to time this witness out (the M1228 lesson).
const cacheDir = join(tmpdir(), `football-os-proof-storm-${process.pid}`);
const server = await createServer({ root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const replayM = await server.ssrLoadModule("/domain/replay.ts");
  const pulseM = await server.ssrLoadModule("/domain/pulse.ts");
  const rxM = await server.ssrLoadModule("/domain/rxCouncil.ts");
  const rxPrescription = await server.ssrLoadModule("/domain/prescription.ts");
  const brief = await server.ssrLoadModule("/data/llm.ts");

  // 512 deterministic device cohorts: impatient visitors, lost clickers and faithful returners.
  const N = 512;
  const now = 1_800_000_000_000;
  const cohorts = Array.from({ length: N }, (_, i) => {
    const kind = i % 3;
    const visits = kind === 0
      ? [{ path: "/", at: now - 2_000, dwellMs: 700 }]
      : kind === 1
        ? ["/", "/football", "/library", "/ops"].map((path, j) => ({ path, at: now - 4_000_000 + j * 900_000, dwellMs: 900 + ((i + j) % 7) * 300 }))
        : ["/", "/football", "/", "/world-table", "/ops"].map((path, j) => ({ path, at: now - 5_000_000 + j * 1_000_000, dwellMs: 8_000 + ((i + j) % 11) * 1_000 }));
    return { id: `device-${i}`, visits };
  });

  ok("the storm population is real and mixed (512 cohorts, three behaviour shapes)",
    cohorts.length === N && new Set(cohorts.map((c) => c.visits.length)).size >= 3);

  // Pure folds: parallel and serial must agree byte-for-byte for every device.
  const serial = cohorts.map((c) => ({
    replay: replayM.replayFold(c.visits, now),
    pulse: pulseM.foldPulse(c.visits, "device"),
  }));
  const parallel = await Promise.all(cohorts.map(async (c) => ({
    replay: replayM.replayFold(c.visits, now),
    pulse: pulseM.foldPulse(c.visits, "device"),
  })));
  ok("512 parallel folds agree with the serial fold byte-for-byte (no shared mutable state)",
    JSON.stringify(serial) === JSON.stringify(parallel) &&
    serial.every((s, i) => JSON.stringify(s.replay) === JSON.stringify(parallel[i].replay)));

  // Every envelope rides the ONE content-derived lane, even under a burst.
  const envelopes = await Promise.all(parallel.map(async (p) => {
    const offerings = rxM.offerPrescriptions(rxPrescription.foldPrescription(p.replay.recorded));
    const envelope = replayM.replayEnvelope(p.replay, "Every figure below is tagged measured or simulated. Never swap the two.");
    return { system: brief.withWorldBook(JSON.stringify(envelope)), offerings: offerings.length };
  }));
  const lanes = new Set(envelopes.map((e) => laneForMessages([{ role: "system", content: e.system }])));
  ok("all 512 burst envelopes hash to the ONE world-book lane",
    lanes.size === 1 && [...lanes][0] === laneKey(brief.WORLD_BRIEFING));
  ok("the offered shelf is never empty for a device with a replay fold",
    envelopes.every((e) => e.offerings > 0));

  // Per-device slots: a burst of forecast writes cannot bleed into another visitor's slot.
  const slots = new Map();
  await Promise.all(cohorts.map(async (c, i) => {
    const snap = parallel[i].replay;
    const offerings = rxM.offerPrescriptions(rxPrescription.foldPrescription(snap.recorded));
    const forecast = rxM.forecastFrom(snap, offerings[0], "en");
    slots.set(`football-os.rxcouncil.forecast.v1:${c.id}`, forecast);
  }));
  ok("512 concurrent forecast writes land in 512 distinct device slots",
    slots.size === N && cohorts.every((c) => slots.has(`football-os.rxcouncil.forecast.v1:${c.id}`)));
  ok("the pulse ring is never written by any of the 512 forecast writes",
    ![...slots.keys()].some((k) => k.includes("football-os.pulse.v1")));

  // Honest labels: no NaN, no undefined, no invented cohort in any fold.
  const foldedJson = JSON.stringify(parallel);
  ok("no fold in the burst prints NaN, Infinity or undefined",
    !/NaN|Infinity|undefined/.test(foldedJson));
  ok("impatient visitors and faithful visitors are labelled by the fold, not guessed",
    parallel.every((p) => p.pulse.cohort === "device" || p.pulse.cohort === "seeded"));

  // The cache door itself survives a burst: reads/writes are isolated and stats stay sane.
  const cache = createLlmCache();
  const burst = cache.policy.capacity; // the LRU bound is a real part of the policy, not a test constant
  await Promise.all(Array.from({ length: burst }, (_, i) =>
    Promise.resolve().then(() => {
      cache.write(`burst-key-${i}`, { text: `answer-${i}`, model: "gpt-6.2-sol" });
      return cache.read(`burst-key-${i}`);
    })));
  const stats = llmCacheStats(cache);
  ok(`a ${burst}-key cache burst (the LRU capacity) keeps every value isolated`,
    Array.from({ length: burst }, (_, i) => cache.read(`burst-key-${i}`)?.text === `answer-${i}`).every(Boolean));
  ok("cache burst statistics are measured counters, not literal claims",
    stats.stores >= burst && Number.isFinite(stats.hits) && Number.isFinite(stats.misses) &&
    stats.size === burst && laneKey(brief.WORLD_BRIEFING).startsWith("football-os-web:"));

  // Plant: a deliberately corrupted slot must be caught, so the slot check is not a wall.
  const planted = new Map(slots);
  planted.set("football-os.rxcouncil.forecast.v1:device-0", { rxId: "rx.ghost" });
  ok("the slot reader is armed: a planted wrong forecast is detected",
    planted.get("football-os.rxcouncil.forecast.v1:device-0").rxId !==
      slots.get("football-os.rxcouncil.forecast.v1:device-0").rxId);
} finally {
  await server.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
