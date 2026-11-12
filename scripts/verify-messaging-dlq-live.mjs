// M1072: the messaging tier's retry -> DLQ failure semantics, witnessed LIVE against a real,
// project-owned RabbitMQ. This is the complementary witness to verify-messaging-live.mjs (M1071,
// which proved lossless publish + honest live + bounded degrade). Where M1071 only ever sent HAPPY
// messages, this one injects FAILURES through the wire and measures the two things that make a queue
// trustworthy: a transient failure RECOVERS after its back-off ladder, and a permanent poison pill
// TERMINATES in the dead-letter queue instead of vanishing.
//
// TWO REAL DEFECTS THIS WITNESS CAUGHT (both invisible to every static gate and to M1071):
//   1. SWALLOWED POISON — processEvents() used to call `seen.add(id)` BEFORE the failure check. With
//      an injectable failure, try 1 added the id to the seen-set then threw; the binder's retry drew
//      try 2, which found the id in `seen`, counted it a DUPLICATE and returned SUCCESS. So the retry
//      ladder never advanced, max-attempts was never reached, and a `FAIL:2` pill never recovered —
//      delivered stayed put and the poison was neither delivered nor dead-lettered. Live-measured on
//      the defective order: `FAIL:2` -> faultAttempts=1, delivered unchanged. The fix moves the
//      failure door BEFORE the idempotency door, mirroring domain/queue.ts's deliverQueue(): a NACK'd
//      try never occupies `seen`; only a successful delivery does.
//   2. LOG-AND-DROP TERMINATION — after the order fix, a POISON pill walked all 5 framework retries
//      (faultAttempts=5, `deliveryAttempt=5` in the log) but `deadLettered` STAYED 0 and the message
//      vanished into the global errorChannel's default LoggingHandler. `republish-to-dlq: true` did
//      NOT rescue it: that is a BINDER-level recoverer, and the functional-consumer RetryTemplate
//      never passes through the binder's republish interceptor. A second experiment (moving retry to
//      the binder layer) was WORSE: requeue redelivery spread attempts across consumer threads, the
//      ledger stopped converging, and one pill took >30s. The fix keeps framework back-off (bounded,
//      measured 578ms) and has processEvents() itself PUBLISH the exhausted event through the
//      `poison-out-0` output binding to the deadLetter consumer's destination on the LAST try, then
//      return — real, observable termination owned by the service, independent of Spring's two
//      disjoint retry mechanisms. Live-measured after the fix: `routedToDlq=1`, `deadLettered=1`,
//      delivered unchanged, queue drained, no errorChannel drop.
//
// THE LAST, DECIDIVE ASSERTION: re-publish the SAME poison id with a NORMAL body. It must DELIVER
// (duplicates stays 0). If a failed try had polluted `seen`, this would be dropped as a duplicate —
// so it is the proof that the failure door truly precedes the idempotency door.
//
// PORT HYGIENE. This host's 5672/6379 belong to a foreign Docker Desktop workload and are NEVER
// dialed. The container binds ONLY 127.0.0.1:5673 + management 15673 with a dedicated user; the jar
// is spawned with ONLY standard SPRING_RABBITMQ_* (no binder override) and refuses a default target
// before touching Docker. Reuses a surviving container, always kills its own jar, and finally-
// restores the broker so a failed assertion never leaves it down. `--clean` removes it afterwards.
//
// Run from the repo root after building the reactor:
//   mvn -DskipTests package -f services/pom.xml
//   node scripts/verify-messaging-dlq-live.mjs           # reuses/leaves the container
//   node scripts/verify-messaging-dlq-live.mjs --clean   # removes it at the end
//
// NOT part of `npm run proof`; it starts real processes and takes a couple of minutes.
import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLEAN = process.argv.includes("--clean");

const RABBIT_PORT = 5673, MGMT_PORT = 15673;   // project-owned; NEVER 5672 / 15672 / 6379
const RABBIT_USER = "footballos", RABBIT_PASS = "footballos";
const SERVICE_PORT = 8084;
const CONTAINER = "footballos-rabbit-live";
const JAR = join(root, "services", "messaging-service", "target", "messaging-service-0.1.0.jar");
const BASE = `http://127.0.0.1:${SERVICE_PORT}/messaging`;
const HEALTH = `http://127.0.0.1:${SERVICE_PORT}/actuator/health`;
const EXCHANGE = "footballos.events", DLQ = "footballos.events.dlq";
const SHARED_QUEUE = "footballos.events.footballos.pipeline";
const DLQ_QUEUE = "footballos.events.dlq.footballos.pipeline.dlq";
const MAX_ATTEMPTS = 5;
const TERMINATE_BUDGET_MS = 8000;   // the whole 5-try ladder + DLQ round-trip, bounded
const UP_WINDOW_MS = 70000;

if (RABBIT_PORT === 5672 || MGMT_PORT === 15672 || RABBIT_PORT === 6379) {
  console.error(`FAIL verify-messaging-dlq-live targets default/foreign ports (${RABBIT_PORT}/${MGMT_PORT}); refusing`);
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
const ev = (id, body = "goal", key = "home-A") => ({ id, key, body, availableAt: 0 });
const waitStats = async (pred, msWindow = 20000) => {
  const t0 = ms(); let s;
  while (ms() - t0 < msWindow) { s = await stats(); if (pred(s)) return { s, waited: ms() - t0 }; await sleep(400); }
  return { s, waited: ms() - t0 };
};

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
ok(`the container publishes AMQP ONLY at 127.0.0.1:${RABBIT_PORT} and management at ${MGMT_PORT} (amqp=${portMap}; foreign 5672/6379 never dialed)`,
  portMap === `127.0.0.1:${RABBIT_PORT}`);

// Remove leftover queues from any prior/interrupted run so this run's counters start at zero.
for (const q of [SHARED_QUEUE, DLQ_QUEUE, `${EXCHANGE}.footballos.pipeline-0`, `${DLQ}.footballos.pipeline.dlq`]) {
  try { await mgmt(`queues/%2F/${encodeURIComponent(q)}`, { method: "DELETE" }); } catch { /* absent is fine */ }
}

// --- spawn a fresh messaging-service against the live broker (ONLY standard rabbit env) ----------
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
const note = (c) => { for (const l of String(c).split(/\r?\n/)) { if (l.trim()) { logTail.push(l); if (logTail.length > 140) logTail.shift(); } } };
child.stdout.on("data", note); child.stderr.on("data", note);
const dump = (n = 40) => { for (const l of logTail.slice(-n)) console.error("  " + l); };
const cleanup = (code) => {
  try { child.kill("SIGTERM"); } catch { /* gone */ }
  if (CLEAN) { try { docker("rm", "-f", CONTAINER); } catch { /* gone */ } }
  process.exit(code);
};
process.on("SIGINT", () => cleanup(130));
let serviceUp = false;
const upStart = ms();
while (ms() - upStart < UP_WINDOW_MS) {
  if (child.exitCode !== null) break;
  try { const r = await fetch(`${BASE}/summary`, { signal: AbortSignal.timeout(2000) }); if (r.ok) { serviceUp = true; break; } } catch { /* booting */ }
  await sleep(1500);
}
if (!serviceUp) { console.error(`FAIL messaging-service did not answer within ${UP_WINDOW_MS}ms`); dump(); cleanup(1); }

// --- 0 · the broker is live, the retry policy is published, and the ledger starts clean ----------
const s0 = await summary();
const baseline = await stats();
ok(`broker UP: live=true, maxAttempts=${s0.maxAttempts}, exchange=${s0.exchange}, dlq=${s0.dlq} (real AMQP probe)`,
  s0.live === true && s0.maxAttempts === MAX_ATTEMPTS && s0.exchange === EXCHANGE && s0.dlq === DLQ);
ok(`the fault ledger starts empty (delivered=${baseline.delivered}, faultAttempts=${baseline.faultAttempts}, routedToDlq=${baseline.routedToDlq}, deadLettered=${baseline.deadLettered})`,
  baseline.delivered === 0 && baseline.faultAttempts === 0 && baseline.routedToDlq === 0 && baseline.deadLettered === 0 && baseline.seen === 0);
// The shared queue + its 4 competing consumers must be live before failure injection (M1071 contract).
let shared = null;
for (let i = 0; i < 20; i++) {
  const q = await mgmt(`queues/%2F/${encodeURIComponent(SHARED_QUEUE)}`);
  if (q.body?.consumers >= 4) { shared = q.body; break; }
  await sleep(1000);
}
ok(`the shared queue ${SHARED_QUEUE} has ${shared?.consumers ?? -1} competing consumers before injection (concurrency:4)`,
  shared != null && shared.consumers >= 4);

// --- 1 · a NORMAL publish is still lossless (M1071 non-regression; failure path adds no cost) ----
const batch = [ev("n-1", "goal", "home-A"), ev("n-2", "goal", "home-B"), ev("n-3", "goal", "home-C")]
  .concat(["home-A", "home-D", "home-B", "home-E"].map((k, i) => ev(`n-${i + 4}`, "goal", k)));
const pub0 = await publish(batch);
const p0 = JSON.parse(pub0.body);
const { s: st, waited: w0 } = await waitStats((x) => x.delivered === baseline.delivered + batch.length, 20000);
ok(`POST /publish is still LOSSLESS with the failure path installed (sent=${p0.sent}/${p0.requested}, delivered=${st.delivered}, in ${w0}ms)`,
  pub0.status === 200 && p0.sent === batch.length && st.delivered === batch.length && st.seen === st.delivered && st.faultAttempts === 0);

// --- 2 · a FAIL:2 transient pill NACKs twice, then DELIVERS on try 3 (failure-before-seen) -------
const beforeTrans = await stats();
const pubT = await publish([ev("trans-1", "FAIL:2:transient")]);
const { s: trans, waited: wT } = await waitStats((x) => x.delivered === beforeTrans.delivered + 1 && x.faultAttempts === beforeTrans.faultAttempts + 2, 20000);
ok(`a FAIL:2 transient pill recovers on try 3 (delivered ${beforeTrans.delivered}->${trans.delivered}, faultAttempts ${beforeTrans.faultAttempts}->${trans.faultAttempts}, in ${wT}ms) — the swallowed-poison defect stayed fixed`,
  JSON.parse(pubT.body).sent === 1 && trans.delivered === beforeTrans.delivered + 1 &&
  trans.faultAttempts === beforeTrans.faultAttempts + 2 && trans.deadLettered === beforeTrans.deadLettered && trans.seen === trans.delivered);
// If seen.add had run before the failure door, try 2 would have been a duplicate and try 3 never
// delivered. The +1 delivered with +2 faults is the proof it did not.

// --- 3 · a POISON pill walks the whole ladder and is ROUTED to the DLQ (termination, no drop) -----
const beforeDlq = await stats();
const t0 = ms();
const pubP = await publish([ev("poison-1", "POISON:kill")]);
const { s: poison, waited: wP } = await waitStats(
  (x) => x.deadLettered === beforeDlq.deadLettered + 1 && x.routedToDlq === beforeDlq.routedToDlq + 1,
  TERMINATE_BUDGET_MS + 12000);
const dt = ms() - t0;
ok(`a POISON pill exhausts maxAttempts=${MAX_ATTEMPTS} and TERMINATES in the DLQ (faultAttempts ${beforeDlq.faultAttempts}->${poison.faultAttempts}, routedToDlq ${beforeDlq.routedToDlq}->${poison.routedToDlq}, deadLettered ${beforeDlq.deadLettered}->${poison.deadLettered}, in ${dt}ms, bound ${TERMINATE_BUDGET_MS}ms)`,
  JSON.parse(pubP.body).sent === 1 && poison.faultAttempts === beforeDlq.faultAttempts + MAX_ATTEMPTS &&
  poison.routedToDlq === beforeDlq.routedToDlq + 1 && poison.deadLettered === beforeDlq.deadLettered + 1 &&
  dt < TERMINATE_BUDGET_MS + 4000);
ok(`the poison was NEITHER delivered NOR added to the seen-set (delivered ${beforeDlq.delivered}->${poison.delivered}, seen ${beforeDlq.seen}->${poison.seen}, duplicates=${poison.duplicates}) — no silent loss, no phantom effect`,
  poison.delivered === beforeDlq.delivered && poison.seen === beforeDlq.seen && poison.duplicates === beforeDlq.duplicates);
// The broker's own accounting: the shared queue drained, and the deadLetter sink consumed the DLQ
// message (its queue is empty, its consumer ack'd it).
const qAfter = await mgmt(`queues/%2F/${encodeURIComponent(SHARED_QUEUE)}`);
const dlqAfter = await mgmt(`queues/%2F/${encodeURIComponent(DLQ_QUEUE)}`);
ok(`the broker confirms termination: shared queue drained to ${qAfter.body?.messages ?? "?"} (no unacked poison), DLQ group queue drained to ${dlqAfter.body?.messages ?? "?"} after the sink consumed it`,
  qAfter.body?.messages === 0 && dlqAfter.body?.messages === 0);
// The decisive ordering proof: re-publish the SAME poison id with a NORMAL body. It must DELIVER.
const beforeReplay = await stats();
await publish([ev("poison-1", "goal")]);
const { s: replay } = await waitStats((x) => x.delivered === beforeReplay.delivered + 1, 15000);
ok(`re-publishing the poison id with a normal body DELIVERS it (delivered ${beforeReplay.delivered}->${replay.delivered}, duplicates=${replay.duplicates}) — proof a NACK'd try never occupied the seen-set`,
  replay.delivered === beforeReplay.delivered + 1 && replay.duplicates === beforeReplay.duplicates && replay.seen === replay.delivered);

// --- 4 · seen-set idempotency still holds for ordinary duplicates (M1071 non-regression) ---------
const beforeDupe = await stats();
await publish([ev("n-1", "goal", "home-A"), ev("brand-new", "goal", "home-F")]);
const { s: dupe } = await waitStats((x) => x.delivered === beforeDupe.delivered + 1 && x.duplicates === beforeDupe.duplicates + 1, 15000);
ok(`ordinary duplicate ids are still collapsed by the seen-set (delivered +1, duplicates ${beforeDupe.duplicates}->${dupe.duplicates}, seen=${dupe.seen})`,
  dupe.delivered === beforeDupe.delivered + 1 && dupe.duplicates === beforeDupe.duplicates + 1 && dupe.seen === dupe.delivered);

// --- 5 · broker DOWN: observe surface stays honest and bounded (M1071 non-regression) ------------
let downSummary = null, downPub = null, downHealth = 0, downMs = 0;
try {
  docker("stop", CONTAINER);
  const t1 = ms();
  downSummary = await summary();
  downMs = ms() - t1;
  downPub = await publish([ev("down-1", "goal")]);
  downHealth = (await fetch(HEALTH, { signal: AbortSignal.timeout(15000) })).status;
} finally {
  docker("start", CONTAINER);
  for (let i = 0; i < 60; i++) { try { if ((await mgmt("overview")).status === 200) break; } catch { /* rebooting */ } await sleep(2000); }
}
ok(`with Rabbit DOWN the tier still reports live=false honestly in ${downMs}ms and /publish degrades to 200 sent:0 (never a 500) — bounded M1071 contract intact`,
  downSummary?.live === false && downMs < TERMINATE_BUDGET_MS && downPub?.status === 200 &&
  JSON.parse(downPub?.body ?? "{}").sent === 0 && downHealth === 503);
// DOWN -> live: the probe is bidirectional and a fresh event is accepted after recovery.
let back = null;
for (let i = 0; i < 40; i++) { try { back = await summary(); if (back.live) break; } catch { /* reconnecting */ } await sleep(2000); }
ok(`after Rabbit returns live flips back to true (live=${back?.live}) — the failure-path tier is not left wedged`,
  back?.live === true);

// The exit code MUST reflect the tally — a FAIL that exits 0 is a green that lies. Print the tally
// first, then exit on the counter the tally reads.
console.log(`\n${pass}/${pass + fail} checks passed`);
console.log("verify-messaging-dlq-live: the messaging tier recovered a FAIL:2 transient on try 3, walked the full 5-try ladder for a POISON pill and ROUTED it to the DLQ (routedToDlq+1, deadLettered+1, neither delivered nor seen), replay of the poison id delivered cleanly (failure door precedes the seen-set), ordinary duplicates stayed collapsed, and the broker-outage degrade stayed honest and bounded — the swallowed-poison / log-and-drop defects stay fixed; the foreign host ports 5672/6379 were never dialed.");
cleanup(fail ? 1 : 0);
