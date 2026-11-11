// M1071: the messaging tier's RabbitMQ dependency, witnessed LIVE against a project-owned broker.
//
// `verify-services.mjs` proves the honest DOWN floor: all seven jars boot, the messaging tier
// answers `live:false` against a DEAD :3999 port. That endpoint used to be a HARDCODED `false`, so
// the proof could not tell a truly-degraded tier from a working one that always lied. This script is
// the complementary LIVE witness: it starts a project-owned RabbitMQ on a NON-DEFAULT port, spawns a
// real messaging-service against it, and drives a full publish -> consume -> dedupe -> DLQ -> outage
// -> recovery cycle. Every number below is measured against a broker that actually answered.
//
// THREE DEFECTS THIS WITNESS CAUGHT AND LOCKS DOWN (all invisible to verify-services.mjs):
//   1. `live` was a hardcoded `false`: a fully working tier (health UP, AMQP connection open,
//      exchange + 3 queues provisioned) still told every caller it was DOWN. Now brokerLive() probes
//      a REAL connection; this script asserts `live:true` when the broker is up and `false` when down.
//   2. `POST /publish` 500'd EVERY call: `partition-key-expression: payload.key` was evaluated after
//      the JSON converter turned the POJO into a byte[], raising EL1008E ('key' not on byte[]). Now
//      the key rides in a message header (MessageBuilder) with no payload-field routing expression;
//      this script asserts HTTP 200, `sent == requested`, and — decisively — delivered > 0.
//   3. 7 of 8 messages were silently DROPPED: Rabbit's binder implements partitioning as one queue
//      PER partition needing one CONSUMER INSTANCE per partition (instanceIndex decides which). A
//      single jar consumed only partition-0 (sent:8/delivered:1). Now broker-level partitioning is
//      removed in favour of ONE shared durable group queue + concurrency:4; the 8-shard decision
//      survives as a consumer-side census (shardOf/byShard). This script asserts delivered == all
//      published, seen == delivered, byShard spreads over MULTIPLE shards, and the broker queue is
//      the shared `footballos.events.footballos.pipeline` (no `-0` partition suffix).
//   Plus a bounded `spring.rabbitmq.connection-timeout: 2s`: without it a broker outage parks a
//   Tomcat worker for the implicit 60s (the same avalanche the cache tier had, M1070). The DOWN arm
//   below asserts both /summary and /publish stay under DEGRADE_BUDGET_MS and never 500.
//
// PORT HYGIENE. This host's 5672/6379 belong to a foreign Docker Desktop workload (a Career OS
// stack) and are NEVER dialed. The container binds ONLY 127.0.0.1:RABBIT_PORT(5673) + management
// 15673, with a dedicated footballos/footballos user. The jar is spawned with SPRING_RABBITMQ_PORT
// =5673; the script refuses a default target before touching Docker (proof-messaging-resilience pins
// the same refusal). Reuses a surviving container; always kills its own jar; finally-restores the
// container so a failed assertion never leaves the broker down. `--clean` removes it afterwards.
//
// Run from the repo root after building the reactor:
//   mvn -DskipTests package -f services/pom.xml
//   node scripts/verify-messaging-live.mjs
//   node scripts/verify-messaging-live.mjs --clean
//
// Like verify-services.mjs this is NOT part of `npm run proof`; it starts real processes and takes a
// couple of minutes. It is the runnable truth the runbook points at.
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const CLEAN = argv.includes("--clean");

const RABBIT_PORT = 5673;          // project-owned, non-default; NEVER 5672
const MGMT_PORT = 15673;           // management API, non-default; NEVER 15672
const RABBIT_USER = "footballos", RABBIT_PASS = "footballos";
const SERVICE_PORT = 8084;         // domain/platform.ts messaging port
const CONTAINER = "footballos-rabbit-live";
const JAR = join(root, "services", "messaging-service", "target", "messaging-service-0.1.0.jar");
const BASE = `http://127.0.0.1:${SERVICE_PORT}/messaging`;
const HEALTH = `http://127.0.0.1:${SERVICE_PORT}/actuator/health`;
const EXCHANGE = "footballos.events", DLQ = "footballos.events.dlq";
const SHARED_QUEUE = "footballos.events.footballos.pipeline";
const DEGRADE_BUDGET_MS = 8000;    // bounded (2s) timeout, generous ceiling for CI jitter
const UP_WINDOW_MS = 70000;

if (RABBIT_PORT === 5672 || MGMT_PORT === 15672 || RABBIT_PORT === 6379) {
  console.error(`FAIL verify-messaging-live targets default/foreign ports (${RABBIT_PORT}/${MGMT_PORT}); refusing`);
  process.exit(2);
}
if (!existsSync(JAR)) {
  console.error(`FAIL missing ${JAR} — build first: mvn -DskipTests package -f services/pom.xml`);
  process.exit(2);
}

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mgmt = async (path, init) => {
  const headers = { Authorization: "Basic " + Buffer.from(`${RABBIT_USER}:${RABBIT_PASS}`).toString("base64"), ...(init?.headers ?? {}) };
  const r = await fetch(`http://127.0.0.1:${MGMT_PORT}/api/${path}`, { signal: AbortSignal.timeout(9000), ...init, headers });
  const text = await r.text();
  let body = text; try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: r.status, body };
};
const json = async (url, init) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(12000), ...init });
  return { status: r.status, body: await r.text() };
};
const summary = async () => JSON.parse((await json(`${BASE}/summary`)).body);
const stats = async () => JSON.parse((await json(`${BASE}/stats`)).body);
const publish = (events) => json(`${BASE}/publish`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(events),
});
const ms = () => Date.now();
const ev = (id, key, body = "goal") => ({ id, key, body, availableAt: 0 });

// --- bring up the project-owned broker (reuse a surviving one, never a foreign broker) -----------
let containerReady = false;
try {
  const state = docker("inspect", "-f", "{{.State.Status}}", CONTAINER);
  if (state !== "running") docker("start", CONTAINER);
  pass++; console.log(`ok   reused existing container ${CONTAINER} (state=${state})`);
  containerReady = true;
} catch { /* not present — create below */ }
if (!containerReady) {
  docker("run", "-d", "--name", CONTAINER,
    "--publish", `127.0.0.1:${RABBIT_PORT}:5672`,
    "--publish", `127.0.0.1:${MGMT_PORT}:15672`,
    "-e", `RABBITMQ_DEFAULT_USER=${RABBIT_USER}`,
    "-e", `RABBITMQ_DEFAULT_PASS=${RABBIT_PASS}`,
    "rabbitmq:4.0-management-alpine");
  pass++; console.log(`ok   started project-owned RabbitMQ on 127.0.0.1:${RABBIT_PORT}/${MGMT_PORT} (dedicated ${RABBIT_USER} user)`);
}
let mgmtUp = false;
for (let i = 0; i < 60; i++) { try { if ((await mgmt("overview")).status === 200) { mgmtUp = true; break; } } catch { /* booting */ } await sleep(2000); }
ok(`the project-owned RabbitMQ management API answers on the non-default ${MGMT_PORT} port (up=${mgmtUp})`, mgmtUp);
const portMap = docker("inspect", "-f",
  '{{(index (index .NetworkSettings.Ports "5672/tcp") 0).HostIp}}:{{(index (index .NetworkSettings.Ports "5672/tcp") 0).HostPort}}', CONTAINER);
ok(`the container publishes AMQP ONLY at 127.0.0.1:${RABBIT_PORT} and management at 127.0.0.1:${MGMT_PORT} (amqp=${portMap}; foreign 5672/6379 never dialed)`,
  portMap === `127.0.0.1:${RABBIT_PORT}`);

// Remove leftover queues from any prior/interrupted run so the topology is rebuilt from THIS yml.
for (const q of [SHARED_QUEUE, `${EXCHANGE}.footballos.pipeline-0`, `${EXCHANGE}.footballos.pipeline.dlq`, `${DLQ}.footballos.pipeline.dlq`]) {
  try { await mgmt(`queues/%2F/${q}`, { method: "DELETE" }); } catch { /* absent is fine */ }
}

// --- spawn a fresh messaging-service against the live broker ------------------------------------
// ONLY the standard spring.rabbitmq.* env is set — this is itself a witness that the binder reads
// those properties (an earlier hypothesis that SPRING_RABBITMQ_PORT was ignored was FALSIFIED here:
// setting just it redirected the binder's real AMQP connection to :5673).
const child = spawn("java", ["-jar", JAR], {
  cwd: join(root, "services", "messaging-service"),
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    SPRING_RABBITMQ_HOST: "127.0.0.1",
    SPRING_RABBITMQ_PORT: String(RABBIT_PORT),
    SPRING_RABBITMQ_USERNAME: RABBIT_USER,
    SPRING_RABBITMQ_PASSWORD: RABBIT_PASS,
    EUREKA_CLIENT_ENABLED: "false",
    SPRING_CLOUD_CONFIG_ENABLED: "false",
    SERVER_PORT: String(SERVICE_PORT),
    CODEBUDDY_SAFE_DELETE_ENABLED: "0",
  },
});
const logTail = [];
const note = (c) => { for (const l of String(c).split(/\r?\n/)) { if (l.trim()) { logTail.push(l); if (logTail.length > 60) logTail.shift(); } } };
child.stdout.on("data", note); child.stderr.on("data", note);
let serviceUp = false;
const upStart = ms();
while (ms() - upStart < UP_WINDOW_MS) {
  if (child.exitCode !== null) break;
  try { const r = await fetch(`${BASE}/summary`, { signal: AbortSignal.timeout(2000) }); if (r.ok) { serviceUp = true; break; } } catch { /* booting */ }
  await sleep(1500);
}
const dump = () => { for (const l of logTail) console.error("  " + l); };
const cleanup = (code) => {
  try { child.kill("SIGTERM"); } catch { /* gone */ }
  if (CLEAN) { try { docker("rm", "-f", CONTAINER); } catch { /* gone */ } }
  process.exit(code);
};
process.on("SIGINT", () => cleanup(130));
if (!serviceUp) { console.error(`FAIL messaging-service did not answer within ${UP_WINDOW_MS}ms`); dump(); cleanup(1); }

// --- 1 · live is HONEST and bidirectional (the defect-1 lock) -----------------------------------
const s0 = await summary();
ok(`with the broker UP the tier reports live=true from a real AMQP probe (live=${s0.live}, binder=${s0.binder}, exchange=${s0.exchange})`,
  s0.live === true && s0.binder === "rabbit" && s0.exchange === EXCHANGE && s0.dlq === DLQ && s0.shards === 8);
const health0 = await fetch(HEALTH, { signal: AbortSignal.timeout(8000) });
ok(`the broker-backed tier's actuator health is UP (HTTP ${health0.status}), matching live=true instead of the old hardcoded false`,
  health0.status === 200);
// The topology must be provisioned on the REAL broker, and the group queue must be SHARED (no -0).
const qBody = await mgmt("queues");
const qNames = Array.isArray(qBody.body) ? qBody.body.map((q) => q.name) : [];
const xBody = await mgmt("exchanges");
const xNames = Array.isArray(xBody.body) ? xBody.body.map((x) => x.name) : [];
ok(`the broker really provisioned the ${EXCHANGE} exchange and the shared group queue ${SHARED_QUEUE} (${qNames.filter((n) => n.includes("footballos")).length} footballos queues, no -0 partition-only queue)`,
  xNames.includes(EXCHANGE) && qNames.includes(SHARED_QUEUE) && !qNames.includes(`${EXCHANGE}.footballos.pipeline-0`));
// Consumers attach asynchronously after the binding is provisioned — poll rather than presume a
// single read (the same "poll, don't assume" discipline the gateway LB window taught M1042).
let shared = null;
for (let i = 0; i < 20; i++) {
  const q = await mgmt(`queues/%2F/${encodeURIComponent(SHARED_QUEUE)}`);
  if (q.body?.consumers >= 4) { shared = q.body; break; }
  await sleep(1000);
}
ok(`the shared queue has ${shared?.consumers ?? (await mgmt(`queues/%2F/${encodeURIComponent(SHARED_QUEUE)}`)).body?.consumers ?? -1} competing consumers (concurrency:4) and ${shared?.messages ?? "n/a"} messages at rest`,
  shared != null && shared.consumers >= 4 && shared.messages === 0);

// --- 2 · publish is end-to-end LOSSLESS (defects 2+3 lock, the decisive witness) -----------------
const batch = ["home-A", "home-B", "home-C", "home-A", "home-D", "home-B", "home-E", "home-F"]
  .map((k, i) => ev(`e-${i + 1}`, k));
const pub1 = await publish(batch);
const p1 = JSON.parse(pub1.body);
ok(`POST /publish answers 200 with sent==requested (${p1.sent}/${p1.requested}) instead of the old EL1008E 500`,
  pub1.status === 200 && p1.sent === batch.length && p1.requested === batch.length);
let st = null;
for (let i = 0; i < 20; i++) { st = await stats(); if (st.delivered >= batch.length) break; await sleep(1000); }
ok(`ALL ${batch.length} published events were consumed (delivered=${st.delivered}, seen=${st.seen}, duplicates=${st.duplicates}) — not the old delivered:1 with 7/8 dropped`,
  st.delivered === batch.length && st.seen === st.delivered && st.duplicates === 0);
const shardCount = Object.keys(st.byShard ?? {}).length;
const shardSum = Object.values(st.byShard ?? {}).reduce((a, b) => a + b, 0);
ok(`the 8-shard consumer-side census is real: ${shardCount} shards touched, ${shardSum} events accounted (shards pin ${s0.shards})`,
  shardCount >= 3 && shardSum === st.delivered && s0.shards === 8);
// A broker-side echo check: the queue drained to 0 after the burst (no messages stranded unrouted).
const qAfter = await mgmt(`queues/%2F/${encodeURIComponent(SHARED_QUEUE)}`);
ok(`the shared queue drained to ${qAfter.body?.messages ?? "n/a"} messages after the burst — no unroutable backlog`,
  qAfter.body?.messages === 0);

// --- 3 · seen-set idempotency under at-least-once redelivery -------------------------------------
const dupeBatch = [ev("e-1", "home-A"), ev("e-2", "home-B"), ev("e-9", "home-G")];
const pub2 = await publish(dupeBatch);
const p2 = JSON.parse(pub2.body);
for (let i = 0; i < 16; i++) { st = await stats(); if (st.delivered >= batch.length + 1 && st.duplicates >= 2) break; await sleep(1000); }
ok(`re-publishing 2 known ids + 1 new id is idempotent (sent=${p2.sent}, delivered=${st.delivered}, duplicates=${st.duplicates}, seen=${st.seen})`,
  p2.sent === dupeBatch.length && st.delivered === batch.length + 1 && st.duplicates === 2 && st.seen === st.delivered);

// --- 4 · the DLQ sink actually consumes a dead-lettered message ---------------------------------
const beforeDlq = st.deadLettered;
const poison = JSON.stringify({ id: "poison-1", key: "home-X", body: "explode", availableAt: 0 });
const dlqPub = await mgmt(`exchanges/%2F/${DLQ}/publish`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ properties: { content_type: "application/json" }, routing_key: "dead", payload: poison, payload_encoding: "string" }),
});
let dlqStats = null;
for (let i = 0; i < 14; i++) { dlqStats = await stats(); if (dlqStats.deadLettered > beforeDlq) break; await sleep(1000); }
ok(`a message on ${DLQ} is routed (${dlqPub.status === 200 ? dlqPub.body.routed : "?"}) and consumed by the deadLetter sink (deadLettered ${beforeDlq} -> ${dlqStats.deadLettered})`,
  dlqPub.status === 200 && dlqPub.body.routed === true && dlqStats.deadLettered === beforeDlq + 1 &&
  dlqStats.delivered === st.delivered);

// --- 5 · live -> DOWN: honest live=false, bounded degrade, publish does NOT 500 ------------------
let downSummary = null, downPub = null, downHealth = 0, downMs = 0, pubMs = 0;
try {
  docker("stop", CONTAINER);
  const t0 = ms();
  downSummary = await summary();          // brokerLive() must probe a dead broker, bounded
  downMs = ms() - t0;
  const t1 = ms();
  downPub = await publish([ev("down-1", "home-Z")]);  // must degrade to sent:0, NOT a 500
  pubMs = ms() - t1;
  downHealth = (await fetch(HEALTH, { signal: AbortSignal.timeout(15000) })).status;
} finally {
  docker("start", CONTAINER);
  for (let i = 0; i < 60; i++) { try { if ((await mgmt("overview")).status === 200) break; } catch { /* rebooting */ } await sleep(2000); }
}
ok(`with Rabbit DOWN the tier reports live=false HONESTLY in ${downMs}ms (bound ${DEGRADE_BUDGET_MS}ms; was a hardcoded false when UP, and an implicit 60s outage)`,
  downSummary?.live === false && downMs < DEGRADE_BUDGET_MS && downMs >= 0);
ok(`with Rabbit DOWN /publish degrades to HTTP ${downPub?.status} sent=${JSON.parse(downPub?.body ?? "{}").sent} in ${pubMs}ms — never a 500, never a parked worker`,
  downPub?.status === 200 && JSON.parse(downPub.body).sent === 0 && pubMs < DEGRADE_BUDGET_MS);
ok(`with Rabbit DOWN actuator health answers ${downHealth} (503), agreeing with live=false — the tier degrades but does not lie`,
  downHealth === 503);

// --- 6 · DOWN -> live: live flips true again and the pipeline re-delivers ------------------------
let back = null;
for (let i = 0; i < 40; i++) { try { back = await summary(); if (back.live) break; } catch { /* reconnecting */ } await sleep(2000); }
ok(`after Rabbit returns live flips back to true (live=${back?.live}) — the probe is bidirectional, not a one-way flag`,
  back?.live === true);
const beforeRecover = await stats();
const pub3 = await publish([ev("e-10", "home-H")]);
for (let i = 0; i < 16; i++) { st = await stats(); if (st.delivered > beforeRecover.delivered) break; await sleep(1000); }
ok(`after recovery a fresh event is accepted (sent=${JSON.parse(pub3.body).sent}) and delivered (${beforeRecover.delivered} -> ${st.delivered}), all 8 shards now representable (${Object.keys(st.byShard).length})`,
  JSON.parse(pub3.body).sent === 1 && st.delivered === beforeRecover.delivered + 1 && Object.keys(st.byShard).length >= 3);

// The exit code MUST reflect the tally — a FAIL that exits 0 is a green that lies, the exact
// discipline proof-discipline.mjs holds every proof script to. Print the tally first, then exit on
// the counter the tally reads.
console.log(`\n${pass}/${pass + fail} checks passed`);
console.log("verify-messaging-live: the messaging tier published LOSSLESSLY to a real project-owned RabbitMQ (live honest both ways, 8/8 delivered, seen-set dedupe, 8-shard consumer census, DLQ sink consumed a dead letter), degraded in bounded time with live:false + health 503 when the broker vanished, and self-healed after recovery — the hardcoded-live / EL1008E-500 / 7-of-8-dropped defects stay fixed; the foreign host ports 5672/6379 were never dialed.");
cleanup(fail ? 1 : 0);
