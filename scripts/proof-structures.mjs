import { createServer } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// M1057: the algorithmic floor — the heap and the union-find, measured rather than trusted.
//
// The interesting assertion is the comparison counter. A wall-clock timing on a shared machine is
// noise; the number of times a comparator was called is a property of the algorithm, and it is
// the number the O(n log k) claim is actually about. So the proof counts comparisons for a
// selection over 10,000 rows and for a full sort of the same rows, and requires the heap to come
// in well under the sort. A regression that quietly turned topK back into `sort().slice()` would
// still pass every correctness check and fail this one.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { MinHeap, UnionFind, topK } = await server.ssrLoadModule("/lib/structures.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- 1. The heap is a heap: the smallest in, the smallest out, whatever the insertion order. ---
const heap = new MinHeap((a, b) => a - b);
for (const v of [5, 3, 8, 1, 9, 2]) heap.push(v);
const drained = [];
while (heap.size > 0) drained.push(heap.pop());
ok(`the hand heap drains in order (${drained.join(",")})`,
  drained.join(",") === "1,2,3,5,8,9" && heap.size === 0 && heap.pop() === undefined && heap.peek() === undefined);
const one = new MinHeap((a, b) => a - b);
one.push(7);
ok(`a one-row heap peeks and pops the same row, then empties`,
  one.peek() === 7 && one.pop() === 7 && one.size === 0 && one.peek() === undefined);

// A max-heap is the same structure under a negated comparator — the shape topK relies on.
// The pops are captured into a string first, then asserted: draining the heap inside the
// message template before the IIFE runs would leave the IIFE reading an empty heap.
const max = new MinHeap((a, b) => b - a);
for (const v of [4, 10, 1]) max.push(v);
const maxOut = (() => { const out = []; while (max.size) out.push(max.pop()); return out.join(","); })();
ok(`a negated comparator turns the min-heap into a max-heap (${maxOut})`, maxOut === "10,4,1");

// --- 2. topK is selection, not sorting: same rows, same order, fewer comparisons. ---
// A deterministic pseudo-random population. It must be reproducible: the proof prints the counts,
// and a suite whose numbers move run to run is not a measurement.
let seed = 20261111;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const population = Array.from({ length: 10000 }, (_, i) => ({ i, v: Math.floor(rand() * 100000) }));
const cmp = (a, b) => b.v - a.v || a.i - b.i;

let heapCalls = 0;
const heapPick = topK(population, 8, (a, b) => { heapCalls++; return cmp(a, b); });
let sortCalls = 0;
const sortPick = [...population].sort((a, b) => { sortCalls++; return cmp(a, b); }).slice(0, 8);
ok(`topK returns exactly the sort's first eight, in the same order (${heapPick.map((r) => r.v).join(",")})`,
  heapPick.length === 8 && heapPick.every((r, k) => r.i === sortPick[k].i && r.v === sortPick[k].v));
ok(`topK compares far less than a full sort (${heapCalls} vs ${sortCalls}, ratio ${(heapCalls / sortCalls).toFixed(3)})`,
  heapCalls > 0 && sortCalls > 0 && heapCalls < sortCalls * 0.7);

// --- 3. The degenerate sizes: k above the population, k zero, an empty population. ---
ok(`k larger than the population returns everything, ordered`,
  topK(population.slice(0, 5), 20, cmp).map((r) => r.v).join(",") === [...population.slice(0, 5)].sort(cmp).map((r) => r.v).join(","));
ok(`k=0 and an empty population both read empty, and neither calls the comparator`,
  (() => { let calls = 0; const c = (a, b) => { calls++; return cmp(a, b); }; return topK(population, 0, c).length === 0 && topK([], 4, c).length === 0 && calls === 0 && population.length >= 10000; })());
ok(`duplicate rows are not collapsed (three identical values all survive k=3)`,
  topK([{ i: 0, v: 1 }, { i: 1, v: 1 }, { i: 2, v: 1 }], 3, cmp).length === 3);

// --- 4. Union-find: the components, the idempotence, and the merge count. ---
const sets = new UnionFind();
ok(`a fresh union-find has no sets`, sets.size === 0 && sets.components === 0 && sets.groups().size === 0);
ok(`add is idempotent`, (() => { sets.add("a"); sets.add("a"); return sets.size === 1 && sets.components === 1; })());
for (const id of ["b", "c", "d", "e"]) sets.add(id);
ok(`union reports whether it merged (a-b true, b-a false)`, sets.union("a", "b") === true && sets.union("b", "a") === false);
sets.union("c", "d");
// a-b, c-d, and e alone: three components, not two — the singleton is counted.
ok(`two pairs and a lone club leave three components (${sets.components})`, sets.components === 3);
sets.union("b", "c");
// Bridging the two pairs joins them but e is still its own component: two components, five rows.
ok(`bridging the two pairs leaves two components (the lone club still stands)`,
  sets.components === 2 && sets.size === 5 && sets.groups().size === 2 && sets.groups().get(sets.find("a")).length === 4);
ok(`find is stable and agrees with itself across the bridged group`,
  sets.find("a") === sets.find("c") && sets.find("c") === sets.find("b"));

// A long chain is the shape path halving exists for: without compression the last find walks it.
const chain = new UnionFind();
for (let i = 0; i < 5000; i += 1) chain.union(String(i), String(i + 1));
ok(`a 5,000-link chain collapses to one component and finds its end`,
  chain.components === 1 && chain.find("0") === chain.find("5000") && chain.groups().size === 1);
ok(`an unknown row finds itself and does not enter the structure`,
  chain.find("nobody") === "nobody" && chain.size === 5001);

// --- 5. Two runs of the same input are the same run. ---
ok(`the fold is pure: the same population selects the same rows twice`,
  JSON.stringify(topK(population, 5, cmp)) === JSON.stringify(topK(population, 5, cmp)));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
