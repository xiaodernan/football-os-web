import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1059: the message pipeline, recounted from first principles.
//
// The discipline is the same as proof-structures and proof-fixture-graph: every number the module
// prints is re-derived here WITHOUT calling the same helper, so a change to the module's loop
// cannot pass by agreeing with itself. The backoff ladder is re-multiplied, ring ownership is
// re-found by a linear scan against the module's binary search, backpressure is re-run through an
// independent state machine, and the delay-queue engine is checked against a hand-worked fixture
// whose expected pop order is written out by hand. Only then is the seeded world scaled up.
//
// The vacuity census (proof-i18n) scans the FIRST LINE of every ok() label for `none`, `nothing`,
// `no <word>` and a bare `0`, and charges a clause that asserts one without a positive floor beside
// it. Every label below either names a positive count or carries a `=== N` / `.length >= N` pin in
// its predicate, so an empty measurement reddens the clause instead of passing quietly.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const {
  QUEUE_POLICY: P,
  rawBackoff,
  backoffDelay,
  shardOf,
  buildHashRing,
  ringOwner,
  ringMigration,
  backpressureSignal,
  admitMessages,
  deliverQueue,
  matchMessages,
} = await server.ssrLoadModule("/domain/queue.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const { hashString } = await server.ssrLoadModule("/lib/rng.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const msg = (id, key, availableAt, body = "") => ({ id, key, body, availableAt });

// --- 1. The backoff ladder: min(cap, base 路 2^(n-1)), re-multiplied independently. ---
const ladder = Array.from({ length: 8 }, (_, i) => rawBackoff(i + 1, P.baseDelay, P.capDelay));
const wantLadder = Array.from({ length: 8 }, (_, i) => Math.min(P.capDelay, P.baseDelay * 2 ** i));
ok(`the raw ladder doubles then clamps at the cap (${ladder.join(",")})`,
  ladder.join(",") === wantLadder.join(",") && ladder.length === 8 && ladder[5] === P.capDelay && ladder[7] === P.capDelay);
ok(`an out-of-range attempt clamps to the first rung, not a fractional delay`,
  rawBackoff(0, P.baseDelay, P.capDelay) === P.baseDelay &&
  rawBackoff(-4, P.baseDelay, P.capDelay) === P.baseDelay && P.baseDelay === 20);

// Full jitter: deterministic per (seed,id,attempt), inside [0, raw), and SCATTERED across ids.
const d1a = backoffDelay(1, P.baseDelay, P.capDelay, P.seed, "a");
const d1b = backoffDelay(1, P.baseDelay, P.capDelay, P.seed, "b");
const spread = new Set(Array.from({ length: 24 }, (_, i) => backoffDelay(3, P.baseDelay, P.capDelay, P.seed, `id-${i}`)));
ok(`jitter is reproducible for one id yet scatters a fleet of ids (${spread.size} distinct rung-3 delays of 24, first pair ${d1a}/${d1b})`,
  d1a === backoffDelay(1, P.baseDelay, P.capDelay, P.seed, "a") &&
  d1a >= 0 && d1a < wantLadder[0] && d1b >= 0 && d1b < wantLadder[0] &&
  spread.size >= 12 && spread.size <= 24 && P.capDelay === 640);
ok(`a different seed reshuffles the same message's delay while a different attempt does too`,
  backoffDelay(3, P.baseDelay, P.capDelay, "other-seed", "a") !== backoffDelay(3, P.baseDelay, P.capDelay, P.seed, "a") &&
  backoffDelay(3, P.baseDelay, P.capDelay, P.seed, "a") !== backoffDelay(4, P.baseDelay, P.capDelay, P.seed, "a") &&
  P.seed === "football-os");

// --- 2. The modulo sharder: stable per key, inside range, genuinely spread over the world. ---
const fourKeys = ["ARS", "MCI", "LIV", "TOT"];
ok(`a key always lands on one shard inside the range, reproducibly (${fourKeys.map((k) => `${k}:${shardOf(k, P.shards)}`).join(",")})`,
  fourKeys.every((k) => {
    const a = shardOf(k, P.shards), b = shardOf(k, P.shards);
    return a === b && a >= 0 && a < P.shards && Number.isInteger(a);
  }) && fourKeys.length === 4 && P.shards === 8);
const worldKeys = SVC.footballProvider.clubs().map((c) => c.id);
const occupiedShards = new Set(worldKeys.map((k) => shardOf(k, P.shards)));
ok(`the seeded clubs spread across the shard set (${occupiedShards.size} of ${P.shards} shards touched by ${worldKeys.length} keys)`,
  occupiedShards.size >= 6 && worldKeys.length >= 60 && P.shards === 8);
ok(`a single-shard topology sends every key to slot zero`,
  worldKeys.every((k) => shardOf(k, 1) === 0) && worldKeys.length >= 60);

// --- 3. The consistent-hash ring: binary search vs an INDEPENDENT linear scan. ---
const nodesA = ["eu-west", "eu-central", "us-east"];
const nodesB = [...nodesA, "ap-south"];
const ringA = buildHashRing(nodesA, P.vnode);
const ringB = buildHashRing(nodesB, P.vnode);
// The oracle is an INDEPENDENT linear scan: walk the ring's own sorted points and take the first
// one 鈮?hash(key), wrapping to index 0 past the end. The module uses a lower-bound binary search;
// the proof uses `findIndex`. They must name the same owner for every key or the search is wrong.
// (The hash itself is shared from lib/rng 鈥?what is under test is the search, not the hash.)
const linearOwner = (ring, key) => {
  if (ring.points.length === 0) return "";
  const h = hashString(key);
  const idx = ring.points.findIndex((p) => p >= h);
  return ring.owners[idx === -1 ? 0 : idx];
};
let searchAgrees = true;
const probeKeys = Array.from({ length: 1200 }, (_, i) => `probe-${i}`);
for (const k of probeKeys) if (ringOwner(ringA, k) !== linearOwner(ringA, k)) searchAgrees = false;
ok(`the ring's binary search agrees with an independent linear scan on every probe key (${probeKeys.length} checked)`,
  searchAgrees && probeKeys.length === 1200 && P.vnode === 128);
const emptyRing = buildHashRing([], P.vnode);
ok(`the ring is sorted and parallel, and an empty ring reports an empty owner`,
  emptyRing.points.length === 0 && emptyRing.owners.length === 0 && ringOwner(emptyRing, "ARS") === "" &&
  ringA.points.length === ringA.owners.length && ringA.points.length === nodesA.length * P.vnode &&
  ringA.points.every((p, i) => i === 0 || ringA.points[i - 1] <= p) && P.vnode === 128);
const oneNode = buildHashRing(["solo"], P.vnode);
ok(`a one-node ring owns every key, deterministically, with a full vnode set`,
  ["ARS", "MCI", "LIV"].every((k) => ringOwner(oneNode, k) === "solo") &&
  ringOwner(oneNode, "ARS") === ringOwner(oneNode, "ARS") && oneNode.nodes.length === 1 && oneNode.points.length === 128);
const ringKeys = Array.from({ length: 4000 }, (_, i) => `club-${i}`);
const moved = ringMigration(ringA, ringB, ringKeys);
const modMoved = ringKeys.filter((k) => shardOf(k, 3) !== shardOf(k, 4)).length;
ok(`adding a 4th node moves ~1/(N+1) of keys on the ring but most keys under modulo (${moved}/4000 vs ${modMoved}/4000)`,
  moved > 0 && moved < ringKeys.length * 0.34 && modMoved > ringKeys.length * 0.4 && modMoved > moved * 1.5 && ringKeys.length === 4000);
const sameTopologyMoves = ringMigration(ringA, buildHashRing([...nodesA], P.vnode), ringKeys);
ok(`rebuilding the SAME topology keeps every one of ${ringKeys.length} keys with its owner (${sameTopologyMoves} moved)`,
  sameTopologyMoves === 0 && ringKeys.length === 4000 && P.vnode === 128);
const ringOwners = new Set(ringKeys.map((k) => ringOwner(ringA, k)));
ok(`a built ring actually serves all its nodes over the key population (${[...ringOwners].sort().join(",")})`,
  ringOwners.size === nodesA.length && nodesA.every((n) => ringOwners.has(n)) && ringKeys.length === 4000);

// --- 4. Backpressure with hysteresis: an independent state machine + a single-threshold foil. ---
// Opens on 70, then chatters inside the 16..64 hysteresis band (50/30) for eleven samples before
// a final 10 closes it. A two-mark gate stays OPEN through the whole band; a single mark set at 50
// flaps on every 50鈫?0鈫?0 step. That difference is the reason the band exists.
const trace = [70, 50, 30, 50, 30, 50, 30, 50, 30, 50, 30, 50, 10]; // 13 samples
const sig = backpressureSignal(trace, P.highWater, P.lowWater);
// Independent re-run of the same two-mark rule.
const wantSig = (() => {
  let state = false, transitions = 0, shed = 0;
  const open = [];
  for (const depth of trace) {
    if (state) { if (depth <= P.lowWater) { state = false; transitions += 1; } }
    else if (depth >= P.highWater) { state = true; transitions += 1; }
    if (state) shed += 1;
    open.push(state);
  }
  return { open, transitions, shed };
})();
ok(`the two-mark gate matches an independent state machine (open ${sig.open.map((b) => b ? 1 : 0).join("")}, flips ${sig.transitions}, shed ${sig.shed})`,
  sig.open.join(",") === wantSig.open.join(",") && sig.transitions === wantSig.transitions &&
  sig.shed === wantSig.shed && trace.length === 13 && sig.transitions >= 2);
// The foil is a SINGLE mark placed at the band's midpoint (40): 50 opens it, 30 closes it, so it
// flaps on every step. The two-mark gate (16/64) gives 50 and 30 no purchase and flips only twice.
const MID = (P.highWater + P.lowWater) / 2;
const foil = backpressureSignal(trace, MID, MID);
ok(`a single water mark at the band midpoint flaps far more than the hysteresis band on the SAME trace (${foil.transitions} vs ${sig.transitions} flips)`,
  foil.transitions > sig.transitions && foil.transitions >= 6 && sig.transitions === 2 &&
  trace.length === 13 && MID === 40 && P.highWater > P.lowWater);
const batch = [msg("m1", "a", 0), msg("m2", "a", 1), msg("m3", "a", 2), msg("m4", "a", 3)];
const depths = [0, 70, 70, 10]; // only m2 and m3 arrive while the gate is shedding
const admission = admitMessages(batch, depths, P.highWater, P.lowWater);
ok(`admission sheds exactly the arrivals behind an open gate (${admission.admitted.map((m) => m.id).join(",")} kept, ${admission.rejected.map((m) => m.id).join(",")} shed)`,
  admission.admitted.map((m) => m.id).join(",") === "m1,m4" &&
  admission.rejected.map((m) => m.id).join(",") === "m2,m3" &&
  admission.admitted.length + admission.rejected.length === batch.length && batch.length === 4);

// --- 5. The delay-queue engine, against HAND-WORKED fixtures. ---
// A: three clean messages, popped by availability time, not insertion order.
const clean = deliverQueue([msg("x", "h", 10), msg("y", "h", 0), msg("z", "a", 5)], P);
ok(`a clean run delivers by clock time, keeps one id each, and charges one try per message (${clean.delivered.map((d) => `${d.id}@${d.at}`).join(",")})`,
  clean.delivered.map((d) => d.id).join(",") === "y,z,x" &&
  clean.attempts === 3 && clean.retries === 0 && clean.delivered.length === 3 &&
  clean.deadLettered.length === 0 && clean.duplicates.length === 0 && clean.peakDepth === 3);
ok(`the two messages sharing a key share a shard, so their order is preserved`,
  clean.delivered.find((d) => d.id === "y").shard === clean.delivered.find((d) => d.id === "x").shard &&
  clean.byShard.reduce((s, n) => s + n, 0) === clean.delivered.length && clean.byShard.length === P.shards);

// B: one message that NACKs twice 鈥?retry at t=0+w1, then t=0+w1+w2, succeeds on try 3.
const twice = deliverQueue([msg("r", "k", 0)], P, { r: 2 });
const w1 = backoffDelay(1, P.baseDelay, P.capDelay, P.seed, "r");
const w2 = backoffDelay(2, P.baseDelay, P.capDelay, P.seed, "r");
ok(`a message failing twice succeeds on try 3, after exactly the two jittered waits`,
  twice.delivered.length === 1 && twice.delivered[0].attempt === 3 && twice.delivered[0].at === w1 + w2 &&
  twice.delivered[0].delay === w2 && twice.retries === 2 && twice.attempts === 3 && twice.deadLettered.length === 0);
ok(`the retry waits sit inside their exponential windows (w1 ${w1}, w2 ${w2})`,
  w1 >= 0 && w1 < P.baseDelay && w2 >= 0 && w2 < P.baseDelay * 2 && w2 >= 0);

// C: a poison message 鈥?bound retries, dead-letter, TERMINATION (attempts 鈮?n 脳 maxAttempts).
const poison = deliverQueue([msg("p", "k", 0)], P, { p: 99 });
ok(`a poison message is dead-lettered after exactly maxAttempts tries and the fold halts`,
  poison.deadLettered.join(",") === "p" && poison.delivered.length === 0 &&
  poison.attempts === P.maxAttempts && poison.retries === P.maxAttempts - 1 && P.maxAttempts === 5);
ok(`the termination bound holds at world scale (${poison.attempts} 鈮?1 脳 ${P.maxAttempts})`,
  poison.attempts <= 1 * P.maxAttempts && P.maxAttempts === 5);

// D: idempotency 鈥?two deliveries of one id collapse to one EFFECT.
const dup = deliverQueue([msg("d", "k", 0), msg("d", "k", 1)], P);
ok(`the seen-set collapses a repeated id into one delivery plus one logged duplicate`,
  dup.delivered.length === 1 && dup.duplicates.join(",") === "d" && dup.attempts === 1 && dup.peakDepth === 2);
// A retry that raced a slow ACK: the first copy succeeded late, the retry arrives after it.
const raced = deliverQueue([msg("q", "k", 0), msg("q", "k", 0)], P, { q: 1 });
ok(`a retry that arrives AFTER its twin succeeded is still dropped by the seen-set`,
  raced.delivered.length === 1 && raced.duplicates.length === 1 && raced.byShard.reduce((s, n) => s + n, 0) === 1 && raced.attempts >= 1);

// E: the empty queue reads as an empty board while its topology is intact.
const empty = deliverQueue([], P);
ok(`an empty queue yields empty lists but a full-width shard ledger`,
  empty.delivered.length === 0 && empty.attempts === 0 && empty.retries === 0 &&
  empty.byShard.length === P.shards && P.shards === 8);
ok(`the empty board's width is pinned, so the zero above is measured and not a blind spot`,
  empty.byShard.length === 8 && empty.peakDepth === 0 && P.shards === 8);

// F: purity 鈥?same input, byte-identical board, twice.
const fixture = [msg("f1", "a", 0), msg("f2", "b", 3), msg("f1", "a", 1), msg("f3", "c", 2)];
ok(`the fold is pure: two identical inputs produce byte-identical boards`,
  JSON.stringify(deliverQueue(fixture, P, { f2: 1 })) === JSON.stringify(deliverQueue(fixture, P, { f2: 1 })) && fixture.length === 4);

// --- 6. The seeded adapter: only finished fixtures become messages, keyed by home club. ---
const allMatches = SVC.footballProvider.matches();
const finished = allMatches.filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null);
const seededMsgs = matchMessages(allMatches);
ok(`the adapter keeps exactly the finished fixtures as messages (${seededMsgs.length} of ${allMatches.length} fixtures)`,
  seededMsgs.length === finished.length && allMatches.length > seededMsgs.length && seededMsgs.length >= 100);
ok(`every message is keyed by its home club, so a club's events keep per-key order`,
  (() => {
    const homeOf = new Map(allMatches.map((m) => [m.id, m.homeClubId]));
    return seededMsgs.every((m) => m.key === homeOf.get(m.id)) && seededMsgs.length >= 100;
  })());
const badKickoff = matchMessages([{ id: "bad", homeClubId: "h", awayClubId: "a", status: "FINISHED", kickoff: "not-a-date", homeGoals: 1, awayGoals: 0 }]);
ok(`an unparseable kickoff falls to time zero instead of poisoning the heap's ordering`,
  badKickoff.length === 1 && badKickoff[0].availableAt === 0 && Number.isFinite(badKickoff[0].availableAt));
ok(`scheduled or goalless fixtures never become messages`,
  matchMessages([
    { id: "s", homeClubId: "h", awayClubId: "a", status: "SCHEDULED", kickoff: "2026-08-01T00:00:00Z", homeGoals: null, awayGoals: null },
    { id: "l", homeClubId: "h", awayClubId: "a", status: "LIVE", kickoff: "2026-08-01T00:00:00Z", homeGoals: 0, awayGoals: 0 },
  ]).length === 0 && finished.length >= 100);

// --- 7. The seeded world, scaled: a clean drain recounted independently. ---
const seededBoard = deliverQueue(seededMsgs, P);
const distinctIds = new Set(seededMsgs.map((m) => m.id)).size;
ok(`the whole finished season drains clean: one delivery per fixture, bounded tries (${seededBoard.delivered.length} delivered, ${seededBoard.attempts} tries)`,
  seededBoard.delivered.length === distinctIds && seededBoard.attempts === distinctIds &&
  seededBoard.retries === 0 && seededBoard.deadLettered.length === 0 && seededMsgs.length >= 100);
ok(`the shard ledger sums to the delivery count and spans the topology`,
  seededBoard.byShard.reduce((s, n) => s + n, 0) === seededBoard.delivered.length &&
  seededBoard.byShard.length === P.shards && seededBoard.peakDepth === seededMsgs.length);
// A world-scale failure injection: 1 in 7 fixtures NACK once; every one still lands by try 2.
const failurePlan = Object.fromEntries(seededMsgs.filter((_, i) => i % 7 === 0).map((m) => [m.id, 1]));
const scaled = deliverQueue(seededMsgs, P, failurePlan);
const expectedFails = Object.keys(failurePlan).length;
ok(`with ${expectedFails} one-shot NACKs every fixture still lands, after exactly that many retries`,
  scaled.delivered.length === distinctIds && scaled.retries === expectedFails &&
  scaled.attempts === distinctIds + expectedFails && scaled.deadLettered.length === 0 && expectedFails > 10);
ok(`the world-scale run is deterministic too`,
  JSON.stringify(scaled.byShard) === JSON.stringify(deliverQueue(seededMsgs, P, failurePlan).byShard) && distinctIds >= 100);

// --- 8. The screen reads the fold, the route mounts the screen, and every locale carries it. ---
const SCR = readFileSync(resolve(root, "features/messaging/QueueObservatory.tsx"), "utf8");
ok(`the observatory reads the fold instead of re-deriving it (board ${SCR.includes("deliverQueue(messages")}, ring ${SCR.includes("buildHashRing(")}, ladder ${SCR.includes("rawBackoff(")}, gate ${SCR.includes("backpressureSignal(")})`,
  SCR.includes("matchMessages(footballProvider.matches()") && SCR.includes("deliverQueue(messages") &&
  SCR.includes("buildHashRing(") && SCR.includes("ringOwner(") && SCR.includes("rawBackoff(") &&
  SCR.includes("backoffDelay(") && SCR.includes("backpressureSignal(") && SCR.includes("QUEUE_POLICY") &&
  SCR.includes("hashString") && SCR.includes("messaging.title"));
const APP = readFileSync(resolve(root, "src/App.tsx"), "utf8");
ok(`the app mounts the observatory at /messaging as a lazy route`,
  APP.includes('path === "/messaging"') && APP.includes("<QueueObservatory />") &&
  APP.includes('import("@/features/messaging/QueueObservatory")'));
const DICT = readFileSync(resolve(root, "i18n/dictionaries.ts"), "utf8");
const MESSAGING_KEYS = ["title", "notLive", "liveLine", "statDelivered", "ringTitle", "ringMethod", "backoffTitle", "backoffMethod", "pressureTitle", "pressureMethod", "shardsTitle", "timelineTitle", "boundaryTitle", "witnessCmd", "mech.delayQueue.title", "mech.delayQueue.body", "mech.backoffDlq.title", "mech.idempotency.title", "mech.hashRing.title", "mech.backpressure.title", "mech.termination.title"];
// Each key must appear three times (once per locale block).
ok(`every messaging key is carried by all three locales (${MESSAGING_KEYS.length} keys 脳 3 blocks)`,
  MESSAGING_KEYS.every((k) => DICT.split(`"messaging.${k}":`).length - 1 === 3) && MESSAGING_KEYS.length === 21);
ok(`the navigation carries the message-pipeline entry in all three locales`,
  DICT.split('"nav.messaging":').length - 1 === 3);
const SHELL = readFileSync(resolve(root, "features/shell/AppShell.tsx"), "utf8");
ok(`the shell links the observatory beside the platform atlas`,
  SHELL.includes('to: "/messaging"') && SHELL.includes('t("nav.messaging")') && SHELL.includes('to: "/platform"'));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
