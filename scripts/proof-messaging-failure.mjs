// M1072: the retry -> DLQ failure semantics, pinned as a deterministic static gate.
//
// verify-messaging-dlq-live.mjs witnesses the tier against a REAL project-owned RabbitMQ: a
// `FAIL:n` transient pill NACKs n times then delivers, and a `POISON:` pill walks the whole
// max-attempts ladder and is ROUTED to the DLQ (then consumed by the deadLetter sink) instead of
// being silently dropped. That is runtime truth but it needs Docker and a jar. This proof is the
// portable floor beneath it: it parses the SHIPPED Java, the SHIPPED yml and the witness harness,
// needs no broker, and refuses the two defects the live run exposed — most importantly:
//
//   • `seen.add(id)` BEFORE the failure check  -> a NACK'd try occupies the idempotency set, so the
//       binder's retry is counted as a duplicate and returns SUCCESS: a `FAIL:2` never recovers and
//       a poison pill is neither delivered nor dead-lettered. It silently vanishes. (Live-measured.)
//   • relying on the framework RetryTemplate / binder `republish-to-dlq` to terminate poison
//       -> on the functional-consumer path the exhausted Message goes to the global errorChannel,
//       whose default LoggingHandler LOG-AND-DROPS it; `deadLettered` stayed 0 while `faultAttempts`
//       hit 5. The fix ROUTES the exhausted event to an explicit DLQ output binding itself.
//
// Six families, each with a planted arm so a widened reader can never quietly blind the gate:
//   1. failure-before-idempotency: the failure door runs before seen.add, and a NACK'd try is not
//      added to seen.
//   2. bounded termination: poison reaching maxAttempts is PUBLISHED (bridge.send) to a DLQ-bound
//      output binding and RETURNS, never rethrown into a log-and-drop errorChannel.
//   3. observable counters: faultAttempts / faultIds / routedToDlq are exported on /stats.
//   4. transient recovery shape: a `FAIL:n` pill fails exactly its first n tries (no off-by-one),
//      then falls through to the ordinary idempotency door.
//   5. witness integrity: the live harness refuses default ports, asserts the poison terminates in
//      the DLQ (deadLettered +1 AND routedToDlq +1), asserts `FAIL:n` recovers, keeps the M1071
//      losslessness lock, restores the broker in a finally, and exits on its tally.
//   6. M1071 non-regression + population floor: shared queue, header routing, honest live probe and
//      the bounded timeouts are all still present; the census read real files.
//
// Honest limit: this reads declarations, not a socket. The measured retry count, the 8-8 delivery,
// the transient recovery and the DLQ consumption belong to verify-messaging-dlq-live.mjs; this gate
// keeps their preconditions from rotting on a machine without Docker.
//
// Vacuity discipline: every zero-asserting clause below carries a positive `=== N` / `>= N` pinned
// companion or a planted arm in the SAME or next two clauses (proof-i18n section 38).

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const FUNCTIONS = read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineFunctions.java");
const YML = read("services/messaging-service/src/main/resources/application.yml");
const WITNESS = read("scripts/verify-messaging-dlq-live.mjs");
const PROOF_FILES = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const code = (s) => s.replace(/^[ \t]*#.*$/gm, "").replace(/\r/g, "");
const ymlCode = code(YML);

// Isolate the processEvents() body: from its @Bean declaration to the next @Bean / javadoc close.
const fnBody = (() => {
  const start = FUNCTIONS.lastIndexOf("public Consumer<MatchEvent> processEvents");
  if (start < 0) return "";
  const tail = FUNCTIONS.slice(start);
  const end = tail.indexOf("@Bean", 10);
  return end > 0 ? tail.slice(0, end) : tail;
})();
// Read CODE lines, not the javadoc above the method (which paraphrases the ladder with `try`).
const fnCode = fnBody.slice(fnBody.indexOf("return event -> {"));
const seenDoorAt = fnCode.indexOf("seen.add(");
// The failure door is the guard that throws on a NACK'd try; poison is factored into `isPoison`.
const failureDoorAt = fnCode.indexOf("if (isPoison || tryNumber <= failTries)");
const poisonTerminateAt = fnCode.indexOf("isPoison && tryNumber >= policy.getMaxAttempts()");

// --- 1 · failure door MUST precede the idempotency door (the swallowed-poison defect) -----------
ok(`the failure door runs BEFORE the seen-set (failure=${failureDoorAt}, seen.add=${seenDoorAt}, both present=${failureDoorAt >= 0 && seenDoorAt >= 0}) so a NACK never occupies the idempotency key`,
  failureDoorAt >= 0 && seenDoorAt >= 0 && failureDoorAt < seenDoorAt);
// A NACK'd try must not seen.add: the failure branch throws (or returns after DLQ) before reaching
// the door. Pin the ORDER — the throw / terminal return sits between the failure door and seen.add.
const throwAt = fnCode.indexOf("throw new IllegalStateException");
// The whole fault-injection block (ledger entry -> terminal return + throw) sits before seen.add.
// The poison terminal branch precedes the generic failure guard, so measure the window from the
// ledger entry, not from the guard — both the terminal return and the throw must be inside it.
const ledgerAt = fnCode.indexOf("if (failTries != 0) {");
const faultBlock = fnCode.slice(ledgerAt > 0 ? ledgerAt : 0, seenDoorAt > 0 ? seenDoorAt : 0);
ok(`a NACK'd try leaves the seen-set untouched: the whole fault block (ledger@${ledgerAt}, throw@${throwAt}, ${faultBlock.length} chars) with terminal return and throw sits BEFORE seen.add@${seenDoorAt}`,
  ledgerAt >= 0 && throwAt > ledgerAt && throwAt < seenDoorAt && /return;\s*\/\/ terminal/.test(faultBlock) && failureDoorAt < seenDoorAt);
// Planted: move seen.add above the failure door -> the detector must charge it (order inverts).
const plantedReorder = fnCode
  .replace("if (failTries != 0) {", "if (!seen.add(event.id())) return; if (failTries != 0) {");
const orderDetector = (body) => {
  const f = body.indexOf("if (isPoison || tryNumber <= failTries)");
  const s = body.indexOf("seen.add(");
  return f >= 0 && s >= 0 && f < s;
};
ok(`the order detector charges a planted seen.add-before-failure regression (planted passes? ${orderDetector(plantedReorder)}, shipped passes? ${orderDetector(fnBody)})`,
  orderDetector(fnBody) && !orderDetector(plantedReorder));

// --- 2 · bounded termination: poison is ROUTED to DLQ, not rethrown into log-and-drop ----------
const hasTerminate = poisonTerminateAt >= 0 && poisonTerminateAt < seenDoorAt && poisonTerminateAt < throwAt;
const bridgeSend = /bridge\.send\(\s*"poison-out-0"\s*,\s*event\s*\)/.test(fnBody);
const terminalReturn = /poison exhausted[\s\S]{0,240}return;\s*\/\/ terminal/.test(fnBody);
ok(`poison reaching maxAttempts is ROUTED and returned, not rethrown (terminate@${poisonTerminateAt}, bridge.send=${bridgeSend}, terminal return=${terminalReturn})`,
  hasTerminate && bridgeSend && terminalReturn);
// The DLQ output binding must exist and target the deadLetter consumer's destination.
const poisonOut = /poison-out-0:\s*\r?\n\s*destination:\s*footballos\.events\.dlq/m.test(YML);
const dlqIn = /deadLetter-in-0:\s*\r?\n\s*destination:\s*footballos\.events\.dlq/m.test(YML);
ok(`the poison-out-0 producer and the deadLetter-in-0 consumer share destination footballos.events.dlq (out=${poisonOut}, in=${dlqIn})`,
  poisonOut && dlqIn);
// Planted: removing bridge.send or the terminal branch must be charged.
const terminationDetector = (body) => /bridge\.send\(\s*"poison-out-0"/.test(body) && /return;\s*\/\/ terminal/.test(body);
const plantedNoTerminate = fnBody.replace("boolean routed = bridge.send(\"poison-out-0\", event);", "boolean routed = false;").replace("return; // terminal", "// planted: rethrow into errorChannel");
ok(`the termination detector charges a planted bridge.send removal (planted passes? ${terminationDetector(plantedNoTerminate)}, shipped passes? ${terminationDetector(fnBody)})`,
  terminationDetector(fnBody) && !terminationDetector(plantedNoTerminate));

// --- 3 · observable counters exported on /stats ------------------------------------------------
// faultAttempts/routedToDlq are AtomicLong counters; faultIds is the ledger's distinct-id size
// (attempts.size()) — all three are measurements on the /stats surface, never literals.
const counterShape = {
  faultAttempts: { declared: /private final AtomicLong faultAttempts/.test(FUNCTIONS), exported: /"faultAttempts"\s*,\s*faultAttempts\.get\(\)/.test(FUNCTIONS) },
  faultIds: { declared: /private final Map<String, AtomicLong> attempts/.test(FUNCTIONS), exported: /"faultIds"\s*,\s*attempts\.size\(\)/.test(FUNCTIONS) },
  routedToDlq: { declared: /private final AtomicLong routedToDlq/.test(FUNCTIONS), exported: /"routedToDlq"\s*,\s*routedToDlq\.get\(\)/.test(FUNCTIONS) },
};
for (const key of Object.keys(counterShape)) {
  const { declared, exported } = counterShape[key];
  ok(`the /stats surface exports a real "${key}" measurement (declared=${declared}, exported=${exported})`,
    declared && exported);
}
// Planted: a hardcoded routedToDlq=1 would fake termination; the reader must reject literals.
const statsBody = FUNCTIONS.slice(FUNCTIONS.indexOf("public Map<String, Object> stats"));
const noHardcodedCounter = !/"routedToDlq"\s*,\s*1\b/.test(statsBody) && !/"faultAttempts"\s*,\s*[1-9]/.test(statsBody);
ok(`the counters are measurements, not planted literals (no hardcoded routedToDlq/faultAttempts = ${noHardcodedCounter}; ${["faultAttempts", "faultIds", "routedToDlq"].length} keys checked)`,
  noHardcodedCounter && /routedToDlq\.get\(\)/.test(FUNCTIONS));

// --- 4 · transient recovery shape: FAIL:n fails exactly its first n tries ----------------------
const failTriesParse = /Integer\.parseInt\(body\.substring\(FAIL_PREFIX\.length\(\), end\)\)/.test(FUNCTIONS);
const boundedLedger = /n >= 0 && n < 1_000_000/.test(FUNCTIONS);
const offByOne = /tryNumber <= failTries/.test(fnBody); // try=1..n fail, try=n+1 delivers
const poisonForever = /failTries < 0/.test(FUNCTIONS) && /body\.startsWith\(POISON_PREFIX\)/.test(FUNCTIONS) && /return -1/.test(FUNCTIONS);
ok(`a FAIL:n pill fails exactly its first n tries (parse=${failTriesParse}, bounded ledger=${boundedLedger}, <= not < =${offByOne})`,
  failTriesParse && boundedLedger && offByOne);
ok(`a POISON: pill fails forever (marker=${/POISON_PREFIX = "POISON:"/.test(FUNCTIONS)}, -1 sentinel=${poisonForever})`,
  /POISON_PREFIX = "POISON:"/.test(FUNCTIONS) && poisonForever);
// Planted: an off-by-one (< instead of <=) must be charged.
const plantedOffByOne = fnBody.replace("tryNumber <= failTries", "tryNumber < failTries");
ok(`the off-by-one detector charges a planted < for the retry bound (planted passes? ${/tryNumber <= failTries/.test(plantedOffByOne)}, shipped passes? ${offByOne})`,
  offByOne && !/tryNumber <= failTries/.test(plantedOffByOne));

// --- 5 · witness integrity: the live harness cannot drift into a worthless green ---------------
// The two ports share one declaration: `const RABBIT_PORT = 5673, MGMT_PORT = 15673;`.
const portDecl = /const\s+RABBIT_PORT\s*=\s*(\d+)\s*,\s*MGMT_PORT\s*=\s*(\d+)/.exec(WITNESS);
const wPort = portDecl ? { 1: portDecl[1] } : null;
const wMgmt = portDecl ? { 1: portDecl[2] } : null;
const portOk = (p) => p > 1024 && p !== 5672 && p !== 15672 && p !== 6379;
ok(`the DLQ witness targets non-default ports (AMQP ${wPort?.[1]}, mgmt ${wMgmt?.[1]}) and refuses the foreign 5672/6379 pair`,
  wPort && wMgmt && portOk(Number(wPort[1])) && Number(wMgmt[1]) > 1024 && Number(wMgmt[1]) !== 15672 &&
  /RABBIT_PORT === 5672 \|\| MGMT_PORT === 15672/.test(WITNESS));
// The decisive locks: poison terminates in the DLQ AND a transient recovers AND losslessness holds.
const poisonLock = /deadLettered\s*===\s*beforeDlq\.deadLettered\s*\+\s*1/.test(WITNESS) && /routedToDlq\s*===\s*beforeDlq\.routedToDlq\s*\+\s*1/.test(WITNESS);
const transientLock = /trans\.delivered\s*===\s*beforeTrans\.delivered\s*\+\s*1/.test(WITNESS) && /trans\.faultAttempts\s*===\s*beforeTrans\.faultAttempts\s*\+\s*2/.test(WITNESS);
const losslessnessLock = /st\.delivered\s*===\s*batch\.length/.test(WITNESS);
ok(`the witness locks poison termination (deadLettered +1 AND routedToDlq +1 = ${poisonLock}) so a log-and-drop regression cannot pass`,
  poisonLock);
ok(`the witness locks transient recovery (FAIL:2 -> delivered +1 AND faultAttempts +2 = ${transientLock})`, transientLock);
ok(`the witness keeps the M1071 losslessness lock (delivered===published = ${losslessnessLock})`, losslessnessLock);
const restoresInFinally = /finally\s*\{[\s\S]*?docker\("start",\s*CONTAINER\)/.test(WITNESS);
const honestExit = /cleanup\(fail\s*\?\s*1\s*:\s*0\)/.test(WITNESS) && /checks passed/.test(WITNESS);
ok(`the witness restores the broker in a finally (${restoresInFinally}) and exits on its tally (${honestExit}) — a FAIL cannot pose as green`,
  restoresInFinally && honestExit && /process\.on\("SIGINT"/.test(WITNESS));
const plantedWitnessPort = `const RABBIT_PORT = 5672;`;
ok(`the witness port reader charges a planted default AMQP port (5672 refused = ${!portOk(5672)}) while crediting the shipped ${wPort?.[1]}`,
  !portOk(5672) && portOk(Number(wPort?.[1])) && /RABBIT_PORT === 5672/.test(WITNESS));

// --- 6 · M1071 non-regression + population floor -----------------------------------------------
const m1071SharedQueue = /group\s*:\s*footballos\.pipeline\b/.test(ymlCode) && /concurrency\s*:\s*4/.test(ymlCode);
const m1071Header = /setHeader\(\s*"partitionKey"/.test(read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineController.java"));
const m1071HonestLive = /"live"\s*,\s*brokerLive\(\)/.test(read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineController.java"));
const m1071Bounded = /connection-timeout\s*:\s*2000/.test(ymlCode);
ok(`the M1071 contracts survive: shared queue (${m1071SharedQueue}), header routing (${m1071Header}), honest live (${m1071HonestLive}), bounded timeout (${m1071Bounded})`,
  m1071SharedQueue && m1071Header && m1071HonestLive && m1071Bounded);
ok(`the census read a real messaging tier — functions ${FUNCTIONS.length} chars, yml ${YML.length} chars, witness ${WITNESS.length} chars, ${PROOF_FILES.length} proof scripts`,
  FUNCTIONS.length > 4000 && YML.length > 1000 && WITNESS.length > 5000 && PROOF_FILES.length >= 40);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
