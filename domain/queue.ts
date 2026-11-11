// The message pipeline (M1059) — the delivery layer the football world would run on, written as
// a fold instead of a broker process.
//
// Why a domain fold and not a Spring listener right away: every mechanism a real queue leans on
// (a delay queue, retry backoff, a dead-letter path, consumer idempotency, partition ownership,
// admission control) is a DECISION, and a decision that lives in a network hop is a decision no
// proof can recount. So the decisions live here as pure functions over the seeded world's fixture
// events; scripts/proof-message-queue.mjs recomputes each one from first principles and refuses a
// drift. M1061 then builds the Spring Cloud Stream service on the SAME vocabulary — the Java
// mirrors these names instead of inventing a second semantics.
//
// The knowledge on display is the point, not decoration:
//   · MinHeap (lib/structures.ts) is the DELAY QUEUE. A broker that scanned every pending message
//     each tick is O(n) per delivery; a heap is O(log n), and the proof counts pushes/pops rather
//     than trusting a wall clock on a shared machine.
//   · Exponential backoff with FULL JITTER is the classic network answer to a thundering herd:
//     cap the exponential, then spread each retry across [0, raw) with a seeded draw so a fleet of
//     consumers that failed together does not retry together.
//   · A dead-letter queue terminates the retry loop. Without a max-attempt bound a poison message
//     re-enters the delay queue forever and the fold would not halt — termination is a proof, not
//     a hope.
//   · Consumer idempotency (a seen-id set) turns at-least-once delivery into an exactly-once
//     EFFECT: a duplicate that survives a retry is dropped before it reaches the reader.
//   · A consistent-hash ring keeps per-key order and, when a node joins, moves only ~1/(N+1) of
//     the keys — the modulo partition it replaces would move ~N/(N+1). The proof measures both.
//   · Backpressure with HYSTERESIS (two water marks, not one) stops a flow-control flag from
//     flapping when the depth hovers on a single threshold.
//
// Nothing here opens a socket, reads the clock, or touches the seeded world's mutable state. The
// "time" is an integer the caller supplies; the randomness is a seeded mulberry32 from lib/rng.
// Re-running a fold with the same input is byte-identical, which is what makes it provable.

import { MinHeap } from "@/lib/structures";
import { hashString, makeRng } from "@/lib/rng";
import { unique } from "./attributes";

/** The defaults the atlas prints and the proof pins. A caller may override any of them; the
 *  proof measures the default policy so a change to one number has to be written down. */
export const QUEUE_POLICY = {
  baseDelay: 20,      // ms — first retry's exponential base
  capDelay: 640,      // ms — the ceiling the exponential is clamped to
  maxAttempts: 5,     // a message that fails this many times is dead-lettered
  highWater: 64,      // queue depth that OPENS admission control
  lowWater: 16,       // depth that CLOSES it again (hysteresis band: 16..64)
  shards: 8,          // partition count for the modulo sharder
  vnode: 128,         // virtual nodes per physical node on the hash ring
  seed: "football-os",// jitter seed — a fixed string, never Date.now()
} as const;

/** The six mechanisms the observatory explains and the proof measures. One list, read by the
 *  screen to render the boundary cards and by proof-i18n to verify every `messaging.mech.<key>`
 *  row exists in all three locales — so a card cannot be added on screen without its copy. */
export const MECH_KEYS = [
  "delayQueue",
  "backoffDlq",
  "idempotency",
  "hashRing",
  "backpressure",
  "termination",
] as const;

export interface Message {
  /** Idempotency key. Two messages with one id are ONE delivery. */
  id: string;
  /** Partition key. One key always lands on one shard, so its events stay ordered. */
  key: string;
  /** Opaque payload — the screen shows it, the pipeline never interprets it. */
  body: string;
  /** Earliest delivery time (integer ms on the caller's own clock). */
  availableAt: number;
}

export interface DeliveryAttempt {
  id: string;
  shard: number;
  /** 1-based: the first try is attempt 1, its retry is attempt 2, and so on. */
  attempt: number;
  /** The clock time this try was delivered at. */
  at: number;
  /** Backoff waited before THIS try (0 on the first try). */
  delay: number;
}

export interface QueueBoard {
  /** Successful deliveries, in delivery-clock order (the heap pops in that order). */
  delivered: DeliveryAttempt[];
  /** Ids that exhausted maxAttempts and were moved to the dead-letter queue. */
  deadLettered: string[];
  /** Ids dropped by the consumer's seen-set — the exactly-once effect. */
  duplicates: string[];
  /** Successful deliveries per shard. */
  byShard: number[];
  /** Real delivery tries, including the failed ones (bounded by n × maxAttempts). */
  attempts: number;
  /** Re-queue events — one per non-terminal failure. */
  retries: number;
  /** Peak number of pending messages, retries included. */
  peakDepth: number;
}

/** The failure model: `failures[id]` is the number of INITIAL tries that will NACK. A message with
 *  `failures[id] = 2` fails tries 1 and 2 and succeeds on try 3 (unless maxAttempts cuts it off).
 *  A plain record keeps the fold data-only — the caller decides what a failure means. */
export type FailurePlan = Readonly<Record<string, number>>;

/** The un-jittered exponential: `min(cap, base · 2^(attempt-1))`. Exported so the proof can measure
 *  the ladder itself, separately from the spread the jitter adds on top. */
export function rawBackoff(attempt: number, base: number, cap: number): number {
  const step = Math.max(1, attempt);
  return Math.min(cap, base * 2 ** (step - 1));
}

/** Exponential backoff with FULL JITTER. The seeded draw is a function of (seed, id, attempt), so
 *  the same message backs off identically run to run — deterministic, but different messages that
 *  failed in the same tick scatter across the window instead of colliding again. */
export function backoffDelay(attempt: number, base: number, cap: number, seed: string, id: string): number {
  const raw = rawBackoff(attempt, base, cap);
  return Math.floor(makeRng(`${seed}:${id}:${attempt}`)() * raw);
}

/** The modulo sharder: `hash(key) % shards`. Per-key order is free (one key, one shard); the cost
 *  is that adding a shard re-maps most keys. The consistent-hash ring below is the remedy and the
 *  proof prints both migration counts side by side. */
export function shardOf(key: string, shards: number): number {
  return hashString(key) % Math.max(1, Math.floor(shards));
}

// --- The consistent-hash ring ---------------------------------------------------------------
/** A sorted ring of virtual-node hashes, each pointing at the physical node that owns it. */
export interface HashRing {
  readonly nodes: readonly string[];
  /** Ascending vnode hashes — the search key. */
  readonly points: readonly number[];
  /** `owners[i]` is the physical node that placed `points[i]`. */
  readonly owners: readonly string[];
}

/** Place `vnode` virtual points per physical node, then sort the whole ring once. Duplicated node
 *  names collapse (a node cannot own two disjoint slices of the ring). */
export function buildHashRing(nodes: readonly string[], vnode: number): HashRing {
  const uniqueNodes = unique(nodes);
  const pts: number[] = [];
  const own: string[] = [];
  for (const node of uniqueNodes) {
    for (let v = 0; v < Math.max(1, Math.floor(vnode)); v += 1) {
      pts.push(hashString(`${node}#${v}`));
      own.push(node);
    }
  }
  const order = pts.map((_, i) => i).sort((a, b) => pts[a] - pts[b]);
  return {
    nodes: uniqueNodes,
    points: order.map((i) => pts[i]),
    owners: order.map((i) => own[i]),
  };
}

/** Clockwise ownership: the first vnode point with hash ≥ the key's hash; wrap past the end.
 *  Lower-bound binary search makes a lookup O(log vnode·nodes) rather than a ring scan. An empty
 *  ring owns nothing and returns the empty string — an owner the caller can test for. */
export function ringOwner(ring: HashRing, key: string): string {
  if (ring.points.length === 0) return "";
  const h = hashString(key);
  let lo = 0;
  let hi = ring.points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ring.points[mid] < h) lo = mid + 1;
    else hi = mid;
  }
  return ring.owners[lo % ring.owners.length];
}

/** How many keys change hands when a ring is rebuilt — the expansion cost the modulo sharder
 *  cannot avoid and consistent hashing nearly eliminates. */
export function ringMigration(from: HashRing, to: HashRing, keys: readonly string[]): number {
  let moved = 0;
  for (const key of keys) if (ringOwner(from, key) !== ringOwner(to, key)) moved += 1;
  return moved;
}

// --- Backpressure with hysteresis -----------------------------------------------------------
export interface BackpressureResult {
  /** `open[i]` is whether admission is CLOSED (shedding) at depth `depths[i]`. */
  readonly open: boolean[];
  /** State flips — few flips on a noisy depth signal is the whole point of two water marks. */
  readonly transitions: number;
  /** Samples for which shedding was active. */
  readonly shed: number;
}

/** Given a queue-depth trace, decide when a producer should be shed. A single threshold flaps when
 *  depth hovers on it; two marks (low ≤ high) make the flag STICK until depth crosses the other
 *  mark — the same hysteresis a thermostat or a TCP congestion state machine uses. */
export function backpressureSignal(depths: readonly number[], high: number, low: number): BackpressureResult {
  const open: boolean[] = [];
  let state = false;
  let transitions = 0;
  let shed = 0;
  for (const depth of depths) {
    if (state) {
      if (depth <= low) { state = false; transitions += 1; }
    } else if (depth >= high) {
      state = true;
      transitions += 1;
    }
    if (state) shed += 1;
    open.push(state);
  }
  return { open, transitions, shed };
}

/** Admission control: pair a message batch with the depth seen before each arrival and shed the
 *  ones that arrive while the gate is open. The survivors are the load the broker would accept. */
export function admitMessages(
  messages: readonly Message[],
  depths: readonly number[],
  high: number,
  low: number,
): { admitted: Message[]; rejected: Message[]; signal: BackpressureResult } {
  const signal = backpressureSignal(depths, high, low);
  const admitted: Message[] = [];
  const rejected: Message[] = [];
  messages.forEach((message, i) => {
    if (signal.open[i]) rejected.push(message);
    else admitted.push(message);
  });
  return { admitted, rejected, signal };
}

// --- The delay-queue engine ------------------------------------------------------------------
interface Pending {
  at: number;
  seq: number;
  attempt: number;
  delay: number;
  message: Message;
}

/** The reliable-delivery fold. A MinHeap is the pending set, ordered by (delivery time, insertion
 *  sequence): the sequence makes equal-time pops stable so the board is byte-identical run to run.
 *
 *  The loop terminates because every non-terminal outcome either delivers, dead-letters, or
 *  re-queues with `attempt + 1`, and a re-queue at `maxAttempts` dead-letters instead. So each
 *  message is popped at most `maxAttempts` times — `attempts ≤ n × maxAttempts` is a theorem the
 *  proof checks, not a property the code promises in a comment. */
export function deliverQueue(
  messages: readonly Message[],
  policy: typeof QUEUE_POLICY = QUEUE_POLICY,
  failures: FailurePlan = {},
): QueueBoard {
  const pending = new MinHeap<Pending>((a, b) => (a.at - b.at) || (a.seq - b.seq));
  let seq = 0;
  let peakDepth = 0;
  const enqueue = (p: Omit<Pending, "seq">) => {
    pending.push({ ...p, seq: seq += 1 });
    if (pending.size > peakDepth) peakDepth = pending.size;
  };
  for (const message of messages) {
    enqueue({ at: message.availableAt, attempt: 1, delay: 0, message });
  }

  const delivered: DeliveryAttempt[] = [];
  const deadLettered: string[] = [];
  const duplicates: string[] = [];
  const byShard = Array.from({ length: Math.max(1, Math.floor(policy.shards)) }, () => 0);
  const seen = new Set<string>();
  let attempts = 0;
  let retries = 0;

  let next = pending.pop();
  while (next !== undefined) {
    const { message, attempt, at, delay } = next;
    // Idempotency: an at-least-once broker can deliver a message twice (a slow ACK, a retry that
    // raced the commit). The seen-set collapses both into one EFFECT without changing the wire.
    if (seen.has(message.id)) {
      duplicates.push(message.id);
      next = pending.pop();
      continue;
    }
    attempts += 1;
    const failTries = failures[message.id] ?? 0;
    if (attempt <= failTries) {
      if (attempt >= policy.maxAttempts) {
        deadLettered.push(message.id); // poison pill: terminate, don't spin forever
      } else {
        const wait = backoffDelay(attempt, policy.baseDelay, policy.capDelay, policy.seed, message.id);
        retries += 1;
        enqueue({ at: at + wait, attempt: attempt + 1, delay: wait, message });
      }
    } else {
      seen.add(message.id);
      const shard = shardOf(message.key, policy.shards);
      byShard[shard] += 1;
      delivered.push({ id: message.id, shard, attempt, at, delay });
    }
    next = pending.pop();
  }

  return { delivered, deadLettered, duplicates, byShard, attempts, retries, peakDepth };
}

// --- The seeded-world adapter ---------------------------------------------------------------
/** The fixture shape the pipeline reads — structural, so the domain module does not import the
 *  data layer. A finished match is one message; its kickoff is the availability time. */
export interface QueueSource {
  id: string;
  homeClubId: string;
  awayClubId: string;
  status: string;
  kickoff: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

/** Turn finished fixtures into ordered messages. The KEY is the home club: every event a club
 *  hosts shares one shard, so its chronology is preserved through retries. An unparseable kickoff
 *  falls to time 0 (already available) rather than NaN, which would poison the heap's ordering. */
export function matchMessages(matches: readonly QueueSource[]): Message[] {
  const out: Message[] = [];
  for (const match of matches) {
    if (match.status !== "FINISHED" || match.homeGoals === null || match.awayGoals === null) continue;
    const at = Date.parse(match.kickoff);
    out.push({
      id: match.id,
      key: match.homeClubId,
      body: `${match.homeClubId} ${match.homeGoals}-${match.awayGoals} ${match.awayClubId}`,
      availableAt: Number.isFinite(at) ? at : 0,
    });
  }
  return out;
}
