// M1079: the conditional GET, witnessed LIVE on the wire.
//
// WHAT M1079 CHANGED. Five endpoints of the reactor serve a frozen world snapshot (league-summary,
// league-tables, discipline-clocks). They used to re-send the whole document on every poll, byte for
// byte identical to what the reader already held. Now each answers with a strong `ETag` that is
// `sha256-` over the exact bytes the process loaded, and an `If-None-Match` naming that validator is
// answered with `304` and no body. proof-http-validators.mjs pins the shape of that discipline in
// the source; THIS script is the part a source-reading gate cannot prove:
//
//   · the digest the JVM computes equals the one Node computes over the same file — two languages,
//     two hash libraries, one value. The witness NEVER feeds the wire value back to the wire: the
//     expected tag is re-derived here with node:crypto from the committed resource bytes, so
//     agreement is agreement between implementations, not an echo;
//   · a matching tag really answers 304, and that 304 really carries zero body bytes — the saving is
//     measured from the full body's own length, not declared;
//   · a NON-matching tag still answers 200 with the whole body, so the defence cannot swallow fresh
//     data (the dangerous direction of the same feature);
//   · a 404 is settled before the validator, so a resource that never served a 200 cannot be told
//     its copy is fresh;
//   · the gateway forwards validators end-to-end: the tag through /api/… is the SAME string as the
//     tag direct from the service, and the 304 round trip works from the edge too;
//   · `Last-Modified` is absent, and the tag does not drift between two identical reads.
//
// Boot note: five jars (registry, config, gateway, league, discipline) — the same subset rule as
// verify-services.mjs: nothing booted may depend on a service this run leaves out, so the two broker
// tiers stay home and no Redis or RabbitMQ port is touched at all.
//
// Ports are PLANNED, not presumed. The canonical plan is the one domain/platform.ts pins —
// 8761/8888/8081/8082/8087 — and this run tries it first. On a host where a foreign stack already
// answers on any of them (this machine has a Career OS service on 8761 and 8081) the WHOLE plan moves
// together by +100, and every child is spawned with a server.port plus the registry and config URLs
// it needs, so the shifted run registers into the Eureka it booted itself instead of a stranger's.
// Moving one port alone would be worse than refusing: the shifted service would still announce itself
// to the foreign registry and the gateway would route to whichever instance answered first. A plan is
// taken only when every socket in it is free; if no plan is free the run refuses, because this
// witness will not attest to somebody else's headers.
//
// Run from the repo root after building the reactor:
//   mvn -DskipTests package -f services/pom.xml
//   node scripts/verify-conditional-get-live.mjs
//
// Like verify-services.mjs, this is NOT part of `npm run proof` — it starts real processes. It IS a
// leg of .github/workflows/spring-cloud-live.yml.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertBootOrder, topologicalOrder } from "./lib/boot-order.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "sha256-";

// The same DAG the descriptor and proof-services.mjs reconcile, filtered to the subset this run
// boots. Deriving the order instead of typing it: a hand-written array trusts its own comments.
const TOPOLOGY = [
  { id: "registry", dependsOn: [] },
  { id: "config", dependsOn: ["registry"] },
  { id: "gateway", dependsOn: ["registry"] },
  { id: "league", dependsOn: ["registry", "config"] },
  { id: "discipline", dependsOn: ["registry", "config"] },
  { id: "cache", dependsOn: ["registry", "config"] },
  { id: "messaging", dependsOn: ["registry", "config"] },
];
const BOOT_IDS = ["registry", "config", "league", "discipline", "gateway"];
// `port` is the canonical port the descriptor pins; the run may move the whole plan, never one port.
const DETAILS = {
  registry: { jar: "eureka-server/target/eureka-server-0.1.0.jar", port: 8761 },
  config: { jar: "config-server/target/config-server-0.1.0.jar", port: 8888 },
  league: { jar: "league-service/target/league-service-0.1.0.jar", port: 8081 },
  discipline: { jar: "discipline-service/target/discipline-service-0.1.0.jar", port: 8082 },
  gateway: { jar: "gateway/target/gateway-0.1.0.jar", port: 8087 },
};
const SHIFTS = [0, 100, 200];

const canonical = topologicalOrder(TOPOLOGY);
if (canonical.cyclic.length || canonical.unknown.length || canonical.duplicates.length) {
  console.error(`TOPOLOGY is not a well-formed DAG — cyclic=[${canonical.cyclic}] unknown=[${canonical.unknown}] duplicates=[${canonical.duplicates}]`);
  process.exit(2);
}
const chosen = assertBootOrder(BOOT_IDS, TOPOLOGY.filter((e) => BOOT_IDS.includes(e.id)));
if (!chosen.ok) { console.error(`BOOT_IDS is not a valid topological order:\n  ${chosen.violations.join("\n  ")}`); process.exit(2); }
const excluded = new Set(TOPOLOGY.filter((e) => !BOOT_IDS.includes(e.id)).map((e) => e.id));
const dangling = TOPOLOGY.filter((e) => BOOT_IDS.includes(e.id))
  .flatMap((e) => (e.dependsOn ?? []).filter((d) => excluded.has(d)).map((d) => `${e.id} needs ${d}`));
if (dangling.length) { console.error(`this run boots a service that depends on one it excludes: ${dangling.join(", ")}`); process.exit(2); }
for (const id of BOOT_IDS) {
  const p = join(root, "services", DETAILS[id].jar);
  if (!existsSync(p)) {
    console.error(`missing ${DETAILS[id].jar} — build first: mvn -DskipTests package -f services/pom.xml`);
    process.exit(2);
  }
}

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };
const dumpLogsOnFailure = () => {
  for (const [, { label, tail }] of logTails) {
    console.error(`\n==== ${label} (last ${tail.length} lines) ====`);
    for (const line of tail) console.error(line);
  }
};
const children = new Map();
const logTails = new Map();
const wireLogs = (child, label) => {
  const tail = [];
  const note = (chunk) => {
    for (const line of String(chunk).split(/\r?\n/)) {
      if (!line.trim()) continue;
      tail.push(line);
      if (tail.length > 60) tail.shift();
    }
  };
  child.stdout.on("data", note);
  child.stderr.on("data", note);
  logTails.set(child, { label, tail });
};
const cleanup = () => { for (const c of children.values()) { try { c.kill("SIGTERM"); } catch { /* gone */ } } };
process.on("SIGINT", () => { dumpLogsOnFailure(); cleanup(); process.exit(130); });
process.on("exit", cleanup);
const failOut = (msg) => { console.error(`FAIL ${msg}`); dumpLogsOnFailure(); cleanup(); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The validator this run expects, computed HERE over the committed resource bytes.
const expectedTag = (rel) => PREFIX + createHash("sha256").update(readFileSync(join(root, rel))).digest("hex");
const unquote = (v) => (v ?? "").replace(/^W?"/, "").replace(/"$/, "");

// A JSON object's member order is not its content, and neither is the order of a key set: the two
// list endpoints project a document's keys into an array, and the JVM may emit them in another order
// than Object.keys read them. `setFields` names the arrays THIS run compares as sets — every other
// array stays a sequence, so a standings table still has to match position for position.
const canon = (v, setFields) => {
  if (Array.isArray(v)) return v.map((x) => canon(x, setFields));
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => {
      const cell = canon(v[k], setFields);
      return [k, setFields.includes(k) && Array.isArray(cell) ? [...cell].sort((a, b) => String(a).localeCompare(String(b))) : cell];
    }));
  }
  return v;
};
const sameFacts = (a, b, setFields = []) => JSON.stringify(canon(a, setFields)) === JSON.stringify(canon(b, setFields));

const get = async (url, headers = {}) => {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  return { status: r.status, etag: unquote(r.headers.get("etag")), raw: r.headers.get("etag"),
    lastModified: r.headers.get("last-modified"), text, bytes: Buffer.byteLength(text) };
};

// -- which ports this run owns ------------------------------------------------------------------
// Any HTTP answer means the socket belongs to somebody else, whatever the status: a 404 from a
// foreign process is still a foreign process. A refused connection means the port is ours to take.
const held = async (port) => {
  try {
    const r = await fetch(`http://localhost:${port}/actuator/health`, { signal: AbortSignal.timeout(1500) });
    return r.status;
  } catch {
    return 0;
  }
};
const portsFor = (shift) => Object.fromEntries(BOOT_IDS.map((id) => [id, DETAILS[id].port + shift]));

let plan = null;
const dirty = [];
for (const shift of SHIFTS) {
  const ports = portsFor(shift);
  const answers = await Promise.all(BOOT_IDS.map((id) => held(ports[id])));
  const offenders = BOOT_IDS.map((id, i) => (answers[i] ? `${ports[id]} (${id}) answers ${answers[i]}` : null)).filter(Boolean);
  if (offenders.length === 0) { plan = { shift, ports }; break; }
  dirty.push(`plan +${shift}: ${offenders.join(", ")}`);
}
if (!plan) failOut(`no port plan is free on this host — ${dirty.join(" | ")}; this witness will not attest to a foreign stack's headers`);
const P = plan.ports;
ok(`port plan +${plan.shift}: this run owns every socket it judges (${BOOT_IDS.map((id) => `${id}=${P[id]}`).join(" ")})`,
  BOOT_IDS.every((id) => P[id] > 1024 && P[id] === DETAILS[id].port + plan.shift));
ok(`the plan moves as one: ${BOOT_IDS.length} canonical ports ${BOOT_IDS.map((id) => DETAILS[id].port).join(",")} all shifted by the same ${plan.shift}`,
  new Set(BOOT_IDS.map((id) => P[id] - DETAILS[id].port)).size === 1);

// The override each child needs is read out of that child's own application.yml, not typed here: a
// service that declares no registry dial gets no registry flag, and one that stops importing the
// config server stops being told to.
const YML = Object.fromEntries(BOOT_IDS.map((id) =>
  [id, readFileSync(join(root, "services", DETAILS[id].jar.split("/")[0], "src/main/resources/application.yml"), "utf8")]));
const argsFor = (id) => [
  "-jar", join(root, "services", DETAILS[id].jar),
  `--server.port=${P[id]}`,
  ...(YML[id].includes("defaultZone") ? [`--eureka.client.serviceUrl.defaultZone=http://localhost:${P.registry}/eureka/`] : []),
  ...(YML[id].includes("optional:configserver:") ? [`--spring.config.import=optional:configserver:http://localhost:${P.config}`] : []),
];
ok(`every child but the registry dials a registry, so ${BOOT_IDS.filter((id) => YML[id].includes("defaultZone")).length} of ${BOOT_IDS.length} get the shifted registry URL`,
  YML.registry.includes("defaultZone") === false && BOOT_IDS.filter((id) => YML[id].includes("defaultZone")).length === BOOT_IDS.length - 1);
ok(`the config clients come from their own spring.config.import lines (${BOOT_IDS.filter((id) => YML[id].includes("optional:configserver:")).join(", ")}), so the shifted config server is the one they load from`,
  BOOT_IDS.filter((id) => YML[id].includes("optional:configserver:")).every((id) => ["league", "discipline"].includes(id)));

// -- boot ---------------------------------------------------------------------------------------
for (const id of BOOT_IDS) {
  const child = spawn("java", argsFor(id), { stdio: ["ignore", "pipe", "pipe"] });
  wireLogs(child, `${id}:${P[id]}`);
  children.set(id, child);
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    if (child.exitCode !== null) break;
    try {
      const r = await fetch(`http://localhost:${P[id]}/actuator/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { const j = await r.json(); up = j.status === "UP"; }
    } catch { /* not yet */ }
    if (!up) await sleep(2000);
  }
  if (!up) failOut(`${id} (${P[id]}) did not come UP within the window — child exit ${child.exitCode}`);
  console.log(`ok   ${id} is UP on ${P[id]}`);
}

// -- the contract, endpoint by endpoint ----------------------------------------------------------
// `body` says which slice of the document the endpoint owes the reader, so the equality check below
// compares the response to the file rather than to itself.
const L = "services/league-service/src/main/resources";
const D = "services/discipline-service/src/main/resources";
const CASES = [
  { name: "league summary", service: "league", direct: "/league/summary", viaGateway: "/api/league/summary",
    resource: `${L}/league-summary.json`, body: (doc) => doc },
  { name: "league tables (list)", service: "league", direct: "/league/table", viaGateway: "/api/league/table",
    resource: `${L}/league-tables.json`, setFields: ["competitions"],
    body: (doc) => ({ generatedBy: doc.generatedBy, dataset: doc.dataset, leagues: doc.leagues, competitions: Object.keys(doc.tables) }) },
  { name: "league table (ucl)", service: "league", direct: "/league/table/ucl", viaGateway: "/api/league/table/ucl",
    resource: `${L}/league-tables.json`, body: (doc) => doc.tables.ucl },
  { name: "discipline clocks (list)", service: "discipline", direct: "/discipline/clock", viaGateway: "/api/discipline/clock",
    resource: `${D}/discipline-clocks.json`, setFields: ["competitions"],
    body: (doc) => ({ generatedBy: doc.generatedBy, dataset: doc.dataset, competitions: Object.keys(doc.clocks) }) },
  { name: "discipline clock (ucl)", service: "discipline", direct: "/discipline/clock/ucl", viaGateway: "/api/discipline/clock/ucl",
    resource: `${D}/discipline-clocks.json`, body: (doc) => doc.clocks.ucl },
];
const wrongTag = PREFIX + "0".repeat(64);
let savedBytes = 0, bodyBytes = 0;

// The gateway's load balancer caches the registry; a freshly registered backend may need one cache
// window before lb:// can see it. Poll the edge rather than presuming it.
const edge = async (path) => {
  let last;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://localhost:${P.gateway}${path}`, { signal: AbortSignal.timeout(10000) });
      last = r.status;
      if (r.status === 200) return r;
    } catch (e) { last = String(e); }
    await sleep(4000);
  }
  failOut(`the gateway never served ${path} (last ${last})`);
};

// The edge needs the registry cache window before it can resolve lb:// — poll, do not presume.
for (const c of CASES) await edge(c.viaGateway);
console.log(`ok   the gateway on ${P.gateway} resolved lb:// to the instances this run booted (${P.league}, ${P.discipline}): all ${CASES.length} guarded paths served, no canned 503 fallback`);

for (const c of CASES) {
  const url = `http://localhost:${P[c.service]}${c.direct}`;
  const want = expectedTag(c.resource);
  const fresh = await get(url);
  ok(`${c.name}: 200 carries a strong validator equal to the ${PREFIX} digest Node computes over the resource bytes — two implementations, one value`,
    fresh.status === 200 && fresh.etag === want && fresh.raw?.startsWith('"') === true && !fresh.raw.startsWith('W/"'));
  ok(`${c.name}: no Last-Modified anywhere on that response (a jar timestamp moves while the document does not)`,
    fresh.lastModified === null);
  ok(`${c.name}: the body the validator names is the document's own slice, not a re-derivation${(c.setFields ?? []).length ? ` (${c.setFields.join(", ")} compared as sets)` : ""}`,
    sameFacts(JSON.parse(fresh.text), c.body(JSON.parse(readFileSync(join(root, c.resource), "utf8"))), c.setFields ?? []));
  const again = await get(url);
  ok(`${c.name}: two identical reads give the same validator and the same length — it never drifts on its own`,
    again.etag === fresh.etag && again.bytes === fresh.bytes);
  const hit = await get(url, { "If-None-Match": fresh.raw });
  ok(`${c.name}: If-None-Match naming that validator answers 304, and the 304 body is EMPTY (${hit.bytes} bytes)`,
    hit.status === 304 && hit.bytes === 0 && hit.text.length === 0 && hit.etag === fresh.etag);
  const miss = await get(url, { "If-None-Match": `"${wrongTag}"` });
  ok(`${c.name}: a NON-matching validator still answers 200 with the whole body (${miss.bytes} bytes) — freshness never swallows data`,
    miss.status === 200 && miss.bytes === fresh.bytes && miss.etag === fresh.etag);
  // The wildcard is the one If-None-Match this server does not honour: the Spring validator check
  // compares the named tag, and "*" names none. RFC 9110 would let it answer 304 for a
  // representation that has a validator; this one re-sends the document instead. Measured, not
  // argued — and it is the safe direction, because the response is still the truth rather than a
  // promise about it.
  const star = await get(url, { "If-None-Match": "*" });
  ok(`${c.name}: If-None-Match: * answers 200 with the WHOLE body (${star.bytes} of ${fresh.bytes} bytes) — the wildcard is not treated as a match, so no reader is ever told freshness it cannot name`,
    star.status === 200 && star.bytes === fresh.bytes && star.etag === fresh.etag);
  bodyBytes += fresh.bytes;
  savedBytes += hit.status === 304 ? fresh.bytes : 0;
}

// The 404 must be settled before the validator: a competition this document does not carry has
// never served a 200, so nothing a client holds can be "still fresh" about it.
{
  const r1 = await get(`http://localhost:${P.league}/league/table/not-a-real-competition`,
    { "If-None-Match": `"${expectedTag(`${L}/league-tables.json`)}"` });
  const r2 = await get(`http://localhost:${P.discipline}/discipline/clock/not-a-real-competition`,
    { "If-None-Match": `"${expectedTag(`${D}/discipline-clocks.json`)}"` });
  ok(`an unknown competition answers 404 even when the validator matches — the 404 is settled first (${r1.status}/${r2.status})`,
    r1.status === 404 && r2.status === 404);
}

// Through the edge: the gateway must forward validators end-to-end and must not re-write them.
for (const c of CASES) {
  const url = `http://localhost:${P.gateway}${c.viaGateway}`;
  const want = expectedTag(c.resource);
  const fresh = await get(url);
  ok(`${c.name} via the gateway: the same validator arrives through the edge as direct from the service`,
    fresh.status === 200 && fresh.etag === want);
  const hit = await get(url, { "If-None-Match": fresh.raw });
  ok(`${c.name} via the gateway: the 304 round trip survives StripPrefix and the circuit breaker (${hit.status}, ${hit.bytes} bytes)`,
    hit.status === 304 && hit.bytes === 0);
  bodyBytes += fresh.bytes;
  savedBytes += hit.status === 304 ? fresh.bytes : 0;
}

ok(`the run measured its own saving: ${savedBytes} of ${bodyBytes} body bytes are NOT re-sent on a conditional re-read (${(100 * savedBytes / bodyBytes).toFixed(1)}%)`,
  savedBytes > 0 && savedBytes <= bodyBytes);
ok(`the two documents behind the same service carry DIFFERENT validators, so a reader cannot confuse a table for a summary`,
  expectedTag(`${L}/league-summary.json`) !== expectedTag(`${L}/league-tables.json`));

console.log(`\nverify-conditional-get-live: ${pass} passed, ${fail} failed (port plan +${plan.shift})`);
process.exit(fail ? 1 : 0);
