// M1042: the Spring Cloud stack is not decoration. This script replays the live verification
// the platform milestone proved by hand — boot the four services in dependency order, ask the
// config server what the league service is made of, read the frozen contract through the
// gateway, then stop the league service and watch the circuit answer itself with a canned 503.
//
// Run from the repo root after building the reactor:
//   mvn -DskipTests package -f services/pom.xml
//   node scripts/verify-services.mjs
//
// It is not part of `npm run proof`: it starts real processes, takes a minute, and the gate
// should not carry that weight. It IS the gate's witness — the committed evidence the runbook
// (dev/platform-runbook.md) describes, runnable by anyone who wants to watch.
//
// On Windows the port 8080 belongs to Docker Desktop on this machine, which is why the gateway
// lives on 8087. Free the four ports before running — a stale java.exe is the usual suspect:
//   taskkill /IM java.exe /F
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SERVICES = [
  { id: "registry", module: "eureka-server", jar: "eureka-server/target/eureka-server-0.1.0.jar", port: 8761, health: "http://localhost:8761/actuator/health" },
  { id: "config", module: "config-server", jar: "config-server/target/config-server-0.1.0.jar", port: 8888, health: "http://localhost:8888/actuator/health" },
  { id: "league", module: "league-service", jar: "league-service/target/league-service-0.1.0.jar", port: 8081, health: "http://localhost:8081/actuator/health" },
  { id: "gateway", module: "gateway", jar: "gateway/target/gateway-0.1.0.jar", port: 8087, health: "http://localhost:8087/actuator/health" },
];

const jarPath = (s) => join(root, "services", s.jar);
for (const s of SERVICES) {
  if (!existsSync(jarPath(s))) {
    console.error(`missing ${s.jar} — build the reactor first: mvn -DskipTests package -f services/pom.xml`);
    process.exit(2);
  }
}

const waitFor = async (url, tries = 90) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { const j = await r.json(); if (j.status === "UP") return true; }
    } catch { /* not yet */ }
    await new Promise((res) => setTimeout(res, 2000));
  }
  return false;
};

// The gateway's load balancer caches the registry; a freshly booted stack may need one cache
// window (~35s default) before LEAGUE-SERVICE is visible to lb://. Poll instead of presuming.
const fetchUntil = async (url, validate, tries = 24, sleepMs = 5000) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await r.text();
      last = { r, text };
      if (validate(r, text)) return last;
    } catch (err) {
      last = { r: null, text: String(err) };
    }
    await new Promise((res) => setTimeout(res, sleepMs));
  }
  return last;
};

const children = [];
// Keep the tails of the service logs only if something goes wrong — a failing boot should
// hand you the stack trace, a passing one should be quiet.
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
const dumpLogsOnFailure = () => {
  for (const [, { label, tail }] of logTails) {
    console.error(`\n==== ${label} (last ${tail.length} lines) ====`);
    for (const line of tail) console.error(line);
  }
};
const cleanup = () => { for (const c of children) { try { c.kill("SIGTERM"); } catch { /* gone */ } } };
process.on("SIGINT", () => { dumpLogsOnFailure(); cleanup(); process.exit(130); });
process.on("exit", cleanup);

const fail = (msg) => { console.error(`FAIL ${msg}`); dumpLogsOnFailure(); cleanup(); process.exit(1); };
const pass = (msg) => console.log(`ok   ${msg}`);

// Boot the stack in dependency order.
for (const s of SERVICES) {
  const child = spawn("java", ["-jar", jarPath(s)], { stdio: ["ignore", "pipe", "pipe"] });
  wireLogs(child, s.id);
  children.push(child);
  const up = await waitFor(s.health);
  if (!up) fail(`${s.id} (${s.port}) did not report UP within the window`);
  pass(`${s.id} answers actuator/health with UP on ${s.port}`);
}

// The config server must actually be serving the league's property — this is what M1040 opened
// up, and it is the one piece that was invisible when everything was hard-coded.
const configRoundTrip = await fetch("http://localhost:8888/league-service/default", {
  signal: AbortSignal.timeout(8000),
});
const configBody = await configRoundTrip.json();
const source = configBody?.propertySources?.find((s) => s.name.includes("config-repo"))?.source ?? {};
if (source["footballos.world.label"] !== "Demo World R1") fail("the config server did not serve footballos.world.label=Demo World R1 for league-service/default");
pass("the config server serves league-service/default: footballos.world.label=Demo World R1");

// The league's actuator/info must print the world label that came from the config server, not a
// compiled-in constant.
const info = await fetch("http://localhost:8081/actuator/info", { signal: AbortSignal.timeout(8000) });
const infoBody = await info.json();
if (infoBody?.app?.world !== "Demo World R1") fail(`league-service /actuator/info did not print the config-supplied world label (got ${JSON.stringify(infoBody?.app?.world)})`);
pass("league-service /actuator/info prints world=Demo World R1, taken from the config server");

// The frozen contract, read three ways: off disk, direct, and through the gateway's lb:// route.
const contract = JSON.parse(readFileSync(join(root, "services/league-service/src/main/resources/league-summary.json"), "utf8"));
const direct = await fetch("http://localhost:8081/league/summary", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
if (JSON.stringify(direct) !== JSON.stringify(contract)) fail("the direct league read diverges from the frozen contract on disk");
pass("league-service /league/summary answers identical bytes to the frozen contract");

const gatewayProbe = await fetchUntil(
  "http://localhost:8087/api/league/summary",
  (r, text) => r.ok && text.length > 2 && text.includes("\"digest\""),
  18,
  5000,
);
if (!gatewayProbe || !gatewayProbe.r || !gatewayProbe.r.ok ||
    JSON.stringify(JSON.parse(gatewayProbe.text)) !== JSON.stringify(contract)) {
  fail(`the gateway round-trip did not return the frozen contract (last probe: status ${gatewayProbe?.r?.status ?? "n/a"})`);
}
pass("the gateway round-trip (lb://LEAGUE-SERVICE via Eureka + StripPrefix=1) returns the frozen contract");

// Stop the league service and let the circuit open. The breaker (sliding window 3, min calls 2)
// must answer with the canned 503, never a bare timeout.
children[2].kill("SIGTERM");
await new Promise((res) => setTimeout(res, 3000));
let canned = 0;
for (let i = 0; i < 6; i++) {
  try {
    const r = await fetch("http://localhost:8087/api/league/summary", { signal: AbortSignal.timeout(8000) });
    const body = await r.text();
    if (r.status === 503 && body.includes("league-service is quiet") && body.includes("SERVICE_UNAVAILABLE")) canned++;
  } catch { /* expected to fail in the dead-league window */ }
  await new Promise((res) => setTimeout(res, 1000));
}
if (canned < 3) fail(`the circuit did not answer with the canned 503 (${canned}/6 calls carried it)`);
pass(`with the league service stopped, the circuit answers ${canned}/6 probes with the canned 503 from /fallback`);

cleanup();
console.log("\nverify-services: the Spring Cloud stack boots, registers, serves the frozen contract and answers its own failure mode");
process.exit(0);
