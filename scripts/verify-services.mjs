// M1042: the Spring Cloud stack is not decoration. This script replays the live verification
// the platform milestone proved by hand — boot the services in dependency order, ask the config
// server what the league service is made of, read the frozen contract through the gateway, then
// stop the league service and watch the circuit answer itself with a canned 503.
//
// M1063: the boot order is no longer a hand-typed array trusting its own comments. TOPOLOGY is the
// full seven-node dependency DAG (mirrored from domain/platform.ts and proof-checked row for row);
// BOOT_IDS is the honest host-boot subset. scripts/lib/boot-order.mjs derives the canonical order
// with Kahn's algorithm and REFUSES to continue if either list has a cycle, an edge to a missing
// node, a duplicate, or a chosen order that boots a node before a dependency. The chosen order is
// allowed to differ from the canonical one — the gateway stays last on purpose (M1042: booting it
// before the domain services earns a `No servers available for service` Eureka/LB cache window) —
// it just has to remain a VALID topological order.
//
// Seven services boot right now, in the verified topological order — but two of them cannot claim
// their brokers on THIS host: 6379 and 5672 belong to a foreign stack published by Docker Desktop.
// Dialing them with default credentials would not be a witness, it would be a guess, so the child
// processes are spawned against :3999 (a port nothing occupies) instead. The cache tier then serves
// the frozen contract from origin with `redisUp:false`, and the messaging tier binds against a dead
// broker and reports it — both honest, both checkable, neither a claimed green. On a host where
// redis and rabbitmq run on the default ports, delete the two env overrides in BOOT_ENV below and
// the same assertions hold against the live brokers.
// The yml stays pointed at localhost:6379/5672 (the compose stack owns the live-broker story);
// nothing about the reactor config itself changes — this is spawn-time honesty, not a config edit.
//
// Run from the repo root after building the reactor:
//   mvn -DskipTests package -f services/pom.xml
//   node scripts/verify-services.mjs
//
// It is not part of `npm run proof`: it starts real processes, takes a minute, and the gate
// should not carry that weight. It IS the gate's witness — the committed evidence the runbook
// (dev/platform-runbook.md) describes, runnable by anyone who wants to watch.
//
// On Windows the port 8080 belongs to Docker Desktop on this machine, which is why the gateway
// lives on 8087. Free the boot ports before running — a stale java.exe is the usual suspect:
//   taskkill /IM java.exe /F
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { topologicalOrder, assertBootOrder } from "./lib/boot-order.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The full dependency DAG, in the same order and with the same edges as PLATFORM_SERVICES in
// domain/platform.ts. Kept as a plain JSON literal so proof-boot-order.mjs can parse it without an
// interpreter and refuse a drift against the descriptor. `dependsOn` reads "must boot after".
const TOPOLOGY = [
  {"id":"registry","dependsOn":[]},
  {"id":"config","dependsOn":["registry"]},
  {"id":"gateway","dependsOn":["registry"]},
  {"id":"league","dependsOn":["registry","config"]},
  {"id":"discipline","dependsOn":["registry","config"]},
  {"id":"cache","dependsOn":["registry","config"]},
  {"id":"messaging","dependsOn":["registry","config"]}
];
// The honest host-boot list: all seven services, gateway last on purpose (M1042 — the LB cache
// window for any freshly booted backend). cache (8083) and messaging (8084) boot against :3999 (a
// dead port) rather than claiming a local broker — see BOOT_ENV below.
const BOOT_IDS = [
  "registry","config","league","discipline","cache","messaging","gateway"
];
// Nothing occupies :3999 — that is the point. The broker-dependent children are spawned against it
// so the run never dials the foreign stack that owns 6379/5672 on this host (Docker Desktop publishes
// both for another project). Delete these two lines on a host that owns a real broker pair to watch
// the same assertions pass against live Redis/RabbitMQ.
const BOOT_ENV = {
  cache: { SPRING_DATA_REDIS_PORT: "3999" },
  messaging: { SPRING_RABBITMQ_PORT: "3999" },
};

// Boot details for each host-booted node. Kept by id and looked up through BOOT_IDS, so adding a
// service to the topology can never silently shift a positional index into the children map.
const DETAILS = {
  registry: { jar: "eureka-server/target/eureka-server-0.1.0.jar", port: 8761, healthGated: true },
  config: { jar: "config-server/target/config-server-0.1.0.jar", port: 8888, healthGated: true },
  league: { jar: "league-service/target/league-service-0.1.0.jar", port: 8081, healthGated: true },
  discipline: { jar: "discipline-service/target/discipline-service-0.1.0.jar", port: 8082, healthGated: true },
  cache: { jar: "cache-service/target/cache-service-0.1.0.jar", port: 8083, healthGated: false },
  messaging: { jar: "messaging-service/target/messaging-service-0.1.0.jar", port: 8084, healthGated: false },
  gateway: { jar: "gateway/target/gateway-0.1.0.jar", port: 8087, healthGated: true },
};

// -- the algorithm is a gate, not a comment ----------------------------------------------------
const canonical = topologicalOrder(TOPOLOGY);
if (canonical.cyclic.length || canonical.unknown.length || canonical.duplicates.length) {
  console.error(`TOPOLOGY is not a well-formed DAG — cyclic=[${canonical.cyclic}] unknown=[${canonical.unknown}] duplicates=[${canonical.duplicates}]`);
  process.exit(2);
}
const bootEntries = TOPOLOGY.filter((e) => BOOT_IDS.includes(e.id));
const chosen = assertBootOrder(BOOT_IDS, bootEntries);
if (!chosen.ok) { console.error(`BOOT_IDS is not a valid topological order:\n  ${chosen.violations.join("\n  ")}`); process.exit(2); }
// No booted node may depend on a service we are NOT booting — otherwise the host stack is incomplete.
const excluded = new Set(TOPOLOGY.filter((e) => !BOOT_IDS.includes(e.id)).map((e) => e.id));
const dangling = bootEntries.flatMap((e) => (e.dependsOn ?? []).filter((d) => excluded.has(d)).map((d) => `${e.id} needs ${d}`));
if (dangling.length) { console.error(`BOOT_IDS depends on an excluded service: ${dangling.join(", ")}`); process.exit(2); }
console.log(`ok   topology is a clean ${TOPOLOGY.length}-node DAG (canonical: ${canonical.order.join(" -> ")})`);
console.log(`ok   host boot order is a valid topological order of ${BOOT_IDS.length} nodes (${BOOT_IDS.join(" -> ")}); excluded: ${[...excluded].join(", ")}`);

const jarPath = (s) => join(root, "services", s.jar);
for (const id of BOOT_IDS) {
  const s = DETAILS[id];
  if (!existsSync(jarPath(s))) {
    console.error(`missing ${s.jar} — build the reactor first: mvn -DskipTests package -f services/pom.xml`);
    process.exit(2);
  }
}

const waitFor = async (url, tries = 90) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { const j = await r.json(); if (j.status === "UP") return true; }
    } catch { /* not yet */ }
    await new Promise((res) => setTimeout(res, 2000));
  }
  return false;
};

// For the broker-deprived services the liveness question is "does the surface it serves answer
// 200", not "is the broker present".
const waitUntil200 = async (url, tries = 60, sleepMs = 2000) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) return true;
    } catch { /* not yet */ }
    await new Promise((res) => setTimeout(res, sleepMs));
  }
  return false;
};

// The gateway's load balancer caches the registry; a freshly booted stack may need one cache
// window (~35s default) before LEAGUE-SERVICE is visible to lb://. Poll instead of presuming.
const fetchUntil = async (url, validate, tries = 24, sleepMs = 5000) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await r.text();
      last = { r, text };
      if (validate(r, text)) return last;
    } catch (err) {
      last = { r: null, text: String(err) };
    }
    await new Promise((res) => setTimeout(res, sleepMs));
  }
  return last;
};

// Keyed by service id, not a positional array: `children[2].kill()` silently means "league" only
// while the list keeps its exact order, so inserting one service would redirect the circuit test
// to an unrelated process. A Map makes the stop target a named decision.
const children = new Map();
// Keep the tails of the service logs only if something goes wrong — a failing boot should
// hand you the stack trace, a passing one should be quiet.
const logTails = new Map();
const wireLogs = (child, label) => {
  const tail = [];
  const note = (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (!line.trim()) continue;
      tail.push(line);
      if (tail.length > 60) tail.shift();
    }
  };
  child.stdout.on("data", note);
  child.stderr.on("data", note);
  logTails.set(child, { label, tail });
};
const dumpLogsOnFailure = () => {
  for (const [, { label, tail }] of logTails) {
    console.error(`\n==== ${label} (last ${tail.length} lines) ====`);
    for (const line of tail) console.error(line);
  }
};
const cleanup = () => { for (const c of children.values()) { try { c.kill("SIGTERM"); } catch { /* gone */ } } };
process.on("SIGINT", () => { dumpLogsOnFailure(); cleanup(); process.exit(130); });
process.on("exit", cleanup);

const fail = (msg) => { console.error(`FAIL ${msg}`); dumpLogsOnFailure(); cleanup(); process.exit(1); };
const pass = (msg) => console.log(`ok   ${msg}`);

// Boot the host stack in the verified topological order.
for (const id of BOOT_IDS) {
  const s = { id, ...DETAILS[id], health: `http://localhost:${DETAILS[id].port}/actuator/health` };
  const env = BOOT_ENV[id] ? { ...process.env, ...BOOT_ENV[id] } : process.env;
  const child = spawn("java", ["-jar", jarPath(s)], { stdio: ["ignore", "pipe", "pipe"], env });
  wireLogs(child, s.id);
  children.set(s.id, child);
  // The broker-deprived services are not health-gated (their /actuator/health answers 503 by design,
  // naming the missing broker honestly); instead the witness below polls the surface they serve.
  const up = s.healthGated ? await waitFor(s.health) : await waitUntil200(`http://localhost:${s.port}/${id === "cache" ? "cache/league/summary" : "messaging/summary"}`);
  if (!up) fail(`${s.id} (${s.port}) did not come up within the window`);
  pass(`${s.id} is up on ${s.port}${s.healthGated ? " (actuator/health UP)" : " (broker-deprived surface answered 200)"}`);
}

// The two broker-deprived services are witnessed LIVE, not by contract: they booted (above) against a
// dead broker, so this host sees the honest degraded mode. The checks below hold in both a brokerless
// host (what this run proved) and a brokered one (delete BOOT_ENV — the same bytes answer).
// Cache: the read-through serves the frozen contract from origin when Redis is unreachable, and its two
// endpoints must agree with each other — /stats's redisUp false exactly when /actuator/health is 503.
{
  const cacheHealth = await fetch("http://localhost:8083/actuator/health", { signal: AbortSignal.timeout(8000) });
  const stats = await fetch("http://localhost:8083/cache/league/stats", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  if (typeof stats?.redisUp !== "boolean") fail("the cache's stats endpoint did not report a boolean redisUp");
  if ((cacheHealth.status === 200) !== stats.redisUp) {
    fail(`the cache disagrees with itself: /actuator/health answers ${cacheHealth.status} but redisUp=${stats.redisUp}`);
  }
  pass(`the cache boots without Redis and tells the truth about it (health=${cacheHealth.status}, redisUp=${stats.redisUp})`);
  const summary = await fetch("http://localhost:8083/cache/league/summary", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  const cacheContract = JSON.parse(readFileSync(join(root, "services/cache-service/src/main/resources/league-summary.json"), "utf8"));
  if (JSON.stringify(summary) !== JSON.stringify(cacheContract)) fail("the cache's origin read diverges from the frozen contract on disk");
  pass("the cache serves the frozen contract from origin with the broker deprived (read-through degraded mode)");
}
// Messaging: the binder dials a dead port, the web surface still answers, and the payload must mirror
// the shared policy the pure fold runs under — the same numbers proof-services.mjs checks in the yml.
{
  const summary = await fetch("http://localhost:8084/messaging/summary", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  if (summary?.exchange !== "footballos.events" || summary?.dlq !== "footballos.events.dlq" || summary?.binder !== "rabbit" || summary?.live !== false) {
    fail(`the messaging summary did not carry the declared exchange/dlq/binder/live=false (got ${JSON.stringify(summary)})`);
  }
  pass("the messaging tier answers its observe surface with live=false, the declared exchange and DLQ");
  const policy = await fetch("http://localhost:8084/messaging/policy", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
  if (policy?.baseDelay !== 20 || policy?.capDelay !== 640 || policy?.maxAttempts !== 5 || policy?.highWater !== 64 || policy?.lowWater !== 16 || policy?.shards !== 8 || policy?.rung3 !== 80) {
    fail(`the messaging policy drifted: ${JSON.stringify(policy)}`);
  }
  pass("the messaging tier serves the same retry/water-mark policy the pure fold runs under (rung3=80)");
}
// The config server must actually be serving the league's property — this is what M1040 opened
// up, and it is the one piece that was invisible when everything was hard-coded.
const configRoundTrip = await fetch("http://localhost:8888/league-service/default", {
  signal: AbortSignal.timeout(8000),
});
const configBody = await configRoundTrip.json();
const source = configBody?.propertySources?.find((s) => s.name.includes("config-repo"))?.source ?? {};
if (source["footballos.world.label"] !== "Demo World R1") fail("the config server did not serve footballos.world.label=Demo World R1 for league-service/default");
pass("the config server serves league-service/default: footballos.world.label=Demo World R1");

// The league's actuator/info must print the world label that came from the config server, not a
// compiled-in constant.
const info = await fetch("http://localhost:8081/actuator/info", { signal: AbortSignal.timeout(8000) });
const infoBody = await info.json();
if (infoBody?.app?.world !== "Demo World R1") fail(`league-service /actuator/info did not print the config-supplied world label (got ${JSON.stringify(infoBody?.app?.world)})`);
pass("league-service /actuator/info prints world=Demo World R1, taken from the config server");

// M968: the discipline service's frozen clocks, direct and through the gateway — the same
// bytes both ways, an unknown competition a 404, exactly like the league table reads.
// M1042's LB window bites the discipline probe too: a freshly booted gateway may resolve
// DISCIPLINE-SERVICE to nobody for its first refresh, so the round-trip is retried until it lands.
const discDirect = await fetch("http://localhost:8082/discipline/clock/ucl", { signal: AbortSignal.timeout(8000) });
if (!discDirect.ok) fail(`discipline-service /discipline/clock/ucl did not answer 200 (got ${discDirect.status})`);
else {
  const disc = await discDirect.json();
  const discProbe = await fetchUntil(
    "http://localhost:8087/api/discipline/clock/ucl",
    (r, text) => r.ok && text.length > 2,
    18,
    5000,
  );
  if (!discProbe || !discProbe.r || !discProbe.r.ok ||
      JSON.stringify(JSON.parse(discProbe.text)) !== JSON.stringify(disc)) {
    fail(`the gateway's discipline clock differs from the direct read (last probe: status ${discProbe?.r?.status ?? "n/a"})`);
  } else pass("the discipline clock reads the same direct and through the gateway (ucl)");
  const discMissProbe = await fetchUntil(
    "http://localhost:8087/api/discipline/clock/nowhere",
    (r) => r.status === 404,
    12,
    5000,
  );
  if (!discMissProbe || discMissProbe?.r?.status !== 404) {
    fail(`an unknown competition through the gateway answered ${discMissProbe?.r?.status ?? "n/a"}, wanted 404`);
  } else pass("an unknown competition through the gateway answers 404 from the discipline service");
  const discMiss = await fetch("http://localhost:8082/discipline/clock/nowhere", { signal: AbortSignal.timeout(8000) });
  if (discMiss.status !== 404) fail(`an unknown competition answered ${discMiss.status}, not 404`);
  else pass("an unknown competition reads 404 from the discipline service");
}

// The frozen contract, read three ways: off disk, direct, and through the gateway's lb:// route.
const contract = JSON.parse(readFileSync(join(root, "services/league-service/src/main/resources/league-summary.json"), "utf8"));
const direct = await fetch("http://localhost:8081/league/summary", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
if (JSON.stringify(direct) !== JSON.stringify(contract)) fail("the direct league read diverges from the frozen contract on disk");
pass("league-service /league/summary answers identical bytes to the frozen contract");

// The tables read: the list, one known competition through the gateway and through the direct
// mapping, and an unknown competition forced through the same path — both must land on 404.
const tables = JSON.parse(readFileSync(join(root, "services/league-service/src/main/resources/league-tables.json"), "utf8"));
const tableList = await fetch("http://localhost:8081/league/table", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
const frozenVenue = Object.keys(tables.tables).sort().join(",");
const servedVenue = Array.isArray(tableList?.competitions) ? tableList.competitions.slice().sort().join(",") : "";
if (frozenVenue !== servedVenue) {
  fail("the tables list endpoint does not enumerate the exact competitions in the frozen file");
}
pass("league-service /league/table lists exactly the 15 competitions in the frozen tables file");

const tableUcl = await fetch("http://localhost:8081/league/table/ucl", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
if (JSON.stringify(tableUcl) !== JSON.stringify(tables.tables.ucl)) fail("the direct table read diverges from the frozen tables file");
pass("league-service /league/table/ucl answers identical rows to the frozen champions-league table");

const tableGatewayProbe = await fetchUntil(
  "http://localhost:8087/api/league/table/ucl",
  (r, text) => r.ok && text.length > 2 && text.includes('"competitionId"'),
  18,
  5000,
);
if (!tableGatewayProbe || !tableGatewayProbe.r || !tableGatewayProbe.r.ok ||
    JSON.stringify(JSON.parse(tableGatewayProbe.text)) !== JSON.stringify(tables.tables.ucl)) {
  fail(`the gateway table round-trip does not return the frozen table (last probe: status ${tableGatewayProbe?.r?.status ?? "n/a"})`);
}
pass("the gateway round-trip (lb://LEAGUE-SERVICE, table route, ordered ahead of the catch-all) returns the frozen table rows");

const tableUnknownProbe = await fetchUntil(
  "http://localhost:8087/api/league/table/notacompetition",
  (r) => r.status === 404,
  8,
  5000,
);
if (!tableUnknownProbe || tableUnknownProbe.r?.status !== 404) {
  fail(`an unknown competition through the gateway answered ${tableUnknownProbe?.r?.status ?? "n/a"}, wanted 404`);
}
pass("an unknown competition through the gateway answers 404 from the league service");

// The broker-deprived services through the gateway: the lb:// route strips exactly one prefix, so
// /api/cache/league/summary arrives at the cache as /cache/league/summary, and /api/messaging/summary
// at the messaging tier. Both answer with their honest degraded-mode payloads rather than a green.
const cacheGwProbe = await fetchUntil(
  "http://localhost:8087/api/cache/league/summary",
  (r, text) => r.ok && text.includes('"generatedBy"'),
  18,
  5000,
);
if (!cacheGwProbe || !cacheGwProbe.r || !cacheGwProbe.r.ok) {
  fail(`the gateway did not round-trip /api/cache/league/summary (last probe: status ${cacheGwProbe?.r?.status ?? "n/a"})`);
} else if (JSON.stringify(JSON.parse(cacheGwProbe.text)) !== JSON.stringify(contract)) {
  fail("the gateway's cache summary differs from the frozen contract on disk");
}
pass("the gateway round-trip (lb://football-os-cache) returns the frozen contract from the cache tier");

const cacheStatsGw = await fetch("http://localhost:8087/api/cache/league/stats", { signal: AbortSignal.timeout(8000) });
if (!cacheStatsGw.ok) fail(`the gateway did not round-trip /api/cache/league/stats (status ${cacheStatsGw.status})`);
else {
  const gwStats = await cacheStatsGw.json();
  if (typeof gwStats?.redisUp !== "boolean") fail(`the gateway's cache stats did not carry a boolean redisUp (got ${JSON.stringify(gwStats)})`);
  else pass(`the gateway round-trip carries the cache's honest redisUp=${gwStats.redisUp} through lb://`);
}

const msgGwProbe = await fetchUntil(
  "http://localhost:8087/api/messaging/summary",
  (r, text) => r.ok && text.includes('"dlq"'),
  18,
  5000,
);
if (!msgGwProbe || !msgGwProbe.r || !msgGwProbe.r.ok) {
  fail(`the gateway did not round-trip /api/messaging/summary (last probe: status ${msgGwProbe?.r?.status ?? "n/a"})`);
} else {
  const msgSummary = JSON.parse(msgGwProbe.text);
  if (msgSummary?.exchange !== "footballos.events" || msgSummary?.dlq !== "footballos.events.dlq" || msgSummary?.live !== false) {
    fail(`the gateway's messaging summary drifted (got ${JSON.stringify(msgSummary)})`);
  }
  pass("the gateway round-trip (lb://football-os-messaging) returns the declared exchange with live=false");
}

const gatewayProbe = await fetchUntil(
  "http://localhost:8087/api/league/summary",
  (r, text) => r.ok && text.length > 2 && text.includes("\"digest\""),
  18,
  5000,
);
if (!gatewayProbe || !gatewayProbe.r || !gatewayProbe.r.ok ||
    JSON.stringify(JSON.parse(gatewayProbe.text)) !== JSON.stringify(contract)) {
  fail(`the gateway round-trip did not return the frozen contract (last probe: status ${gatewayProbe?.r?.status ?? "n/a"})`);
}
pass("the gateway round-trip (lb://LEAGUE-SERVICE via Eureka + StripPrefix=1) returns the frozen contract");

// Stop the league service BY NAME and let the circuit open. The breaker (sliding window 3, min
// calls 2) must answer with the canned 503, never a bare timeout.
const leagueChild = children.get("league");
if (!leagueChild) fail("the league service was not booted — the circuit test has nothing to stop");
leagueChild.kill("SIGTERM");
await new Promise((res) => setTimeout(res, 3000));
let canned = 0;
for (let i = 0; i < 6; i++) {
  try {
    const r = await fetch("http://localhost:8087/api/league/summary", { signal: AbortSignal.timeout(8000) });
    const body = await r.text();
    if (r.status === 503 && body.includes("league-service is quiet") && body.includes("SERVICE_UNAVAILABLE")) canned++;
  } catch { /* expected to fail in the dead-league window */ }
  await new Promise((res) => setTimeout(res, 1000));
}
if (canned < 3) fail(`the circuit did not answer with the canned 503 (${canned}/6 calls carried it)`);
pass(`with the league service stopped, the circuit answers ${canned}/6 probes with the canned 503 from /fallback`);

cleanup();
console.log("\nverify-services: the Spring Cloud stack boots in a verified topological order, registers, serves the frozen contract, round-trips the broker-deprived tiers through the gateway and answers its own failure mode; on this host both brokers answered DOWN honestly (spawned against :3999 so the foreign stack on 6379/5672 was never dialed)");
process.exit(0);
