import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { topologicalOrder, assertBootOrder } from "./lib/boot-order.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

// M1063: the reactor's boot order is a dependency decision, and for too long it was a hand-typed
// array that nobody checked against the edges it claims to respect. This proof measures the two
// pure facts in scripts/lib/boot-order.mjs from first principles, then refuses three kinds of drift
// between the verifier and the descriptor: a dependency edge that moved, a boot list that violates
// an edge, and a verifier that stopped consulting the algorithm at all.
//
// The verifier deliberately boots the gateway LAST even though the canonical topological order
// could place it earlier (M1042: the Eureka/LB cache window). So the gate is not "chosen order ==
// canonical order" — it is "chosen order is A valid topological order", plus "the canonical order
// is well-defined and cycle-free". Both come from the same edges.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { PLATFORM_SERVICES } = await server.ssrLoadModule("/domain/platform.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- 1. Kahn from first principles on a planted diamond -------------------------------------
//   config -> league, gateway -> league  (league needs both); two roots, one join.
const diamond = [
  { id: "config", dependsOn: [] },
  { id: "league", dependsOn: ["config", "gateway"] },
  { id: "gateway", dependsOn: [] },
];
const diamondOrder = topologicalOrder(diamond);
ok(`a planted diamond sorts to a valid order (${diamondOrder.order.join(",")})`,
  diamondOrder.order.join(",") === "config,gateway,league" &&
  diamondOrder.cyclic.length === 0 && diamondOrder.unknown.length === 0 && diamondOrder.duplicates.length === 0);

// A chain forces a unique order; the FIFO/descriptor-stability claim is checked on the diamond
// (two roots keep their declaration order) rather than on a chain where order is trivial.
const chain = [
  { id: "c", dependsOn: ["b"] },
  { id: "a", dependsOn: [] },
  { id: "b", dependsOn: ["a"] },
];
const chainOrder = topologicalOrder(chain);
ok(`a planted chain forces its unique order regardless of declaration order (${chainOrder.order.join(",")})`,
  chainOrder.order.join(",") === "a,b,c" && chainOrder.cyclic.length === 0);
const stable = topologicalOrder([
  { id: "first", dependsOn: [] },
  { id: "second", dependsOn: [] },
  { id: "third", dependsOn: [] },
]);
ok(`simultaneously-ready roots keep descriptor order (${stable.order.join(",")}) — the order is reproducible`,
  stable.order.join(",") === "first,second,third");

// --- 2. The three bad configurations are witnesses, not silent coercions --------------------
const cyc = topologicalOrder([
  { id: "a", dependsOn: ["c"] },
  { id: "b", dependsOn: ["a"] },
  { id: "c", dependsOn: ["b"] },
]);
ok(`a 3-cycle is named, not sorted away (cyclic ${cyc.cyclic.join(",")})`,
  cyc.order.length === 0 && cyc.cyclic.slice().sort().join(",") === "a,b,c" && cyc.duplicates.length === 0);
const downstream = topologicalOrder([
  { id: "root", dependsOn: [] },
  { id: "x", dependsOn: ["y"] },
  { id: "y", dependsOn: ["x"] },
  { id: "leaf", dependsOn: ["x"] },
]);
ok(`a node downstream of a cycle is reported alongside it (cyclic ${downstream.cyclic.join(",")})`,
  downstream.cyclic.includes("leaf") && downstream.cyclic.includes("x") && downstream.cyclic.includes("y") &&
  downstream.order.join(",") === "root");
const badEdge = topologicalOrder([
  { id: "a", dependsOn: [] },
  { id: "b", dependsOn: ["ghost"] },
]);
ok(`an edge to an absent node is reported as unknown, not dropped (unknown ${badEdge.unknown.join(",")})`,
  badEdge.unknown.join(",") === "ghost" && badEdge.order.join(",") === "a,b" && badEdge.cyclic.length === 0);
const dup = topologicalOrder([{ id: "a", dependsOn: [] }, { id: "a", dependsOn: [] }]);
ok(`a repeated id is refused as a configuration error (duplicates ${dup.duplicates.join(",")})`,
  dup.duplicates.join(",") === "a");

// --- 3. assertBootOrder accepts a valid chosen order and catches an inversion ----------------
const edges = [
  { id: "registry", dependsOn: [] },
  { id: "config", dependsOn: ["registry"] },
  { id: "gateway", dependsOn: ["registry"] },
  { id: "league", dependsOn: ["registry", "config"] },
];
const gatewayLast = ["registry", "config", "league", "gateway"];
const valid = assertBootOrder(gatewayLast, edges);
ok(`the gateway-last OPERATIONAL order passes although it differs from the canonical order (${topologicalOrder(edges).order.join(",")})`,
  valid.ok && valid.violations.length === 0 && topologicalOrder(edges).order.join(",") === "registry,config,gateway,league");
const inverted = assertBootOrder(["config", "registry", "league", "gateway"], edges);
ok(`an order that boots config before the registry is refused (${inverted.violations.join(" | ")})`,
  !inverted.ok && inverted.violations.some((v) => v.includes("config@") && v.includes("registry@")));
const missing = assertBootOrder(["registry", "config", "gateway"], edges);
ok(`an order that omits a declared node is refused (${missing.violations.join(" | ")})`,
  !missing.ok && missing.violations.some((v) => v.includes("league") && v.includes("never booted")));
const intruder = assertBootOrder(["registry", "config", "ghost", "league", "gateway"], edges);
ok(`an order that boots an undeclared node is refused (${intruder.violations.join(" | ")})`,
  !intruder.ok && intruder.violations.some((v) => v.includes("ghost") && v.includes("not declared")));
const repeated = assertBootOrder(["registry", "config", "config", "league", "gateway"], edges);
ok(`an order that boots the same node twice is refused (${repeated.violations.join(" | ")})`,
  !repeated.ok && repeated.violations.some((v) => v.includes("twice")));

// --- 4. The canonical order of the REAL descriptor is well-formed ---------------------------
const realEdges = PLATFORM_SERVICES.map((s) => ({ id: s.id, dependsOn: [...s.dependsOn] }));
const real = topologicalOrder(realEdges);
ok(`the descriptor's ${realEdges.length} dependency edges admit one clean canonical order (${real.order.join(",")})`,
  real.order.join(",") === "registry,config,gateway,league,discipline,cache,messaging" &&
  real.cyclic.length === 0 && real.unknown.length === 0 && real.duplicates.length === 0);
// The canonical order is itself a valid order under the same edges — the two functions agree.
ok(`topologicalOrder's output is accepted by assertBootOrder (the two readers share one edge model)`,
  assertBootOrder(real.order, realEdges).ok);

// --- 5. The verifier consults the algorithm and its chosen boot list respects the descriptor ---
const VERIFY = read("scripts/verify-services.mjs");
const TOPOLOGY_MATCH = /const TOPOLOGY = (\[[\s\S]*?\]);/.exec(VERIFY);
const BOOT_MATCH = /const BOOT_IDS = (\[[\s\S]*?\]);/.exec(VERIFY);
let parsedTopology = null, parsedBootIds = null;
try {
  if (TOPOLOGY_MATCH) parsedTopology = JSON.parse(TOPOLOGY_MATCH[1]);
  if (BOOT_MATCH) parsedBootIds = JSON.parse(BOOT_MATCH[1]);
} catch { /* a non-JSON literal is a failure of the shape, reported below */ }
ok(`the verifier declares its dependency edges and chosen boot list as parseable JSON literals`,
  Array.isArray(parsedTopology) && Array.isArray(parsedBootIds) &&
  parsedTopology.length === realEdges.length && parsedBootIds.length === 7 &&
  new Set(parsedBootIds).size === 7);
ok(`the verifier imports the shared boot-order module instead of carrying a private copy (2 shared calls, one DAG model)`,
  VERIFY.includes('from "./lib/boot-order.mjs"') &&
  VERIFY.includes("topologicalOrder(") && VERIFY.includes("assertBootOrder(") &&
  VERIFY.split("topologicalOrder(").length - 1 >= 1);
ok(`the verifier's edges match domain/platform.ts row for row (${(parsedTopology ?? []).map((e) => e.id).join(",")})`,
  parsedTopology !== null &&
  JSON.stringify(parsedTopology.map((e) => [e.id, [...(e.dependsOn ?? [])].sort()])) ===
  JSON.stringify(realEdges.map((e) => [e.id, [...e.dependsOn].sort()])));
// The chosen order is validated against the booted sub-DAG — now all seven nodes live in it: the
// broker-deprived pair boots against a dead :3999 (a spawn-time decision, not a config edit), and
// every booted node's declared dependencies must live inside the host-booted set.
const realBootEntries = realEdges.filter((e) => parsedBootIds !== null && parsedBootIds.includes(e.id));
const realExcluded = realEdges.filter((e) => parsedBootIds !== null && !parsedBootIds.includes(e.id));
const realDangling = parsedBootIds === null ? ["?"] : realBootEntries.flatMap((e) => e.dependsOn.filter((d) => realExcluded.some((x) => x.id === d)));
ok(`the verifier's host boot order respects every descriptor edge, keeping all ${realEdges.length} topology nodes acyclic with every booted dependency in-host (${(parsedBootIds ?? []).join(",")})`,
  parsedBootIds !== null && parsedBootIds.length === 7 && assertBootOrder(parsedBootIds, realBootEntries).ok && realDangling.length === 0 &&
  topologicalOrder(realEdges).cyclic.length === 0);
// The gateway-last operational policy must survive: it is a decision, and the proof pins it rather
// than letting a future cleanup "simplify" the array into the canonical order and lose LB patience.
ok(`the verifier keeps the gateway last on purpose (the LB cache decision from M1042 is not simplified away)`,
  parsedBootIds !== null && parsedBootIds[parsedBootIds.length - 1] === "gateway" &&
  parsedBootIds.indexOf("gateway") > parsedBootIds.indexOf("league"));

// --- 6. The fragile hard-coded stop index is gone --------------------------------------------
// A positional kill silently means "league" only while the array keeps its exact order. The
// verifier must name the node it stops, so inserting a service cannot redirect the circuit test.
// Read only executable lines (strip `//` comments) so the explanation of the old bug cannot itself
// trip the detector — a gate that reds on a comment about the defect is a gate that teaches people
// to delete explanations.
const executable = VERIFY.split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
const positionalKill = /children\s*\[\s*\d+\s*\]\s*\.\s*kill/.test(executable);
ok(`the circuit test stops the league service by name, not by a positional index`,
  !positionalKill && /children\.get\(["']league["']\)/.test(executable));
// The two out-of-reactor services now BOOT on this host but must be spawned against a dead port,
// never localhost:6379/5672 (a foreign stack publishes both here and refuses default credentials);
// the spawn-time override is what keeps the run honest — a claimed live broker is still a lie.
ok(`cache and messaging boot, but only against a dead spawn-time port (honest degraded boundary)`,
  parsedTopology !== null && ["cache", "messaging"].every((id) => parsedTopology.some((e) => e.id === id)) &&
  parsedBootIds !== null && ["cache", "messaging"].every((id) => parsedBootIds.includes(id)) &&
  VERIFY.includes("SPRING_DATA_REDIS_PORT") && VERIFY.includes("SPRING_RABBITMQ_PORT") &&
  /3999/.test(VERIFY) && /redis/i.test(VERIFY) && /rabbitmq/i.test(VERIFY));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
