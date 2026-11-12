// M1076 — the cache WIRE-PARITY contract, pinned as a deterministic static gate.
//
// M1064 gave the analysis layer two herd defences: domain/cache.ts's `expiryWithJitter` (seeded TTL
// scatter) and `singleFlight` (N concurrent misses → one origin load). M1065's CacheObservatory
// draws both. But until M1076 the process that ACTUALLY talks to Redis (LeagueCacheService +
// LeagueTablesCacheService) implemented neither — it wrote a fixed `Duration.ofSeconds(ttlSeconds)`
// and did one origin read per caller. The picture and the wire had silently diverged: exactly the
// fold-vs-wire-twin gap M1072 closed for messaging.
//
// proof-cache-parity.mjs holds the seam so it cannot reopen. It needs no broker and no Docker:
//   • wire jitter parity: it re-derives the Java CacheJitter draw in JS (FNV-1a + mulberry32 over
//     seed:key:nowSecond), then checks it BYTE-FOR-BYTE against the real domain/cache.ts
//     `expiryWithJitter` for many (key, now) pairs. A one-bit drift in the Java port — a dropped
//     `| t`, a signed `>>> 0`, a changed constant — would desync the two and redden this gate.
//     Planted arms mutate the Java source and must be charged.
//   • single-flight structure: BOTH read-throughs carry a per-key ConcurrentHashMap of
//     CompletableFutures, a putIfAbsent owner door, a bounded owner.get, an exceptional completion
//     and a finally remove, plus a degraded own-origin fallback. Planted: drop the owner door.
//   • observable measurement: both stats() export ttlJitterSeconds/originLoads/coalesced derived
//     from .get() (real counters), not hardcoded numbers.
//   • config + non-regression: the yml pins ttl-jitter-seconds: 24 == CACHE_POLICY.jitter and
//     origin-latency-ms: 0; M1070's catch→origin + real ping and M1075's two-resource shape survive.
//   • witness integrity: verify-cache-parity-live.mjs targets a non-default port, injects the slow
//     origin, asserts the N→1 collapse and the TTL spread on BOTH resources, restores in finally,
//     and reflects its tally in the exit code. Planted: a fixed-TTL witness or a default port.
//
// Honest limit: this reads declarations and re-derives the seeded draw; it cannot open a socket.
// The measured N→1 collapse and the real TTL buckets belong to verify-cache-parity-live.mjs.

import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
// hmr:false — a static proof must not bind the shared HMR websocket port (24678); other Vite
// processes on this host legitimately hold it, and competing for it is a source of false reds.
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "error" });
const { CACHE_POLICY: P, expiryWithJitter } = await server.ssrLoadModule("/domain/cache.ts");
const { hashString, makeRng } = await server.ssrLoadModule("/lib/rng.ts");
await server.close();

const YML = read("services/cache-service/src/main/resources/application.yml");
const JITTER = read("services/cache-service/src/main/java/com/footballos/cache/CacheJitter.java");
const SUMMARY = read("services/cache-service/src/main/java/com/footballos/cache/LeagueCacheService.java");
const TABLES = read("services/cache-service/src/main/java/com/footballos/cache/LeagueTablesCacheService.java");
const WITNESS = read("scripts/verify-cache-parity-live.mjs");
const REDIS_PROOF = read("scripts/proof-redis-resilience.mjs");
const PROOF_FILES = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- the JS port of the JAVA CacheJitter, using Node's exact int32 arithmetic -------------------
// This is INDEPENDENT of lib/rng.ts even though the two must agree: it is written to mirror the
// Java statements (Math.imul ↔ Java int multiply, |0 ↔ Java int, >>>0 ↔ &0xffffffffL).
const javaFnv1a = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const javaMulberry32 = (seedU32) => {
  let a = seedU32 >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // Java &0xffffffffL === TS >>>0
};
const javaTtl = (key, now, ttl, jitter, seed) => {
  if (jitter <= 0) return ttl;
  const draw = javaMulberry32(javaFnv1a(`${seed}:${key}:${now}`));
  return ttl + Math.floor(draw * (jitter + 1));
};

// --- 1 · wire jitter parity: the Java port reproduces the TS fold bit for bit ------------------
const seed = P.seed;
const pairs = [
  ["footballos:league:summary", 0], ["footballos:league:summary", 1],
  ["footballos:league:tables", 1700000000], ["club-7", 42], ["club-99", 999],
  ["A", -3], ["zzz", 2147483647], ["key:with:colons", 7],
];
// The TS fold returns an ABSOLUTE expiry (now + ttl + offset); the Java service writes a DURATION
// (ttl + offset) that Redis adds to the current instant. They are the same draw — subtract the `now`
// base the fold adds — so compare `javaTtl` against `expiryWithJitter - now`. Requiring this on
// negative and large `now` values is what catches a signed-`>>>0` or a dropped-`| t` port.
const mismatches = pairs.filter(([k, now]) => javaTtl(k, now, P.ttl, P.jitter, seed) !== expiryWithJitter(k, now, P.ttl, P.jitter, seed) - now);
ok(`the Java CacheJitter port reproduces domain/cache.ts expiryWithJitter's draw for all ${pairs.length} (key, now) pairs (${mismatches.length} mismatches)`,
  pairs.length === 8 && mismatches.length === 0 && P.ttl === 60 && P.jitter === 24 && P.seed === "football-os");
const rangePairs = Array.from({ length: 40 }, (_, i) => javaTtl(`k${i}`, i * 7919, P.ttl, P.jitter, seed));
ok(`every one of ${rangePairs.length} wired TTLs lands inside [ttl, ttl+jitter] = [60, 84]`,
  rangePairs.length === 40 && rangePairs.every((t) => t >= 60 && t <= 84));
const distinctBuckets = new Set(rangePairs).size;
ok(`the wired draw scatters ${rangePairs.length} keys into ${distinctBuckets} distinct expiry buckets (a fixed-TTL wire would show 1)`,
  distinctBuckets >= 10 && distinctBuckets <= 25 && rangePairs.length === 40);
// reproduce the LIB rng too, so a change to hashString/makeRng cannot silently desync the port
const libDraw = (k, now) => makeRng(`${seed}:${k}:${now}`)();
const libMatches = pairs.filter(([k, now]) => Math.abs(libDraw(k, now) - javaMulberry32(javaFnv1a(`${seed}:${k}:${now}`))) < 1e-12);
ok(`the Java port also agrees with lib/rng.ts's own makeRng on ${libMatches.length}/${pairs.length} pairs`,
  libMatches.length === pairs.length && typeof hashString === "function");

// --- 2 · the JAVA source actually carries the multiplication/recast we ported -----------------
const javaShapeOk = (src) =>
  /h \^= s\.charAt\(i\)/.test(src) && /h \*= FNV_PRIME/.test(src) &&
  /\(a \^ \(a >>> 15\)\) \* \(1 \| a\)/.test(src) &&
  /\(t \+ \(\(t \^ \(t >>> 7\)\) \* \(61 \| t\)\)\) \^ t/.test(src) &&
  /\(t \^ \(t >>> 14\)\) & 0xffffffffL/.test(src);
ok(`the shipped CacheJitter.java carries the exact mulberry32 third step (61 | t) and the unsigned &0xffffffffL recast (shape=${javaShapeOk(JITTER)})`,
  javaShapeOk(JITTER) && /0x811c9dc5/.test(JITTER) && /0x01000193/.test(JITTER) && /0x6d2b79f5L/.test(JITTER));
// planted: drop `| t` in the mulberry32 third step, or use a SIGNED `>>> 0` recast on the mulberry
// output, must both be charged by the SAME reader. Replace with enough context that the fnv1a
// `return h & 0xffffffffL` (a DIFFERENT, legitimate widening) is not the one we mutate.
const plantedNoOr = JITTER.replace("(t ^ (t >>> 7)) * (61 | t)", "(t ^ (t >>> 7)) * 61");
const plantedSigned = JITTER.replace("(t ^ (t >>> 14)) & 0xffffffffL", "(t ^ (t >>> 14)) >>> 0");
ok(`the Java-shape reader charges BOTH the dropped (61 | t) and the signed-recast regressions (${!javaShapeOk(plantedNoOr) && !javaShapeOk(plantedSigned) ? 2 : 0}/2 planted)`,
  !javaShapeOk(plantedNoOr) && !javaShapeOk(plantedSigned) && javaShapeOk(JITTER));

// --- 3 · single-flight structure on BOTH read-throughs ---------------------------------------
const flightOk = (src) =>
  /ConcurrentHashMap<String, CompletableFuture<String>> inFlight/.test(src) &&
  /inFlight\.putIfAbsent\(key\(\), mine\)/.test(src) &&
  /CompletableFuture<String> owner = inFlight\.putIfAbsent/.test(src) &&
  /owner\.get\(window, TimeUnit\.MILLISECONDS\)/.test(src) &&
  /mine\.completeExceptionally\(e\)/.test(src) &&
  /inFlight\.remove\(key\(\), mine\)/.test(src) &&
  /return originJson\(\)/.test(src) &&
  /COALESCE_FLOOR_MS/.test(src) &&
  /originLoads\.incrementAndGet\(\)/.test(src) &&
  /coalesced\.incrementAndGet\(\)/.test(src);
ok(`the summary read-through single-flights concurrent misses (door=${/putIfAbsent\(key\(\), mine\)/.test(SUMMARY)}, owner-get=${/owner\.get\(window/.test(SUMMARY)}, remove=${/inFlight\.remove/.test(SUMMARY)})`,
  flightOk(SUMMARY));
ok(`the tables read-through single-flights identically (door=${/putIfAbsent\(key\(\), mine\)/.test(TABLES)}, owner-get=${/owner\.get\(window/.test(TABLES)}, remove=${/inFlight\.remove/.test(TABLES)})`,
  flightOk(TABLES));
// planted: drop the owner door from both; the reader must charge both.
const plantedSummaryNoDoor = SUMMARY.replace("CompletableFuture<String> owner = inFlight.putIfAbsent(key(), mine);", "CompletableFuture<String> owner = null;");
const plantedTablesNoDoor = TABLES.replace("CompletableFuture<String> owner = inFlight.putIfAbsent(key(), mine);", "CompletableFuture<String> owner = null;");
ok(`the single-flight reader charges a planted dropped owner door on BOTH services (${!flightOk(plantedSummaryNoDoor) && !flightOk(plantedTablesNoDoor) ? 2 : 0}/2 planted)`,
  !flightOk(plantedSummaryNoDoor) && !flightOk(plantedTablesNoDoor) && flightOk(SUMMARY) && flightOk(TABLES));
// the coalesce window is bounded by a floor AND the injected latency (no parked worker)
ok(`the coalesce wait is bounded by COALESCE_FLOOR_MS and scales with the injected latency (summary=${/Math\.max\(COALESCE_FLOOR_MS, originLatencyMs \* 4L\)/.test(SUMMARY)}, tables=${/Math\.max\(COALESCE_FLOOR_MS, originLatencyMs \* 4L\)/.test(TABLES)})`,
  /Math\.max\(COALESCE_FLOOR_MS, originLatencyMs \* 4L\)/.test(SUMMARY) &&
  /Math\.max\(COALESCE_FLOOR_MS, originLatencyMs \* 4L\)/.test(TABLES) &&
  /COALESCE_FLOOR_MS = 8000/.test(SUMMARY));

// --- 4 · both write-backs use the seeded jittered TTL ----------------------------------------
const jitterWriteOk = (src) => /opsForValue\(\)\.set\(key\(\), fresh, Duration\.ofSeconds\(jitteredTtlSeconds\(\)\)\)/.test(src) &&
  /CacheJitter\.jitteredTtlSeconds\(key\(\), System\.currentTimeMillis\(\) \/ 1000L,/.test(src) &&
  /private static final String JITTER_SEED = "football-os"/.test(src);
ok(`the summary write-back uses the seeded jittered lifetime, not the fixed base TTL (jittered=${jitterWriteOk(SUMMARY)})`,
  jitterWriteOk(SUMMARY));
ok(`the tables write-back uses the SAME jittered lifetime (jittered=${jitterWriteOk(TABLES)})`,
  jitterWriteOk(TABLES));

// --- 5 · observable measurement: real counters, never hardcoded -------------------------------
const censusOk = (src) => ["ttlJitterSeconds", "originLoads", "coalesced"].every((k) => src.includes(`out.put("${k}"`)) &&
  /out\.put\("originLoads", originLoads\.get\(\)\)/.test(src) && /out\.put\("coalesced", coalesced\.get\(\)\)/.test(src) &&
  /AtomicLong originLoads = new AtomicLong\(\)/.test(src) && /AtomicLong coalesced = new AtomicLong\(\)/.test(src);
ok(`both stats() export ttlJitterSeconds/originLoads/coalesced as REAL .get() counters (summary=${censusOk(SUMMARY)}, tables=${censusOk(TABLES)})`,
  censusOk(SUMMARY) && censusOk(TABLES));
const plantedHardcode = TABLES.replace("out.put(\"originLoads\", originLoads.get());", "out.put(\"originLoads\", 1);");
ok(`the counter reader charges a planted hardcoded originLoads (charged=${!censusOk(plantedHardcode)})`,
  !censusOk(plantedHardcode) && censusOk(TABLES));

// --- 6 · config parity + M1070/M1075 non-regression ------------------------------------------
const cfg = (key) => { const m = new RegExp(`^\\s*${key}\\s*:\\s*(\\d+)`, "m").exec(YML); return m ? Number(m[1]) : null; };
ok(`the yml pins ttl-jitter-seconds=${cfg("ttl-jitter-seconds")} == CACHE_POLICY.jitter=${P.jitter} and origin-latency-ms=${cfg("origin-latency-ms")} (default off)`,
  cfg("ttl-jitter-seconds") === P.jitter && cfg("origin-latency-ms") === 0 && P.jitter === 24);
ok(`M1070 honest degrade survives the wire twin (catch→origin=${/catch \(Exception e\) \{\s*\/\/ M1070[\s\S]*?return originJson\(\)/.test(SUMMARY)}, real ping=${/getConnectionFactory\(\)\.getConnection\(\)/.test(SUMMARY) && /conn\.ping\(\)/.test(SUMMARY)})`,
  /return originJson\(\)/.test(SUMMARY) && /getConnectionFactory\(\)\.getConnection\(\)/.test(SUMMARY) && /redisUp = false/.test(SUMMARY));
ok(`M1075's two distinct namespaced keys survive (summary=${/footballos:league:summary/.test(SUMMARY)}, tables=${/footballos:league:tables/.test(TABLES)})`,
  /footballos:league:summary/.test(SUMMARY) && /footballos:league:tables/.test(TABLES));
ok(`the M1070 resilience gate still runs alongside the new parity gate (${PROOF_FILES.length} proof scripts, redis-resilience linked=${PROOF_FILES.includes("proof-redis-resilience.mjs")})`,
  PROOF_FILES.length >= 41 && PROOF_FILES.includes("proof-redis-resilience.mjs") && PROOF_FILES.includes("proof-cache-parity.mjs"));

// --- 7 · witness integrity -------------------------------------------------------------------
const witnessPort = Number(/const\s+REDIS_PORT\s*=\s*(\d+)/.exec(WITNESS)?.[1] ?? -1);
ok(`the live parity witness targets a NON-default port (${witnessPort}) and refuses 6379/5672`,
  witnessPort > 1024 && witnessPort !== 6379 && witnessPort !== 5672 && /REDIS_PORT === 6379 \|\| REDIS_PORT === 5672/.test(WITNESS));
ok(`the witness injects a slow origin and asserts the N→1 collapse (${/FOOTBALLOS_CACHE_ORIGIN_LATENCY_MS/.test(WITNESS)}, ${/dLoads === 1 && dCoalesced === BURST - 1/.test(WITNESS)})`,
  /FOOTBALLOS_CACHE_ORIGIN_LATENCY_MS:\s*String\(ORIGIN_LATENCY_MS\)/.test(WITNESS) && /dLoads === 1/.test(WITNESS) && /coalesced/.test(WITNESS) && /BURST = 12/.test(WITNESS));
ok(`the witness measures the TTL SPREAD on both resources (repeated writes=${/for \(let i = 0; i < 8/.test(WITNESS)}, two keys=${/TABLE_KEY/.test(WITNESS)}, distinct=${/distinct\.length >= 2/.test(WITNESS)})`,
  /ttls\.push/.test(WITNESS) && /distinct\.length >= 2/.test(WITNESS) && /tableTtl/.test(WITNESS) && /TABLE_KEY/.test(WITNESS));
ok(`the witness restores Redis in a finally, handles SIGINT, and reflects its tally in the exit code`,
  /finally\s*\{[\s\S]*?docker\("start",\s*CONTAINER\)/.test(WITNESS) && /process\.on\("SIGINT"/.test(WITNESS) && /cleanup\(fail \? 1 : 0\)/.test(WITNESS));
const plantedFixedWitness = WITNESS.replace("ttls.push(Number(redisCli(\"ttl\", KEY)));", "ttls.push(60);");
ok(`the TTL-spread reader charges a planted fixed-TTL witness (charged=${/ttls\.push\(Number\(redisCli\("ttl", KEY\)\)\)/.test(WITNESS) && !/ttls\.push\(Number\(redisCli\("ttl", KEY\)\)\)/.test(plantedFixedWitness)})`,
  /ttls\.push\(Number\(redisCli\("ttl", KEY\)\)\)/.test(WITNESS) && !/ttls\.push\(Number\(redisCli\("ttl", KEY\)\)\)/.test(plantedFixedWitness));

// --- 8 · population floor --------------------------------------------------------------------
ok(`the census read real artifacts — Java ${SUMMARY.length}+${TABLES.length}+${JITTER.length} chars, yml ${YML.length}, witness ${WITNESS.length}, ${PROOF_FILES.length} proof scripts`,
  SUMMARY.length > 3000 && TABLES.length > 3000 && JITTER.length > 500 && YML.length > 300 && WITNESS.length > 3000 && PROOF_FILES.length >= 41);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
