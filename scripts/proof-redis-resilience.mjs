// M1070: the Redis resilience contract, pinned as a deterministic static gate.
//
// verify-redis-live.mjs witnesses the cache tier against a REAL project-owned Redis on a
// non-default port: cold miss, warm hit, sentinel echo, evict, real TTL expiry, a bounded live→down
// degrade (2s instead of Lettuce's 60s default), honest redisUp=false + health 503, and repopulation
// after recovery. That is runtime truth but it needs Docker and a jar. This proof is the portable
// floor beneath it: it parses the SHIPPED yml, the SHIPPED Java and the witness harness itself, needs
// no broker, and refuses the exact regressions that caused the defect — most importantly, someone
// deleting `timeout`/`connect-timeout` and silently restoring a 61s thread-pool avalanche.
//
// Four families, each with a planted arm so widening a reading can never quietly blind the gate:
//   • bounded timeout: the packaged yml pins BOTH command and connect timeouts, each a short
//     duration (not Lettuce's implicit 60s, not an unbounded/omitted value). Planted: drop either
//     bound, or set a 60s value, and the detector charges it.
//   • honest degradation: readSummary's catch serves origin (never rethrows), stats() pings a real
//     RedisConnection to set redisUp (never a hardcoded true), and evict swallows a dead broker.
//   • read-through shape: get→hit-return / miss→origin→set-with-TTL, a namespaced key, an evict
//     endpoint, and stats that expose the census the live witness asserts on.
//   • witness integrity: the live harness targets a NON-default port, enforces a degrade budget
//     far below 60s, spawns the jar with NO timeout override (so it tests the packaged bounds),
//     and restores the container in a finally. Planted: a default port or a 60s budget is charged.
//
// Honest limit: this reads declarations, not a socket. A real Redis round-trip and the measured
// 2s degrade belong to verify-redis-live.mjs and the runbook witness; this gate keeps their
// preconditions from rotting on a machine without Docker.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const YML = read("services/cache-service/src/main/resources/application.yml");
const SERVICE = read("services/cache-service/src/main/java/com/footballos/cache/LeagueCacheService.java");
const CONTROLLER = read("services/cache-service/src/main/java/com/footballos/cache/LeagueCacheController.java");
const WITNESS = read("scripts/verify-redis-live.mjs");
const PROOF_FILES = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));
const COMPOSE = read("services/docker-compose.yml");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Parse a `key: value` duration under a given parent indent, stripping comments so a documented
// default cannot satisfy a bound the config does not actually declare.
const declaredDuration = (sheet, key) => {
  const clean = sheet.replace(/^[ \t]*#.*$/gm, "");
  const m = new RegExp(`^(\\s*)${key}\\s*:\\s*([\\d.]+)\\s*(ms|s)\\s*$`, "m").exec(clean);
  if (!m) return null;
  return { indent: m[1].length, ms: parseFloat(m[2]) * (m[3] === "s" ? 1000 : 1), raw: m[0] };
};

// --- 1 · bounded timeout: both arms present, short, and strictly under the 60s default ----------
const COMMAND_TIMEOUT = declaredDuration(YML, "timeout");
const CONNECT_TIMEOUT = declaredDuration(YML, "connect-timeout");
const DEFAULT_MS = 60000;
const MAX_BOUND_MS = 5000;
ok(`the packaged yml pins a BOUNDED command timeout (${COMMAND_TIMEOUT?.ms ?? "missing"}ms) and connect timeout (${CONNECT_TIMEOUT?.ms ?? "missing"}ms), both under the ${MAX_BOUND_MS}ms ceiling and the ${DEFAULT_MS}ms Lettuce default`,
  COMMAND_TIMEOUT != null && CONNECT_TIMEOUT != null &&
  COMMAND_TIMEOUT.ms > 0 && CONNECT_TIMEOUT.ms > 0 &&
  COMMAND_TIMEOUT.ms <= MAX_BOUND_MS && CONNECT_TIMEOUT.ms <= MAX_BOUND_MS &&
  COMMAND_TIMEOUT.ms < DEFAULT_MS && CONNECT_TIMEOUT.ms < DEFAULT_MS);
// Both arms must sit under the SAME spring.data.redis parent, not one nested somewhere unrelated.
// Read from the line AFTER `redis:`; a non-comment line indented back to the parent's own level
// closes the block. This is the shape the packaged yml actually has (redis: at 4, its keys at 6).
const redisBlock = (() => {
  const m = /^(\s*)redis\s*:\s*$/m.exec(YML);
  if (!m) return "";
  const base = m[1].length;
  const rows = [];
  for (const line of YML.slice(m.index + m[0].length).split(/\r?\n/).slice(1)) {
    const indent = line.match(/^\s*/)[0].length;
    if (line.trim() && !/^\s*#/.test(line) && indent <= base) break;
    rows.push(line);
  }
  return rows.join("\n");
})();
const blockKeys = (s) => [...s.matchAll(/^\s*([a-z][\w-]*)\s*:/gm)].map((m) => m[1]);
const redisKeys = blockKeys(redisBlock);
ok(`both bounded timeouts live under the same spring.data.redis block that pins host/port (${redisKeys.length} keys: ${redisKeys.join(", ")}), so the bounds apply to the client that dials Redis`,
  ["host", "port", "timeout", "connect-timeout"].every((k) => redisKeys.includes(k)) &&
  redisKeys.length >= 4 && redisKeys.filter((k) => k === "timeout").length === 1);
// Planted: an omitted bound, or one restored to the implicit 60s, must be charged by this reader.
const detector = (yml) => {
  const c = declaredDuration(yml, "timeout"), n = declaredDuration(yml, "connect-timeout");
  return c != null && n != null && c.ms > 0 && n.ms > 0 && c.ms <= MAX_BOUND_MS && n.ms <= MAX_BOUND_MS;
};
const plantedYml = {
  "both bounds dropped": YML.replace(/^\s*timeout\s*:\s*2s\s*$/m, "").replace(/^\s*connect-timeout\s*:\s*2s\s*$/m, ""),
  "command timeout dropped": YML.replace(/^\s*timeout\s*:\s*2s\s*$/m, ""),
  "connect timeout restored to the 60s default": YML.replace(/^\s*connect-timeout\s*:\s*2s\s*$/m, "      connect-timeout: 60s"),
};
const plantedCharged = Object.values(plantedYml).filter((y) => !detector(y)).length;
ok(`the timeout detector refuses ${plantedCharged}/${Object.keys(plantedYml).length} planted regressions (both dropped, one dropped, one set to 60s) while crediting the shipped 2s/2s bound (${detector(YML)})`,
  plantedCharged === Object.keys(plantedYml).length && detector(YML));

// --- 2 · honest degradation: serve origin on a dead broker, never a hardcoded green -------------
const catchReturnsOrigin = /catch\s*\(Exception\s+e\)\s*\{[\s\S]*?return\s+originJson\(\)/.test(SERVICE);
const originReadsClasspath = /new\s+ClassPathResource\(resource\)/.test(SERVICE);
const statsPingsRealConnection = /getConnectionFactory\(\)\.getConnection\(\)/.test(SERVICE) && /conn\.ping\(\)/.test(SERVICE) && /redisUp\s*=\s*false/.test(SERVICE);
const evictSwallowsDeath = /void\s+evict\(\)[\s\S]*?catch\s*\(Exception/.test(SERVICE);
ok(`readSummary serves the classpath origin on a Redis failure (catch→origin=${catchReturnsOrigin}, ClassPathResource=${originReadsClasspath}) instead of rethrowing a 500`,
  catchReturnsOrigin && originReadsClasspath);
ok(`stats derives redisUp from a REAL ${"RedisConnection"}.ping() with an honest false arm (ping=${statsPingsRealConnection}) rather than a hardcoded true`,
  statsPingsRealConnection && !/redisUp\s*=\s*true\s*;\s*\/\/\s*always/.test(SERVICE));
ok(`evict tolerates a dead broker without taking the endpoint down (catch=${evictSwallowsDeath})`,
  evictSwallowsDeath);
// Planted: a hardcoded `redisUp = true` returned unconditionally must be charged by the reader.
const honestyOk = (src) => /getConnectionFactory\(\)\.getConnection\(\)/.test(src) && /conn\.ping\(\)/.test(src) && /redisUp\s*=\s*false/.test(src);
const plantedHardcode = "public Map stats() { out.put(\"redisUp\", true); return out; }";
const plantedHardcodeCharged = !honestyOk(plantedHardcode);
ok(`the honesty detector credits the shipped real ping (honest=${honestyOk(SERVICE)}) and charges a planted unconditional redisUp=true (refused=${plantedHardcodeCharged})`,
  honestyOk(SERVICE) && plantedHardcodeCharged && /out\.put\(\"redisUp\",\s*true\)/.test(plantedHardcode));

// --- 3 · read-through shape: the three endpoints and the get→miss→origin→set-with-TTL path -----
const getHitMissSet = /opsForValue\(\)\.get\(key\(\)\)/.test(SERVICE) &&
  /if\s*\(cached\s*!=\s*null\)[\s\S]*?hits\+\+[\s\S]*?return\s+cached/.test(SERVICE) &&
  /misses\+\+[\s\S]*?originJson\(\)[\s\S]*?opsForValue\(\)\.set\(key\(\),\s*fresh,\s*Duration\.ofSeconds\(ttlSeconds\)\)/.test(SERVICE);
const namespacedKey = /return\s+"footballos:league:summary"/.test(SERVICE);
const endpoints = ["@GetMapping(\"/summary\")", "@GetMapping(\"/stats\")", "@PostMapping(\"/evict\")"].every((e) => CONTROLLER.includes(e));
const census = ["requests", "hits", "misses", "hitRate", "redisUp", "key", "ttlSeconds"].every((k) => SERVICE.includes(`out.put("${k}"`));
ok(`the service is genuinely read-through: get→hit-return→miss→origin→set-with-TTL (shape=${getHitMissSet}, namespaced key=${namespacedKey})`,
  getHitMissSet && namespacedKey);
ok(`the controller exposes summary/stats/evict (${endpoints ? "3/3" : "missing"}) and stats carries the ${["requests", "hits", "misses", "hitRate", "redisUp", "key", "ttlSeconds"].length}-field census the live witness asserts (census=${census})`,
  endpoints && census);
// compose must still wire the live-broker story for a registry-healthy host, with the bounded
// bounds carried by the same yml (the image and the service dependency are the runnable truth).
const composeWiresRedis = /redis:\s*\n[\s\S]*?image:\s*redis:7-alpine/.test(COMPOSE) && /cache-service[\s\S]*?- redis\b/.test(COMPOSE);
ok(`compose still wires a redis:7-alpine broker into cache-service (wired=${composeWiresRedis}) and the shared yml keeps its ${COMMAND_TIMEOUT?.ms ?? "missing"}ms bound for that live path`,
  composeWiresRedis && COMMAND_TIMEOUT != null && COMMAND_TIMEOUT.ms <= MAX_BOUND_MS);

// --- 4 · witness integrity: the live harness cannot drift into a worthless green ---------------
const portDeclared = /const\s+REDIS_PORT\s*=\s*(\d+)/.exec(WITNESS);
const witnessPort = portDeclared ? Number(portDeclared[1]) : -1;
const budgetDeclared = /const\s+DEGRADE_BUDGET_MS\s*=\s*(\d+)/.exec(WITNESS);
const witnessBudget = budgetDeclared ? Number(budgetDeclared[1]) : Infinity;
ok(`the live witness targets a NON-default port (${witnessPort}) and never 6379/5672, refusing a foreign-stack dial`,
  witnessPort > 1024 && witnessPort !== 6379 && witnessPort !== 5672 && /REDIS_PORT === 6379 \|\| REDIS_PORT === 5672/.test(WITNESS));
ok(`the witness enforces a degrade budget of ${witnessBudget}ms — far below the 60000ms avalanche it locks down (${(60000 / witnessBudget).toFixed(0)}× margin)`,
  witnessBudget > 0 && witnessBudget < DEFAULT_MS / 4 && witnessBudget >= 2000);
const noOverride = !/SPRING_DATA_REDIS_TIMEOUT\s*:/.test(WITNESS) && !/SPRING_DATA_REDIS_CONNECT_TIMEOUT\s*:/.test(WITNESS);
ok(`the witness spawns the jar WITHOUT a timeout env override (noOverride=${noOverride}), so the PACKAGED yml bounds are what actually keep the degrade fast`,
  noOverride && /spawn\("java"/.test(WITNESS) && /SPRING_DATA_REDIS_PORT:\s*String\(REDIS_PORT\)/.test(WITNESS));
const restoresInFinally = /finally\s*\{[\s\S]*?docker\("start",\s*CONTAINER\)[\s\S]*?ping/.test(WITNESS);
ok(`the witness restores the Redis container in a finally (restores=${restoresInFinally}) so a failed assertion never leaves the broker down`,
  restoresInFinally && /process\.on\("SIGINT",\s*\(\)\s*=>\s*cleanup/.test(WITNESS));
// Planted: a default-port witness or a 60s budget must be charged by the SAME readers above.
const portOk = (p) => p > 1024 && p !== 6379 && p !== 5672;
const budgetOk = (b) => b > 0 && b < DEFAULT_MS / 4 && b >= 2000;
const plantedPortCharged = !portOk(6379) && !portOk(5672);
const plantedBudgetCharged = !budgetOk(DEFAULT_MS) && !budgetOk(0);
ok(`the witness readers charge a planted default-port target (6379 refused=${!portOk(6379)}, 5672 refused=${!portOk(5672)}) and a planted ${DEFAULT_MS}ms/zero budget (refused=${plantedBudgetCharged}) while crediting the shipped port ${witnessPort} and budget ${witnessBudget}ms`,
  plantedPortCharged && plantedBudgetCharged && portOk(witnessPort) && budgetOk(witnessBudget));

// --- 5 · population floor: the proof is reading real files, not an empty sheet -----------------
ok(`the census read a real cache tier — yml ${YML.length} chars, service ${SERVICE.length} chars, controller ${CONTROLLER.length} chars, witness ${WITNESS.length} chars, compose ${COMPOSE.length} chars, ${PROOF_FILES.length} proof scripts`,
  YML.length > 300 && SERVICE.length > 2000 && CONTROLLER.length > 500 && WITNESS.length > 3000 && COMPOSE.length > 300 && PROOF_FILES.length >= 40);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
