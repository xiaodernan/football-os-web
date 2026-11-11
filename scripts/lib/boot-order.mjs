// M1063: the boot order is a decision, not a list to re-type.
//
// The Spring Cloud reactor is a dependency DAG: the registry answers no one, the config server
// and the gateway need the registry, and each domain service needs registry + config. A human
// wrote the order in scripts/verify-services.mjs once, put the gateway LAST on purpose (M1042:
// when the gateway boots before the domain services, Eureka's load-balancer cache can hand it a
// `No servers available for service` window), and has been silently trusting that order ever
// since. Insert a service, reorder the array, and the stack can boot in an order its own
// dependency edges forbid — the gate would only find out at runtime, if at all.
//
// This module holds the two pure facts the verifier and its proof both need:
//   · topologicalOrder(entries) — a CANONICAL order from the dependsOn edges (Kahn, FIFO, stable
//     in entries order), plus the cycle and bad-edge witnesses a broken configuration produces.
//   · assertBootOrder(order, entries) — verifies that a CHOSEN order (which may deliberately
//     differ from the canonical one, e.g. the gateway-last policy) still respects every edge.
//
// It has no I/O and imports nothing, so it runs the same under `node`, inside a `ssrLoadModule`
// proof, or on a CI runner. Both functions are pure and re-entrant: the arrays they return are
// built fresh on every call and nothing is mutated on the input.

/**
 * Kahn's algorithm over the `dependsOn` edges. `toBoot` is read as "entry.id may only be booted
 * after every id in its dependsOn has booted" — the same direction domain/platform.ts uses.
 *
 * The queue is FIFO and seeded in `entries` order, and a newly-unblocked node is appended, so
 * among nodes that are simultaneously ready the descriptor's original order wins. That makes the
 * canonical order byte-identical run to run; it is a witness, not the verifier's chosen order.
 *
 * @param {ReadonlyArray<{ id: string, dependsOn?: ReadonlyArray<string> }>} entries
 * @returns {{ order: string[], cyclic: string[], unknown: string[], duplicates: string[] }}
 */
export function topologicalOrder(entries) {
  const ids = entries.map((e) => e.id);
  const idSet = new Set(ids);

  // A repeated id is a configuration error, not two nodes: no well-defined order exists.
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];

  // Only edges to nodes inside the population constrain the order. An edge to an id outside it
  // cannot be satisfied by this boot list and is reported as `unknown` instead of being silently
  // dropped — that is how a future service added to one list but not the other gets caught.
  const indegree = new Map();
  const dependents = new Map();
  const unknown = new Set();
  for (const id of idSet) {
    indegree.set(id, 0);
    dependents.set(id, []);
  }
  for (const entry of entries) {
    for (const dep of entry.dependsOn ?? []) {
      if (!idSet.has(dep)) { unknown.add(dep); continue; }
      indegree.set(entry.id, indegree.get(entry.id) + 1);
      dependents.get(dep).push(entry.id);
    }
  }

  const queue = ids.filter((id) => indegree.get(id) === 0);
  const order = [];
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    order.push(id);
    for (const next of dependents.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }

  // Anything the queue could not reach is on, or downstream of, a cycle.
  const placed = new Set(order);
  const cyclic = ids.filter((id) => !placed.has(id));
  return { order, cyclic, unknown: [...unknown].sort(), duplicates };
}

/**
 * Verifies a CHOSEN order against the same edges. The verifier is allowed to differ from the
 * canonical order for operational reasons (gateway last for the LB cache); what it may never do
 * is boot a node before a dependency it declares.
 *
 * @param {ReadonlyArray<string>} order the actual chosen boot sequence
 * @param {ReadonlyArray<{ id: string, dependsOn?: ReadonlyArray<string> }>} entries
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function assertBootOrder(order, entries) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const position = new Map();
  const violations = [];

  order.forEach((id, i) => {
    if (!byId.has(id)) { violations.push(`${id}: booted but not declared`); return; }
    if (position.has(id)) { violations.push(`${id}: booted twice`); return; }
    position.set(id, i);
  });
  for (const entry of entries) {
    if (!position.has(entry.id)) { violations.push(`${entry.id}: declared but never booted`); continue; }
    const at = position.get(entry.id);
    for (const dep of entry.dependsOn ?? []) {
      if (!byId.has(dep)) { violations.push(`${entry.id}: depends on unknown ${dep}`); continue; }
      const depAt = position.get(dep);
      if (depAt === undefined) violations.push(`${entry.id}: depends on ${dep}, which never boots`);
      else if (depAt >= at) violations.push(`${entry.id}@${at}: depends on ${dep}@${depAt} (must be earlier)`);
    }
  }
  return { ok: violations.length === 0, violations };
}
