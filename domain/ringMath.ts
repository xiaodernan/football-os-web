// The consistent-hash floor (M1064/M1057) — the five primitives an xK-forever ring needs,
// written once. Both the message pipeline and the cache tier key their partitions the same way;
// keeping the primitives in a fifth domain module means neither owns a private copy and neither
// can drift.
//
// The line of decision: a modulo sharder is cheap and stable per key, and O(1) — its cost is
// that adding a shard re-maps ~N/(N+1) of the keys. The ring is O(log V·N) with virtual
// neighbours, and only ~1/(N+1) of the keys move on expansion. The fold computes both and
// prints the numbers side by side; the proof measures them independently.

import { unique } from "./attributes";
import { hashString } from "@/lib/rng";

/** The partition for a key, matching the modulo foil Java's floorMod implements for the
 *  broker side: Math.floor(hash % shards) keeps one trunk one word and one word one trunk. */
export function shardOf(key: string, shards: number): number {
  return hashString(key) % Math.max(1, Math.floor(shards));
}

/** The hash-ring topology both folds publish. `points` is sorted ascending; `owners[i]` is the
 *  physical node that placed `points[i]`. The two directions of an edge are deduplicated by the
 *  caller (a Set of unordered pairs), never here — the ring knows nothing of the world. */
export interface HashRing { readonly nodes: readonly string[]; readonly points: readonly number[]; readonly owners: readonly string[] }

export function buildRing(nodes: readonly string[], vnode: number): HashRing {
  const ns = unique(nodes);
  const pts: number[] = [], own: string[] = [];
  for (const n of ns) for (let v = 0; v < Math.max(1, Math.floor(vnode)); v++) {
    pts.push(hashString(`${n}#${v}`));
    own.push(n);
  }
  const order = pts.map((_, i) => i).sort((a, b) => pts[a] - pts[b]);
  return { nodes: ns, points: order.map((i) => pts[i]), owners: order.map((i) => own[i]) };
}

/** Clockwise ownership: the first vnode point with hash >= the key's hash; wrap past the end.
 *  Lower-bound binary search keeps the lookup O(log vnode·nodes) instead of a scan of the ring.
 *  An empty ring owns nothing and returns "". */
export function ringOwner(ring: HashRing, key: string): string {
  if (!ring.points.length) return "";
  const h = hashString(key);
  let lo = 0, hi = ring.points.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (ring.points[mid] < h) lo = mid + 1; else hi = mid; }
  return ring.owners[lo % ring.owners.length];
}

/** How many keys change hands when the ring is rebuilt — the expansion cost the modulo sharder
 *  cannot avoid and consistent hashing nearly eliminates. */
export function ringMigration(from: HashRing, to: HashRing, keys: readonly string[]): number {
  let moved = 0;
  for (const key of keys) if (ringOwner(from, key) !== ringOwner(to, key)) moved += 1;
  return moved;
}
