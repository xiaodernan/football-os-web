// The algorithmic floor (M1057) — the two structures the graph fold runs on, written once here
// instead of inline in a domain module.
//
// Why a shared module rather than a local helper: the graph fold (domain/graph.ts) needs a top-k
// cut over 73 clubs and a connected-component walk over the same population, and both were
// spelled by hand in other folds before (the leader boards sort the whole list and slice it; the
// world's academy walk keeps its own label map). Sorting every row to keep eight is O(n log n)
// work for an O(n log k) question, and a hand-rolled path-compression walk is exactly the kind
// of code that is right on the happy path and wrong on a cycle. So the heap and the union-find
// live here, and scripts/proof-structures.mjs measures them rather than trusting them: the proof
// counts comparisons, which is the part of the cost the input cannot fake.
//
// Nothing in this module knows what a club is. It is the data-structure layer; the domain layer
// reads it.

/** A binary min-heap over an explicit comparator. `compare(a, b) < 0` means `a` comes out first.
 *  The array is 0-based and the sift loops are the textbook pair: O(log n) push, O(log n) pop,
 *  O(1) peek. A comparator that returns 0 for two different rows is fine — the heap then has no
 *  opinion between them, which is why every caller that needs a stable order sorts the survivors
 *  once more at the end. */
export class MinHeap<T> {
  private readonly items: T[] = [];
  private readonly compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(value: T): void {
    const items = this.items;
    items.push(value);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(items[i], items[parent]) >= 0) break;
      const swap = items[i];
      items[i] = items[parent];
      items[parent] = swap;
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    if (items.length === 0) return undefined;
    const top = items[0];
    const last = items.pop() as T;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && this.compare(items[left], items[smallest]) < 0) smallest = left;
        if (right < items.length && this.compare(items[right], items[smallest]) < 0) smallest = right;
        if (smallest === i) break;
        const swap = items[i];
        items[i] = items[smallest];
        items[smallest] = swap;
        i = smallest;
      }
    }
    return top;
  }
}

/** The best `k` rows of a list, in the comparator's own order.
 *
 *  The heap is a MAX-heap of the kept rows (the comparator is negated once, at construction), so
 *  its root is the worst row still worth keeping; a candidate replaces it only when the candidate
 *  is strictly better. That is the O(n log k) selection the graph fold needs, and the reason the
 *  proof measures comparisons: with n = 10,000 and k = 8 the heap does roughly a third of the
 *  work a full sort does, and the counter is what says so.
 *
 *  The survivors are sorted once at the end. Without that pass the output order would depend on
 *  where each row entered the heap — a reader would see the same eight clubs in a different order
 *  run to run, which is the kind of "deterministic" that is not. */
export function topK<T>(items: readonly T[], k: number, compare: (a: T, b: T) => number): T[] {
  if (k <= 0 || items.length === 0) return [];
  const kept = new MinHeap<T>((a, b) => -compare(a, b));
  for (const item of items) {
    if (kept.size < k) {
      kept.push(item);
      continue;
    }
    const worst = kept.peek() as T;
    if (compare(item, worst) < 0) {
      kept.pop();
      kept.push(item);
    }
  }
  const out: T[] = [];
  let row = kept.pop();
  while (row !== undefined) {
    out.push(row);
    row = kept.pop();
  }
  out.sort(compare);
  return out;
}

/** Disjoint sets with union by rank and path halving. `add` is idempotent, and a `union` of two
 *  rows that already share a root is a no-op — the two facts the graph fold leans on when it
 *  walks matches in fixture order and asks how many separate worlds the results describe.
 *
 *  Path halving (moving each node's parent up one level on the way to the root) is the iterative
 *  form of path compression: it is not literally the two-pass compression in the textbook, but
 *  it flattens the same trees with no recursion, which matters on a 73-node graph not at all and
 *  on a hostile deep chain a great deal. */
export class UnionFind<T> {
  private readonly parent = new Map<T, T>();
  private readonly rank = new Map<T, number>();
  private roots = 0;

  get size(): number {
    return this.parent.size;
  }

  get components(): number {
    return this.roots;
  }

  add(value: T): void {
    if (this.parent.has(value)) return;
    this.parent.set(value, value);
    this.rank.set(value, 0);
    this.roots += 1;
  }

  find(value: T): T {
    let node = value;
    let parent = this.parent.get(node);
    if (parent === undefined) return value;
    while (parent !== node) {
      const grand = this.parent.get(parent) as T;
      if (grand === parent) return parent;
      // Path halving: point this node at its grandparent and walk on.
      this.parent.set(node, grand);
      node = grand;
      parent = this.parent.get(node) as T;
    }
    return node;
  }

  /** Joins the two sets and reports whether anything changed. */
  union(a: T, b: T): boolean {
    this.add(a);
    this.add(b);
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;
    const rankA = this.rank.get(rootA) as number;
    const rankB = this.rank.get(rootB) as number;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
    this.roots -= 1;
    return true;
  }

  /** Every set as its root row plus its members. Rows are grouped in insertion order. */
  groups(): Map<T, T[]> {
    const out = new Map<T, T[]>();
    for (const node of this.parent.keys()) {
      const root = this.find(node);
      const bucket = out.get(root);
      if (bucket) bucket.push(node);
      else out.set(root, [node]);
    }
    return out;
  }
}
