// The cache tier (M1064) — the caching decisions the football world would run on, written as a
// fold instead of a Redis process.
//
// Why a domain fold and not a Spring bean right away: every mechanism a real cache leans on
// (an eviction policy, a per-key TTL, a herd defence, a negative-cache door, a stampede lock, a
// partition scheme) is a DECISION, and a decision that lives inside a network hop is a decision no
// proof can recount. So the decisions live here as pure functions over the seeded world's access
// stream; scripts/proof-cache.mjs recomputes each one from first principles and refuses a drift.
// The Java LeagueCacheService (M1058) mirrors the SAME vocabulary — cache-aside, TTL, hit/miss —
// so this fold is the semantics and that service is one transport of them.
//
// The knowledge on display is the point, not decoration:
//   · LRU is a Map used as an O(1) recency ladder. get = delete+set (move to MRU tail), evict =
//     delete the head. The foil is the array indexOf+splice O(n) version; the proof counts probes.
//   · LFU is a frequency table plus a MinHeap (lib/structures.ts): O(log n) eviction against the
//     naive "re-sort the whole resident set" O(n log n) foil. seq breaks frequency ties, making the
//     policy an LFU/LRU hybrid that is deterministic and cache-friendly.
//   · TTL with FULL JITTER is the classic answer to a cache stampede / thundering herd: a fleet of
//     keys written in the same second would expire together without a seeded spread. This is the
//     cache analogue of queue.ts's retry backoff jitter.
//   · A Bloom filter is a bit array with k hash lines: zero false negatives, bounded false
//     positives — the negative-cache door that stops a miss storm on absent keys without holding
//     the (potentially unbounded) absent-key set exactly.
//   · Single-flight collapses concurrent misses on one hot key into ONE origin load — the answer
//     to the breakdown that happens the instant a hot key expires and every reader stampsedes.
//   · A consistent-hash ring keeps a key on one shard across growth, moving only ~1/(N+1) keys;
//     the modulo partition it replaces re-maps ~N/(N+1). The proof measures both.
//
// Nothing here opens a socket, reads the clock, or touches the seeded world's mutable state. The
// "now" is an integer the caller supplies; the randomness is a seeded mulberry32 from lib/rng.
// Re-running a fold with the same input is byte-identical, which is what makes it provable.

import { MinHeap } from "@/lib/structures";
import { hashString, makeRng } from "@/lib/rng";
import { tally } from "./attributes";
import { shardOf } from "./ringMath";

/** The defaults the observatory prints and the proof pins. `ttl` mirrors cache-service's
 *  application.yml `ttl-seconds: 60` — proof-services checks the two agree, the same three-way
 *  discipline the queue retry policy has. A caller may override any of them. */
export const CACHE_POLICY = {
  capacity: 8,        // working set: max entries resident before an eviction
  ttl: 60,            // seconds — mirrors cache-service application.yml ttl-seconds: 60
  jitter: 24,         // full-jitter window (seconds) applied on top of ttl to defeat a herd
  shards: 8,          // partition count — mirrors QUEUE_POLICY.shards
  vnode: 128,         // virtual nodes per physical shard on the ring
  bloomBits: 4096,    // bloom filter bit array length
  bloomHashes: 3,     // k independent-ish hash lines per key
  seed: "football-os",
} as const;

/** The six mechanisms, in one place: the observatory's boundary cards and the i18n dynamic keys
 *  both read this list, so a new mechanism cannot appear on one surface and be missing on the other. */
export const MECH_KEYS = ["lru", "lfu", "ttlJitter", "bloom", "singleFlight", "sharding"] as const;

export interface PolicyBoard {
  readonly keys: string[];
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;   // 2dp percentage
  readonly events: readonly CacheEvent[];
}
export interface CacheEvent { readonly key: string; readonly kind: "hit" | "miss" | "evict" }
export interface LruBoard extends PolicyBoard { readonly touches: number }
export interface LfuBoard extends PolicyBoard { readonly pushes: number }

// --- 1 · LRU: Map insertion order IS the recency ladder ---------------------------------------
/** get = delete + set (move to MRU tail); evict = delete the oldest (first) key. O(1) amortised.
 *  `touches` counts Map operations so the proof can compare against the O(n) array foil. */
export function lruPolicy(accesses: readonly string[], capacity: number = CACHE_POLICY.capacity): LruBoard {
  const cap = Math.max(1, Math.floor(capacity));
  const cache = new Map<string, true>();
  const events: CacheEvent[] = [];
  let hits = 0, misses = 0, evictions = 0, touches = 0;
  for (const key of accesses) {
    if (cache.has(key)) {
      cache.delete(key); cache.set(key, true); touches += 2; hits += 1;
      events.push({ key, kind: "hit" });
    } else {
      misses += 1;
      if (cache.size >= cap) {
        const oldest = cache.keys().next().value as string;
        cache.delete(oldest); evictions += 1; touches += 1;
        events.push({ key: oldest, kind: "evict" });
      }
      cache.set(key, true); touches += 1;
      events.push({ key, kind: "miss" });
    }
  }
  return { keys: [...cache.keys()], hits, misses, evictions, touches, events,
           hitRate: (hits + misses) ? Math.round((hits / (hits + misses)) * 10000) / 100 : 0 };
}

/** The O(n) foil: a plain array with indexOf + splice on every access. Same hits/evictions, but
 *  `scans` (linear probes) grows with the working set — the cost the Map version removes. */
export function lruFoil(accesses: readonly string[], capacity: number = CACHE_POLICY.capacity) {
  const cap = Math.max(1, Math.floor(capacity));
  const arr: string[] = []; let hits = 0, misses = 0, evictions = 0, scans = 0;
  for (const key of accesses) {
    const at = arr.indexOf(key); scans += at < 0 ? Math.max(1, arr.length) : at + 1;
    if (at >= 0) { arr.splice(at, 1); arr.push(key); hits += 1; }
    else {
      misses += 1;
      if (arr.length >= cap) { arr.shift(); evictions += 1; }
      arr.push(key);
    }
  }
  return { keys: arr, hits, misses, evictions, scans };
}

// --- 2 · LFU: frequency table + MinHeap, O(log n) evict -------------------------------------
interface LfuRec { f: number; seq: number }
interface LfuHeapRow { key: string; f: number; seq: number }

/** Least-frequently-used eviction. A heap keyed by (freq, seq, key) gives O(log n) eviction; `seq`
 *  is a monotonically increasing tie-breaker so equal-frequency items evict oldest-inserted (an
 *  LFU/LRU hybrid that is deterministic). Stale heap rows (a key's freq advanced after its row was
 *  pushed) are skipped by matching BOTH freq and seq — the incarnation check that keeps the lazy
 *  heap honest after an evict+reinsert. */
export function lfuPolicy(accesses: readonly string[], capacity: number = CACHE_POLICY.capacity): LfuBoard {
  const cap = Math.max(1, Math.floor(capacity));
  const freq = new Map<string, LfuRec>();
  const heap = new MinHeap<LfuHeapRow>((a, b) => (a.f - b.f) || (a.seq - b.seq));
  let seq = 0, hits = 0, misses = 0, evictions = 0, pushes = 0;
  const events: CacheEvent[] = [];
  for (const key of accesses) {
    const cur = freq.get(key);
    if (cur) {
      hits += 1; cur.f += 1;
      heap.push({ key, f: cur.f, seq: cur.seq }); pushes += 1;
      events.push({ key, kind: "hit" });
    } else {
      misses += 1;
      if (freq.size >= cap) {
        let victim = heap.pop();
        while (victim) {
          const rec = freq.get(victim.key);
          if (rec && rec.f === victim.f && rec.seq === victim.seq) break;
          victim = heap.pop();
        }
        if (victim) { freq.delete(victim.key); evictions += 1; events.push({ key: victim.key, kind: "evict" }); }
      }
      const rec: LfuRec = { f: 1, seq: seq += 1 }; freq.set(key, rec);
      heap.push({ key, f: 1, seq: rec.seq }); pushes += 1;
      events.push({ key, kind: "miss" });
    }
  }
  return { keys: [...freq.keys()], hits, misses, evictions, pushes, events,
           hitRate: (hits + misses) ? Math.round((hits / (hits + misses)) * 10000) / 100 : 0 };
}

/** The naive LFU foil: re-sort the whole resident set on every eviction to find the minimum. Same
 *  hit/evict decisions (ties by seq), but `comparisons` grows with n·log n per eviction. */
export function lfuFoil(accesses: readonly string[], capacity: number = CACHE_POLICY.capacity) {
  const cap = Math.max(1, Math.floor(capacity));
  const freq = new Map<string, LfuRec>(); let seq = 0, hits = 0, misses = 0, evictions = 0, comparisons = 0;
  for (const key of accesses) {
    const cur = freq.get(key);
    if (cur) { cur.f += 1; hits += 1; }
    else {
      misses += 1;
      if (freq.size >= cap) {
        const rows = [...freq.entries()].map(([k, v]) => [k, v.f, v.seq] as const);
        rows.sort((a, b) => (a[1] - b[1]) || (a[2] - b[2])); comparisons += rows.length;
        freq.delete(rows[0][0]); evictions += 1;
      }
      freq.set(key, { f: 1, seq: seq += 1 });
    }
  }
  return { keys: [...freq.keys()], hits, misses, evictions, comparisons };
}

// --- 3 · TTL with FULL JITTER: scatter expiries to defeat the thundering herd ----------------
/** A key written at `now` expires at now + ttl + floor(rng(seed:key:now) * (jitter+1)). The seeded
 *  draw makes it reproducible yet spreads a fleet written in the same second across the window. */
export function expiryWithJitter(key: string, now: number, ttl: number, jitter: number, seed: string): number {
  const draw = makeRng(`${seed}:${key}:${now}`)();
  return now + ttl + Math.floor(draw * (jitter + 1));
}
export interface SpreadBoard { readonly distinct: number; readonly maxBurst: number; readonly total: number; readonly min: number }
/** Batch the writes of one second and report how concentrated the expiries are. */
export function expirySpread(keys: readonly string[], now: number, ttl: number, jitter: number, seed: string): SpreadBoard {
  const buckets = tally(keys, (k) => expiryWithJitter(k, now, ttl, jitter, seed));
  const counts = [...buckets.values()];
  return { distinct: buckets.size, maxBurst: Math.max(0, ...counts), total: keys.length,
           min: Math.min(ttl, ...[...buckets.keys()].map((e) => e - now)) };
}
/** The foil: no jitter — every key written in the same second expires in the SAME second. */
export function expiryFoil(keys: readonly string[], ttl: number): SpreadBoard {
  return { distinct: 1, maxBurst: keys.length, total: keys.length, min: ttl };
}

// --- 4 · Bloom filter: k hashed bit lines, zero false negatives -----------------------------
export function bloomAdd(bits: number[], k: number, key: string): number[] {
  for (let i = 0; i < k; i++) bits[hashString(`${key}#${i}`) % bits.length] = 1;
  return bits;
}
export function bloomTest(bits: readonly number[], k: number, key: string): boolean {
  for (let i = 0; i < k; i++) if (!bits[hashString(`${key}#${i}`) % bits.length]) return false;
  return true;
}
export interface BloomBoard {
  readonly bits: number; readonly k: number; readonly filled: number;
  readonly falseNeg: number; readonly falsePos: number; readonly falsePosRate: number;
}
/** Build a filter from present keys and measure it against present + absent probes. */
export function bloomBoard(present: readonly string[], absent: readonly string[], m: number, k: number): BloomBoard {
  const bits = new Array<number>(Math.max(8, Math.floor(m))).fill(0);
  for (const key of present) bloomAdd(bits, k, key);
  let falseNeg = 0, falsePos = 0;
  for (const key of present) if (!bloomTest(bits, k, key)) falseNeg += 1;
  for (const key of absent) if (bloomTest(bits, k, key)) falsePos += 1;
  const filled = bits.filter(Boolean).length;
  return { bits: bits.length, k, filled, falseNeg, falsePos,
           falsePosRate: absent.length ? Math.round((falsePos / absent.length) * 10000) / 100 : 0 };
}

// --- 5 · single-flight: collapse concurrent misses on one key into one origin read ----------
export interface FlightRequest { readonly key: string; readonly at: number }
export interface ServedFlight { readonly key: string; readonly at: number; readonly owned: boolean; readonly coalesced: boolean }
export interface FlightBoard {
  readonly served: readonly ServedFlight[];
  readonly originLoads: number;
  readonly coalesced: number;
  readonly requests: number;
}
/** Requests arrive as { key, at }. A single-flight group per key loads the origin once; every
 *  request inside the in-flight window shares that result. The load is a pure function the caller
 *  supplies, so the fold counts origin reads without performing IO. */
export function singleFlight(requests: readonly FlightRequest[], load: (key: string) => unknown, window: number): FlightBoard {
  const groups = new Map<string, { loadedAt: number; value: unknown }>();
  const served: ServedFlight[] = [];
  let originLoads = 0, coalesced = 0;
  for (const req of requests) {
    const g = groups.get(req.key);
    if (g && (req.at - g.loadedAt) <= window) {
      served.push({ key: req.key, at: req.at, owned: false, coalesced: true });
      coalesced += 1;
    } else {
      const value = load(req.key); originLoads += 1;
      groups.set(req.key, { loadedAt: req.at, value });
      served.push({ key: req.key, at: req.at, owned: true, coalesced: false });
    }
  }
  return { served, originLoads, coalesced, requests: requests.length };
}

// --- 6 · consistent-hash sharding: ring vs modulo migration (shared floor with domain/queue.ts)
// HashRing the interface stays inside ringMath (its function signatures carry the type); only the
// values are re-exported here — re-exporting the type name from this barrel would be a dead export,
// since no consumer names it through `domain/cache` (proof-dead-exports charges it).
export { shardOf, buildRing, ringOwner, ringMigration } from "./ringMath";

// --- the seeded-world adapter + one folded board --------------------------------------------
export interface CacheSource {
  readonly homeClubId: string; readonly awayClubId: string;
  readonly status: string; readonly homeGoals: number | null; readonly awayGoals: number | null;
}
/** Turn finished fixtures into a hot-key access stream: every finished match touches its two
 *  clubs. The resulting multi-set is the workload the cache folds over. */
export function matchAccesses(matches: readonly CacheSource[]): string[] {
  const accesses: string[] = [];
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeGoals === null || m.awayGoals === null) continue;
    accesses.push(m.homeClubId, m.awayClubId);
  }
  return accesses;
}

export interface CacheBoard {
  readonly requests: number; readonly hits: number; readonly misses: number; readonly evictions: number;
  readonly hitRate: number; readonly resident: number; readonly touches: number;
  readonly spread: SpreadBoard; readonly bloom: BloomBoard; readonly flight: FlightBoard;
  readonly byShard: readonly number[]; readonly lruKeys: readonly string[];
  readonly events: readonly CacheEvent[];
}
/** ONE fold: LRU policy over the access stream, then layer TTL jitter, bloom admission,
 *  single-flight collapse and shard distribution on top. Every number derives from the same
 *  accesses array, so the observatory's picture cannot disagree with the proof's recount. */
export function runCache(accesses: readonly string[], policy = CACHE_POLICY, negativeProbes: readonly string[] = []): CacheBoard {
  const lru = lruPolicy(accesses, policy.capacity);
  const now = 0;
  const residents = lru.keys;
  const spread = expirySpread(residents.length ? residents : accesses.slice(0, policy.capacity), now, policy.ttl, policy.jitter, policy.seed);
  const bloom = bloomBoard(residents, negativeProbes.length ? negativeProbes : ["__absent__"], policy.bloomBits, policy.bloomHashes);
  const missBurst = lru.events.filter((e) => e.kind === "miss").slice(0, 64);
  const flights: FlightRequest[] = missBurst.map((e, i) => ({ key: e.key, at: i }));
  const flight = singleFlight(flights, () => 1, 16);
  const byShard = Array.from({ length: policy.shards }, () => 0);
  for (const k of residents) byShard[shardOf(k, policy.shards)] += 1;
  return { requests: accesses.length, hits: lru.hits, misses: lru.misses, evictions: lru.evictions,
           hitRate: lru.hitRate, resident: residents.length, touches: lru.touches,
           spread, bloom, flight, byShard, lruKeys: residents, events: lru.events.slice(0, 16) };
}
