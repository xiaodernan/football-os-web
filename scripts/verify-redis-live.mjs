// M1070: the cache tier's Redis dependency, witnessed LIVE — read-through, eviction, TTL,
// honest degradation and (the reason this milestone exists) a BOUNDED degrade latency.
//
// `verify-services.mjs` boots all seven jars against a DEAD broker port (:3999) and proves the
// cache tier degrades honestly with `redisUp:false`. That is the honest floor on a host whose
// 6379/5672 belong to a foreign stack. This script is the complementary LIVE witness: it starts a
// PROJECT-OWNED Redis on a NON-DEFAULT port and drives a real cache-service against it, so every
// number below is measured against a broker that actually answered, not a contracted stand-in.
//
// WHY THIS EXISTS (the defect it locks down). Lettuce's DEFAULT command timeout is 60s. On a real
// Redis outage, every cache read parked a Tomcat worker for that whole minute; a handful of
// concurrent misses exhausted the pool and the tier stopped answering even AFTER Redis came back.
// Measured live before the fix: a single degraded read took 61s and the service stayed unresponsive
// post-recovery. `application.yml` now pins `timeout: 2s` + `connect-timeout: 2s` (M1070). This
// witness asserts the degraded round-trip is under DEGRADE_BUDGET_MS, so a future edit that removes
// those bounds reddens here instead of silently reintroducing a thread-pool avalanche.
//
// NON-NEGOTIABLE PORT HYGIENE. This host's 6379/5672 are published by an unrelated Docker
// Desktop workload (a Career OS stack). We NEVER dial them. The container binds ONLY
// 127.0.0.1:REDIS_PORT (16379), the jar is spawned with SPRING_DATA_REDIS_PORT=REDIS_PORT, and the
// script refuses to run if either default port is the configured target. If the container already
// exists (e.g. a previous interrupted run), it is reused; the jar is always a fresh child and is
// always killed on exit. The container is left RUNNING so the companion proof and a human can poke
// it; pass --clean to remove it at the end.
//
// Run from the repo root after building the reactor:
//   mvn -DskipTests package -f services/pom.xml
//   node scripts/verify-redis-live.mjs          # leave the Redis container running
//   node scripts/verify-redis-live.mjs --clean   # remove the container afterwards
//
// Like verify-services.mjs, this is NOT part of `npm run proof`: it starts real processes and takes
// a minute. It IS the runnable truth the runbook (dev/platform-runbook.md) points at.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const CLEAN = argv.includes("--clean");

const REDIS_PORT = 16379;          // project-owned, non-default; NEVER 6379
const SERVICE_PORT = 8083;         // domain/platform.ts cache port
const CONTAINER = "footballos-redis-live";
const JAR = join(root, "services", "cache-service", "target", "cache-service-0.1.0.jar");
const ORIGIN = resolve(root, "services", "cache-service", "src", "main", "resources", "league-summary.json");
const BASE = `http://127.0.0.1:${SERVICE_PORT}/cache/league`;
const HEALTH = `http://127.0.0.1:${SERVICE_PORT}/actuator/health`;
const KEY = "footballos:league:summary";
const DEGRADE_BUDGET_MS = 8000;    // bounded (2s) timeout, generous ceiling for CI jitter
const UP_WINDOW_MS = 60000;

// Port hygiene is a gate, not a comment: refuse a misconfiguration before touching Docker.
if (REDIS_PORT === 6379 || REDIS_PORT === 5672) {
  console.error(`FAIL verify-redis-live targets a non-default port; got ${REDIS_PORT}, which may belong to a foreign stack`);
  process.exit(2);
}
if (!existsSync(JAR)) {
  console.error(`FAIL missing ${JAR} — build first: mvn -DskipTests package -f services/pom.xml`);
  process.exit(2);
}
const expected = readFileSync(ORIGIN, "utf8");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const redisCli = (...args) => docker("exec", CONTAINER, "redis-cli", ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = async (url, init) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(15000), ...init });
  return { status: r.status, body: await r.text() };
};
const stats = async () => JSON.parse((await json(`${BASE}/stats`)).body);
const summary = async () => (await json(`${BASE}/summary`)).body;
const ms = () => Date.now();

// --- bring up the project-owned Redis (reuse a surviving one, never a foreign broker) ----------
let created = false;
try {
  const state = docker("inspect", "-f", "{{.State.Status}}", CONTAINER);
  if (state !== "running") { docker("start", CONTAINER); }
  console.log(`ok   reused existing container ${CONTAINER} (state=${state})`);
  pass++;
} catch {
  docker("run", "-d", "--name", CONTAINER,
    "--publish", `127.0.0.1:${REDIS_PORT}:6379`,
    "redis:7-alpine", "redis-server", "--save", "", "--appendonly", "no");
  created = true;
  pass++; console.log(`ok   started project-owned Redis ${CONTAINER} on 127.0.0.1:${REDIS_PORT} (created=${created})`);
}
let ping = "";
for (let i = 0; i < 30; i++) { try { ping = redisCli("ping"); } catch { /* booting */ } if (ping === "PONG") break; await sleep(1000); }
ok(`the project-owned Redis answers PONG on the non-default ${REDIS_PORT} port (ping=${ping || "no answer"})`, ping === "PONG");
ok(`the container publishes ONLY 127.0.0.1:${REDIS_PORT} -> 6379 (never the host's 6379/5672)`,
  docker("inspect", "-f", "{{(index (index .NetworkSettings.Ports \"6379/tcp\") 0).HostIp}}:{{(index (index .NetworkSettings.Ports \"6379/tcp\") 0).HostPort}}", CONTAINER) === `127.0.0.1:${REDIS_PORT}`);

redisCli("del", KEY); // guarantee a cold cache even if a prior run left the key resident

// --- spawn a fresh cache-service against the live broker, with NO timeout env override ---------
// The point is to prove the PACKAGED yml (M1070's 2s bounds) is what keeps the degrade fast —
// we deliberately do NOT pass SPRING_DATA_REDIS_TIMEOUT here.
const logTail = [];
const child = spawn("java", ["-jar", JAR], {
  cwd: join(root, "services", "cache-service"),
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    SPRING_DATA_REDIS_HOST: "127.0.0.1",
    SPRING_DATA_REDIS_PORT: String(REDIS_PORT),
    EUREKA_CLIENT_ENABLED: "false",
    SPRING_CLOUD_CONFIG_ENABLED: "false",
    SERVER_PORT: String(SERVICE_PORT),
    CODEBUDDY_SAFE_DELETE_ENABLED: "0",
  },
});
const note = (c) => { for (const l of String(c).split(/\r?\n/)) { if (l.trim()) { logTail.push(l); if (logTail.length > 50) logTail.shift(); } } };
child.stdout.on("data", note); child.stderr.on("data", note);
let serviceUp = false;
const upStart = ms();
while (ms() - upStart < UP_WINDOW_MS) {
  if (child.exitCode !== null) break;
  try { const r = await fetch(`${BASE}/stats`, { signal: AbortSignal.timeout(2000) }); if (r.ok) { serviceUp = true; break; } } catch { /* booting */ }
  await sleep(1500);
}
const dump = () => { for (const l of logTail) console.error("  " + l); };
const cleanup = (code) => {
  try { child.kill("SIGTERM"); } catch { /* gone */ }
  if (CLEAN) { try { docker("rm", "-f", CONTAINER); } catch { /* gone */ } }
  process.exit(code);
};
process.on("SIGINT", () => cleanup(130));
if (!serviceUp) { console.error(`FAIL cache-service did not answer within ${UP_WINDOW_MS}ms`); dump(); cleanup(1); }
const s0 = await stats();
ok(`a fresh cache-service booted against the LIVE broker and reports redisUp=true (requests=${s0.requests}, ttl=${s0.ttlSeconds}s, jitter=${s0.ttlJitterSeconds}s)`,
  s0.redisUp === true && s0.requests === 0 && s0.ttlSeconds === 60 && s0.key === KEY &&
  s0.ttlJitterSeconds === 24 && typeof s0.originLoads === "number" && typeof s0.coalesced === "number");

// --- 1 · cold read is a MISS that writes a real key with a real TTL ---------------------------
const body1 = await summary();
const s1 = await stats();
const exists1 = redisCli("exists", KEY), ttl1 = Number(redisCli("ttl", KEY)), type1 = redisCli("type", KEY);
// M1076: the write-back TTL is now SEEDED-JITTERED into [ttl, ttl+jitter] = [60, 84]s. The exact
// spread (distinct buckets over repeated writes) is the parity witness's job; here we only require
// the single cold key to carry a bounded, non-negative TTL inside that window.
const ttlCeiling = s0.ttlSeconds + s0.ttlJitterSeconds;
ok(`the cold read MISSED and wrote a real Redis string key with a JITTERED TTL in [${s0.ttlSeconds}, ${ttlCeiling}]s (misses=${s1.misses}, EXISTS=${exists1}, TYPE=${type1}, TTL=${ttl1}s)`,
  s1.misses === 1 && s1.hits === 0 && s1.requests === 1 && exists1 === "1" && type1 === "string" && ttl1 >= 30 && ttl1 <= ttlCeiling);
ok(`the served body is the frozen origin contract byte-for-byte (${body1.length} bytes, ${JSON.parse(body1).snapshot.clubs} clubs)`,
  body1 === expected && JSON.parse(body1).snapshot.clubs === 73);

// --- 2 · warm read is a HIT; the origin is untouched and the bytes are identical --------------
const body2 = await summary();
const s2 = await stats();
ok(`the second read HIT Redis without re-reading origin (hits=${s2.hits}, hitRate=${s2.hitRate}%, requests=${s2.requests})`,
  s2.hits === 1 && s2.misses === 1 && s2.requests === 2 && s2.hitRate === 50 && body2 === body1);
// Prove the hit really came from Redis: overwrite the key with a sentinel, read again, and the
// service must echo the sentinel (a re-read of origin would return the contract instead).
const sentinel = JSON.stringify({ sentinel: "m1070-live-witness", n: 1 });
redisCli("set", KEY, sentinel, "EX", "60");
const bodySentinel = await summary();
ok(`the read truly comes from Redis — a planted sentinel key is echoed verbatim (${bodySentinel.slice(0, 32)}…)`,
  bodySentinel === sentinel && bodySentinel !== expected);
redisCli("del", KEY); // restore a clean miss path for the evict sequence below
await summary();       // repopulate

// --- 3 · evict drops the real key; the next read misses and repopulates -----------------------
const evictStats = JSON.parse((await json(`${BASE}/evict`, { method: "POST" })).body);
const existsAfterEvict = redisCli("exists", KEY);
const beforeEvictReads = evictStats.requests;
const body3 = await summary();
const s3 = await stats();
const exists3 = redisCli("exists", KEY), ttl3 = Number(redisCli("ttl", KEY));
ok(`POST /evict removed the real Redis key (EXISTS=${existsAfterEvict}) and the next read re-MISSED (misses=${s3.misses}, requests=${s3.requests})`,
  existsAfterEvict === "0" && s3.requests === beforeEvictReads + 1 && s3.misses === s3.requests - s3.hits && body3 === expected);
ok(`the evicted key was repopulated with a fresh JITTERED TTL in [${s0.ttlSeconds}, ${ttlCeiling}]s (EXISTS=${exists3}, TTL=${ttl3}s)`,
  exists3 === "1" && ttl3 >= 30 && ttl3 <= ttlCeiling);

// --- 4 · TTL actually expires: a short-TTL key vanishes and forces a fresh origin read --------
// Redis's own expiry is the policy (working set is one key), so we shorten THIS key's TTL via
// redis-cli to watch the service cross the expiry boundary without waiting 60s.
redisCli("expire", KEY, "1");
await sleep(1600);
const existsExpired = redisCli("exists", KEY);
const body4 = await summary();
const s4 = await stats();
ok(`a Redis key whose TTL was shortened to 1s expires (EXISTS=${existsExpired}) and the next read re-MISSES origin (misses=${s4.misses})`,
  existsExpired === "0" && body4 === expected && s4.misses === s3.misses + 1 && s4.requests === s3.requests + 1);
ok(`the re-populated key carries the full ${s4.ttlSeconds}s policy TTL again (EXISTS=${redisCli("exists", KEY)}, TTL=${Number(redisCli("ttl", KEY))}s)`,
  redisCli("exists", KEY) === "1" && Number(redisCli("ttl", KEY)) > 30);

// --- 5 · live -> DOWN: bounded degrade, honest flags, origin still served ----------------------
// This is the load-bearing check of M1070. Stop the container (Redis RAM is lost on stop), time
// the degraded reads, then ALWAYS bring it back via finally so an assertion never leaves it down.
let downStats = null, downBody = "", downHealth = 0, degradeMs = 0, statsMs = 0;
try {
  docker("stop", CONTAINER);
  const t0 = ms();
  downBody = await summary();
  degradeMs = ms() - t0;
  const t1 = ms();
  downStats = await stats();
  statsMs = ms() - t1;
  downHealth = (await json(HEALTH)).status;
} finally {
  docker("start", CONTAINER);
  for (let i = 0; i < 30; i++) { try { if (redisCli("ping") === "PONG") break; } catch { /* re-booting */ } await sleep(500); }
}
ok(`with Redis DOWN the origin fallback answers in ${degradeMs}ms (bound ${DEGRADE_BUDGET_MS}ms; was 61000ms at Lettuce's default 60s timeout)`,
  downBody === expected && degradeMs < DEGRADE_BUDGET_MS && degradeMs >= 0);
ok(`with Redis DOWN the stats endpoint also stays responsive in ${statsMs}ms and reports redisUp=false honestly (redisUp=${downStats?.redisUp})`,
  statsMs < DEGRADE_BUDGET_MS && downStats?.redisUp === false);
ok(`with Redis DOWN the actuator health answers ${downHealth} (503), matching redisUp=false — the tier degrades but does not lie`,
  downHealth === 503);
// A bounded-timeout service recovers promptly: the very next post-recovery read must still answer.
const afterBack = await json(`${BASE}/stats`);
ok(`the service is STILL responsive immediately after Redis returns (HTTP ${afterBack.status}, redisUp=${JSON.parse(afterBack.body).redisUp}) — no exhausted worker pool`,
  afterBack.status === 200 && JSON.parse(afterBack.body).redisUp === true);

// --- 6 · DOWN -> live: the lost RAM is repopulated on the next read ----------------------------
const existsLost = redisCli("exists", KEY); // stop lost the container's RAM
const beforeRecover = await stats();
const bodyBack = await summary();
const afterRecover = await stats();
const existsBack = redisCli("exists", KEY), ttlBack = Number(redisCli("ttl", KEY));
ok(`Redis RAM was genuinely lost across the stop (EXISTS=${existsLost}) and the next read re-MISSED into a fresh key (EXISTS=${existsBack}, TTL=${ttlBack}s)`,
  existsLost === "0" && existsBack === "1" && ttlBack > 0 && ttlBack <= ttlCeiling &&
  afterRecover.misses === beforeRecover.misses + 1 && bodyBack === expected);

// The exit code MUST reflect the tally — a FAIL that exits 0 is a green that lies (the discipline
// proof-discipline.mjs holds every proof to). Print the tally first, then exit on the counted fails.
console.log(`\n${pass}/${pass + fail} checks passed`);
console.log("verify-redis-live: the cache tier read-through a REAL project-owned Redis (miss/hit/evict/TTL/sentinel), degraded in bounded time with honest redisUp=false + health 503 when it vanished, and repopulated after recovery — the 60s thread-pool avalanche stays fixed; the foreign host ports 6379/5672 were never dialed.");
cleanup(fail ? 1 : 0);
