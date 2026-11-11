// M1071: the messaging resilience contract, pinned as a deterministic static gate.
//
// verify-messaging-live.mjs witnesses the tier against a REAL project-owned RabbitMQ on a
// non-default port: honest bidirectional `live`, lossless 8/8 publish, seen-set dedupe, an 8-shard
// consumer census, a consuming DLQ sink, and a bounded live→down degrade (14ms) with recovery.
// That is runtime truth but it needs Docker and a jar. This proof is the portable floor beneath it:
// it parses the SHIPPED yml, the SHIPPED Java and the witness harness itself, needs no broker, and
// refuses the exact regressions a live run exposed — most importantly the three defects whose
// signatures are easy to reintroduce with a one-line "cleanup":
//   • `partition-key-expression: payload.key`  -> EL1008E on the serialized byte[], /publish 500s.
//   • broker-level partitioning (partition-count>1 + partitioned:true) in a single-jar deployment
//       -> one queue per partition but only partition-0 consumed, 7/8 messages silently dropped.
//   • a hardcoded `"live", false`  -> a working broker still reported DOWN.
//   • an implicit 60s AMQP connection timeout  -> a broker outage parks Tomcat workers (M1070 again).
//
// Five families, each with a planted arm so widening a reading can never quietly blind the gate:
//   • lossless transport: no payload-field routing expression, no physical partition keys, a shared
//     durable group queue with concurrency>1, broker QoS prefetch pinned to the high-water mark.
//   • honest live: `live` is derived from a real connection probe (createConnection + isOpen), not a
//     hardcoded boolean; the probe swallows failure into false.
//   • bounded degrade: spring.rabbitmq.connection-timeout and template timeouts are short; planted
//     removal / 60s restoration is charged by the same reader.
//   • consumer-side shard census + idempotency: shardOf/byShard remain (the pure fold's wire twin),
//     seen.add door, deadLetter sink, republish-to-dlq — the semantics that survive without broker
//     partitioning.
//   • witness integrity: the live harness targets non-default ports, enforces an 8s degrade budget,
//     spawns the jar with ONLY standard SPRING_RABBITMQ_* (no stream-binder override), asserts
//     delivered==published (the losslessness lock), and restores the container in a finally.
//
// Honest limit: this reads declarations, not a socket. A real AMQP round-trip, the 8/8 delivery and
// the measured 14ms degrade belong to verify-messaging-live.mjs; this gate keeps their preconditions
// from rotting on a machine without Docker.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const YML = read("services/messaging-service/src/main/resources/application.yml");
const CONTROLLER = read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineController.java");
const FUNCTIONS = read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineFunctions.java");
const WITNESS = read("scripts/verify-messaging-live.mjs");
const PROOF_FILES = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));
const COMPOSE = read("services/docker-compose.yml");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
// Strip yml comments so a documented bad config cannot satisfy a good-config assertion.
const code = (s) => s.replace(/^[ \t]*#.*$/gm, "");

// --- 1 · lossless transport: no 500-causing payload routing, no single-jar physical partitioning --
const ymlCode = code(YML);
const noPayloadRouting = !/partition-key-expression\s*:\s*payload\./.test(ymlCode) &&
  !/routing-key-expression\s*:/.test(ymlCode);
const noPhysicalPartitions = !/partition-count\s*:/.test(ymlCode) && !/partitioned\s*:\s*true/.test(ymlCode);
const sharedQueue = /group\s*:\s*footballos\.pipeline\b/.test(ymlCode) && /concurrency\s*:\s*4/.test(ymlCode);
const prefetchPinned = /prefetch\s*:\s*64/.test(ymlCode);
ok(`the transport is LOSSLESS by construction: no payload-field routing expression (${noPayloadRouting}), no single-jar physical partition keys (${noPhysicalPartitions}), one shared durable group queue with ${/concurrency\s*:\s*4/.test(ymlCode) ? "4" : "?"} competing consumers (${sharedQueue}) and prefetch 64 (${prefetchPinned})`,
  noPayloadRouting && noPhysicalPartitions && sharedQueue && prefetchPinned);
// The published key travels in a HEADER (survives JSON serialization), never in a payload field.
const headerSend = /MessageBuilder\s*\.?\s*withPayload|MessageBuilder\b/.test(CONTROLLER) &&
  /setHeader\(\s*"partitionKey"/.test(CONTROLLER) && /bridge\.send\(/.test(CONTROLLER);
ok(`publish() carries the routing key in a ${"MessageBuilder"} header that survives serialization (MessageBuilder=${/MessageBuilder/.test(CONTROLLER)}, setHeader partitionKey=${/setHeader\(\s*"partitionKey"/.test(CONTROLLER)}, bridge.send=${/bridge\.send/.test(CONTROLLER)})`,
  headerSend);
// Planted: a reintroduced payload routing / physical partition / hardcoded live must each be charged.
const losslessDetector = (y) => !/partition-key-expression\s*:\s*payload\./.test(code(y)) &&
  !/routing-key-expression\s*:/.test(code(y)) && !/partition-count\s*:/.test(code(y)) && !/partitioned\s*:\s*true/.test(code(y));
// Planted fixtures are BUILT, not spliced into the CRLF yml (a `\n` anchor silently misses on
// `events\r\n`, which would make the planted arm identical to the shipped one and charge 0/3).
const LOSSLESS_BASE = [
  "spring:", "  cloud:", "    stream:", "      bindings:",
  "        publishFixtures-out-0:", "          destination: footballos.events",
  "        processEvents-in-0:", "          destination: footballos.events",
  "          group: footballos.pipeline", "          consumer:", "            concurrency: 4",
].join("\n");
const plantedLossless = [
  LOSSLESS_BASE + "\n          producer:\n            partition-key-expression: payload.key",
  LOSSLESS_BASE + "\n          producer:\n            partition-count: 8",
  LOSSLESS_BASE.replace("concurrency: 4", "partitioned: true\n            concurrency: 4"),
];
const losslessCharged = plantedLossless.filter((y) => !losslessDetector(y)).length;
ok(`the lossless detector charges ${losslessCharged}/${plantedLossless.length} planted regressions (payload.key routing, partition-count:8, partitioned:true) while crediting the shipped shared-queue yml (${losslessDetector(YML)})`,
  losslessCharged === plantedLossless.length && losslessDetector(YML));

// --- 2 · honest live: a real AMQP probe, never a hardcoded false --------------------------------
const liveFromProbe = /"live"\s*,\s*brokerLive\(\)/.test(CONTROLLER);
const probeOpensConnection = /createConnection\(\)/.test(CONTROLLER) && /\.isOpen\(\)/.test(CONTROLLER);
const probeSwallowsFailure = /brokerLive\(\)[\s\S]*?catch\s*\(Exception[\s\S]*?return false/.test(CONTROLLER);
const noHardcodedLive = !/"live"\s*,\s*(?:true|false)\b/.test(CONTROLLER);
ok(`live is derived from a REAL connection probe (brokerLive call=${liveFromProbe}, createConnection+isOpen=${probeOpensConnection}, catch→false=${probeSwallowsFailure}) with ${noHardcodedLive ? "no hardcoded boolean" : "a hardcoded boolean still present"}`,
  liveFromProbe && probeOpensConnection && probeSwallowsFailure && noHardcodedLive);
const plantedHardcoded = 'return ResponseEntity.ok(Map.of("exchange", p.getExchange(), "live", false));';
const hardcodedCharged = /"live"\s*,\s*false/.test(plantedHardcoded) && !/createConnection/.test(plantedHardcoded);
ok(`the honesty detector would charge a planted hardcoded live=false (planted has probe=${/createConnection/.test(plantedHardcoded)}, shipped live-from-probe=${liveFromProbe})`,
  hardcodedCharged && liveFromProbe && noHardcodedLive);

// --- 3 · bounded degrade: short AMQP timeouts, not the implicit 60s ----------------------------
const declaredDuration = (sheet, key) => {
  // The unit is OPTIONAL: Spring Boot treats a bare number on a Duration as milliseconds (the
  // shipped `connection-timeout: 2000` / `reply-timeout: 2000` are 2000ms without a suffix).
  const m = new RegExp(`^\\s*${key}\\s*:\\s*([\\d.]+)\\s*(ms|s)?\\s*$`, "m").exec(sheet);
  if (!m) return null;
  return parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1);
};
const CONNECT_TIMEOUT = declaredDuration(ymlCode, "connection-timeout");
const REPLY_TIMEOUT = declaredDuration(ymlCode, "reply-timeout");
ok(`the AMQP client pins a BOUNDED connection timeout (${CONNECT_TIMEOUT ?? "missing"}ms) and reply timeout (${REPLY_TIMEOUT ?? "missing"}ms), both under the 5000ms ceiling and the 60000ms implicit default`,
  CONNECT_TIMEOUT != null && REPLY_TIMEOUT != null && CONNECT_TIMEOUT > 0 && REPLY_TIMEOUT > 0 &&
  CONNECT_TIMEOUT <= 5000 && REPLY_TIMEOUT <= 5000 && CONNECT_TIMEOUT < 60000);
const timeoutDetector = (y) => { const c = declaredDuration(code(y), "connection-timeout"); return c != null && c > 0 && c <= 5000; };
const TIMEOUT_BASE = ["spring:", "  rabbitmq:", "    template:", "      receive-timeout: 2000"].join("\n");
const plantedTimeouts = [
  TIMEOUT_BASE,                                            // bound dropped entirely
  TIMEOUT_BASE.replace("    template:", "    connection-timeout: 60s\n    template:"), // restored to 60s
];
const timeoutCharged = plantedTimeouts.filter((y) => !timeoutDetector(y)).length;
ok(`the timeout detector charges ${timeoutCharged}/${plantedTimeouts.length} planted regressions (bound dropped, bound restored to 60s) while crediting the shipped ${CONNECT_TIMEOUT}ms bound (${timeoutDetector(YML)})`,
  timeoutCharged === plantedTimeouts.length && timeoutDetector(YML));

// --- 4 · consumer-side semantics: shard census, seen-set, DLQ sink survive without partitioning --
const shardCensus = /shardOf\(/.test(FUNCTIONS) && /byShard/.test(FUNCTIONS) && /shards:\s*8/.test(YML);
const idempotencyDoor = /seen\.add\(/.test(FUNCTIONS) && /duplicates\.incrementAndGet/.test(FUNCTIONS);
const dlqSink = /Consumer<MatchEvent>\s+deadLetter/.test(FUNCTIONS) && /deadLettered\.incrementAndGet/.test(FUNCTIONS);
const dlqWiring = /republish-to-dlq:\s*true/.test(ymlCode) && /dlq-name:\s*footballos\.events\.dlq/.test(ymlCode);
ok(`the consumer keeps the pure fold's wire twin: ${"shardOf"}/byShard 8-shard census (${shardCensus}), seen.add idempotency door (${idempotencyDoor}) and a ${"deadLetter"} sink (${dlqSink})`,
  shardCensus && idempotencyDoor && dlqSink);
ok(`retry termination is still wired to the broker: republish-to-dlq=true (${/republish-to-dlq:\s*true/.test(ymlCode)}) and dlq-name=footballos.events.dlq (${/dlq-name:\s*footballos\.events\.dlq/.test(ymlCode)})`,
  dlqWiring && /max-attempts:\s*5/.test(ymlCode));

// --- 5 · witness integrity: the live harness cannot drift into a worthless green ---------------
const portDeclared = /const\s+RABBIT_PORT\s*=\s*(\d+)/.exec(WITNESS);
const mgmtDeclared = /const\s+MGMT_PORT\s*=\s*(\d+)/.exec(WITNESS);
const rabbitPort = portDeclared ? Number(portDeclared[1]) : -1;
const mgmtPort = mgmtDeclared ? Number(mgmtDeclared[1]) : -1;
const budgetDeclared = /const\s+DEGRADE_BUDGET_MS\s*=\s*(\d+)/.exec(WITNESS);
const budget = budgetDeclared ? Number(budgetDeclared[1]) : Infinity;
const portOk = (p) => p > 1024 && p !== 5672 && p !== 15672 && p !== 6379;
const budgetOk = (b) => b > 0 && b < 60000 / 4 && b >= 2000;
ok(`the live witness targets non-default ports (AMQP ${rabbitPort}, management ${mgmtPort}) and refuses 5672/15672/6379 (refuse=${!portOk(5672) && !portOk(15672)})`,
  portOk(rabbitPort) && mgmtPort > 1024 && mgmtPort !== 15672 && !portOk(5672) && !portOk(15672) &&
  /RABBIT_PORT === 5672 \|\| MGMT_PORT === 15672/.test(WITNESS));
ok(`the witness enforces a ${budget}ms degrade budget, far below the 60000ms avalanche it locks down (${(60000 / budget).toFixed(0)}× margin)`,
  budgetOk(budget) && /DEGRADE_BUDGET_MS/.test(WITNESS));
const noBinderOverride = !/SPRING_CLOUD_STREAM_RABBIT_BINDER_(?:PORT|HOSTS)\s*:/.test(WITNESS);
ok(`the witness spawns the jar with ONLY standard SPRING_RABBITMQ_* (no binder override=${noBinderOverride}), witnessing that the standard properties really redirect the binder`,
  noBinderOverride && /SPRING_RABBITMQ_PORT:\s*String\(RABBIT_PORT\)/.test(WITNESS) && /spawn\("java"/.test(WITNESS));
// The decisive lock: the witness must assert delivered == published (losslessness), not merely sent.
const losslessnessLock = /delivered\s*===\s*batch\.length/.test(WITNESS) && /st\.delivered\s*===\s*batch\.length/.test(WITNESS);
ok(`the witness asserts losslessness end-to-end (delivered===published, ${losslessnessLock ? "locked" : "MISSING"}) so a sent:8/delivered:1 regression cannot pass`, losslessnessLock);
const restoresInFinally = /finally\s*\{[\s\S]*?docker\("start",\s*CONTAINER\)/.test(WITNESS);
const honestExit = /cleanup\(fail\s*\?\s*1\s*:\s*0\)/.test(WITNESS) && /checks passed/.test(WITNESS);
ok(`the witness restores the broker in a finally (${restoresInFinally}) and its exit reflects the tally (${honestExit}) — a FAIL cannot masquerade as green`,
  restoresInFinally && honestExit && /process\.on\("SIGINT"/.test(WITNESS));
const plantedWitness = [
  `const RABBIT_PORT = 5672;`,
  `const DEGRADE_BUDGET_MS = 60000;`,
];
const witnessCharged = (!portOk(5672) ? 1 : 0) + (!budgetOk(60000) ? 1 : 0);
ok(`the witness readers charge a planted default AMQP port and a planted 60000ms budget (${witnessCharged}/${plantedWitness.length} charged) while crediting the shipped ${rabbitPort}/${budget}ms`,
  witnessCharged === plantedWitness.length && portOk(rabbitPort) && budgetOk(budget));

// --- 6 · population floor: the proof is reading real files, not an empty sheet -----------------
ok(`the census read a real messaging tier — yml ${YML.length} chars, controller ${CONTROLLER.length} chars, functions ${FUNCTIONS.length} chars, witness ${WITNESS.length} chars, compose ${COMPOSE.length} chars, ${PROOF_FILES.length} proof scripts`,
  YML.length > 1000 && CONTROLLER.length > 1500 && FUNCTIONS.length > 2000 && WITNESS.length > 5000 && COMPOSE.length > 300 && PROOF_FILES.length >= 40);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
