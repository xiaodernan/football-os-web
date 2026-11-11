// M1067: the complexity slope gate — the algorithms are not just correct, they scale as claimed.
//
// Every other proof measures CORRECTNESS (an independent fold recomputes the same number). This one
// measures COST GROWTH, and deliberately counts comparisons / map touches / heap pushes rather than
// wall-clock milliseconds: time on a shared machine is noise, but the number of times a comparator
// is called is a property of the algorithm and is byte-identical on every machine, every run. That
// is what makes this the hardware-adaptation proof — it says the step count, not this laptop's
// clock, stays inside the O() budget as the input doubles.
//
// The assertions are SLOPES across n / 2n / 4n, not single magnitudes: a foil that is O(n²) pulls
// away from its O(n) twin by exactly 2× per doubling, and a topK that quietly regressed to
// sort().slice() would show a FLAT ratio instead of a rising one. Each gate would fail on that
// regression even though every correctness proof stayed green.

import { createServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { lruPolicy, lruFoil, lfuPolicy, lfuFoil } = await server.ssrLoadModule("/domain/cache.ts");
const { MinHeap, topK } = await server.ssrLoadModule("/lib/structures.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const seqKeys = (n) => Array.from({ length: n }, (_, i) => `k${i}`);
// Wrap a comparator in a counting proxy so the proof measures the kernel's real comparison calls
// without the kernel having to expose an instrumented API (MinHeap/topK take a plain comparator).
const counted = (compare) => {
  let calls = 0;
  return { f: (a, b) => { calls++; return compare(a, b); }, get calls() { return calls; } };
};
const ratioStep = (xs) => xs.slice(1).map((x, i) => x / xs[i]);
const strictlyRising = (xs) => xs.every((x, i) => i === 0 || x > xs[i - 1]);
const eachNear = (steps, lo, hi) => steps.every((s) => s >= lo && s <= hi);

// ---- 1 · topK selection O(n log k) vs a full sort O(n log n), k pinned to 8 ------------------
// k is fixed, so topK's work grows ~linearly in n while a sort grows n·log n; the ratio must climb.
// n=2000/4000/8000/16000 measured on the real kernel: 8.38 / 9.61 / 11.14 / 12.33.
const selectSizes = [2000, 4000, 8000, 16000];
const K = 8;
const select = selectSizes.map((n) => {
  const items = Array.from({ length: n }, (_, i) => ({ id: i, key: (Math.imul(i, 2654435761) >>> 0) % n }));
  const byKey = (a, b) => a.key - b.key;
  const heapCmp = counted(byKey), sortCmp = counted(byKey);
  const best = topK(items, K, heapCmp.f);
  const sorted = [...items].sort(sortCmp.f);
  // Correctness tie-in: the selected k really are the sorted k smallest KEYS, so this cost gate is
  // measuring the right algorithm and not a faster-but-wrong shortcut. Compare the sorted key
  // multiset, not row ids: equal keys have no stable winner, and topK's MAX-heap may keep a
  // different one of a tie than Array.sort — but the k keys it keeps must be identical.
  const correct = best.length === K &&
    best.map((r) => r.key).sort((a, b) => a - b).join() === sorted.slice(0, K).map((r) => r.key).join();
  return { n, heap: heapCmp.calls, sort: sortCmp.calls, ratio: sortCmp.calls / heapCmp.calls, correct };
});
ok(`topK returns the exact ${K} smallest keys at every scale n=${selectSizes.join(",")} (selection stays correct while its cost is measured)`,
  select.every((r) => r.correct));
ok(`topK's comparisons grow ~linearly in n while a full sort grows n·log n — the sort/heap ratio rises across all ${select.length} doublings (${select.map((r) => r.ratio.toFixed(2)).join(" < ")})`,
  strictlyRising(select.map((r) => r.ratio)) && select.at(-1).ratio > 10 && select[0].ratio > 5);
ok(`the selection beats the sort by a widening margin at the largest scale (n=${select.at(-1).n}: ${select.at(-1).sort} sort comparisons vs ${select.at(-1).heap} heap comparisons, ${select.at(-1).ratio.toFixed(1)}×)`,
  select.at(-1).sort > select.at(-1).heap * 10);

// ---- 2 · LRU: a Map O(1) recency ladder vs the indexOf+splice O(n) foil ----------------------
// capacity grows with n and every access is a distinct cold key, so the foil's linear scan on an
// ever-larger resident array is quadratic while the Map stays linear. Measured ratios double:
// 99.8 / 199.8 / 399.8 / 799.8.
const lruSizes = [400, 800, 1600, 3200];
const lru = lruSizes.map((n) => {
  const keys = seqKeys(n), cap = Math.floor(n / 2);
  const map = lruPolicy(keys, cap), foil = lruFoil(keys, cap);
  return { n, cap, touches: map.touches, scans: foil.scans, ratio: foil.scans / map.touches,
           sameDecisions: map.hits === foil.hits && map.misses === foil.misses && map.evictions === foil.evictions };
});
ok(`the O(n) LRU foil makes the same hit/miss/evict decisions as the Map at all ${lru.length} capacities (cost, not correctness, differs)`,
  lru.every((r) => r.sameDecisions));
ok(`LRU's Map touches stay linear while the array foil's scans are quadratic — the foil/Map ratio doubles at each of the ${lru.length - 1} doublings (${lru.map((r) => r.ratio.toFixed(0)).join(" → ")})`,
  eachNear(ratioStep(lru.map((r) => r.ratio)), 1.8, 2.2) && lru.at(-1).ratio > 700);
ok(`at n=${lru.at(-1).n} the Map needs just ${lru.at(-1).touches} touches where the foil scans ${lru.at(-1).scans} slots (a ${lru.at(-1).ratio.toFixed(0)}× step-count gap on identical decisions)`,
  lru.at(-1).scans > lru.at(-1).touches * 700 && lru.at(-1).touches > 0);

// ---- 3 · LFU: a MinHeap O(log n) eviction vs the full re-sort O(n·log n) foil ----------------
// capacity grows with n; the foil re-sorts the whole resident set on every eviction (quadratic),
// while the heap only pushes O(1) rows per access. Measured ratios double: 75 / 150 / 300 / 600.
const lfuSizes = [400, 800, 1600, 3200];
const lfu = lfuSizes.map((n) => {
  const keys = seqKeys(n), cap = Math.floor(n / 4);
  const heap = lfuPolicy(keys, cap), foil = lfuFoil(keys, cap);
  return { n, cap, pushes: heap.pushes, comparisons: foil.comparisons, ratio: foil.comparisons / heap.pushes,
           sameDecisions: heap.hits === foil.hits && heap.misses === foil.misses && heap.evictions === foil.evictions };
});
ok(`the re-sort LFU foil makes the same hit/miss/evict decisions as the heap at all ${lfu.length} capacities (cost, not correctness, differs)`,
  lfu.every((r) => r.sameDecisions));
ok(`LFU's heap pushes stay linear while the foil's full re-sorts are quadratic — the foil/heap ratio doubles at each of the ${lfu.length - 1} doublings (${lfu.map((r) => r.ratio.toFixed(0)).join(" → ")})`,
  eachNear(ratioStep(lfu.map((r) => r.ratio)), 1.8, 2.2) && lfu.at(-1).ratio > 500);
ok(`at n=${lfu.at(-1).n} the heap makes ${lfu.at(-1).pushes} pushes where the foil compares ${lfu.at(-1).comparisons} rows (a ${lfu.at(-1).ratio.toFixed(0)}× step-count gap on identical decisions)`,
  lfu.at(-1).comparisons > lfu.at(-1).pushes * 500 && lfu.at(-1).pushes > 0);

// ---- 4 · MinHeap push: the sift-up comparison count grows like n·log n ----------------------
// Strictly decreasing inserts force every push to sift to the root (worst inbound path), so the
// total comparator calls are a clean n·log n signal. cmp/n must RISE with n by ~log2(n) each step
// — a heap that degraded to an unsorted array would show a flat cmp/n of 0 or 1.
const heapSizes = [1000, 2000, 4000, 8000];
const heapCost = heapSizes.map((n) => {
  const cmp = counted((a, b) => a - b);
  const h = new MinHeap(cmp.f);
  for (let i = 0; i < n; i++) h.push(n - i);
  let popped = 0;
  while (h.size) { h.pop(); popped++; }
  return { n, cmp: cmp.calls, perN: cmp.calls / n, popped };
});
ok(`the heap pops back every one of its ${heapSizes.join("/")} pushed rows (structure stays sound under the worst inbound order)`,
  heapCost.every((r) => r.popped === r.n));
ok(`push sift comparisons grow super-linearly — cmp/n rises across all ${heapCost.length} doublings as log2(n) grows (${heapCost.map((r) => r.perN.toFixed(1)).join(" < ")})`,
  strictlyRising(heapCost.map((r) => r.perN)) && heapCost.at(-1).perN > heapCost[0].perN + 6);
ok(`the per-element comparison budget stays logarithmic, not linear in n (n ${heapCost[0].n}→${heapCost.at(-1).n} is ${heapCost.at(-1).n / heapCost[0].n}× the rows but only ${(heapCost.at(-1).perN / heapCost[0].perN).toFixed(2)}× the cmp/n)`,
  heapCost.at(-1).perN / heapCost[0].perN < 1.6 && heapCost[0].perN > 10);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
