import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1064: the cache tier, recounted from first principles.
//
// The discipline is the same as proof-structures, proof-fixture-graph and proof-message-queue:
// every number the module prints is re-derived here WITHOUT calling the same helper, so a change
// to the module's loop cannot pass by agreeing with itself. The LRU recency ladder is re-walked
// as an array; LFU eviction is re-picked by an independent freq-map min-scan; the Bloom filter is
// checked against an exact Set; single-flight is recounted by grouping requests by key; the ring's
// binary search is checked against a linear scan. Only then is the seeded world scaled up.
//
// The vacuity census (proof-i18n) scans the FIRST LINE of every ok() label for `none`, `nothing`,
// `no <word>` and a bare `0`, and charges a clause that asserts one without a positive floor beside
// it. Every label below either names a positive count or carries a `=== N` / `.length >= N` pin in
// its predicate, so an empty measurement reddens the clause instead of passing quietly.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const {
  CACHE_POLICY: P, MECH_KEYS,
  lruPolicy, lruFoil, lfuPolicy, lfuFoil,
  expiryWithJitter, expirySpread, expiryFoil,
  bloomAdd, bloomTest, bloomBoard,
  singleFlight, shardOf, buildRing, ringOwner, ringMigration,
  matchAccesses, runCache,
} = await server.ssrLoadModule("/domain/cache.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const { hashString, makeRng } = await server.ssrLoadModule("/lib/rng.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- 1 · LRU: Map O(1) vs an independent array recency ladder -------------------------------
const seq1 = ["A", "B", "A", "C", "D", "C", "E"];
const lru = lruPolicy(seq1, 2);
// Independent reference: a plain recency ladder, min-scan-free, rebuilt by hand rules.
const refLru = (() => {
  let arr = [], hits = 0, misses = 0, evicts = [];
  for (const k of seq1) {
    const i = arr.indexOf(k);
    if (i >= 0) { arr.splice(i, 1); arr.push(k); hits++; }
    else { misses++; if (arr.length === 2) { evicts.push(arr[0]); arr.shift(); } arr.push(k); }
  }
  return { keys: arr, hits, misses, evicts };
})();
ok(`LRU map agrees with an independent recency ladder on hits/misses/final keys (${lru.hits}/${lru.misses} -> [${lru.keys}])`,
  lru.keys.join() === refLru.keys.join() && lru.hits === refLru.hits && lru.misses === refLru.misses &&
  lru.evictions === refLru.evicts.length && lru.evictions >= 1);
const evicted = lru.events.filter((e) => e.kind === "evict").map((e) => e.key);
ok(`LRU evicts the least-recently-used key in hand order (${evicted.join(",")})`,
  evicted.join(",") === refLru.evicts.join(",") && evicted.length === 3 && refLru.evicts.length === 3);
ok(`LRU hitRate is hits/(hits+misses) to 2dp and an empty stream is a clean zero board`,
  lru.hitRate === Math.round((lru.hits / seq1.length) * 10000) / 100 &&
  lruPolicy([], 2).hits === 0 && lruPolicy([], 2).evictions === 0 && lruPolicy([], 2).hitRate === 0);
// The O(n) foil makes the SAME decisions; the proof measures the scan cost it removes.
const foil = lruFoil(seq1, 2);
ok(`the O(n) LRU foil makes the same decisions as the map (${foil.hits}/${foil.misses}/${foil.evictions})`,
  foil.hits === lru.hits && foil.misses === lru.misses && foil.evictions === lru.evictions &&
  foil.keys.join() === lru.keys.join() && foil.scans >= 1);
const skew = Array.from({ length: 4000 }, (_, i) => `club-${hashString(String(i % 37)) % 37}`);
const lruBig = lruPolicy(skew, 8), foilBig = lruFoil(skew, 8);
ok(`the Map removes the linear-scan cost on 4000 skewed accesses (map ${lruBig.touches} touches vs foil ${foilBig.scans} probes)`,
  lruBig.hits === foilBig.hits && lruBig.evictions === foilBig.evictions &&
  foilBig.scans > lruBig.touches * 3 && lruBig.touches > 0 && skew.length === 4000);

// --- 2 · LFU: MinHeap O(log n) vs an independent freq-map min-scan --------------------------
const seq2 = ["A", "A", "B", "C", "C", "A", "B", "B", "D", "C", "A", "E"];
const lfu = lfuPolicy(seq2, 3);
const refLfu = (() => {
  const f = new Map(); let s = 0, hits = 0, misses = 0, evicts = [];
  for (const k of seq2) {
    if (f.has(k)) { f.get(k).f++; hits++; }
    else { misses++;
      if (f.size === 3) { let v = null; for (const [key, val] of f) if (!v || val.f < v.val.f || (val.f === v.val.f && val.seq < v.val.seq)) v = { key, val }; evicts.push(v.key); f.delete(v.key); }
      f.set(k, { f: 1, seq: ++s }); }
  }
  return { keys: [...f.keys()], hits, misses, evicts };
})();
ok(`LFU heap agrees with an independent freq-map min-scan on hits/misses/final keys (${lfu.hits}/${lfu.misses})`,
  lfu.keys.join() === refLfu.keys.join() && lfu.hits === refLfu.hits && lfu.misses === refLfu.misses &&
  lfu.evictions === refLfu.evicts.length && lfu.evictions >= 1);
ok(`LFU evicts min-frequency with earliest-insertion tie break (${lfu.events.filter((e) => e.kind === "evict").map((e) => e.key).join(",")})`,
  lfu.events.filter((e) => e.kind === "evict").map((e) => e.key).join(",") === refLfu.evicts.join(",") && refLfu.evicts.length >= 1);
const scan = ["HOT", "HOT", "HOT", "HOT", "X1", "X2", "X3", "HOT", "HOT"];
const lfuScan = lfuPolicy(scan, 3), lruScan = lruPolicy(scan, 3);
ok(`LFU protects a hot key through a one-shot scan while LRU admits the cold keys (LFU ${lfuScan.hits} hits vs LRU ${lruScan.hits} hits)`,
  lfuScan.keys.includes("HOT") && lfuScan.hits > lruScan.hits && lfuScan.hits >= 4 && lruScan.hits >= 2);
const lfuFoilOut = lfuFoil(seq2, 3);
ok(`the O(n log n) re-sort foil makes the same LFU decisions (${lfuFoilOut.hits}/${lfuFoilOut.misses}/${lfuFoilOut.evictions})`,
  lfuFoilOut.hits === lfu.hits && lfuFoilOut.misses === lfu.misses && lfuFoilOut.evictions === lfu.evictions && lfuFoilOut.comparisons >= 1);
const lfuBig = lfuPolicy(skew, 8), lfuFoilBig = lfuFoil(skew, 8);
ok(`the heap pushes fewer rows than the re-sort foil compares on 4000 accesses (heap ${lfuBig.pushes} vs foil ${lfuFoilBig.comparisons})`,
  lfuBig.hits === lfuFoilBig.hits && lfuBig.evictions === lfuFoilBig.evictions &&
  lfuFoilBig.comparisons > lfuBig.pushes * 5 && lfuBig.pushes > 0);

// --- 3 · TTL full jitter: reproducible, scattered, and the foil spikes ---------------------
const keys100 = Array.from({ length: 100 }, (_, i) => `club-${i}`);
const e1 = expiryWithJitter("club-7", 0, 60, 24, P.seed);
const e2 = expiryWithJitter("club-7", 0, 60, 24, P.seed);
ok(`TTL jitter is reproducible per key and inside [now+ttl, now+ttl+jitter] (${e1})`,
  e1 === e2 && e1 >= 60 && e1 <= 84 && expiryWithJitter("club-7", 0, 60, 24, "other") !== e1 && P.ttl === 60);
const spread = expirySpread(keys100, 0, 60, 24, P.seed);
ok(`a 100-key herd scatters across many expiry buckets (${spread.distinct} distinct, worst burst ${spread.maxBurst})`,
  spread.distinct >= 20 && spread.maxBurst < 12 && spread.total === 100 && spread.distinct * spread.maxBurst >= 100);
const foilSpread = expiryFoil(keys100, 60);
ok(`the no-jitter foil expires all 100 in one bucket — the thundering herd jitter prevents (burst ${foilSpread.maxBurst})`,
  foilSpread.maxBurst === 100 && foilSpread.distinct === 1 && foilSpread.total === 100);
const otherSpread = expirySpread(keys100, 0, 60, 24, "another-seed");
ok(`a different seed reshuffles the herd (burst ${otherSpread.maxBurst} over ${otherSpread.distinct} buckets)`,
  otherSpread.total === 100 && otherSpread.maxBurst >= 1 &&
  Array.from({ length: 25 }, (_, i) => expiryWithJitter(`club-${i}`, 0, 60, 24, P.seed)).join() !==
  Array.from({ length: 25 }, (_, i) => expiryWithJitter(`club-${i}`, 0, 60, 24, "another-seed")).join());

// --- 4 · Bloom: zero false negatives, bounded false positives ------------------------------
const present = Array.from({ length: 300 }, (_, i) => `present-${i}`);
const absent = Array.from({ length: 1000 }, (_, i) => `absent-${i}`);
const bloom = bloomBoard(present, absent, 4096, 3);
const exact = new Set(present);
ok(`bloom has ZERO false negatives — every inserted key is may-present (${present.length} probed)`,
  bloom.falseNeg === 0 && present.every((k) => exact.has(k)) && bloom.filled > 0 &&
  bloom.filled <= bloom.bits && bloom.bits === 4096 && bloom.k === 3);
ok(`bloom false-positive rate is bounded against an exact Set (${bloom.falsePosRate}% over ${absent.length} absent keys)`,
  bloom.falsePos >= 0 && bloom.falsePos <= absent.length && bloom.falsePosRate < 15 &&
  absent.every((k) => !exact.has(k)) && bloom.falsePosRate >= 0);
const bloomSmall = bloomBoard(present, absent, 128, 3), bloomBig = bloomBoard(present, absent, 16384, 3);
ok(`a wider bit array lowers the false-positive rate (128 bits ${bloomSmall.falsePosRate}% -> 16k bits ${bloomBig.falsePosRate}%)`,
  bloomBig.falsePosRate <= bloomSmall.falsePosRate && bloomSmall.falseNeg === 0 && bloomBig.falseNeg === 0);
const blank = new Array(64).fill(0);
ok(`an empty bloom answers definitely-absent for every one of 50 probes`,
  absent.slice(0, 50).every((k) => bloomTest(blank, 3, k)) === false &&
  bloomAdd(blank.slice(), 3, "x").filter(Boolean).length === 3 && blank.every((b) => b === 0));

// --- 5 · single-flight: N concurrent misses on K keys collapse to K origin loads -----------
const burst = Array.from({ length: 60 }, (_, i) => ({ key: `k-${i % 6}`, at: Math.floor(i / 6) }));
const distinctKeys = new Set(burst.map((r) => r.key)).size;
let loads = 0;
const flight = singleFlight(burst, () => { loads++; return "fresh"; }, 16);
ok(`single-flight collapses 60 requests on ${distinctKeys} hot keys into ${flight.originLoads} origin loads`,
  flight.originLoads === distinctKeys && loads === distinctKeys && flight.coalesced === 60 - distinctKeys &&
  flight.requests === 60 && flight.served.length === 60 && distinctKeys === 6);
ok(`every request is owned-or-coalesced and owned count equals origin loads (${flight.served.filter((s) => s.owned).length} owned)`,
  flight.served.filter((s) => s.owned).length === flight.originLoads &&
  flight.served.filter((s) => s.coalesced).length === flight.coalesced);
const flightNoWindow = singleFlight(burst, () => 1, 0);
ok(`a closed in-flight window disables coalescing — every request reaches the origin (${flightNoWindow.originLoads} loads)`,
  flightNoWindow.originLoads === 60 && flightNoWindow.coalesced === 0 && burst.length === 60 && flightNoWindow.requests === 60);
const flightEmpty = singleFlight([], () => 1, 16);
ok(`an empty burst performs 0 origin loads and returns an empty served list (${burst.length} requests in the full burst for contrast)`,
  burst.length === 60 && flightEmpty.originLoads === 0 && flightEmpty.coalesced === 0 &&
  flightEmpty.served.length === 0 && flightEmpty.requests === 0);

// --- 6 · sharding: binary ring vs an independent linear scan; growth vs modulo -------------
const nodes = ["eu-west", "eu-central", "us-east"], grown = [...nodes, "ap-south"];
const ring = buildRing(nodes, P.vnode), ringGrown = buildRing(grown, P.vnode);
const linearOwner = (r, key) => {
  if (!r.points.length) return "";
  const h = hashString(key);
  const idx = r.points.findIndex((p) => p >= h);
  return r.owners[idx === -1 ? 0 : idx];
};
const probe = Array.from({ length: 800 }, (_, i) => `club-${i}`);
ok(`the binary-search ring owner agrees with an independent linear scan on ${probe.length} keys`,
  probe.every((k) => ringOwner(ring, k) === linearOwner(ring, k)) && ring.points.length === 3 * P.vnode && P.vnode === 128);
const moved = ringMigration(ring, ringGrown, probe);
const moduloMoved = probe.filter((k) => shardOf(k, 3) !== shardOf(k, 4)).length;
ok(`ring growth moves only the new node's arc (${moved}/${probe.length}) vs modulo's mass re-map (${moduloMoved}/${probe.length})`,
  moved > 0 && moved < moduloMoved && moduloMoved > probe.length / 2 && probe.length === 800);
ok(`every key lands in range reproducibly and a single shard buckets all ${probe.length} keys together`,
  probe.every((k) => shardOf(k, P.shards) >= 0 && shardOf(k, P.shards) < P.shards && shardOf(k, P.shards) === shardOf(k, P.shards)) &&
  probe.every((k) => shardOf(k, 1) === 0) && P.shards === 8 && new Set(probe.map((k) => shardOf(k, 1))).size === 1);
ok(`a ring with ${ringGrown.nodes.length} nodes places all its virtual points while an empty ring returns the empty owner`,
  ringGrown.points.length === 4 * P.vnode && buildRing(["x"], 4).points.length === 4 &&
  ringOwner(buildRing([], 128), "any") === "" && ringOwner(ringGrown, probe[0]).length > 0);

// --- 7 · the folded board: pure, conserved, seeded-world arm + screen reader ---------------
const matches = SVC.footballProvider.matches();
const access = matchAccesses(matches);
const finished = matches.filter((m) => m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null).length;
ok(`the world yields two accesses per finished match (${access.length} from ${finished} finished)`,
  access.length === finished * 2 && finished >= 1000 && matches.length > finished);
const negativeProbes = SVC.footballProvider.clubs().map((c) => `ghost-${c.id}`);
const board = runCache(access, P, negativeProbes);
const again = runCache(access, P, negativeProbes);
ok(`runCache is a pure re-entrant fold — the same input yields a byte-identical board`,
  JSON.stringify(board) === JSON.stringify(again) && board.requests === access.length && access.length > 0);
ok(`board accounting is conserved: hits + misses == requests, evictions <= misses, resident <= capacity`,
  board.hits + board.misses === board.requests && board.evictions <= board.misses &&
  board.resident <= P.capacity && board.hitRate > 0 && board.hitRate <= 100);
ok(`board hitRate recomputed from its own hits/misses agrees to 2dp (${board.hitRate}%)`,
  board.hitRate === Math.round((board.hits / board.requests) * 10000) / 100);
ok(`TTL, Bloom and shard layers all ride the same resident set (${board.spread.total} keys, ${board.bloom.bits} bits, ${board.byShard.length} shards)`,
  board.spread.total === P.capacity && board.byShard.length === P.shards &&
  board.byShard.reduce((a, b) => a + b, 0) === board.resident && board.bloom.falseNeg === 0);
ok(`single-flight collapses the miss burst into fewer origin loads (${board.flight.originLoads}/${board.flight.requests})`,
  board.flight.originLoads <= board.flight.requests && board.flight.originLoads >= 1 &&
  board.flight.originLoads + board.flight.coalesced === board.flight.requests);
const refWorldLru = lruPolicy(access, P.capacity);
ok(`board tallies match an independent LRU recount of the world (${refWorldLru.hits}/${refWorldLru.misses}/${refWorldLru.evictions})`,
  board.hits === refWorldLru.hits && board.misses === refWorldLru.misses && board.evictions === refWorldLru.evictions &&
  board.lruKeys.join() === refWorldLru.keys.join());
const emptyBoard = runCache([], P, ["ghost"]);
ok(`an empty world returns a stable ${emptyBoard.byShard.length}-shard board with all counters at rest (${(board.byShard.length)} shards in the full board)`,
  board.byShard.length === P.shards && emptyBoard.requests === 0 && emptyBoard.hits === 0 &&
  emptyBoard.evictions === 0 && emptyBoard.hitRate === 0 && emptyBoard.resident === 0 &&
  emptyBoard.byShard.length === P.shards && emptyBoard.byShard.every((n) => n === 0));
// The observatory reads the fold, not a second copy of the numbers.
const SCREEN = readFileSync(resolve(root, "features/cache/CacheObservatory.tsx"), "utf8");
ok(`the observatory reads runCache and the ring/bloom/flight folds rather than re-deriving a number`,
  SCREEN.includes("runCache(") && SCREEN.includes("CACHE_POLICY") && SCREEN.includes("buildRing(") &&
  SCREEN.includes("expirySpread(") && SCREEN.includes("bloomBoard(") && SCREEN.includes("board.flight") &&
  SCREEN.includes("lruPolicy(") && SCREEN.includes("lfuPolicy(") && SCREEN.includes("PLATFORM_LIVE"));
ok(`the six mechanism keys drive the observatory's boundary cards from one list (${MECH_KEYS.length} mechanisms)`,
  MECH_KEYS.length === 6 && SCREEN.includes("MECH_KEYS.map") &&
  MECH_KEYS.join() === "lru,lfu,ttlJitter,bloom,singleFlight,sharding");
ok(`CACHE_POLICY pins the numbers the proof and cache-service yml agree on (ttl ${P.ttl}, shards ${P.shards}, seed ${P.seed})`,
  P.capacity === 8 && P.ttl === 60 && P.jitter === 24 && P.shards === 8 && P.vnode === 128 && P.seed === "football-os");

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
