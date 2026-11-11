import { createServer } from "vite";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildWorldContract,
  contractDigest,
  serializeContract,
  CONTRACT_PATH as WORLD_CONTRACT_PATH,
  buildWorldTables,
  serializeTables,
  TABLES_PATH,
} from "./lib/world-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const has = (p) => existsSync(resolve(root, p));
// YAML readers match on `\n` boundaries and multi-line literals (`instances:\n      name:`).
// Git's autocrlf can check these files out as CRLF on Windows without changing a single byte of
// meaning, so normalise ONLY the yml text before parsing. `read()` stays byte-exact: the frozen
// contract comparisons below must see the original bytes, not a normalised copy.
const readYml = (p) => read(p).replace(/\r\n/g, "\n");

// M1036: the platform atlas — the Spring Cloud skeleton under services/ and the descriptor in
// domain/platform.ts must agree row for row. This proof parses the poms, the application ymls,
// the compose file and the screen, and refuses a port, name or route that moved on one side
// only. It also holds the honesty line: the SPA does not call any of these services.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { PLATFORM_SERVICES, GATEWAY_ROUTES, PLATFORM_LIVE, LEAGUE_CONTRACT, DISCIPLINE_CONTRACT, CIRCUIT_BREAKER, BROKER } = await server.ssrLoadModule("/domain/platform.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// ---- the readers (each exercised on a planted input below) ------------------------------
const modulesIn = (xml) => [...xml.matchAll(/<module>([^<]+)<\/module>/g)].map((m) => m[1]);
const portIn = (yml, key) => {
  const m = new RegExp(`^\\s*${key}:\\s*(\\d+)\\s*$`, "m").exec(yml);
  return m ? Number(m[1]) : NaN;
};
const nameIn = (yml) => (/^\s+name:\s*([\w-]+)\s*$/m.exec(yml) || [])[1];
const routeBlock = (yml, id) => (new RegExp(`- id: ${id}[\\s\\S]*?(?=\\n\\s*- id:|$)`).exec(yml) || [])[0] || "";
const composeBlock = (yml, module) => (new RegExp(`\\n  ${module}:\\n([\\s\\S]*?)(?=\\n  [\\w-]+:\\n|$)`).exec(yml) || [])[1] || "";
// M1061: a structural read of the gateway's route tree. A regex over `- id:` lines cannot
// tell a route nested under `spring.cloud.gateway.routes` from one that drifted two spaces
// left — and Spring cannot see the latter at all. This tracks each list item's ancestor key
// path using indentation only, the same hierarchy the YAML parser builds. M1061 caught exactly
// this drift: three routes sat at 2 spaces instead of 8 and silently registered as nothing.
const routeTree = (yml) => {
  const stack = [], out = [];
  for (const raw of yml.split("\n")) {
    const clean = raw.replace(/#.*$/, "").replace(/[ \t]+$/, "");
    if (!clean.trim()) continue;
    const indent = clean.length - clean.trimStart().length;
    const text = clean.trim();
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.map((s) => s.key).join(".");
    const item = /^-\s+id:\s*(\S+)/.exec(text);
    if (item) { out.push({ id: item[1], parent, indent }); continue; }
    const key = /^([\w.-]+):/.exec(text);
    if (key) stack.push({ indent, key: key[1] });
  }
  return out;
};

const walk = (dir, out = []) => {
  for (const entry of readdirSync(resolve(root, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(resolve(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
};

// ---- planted arms: the readers must read a synthetic input, not just the repo -----------
ok("the module reader reads a planted reactor and refuses an empty one",
  modulesIn("<modules><module>alpha</module><module>beta</module></modules>").join(",") === "alpha,beta" &&
  modulesIn("<modules></modules>").length === 0);
ok("the port reader reads a planted line and answers NaN when the line is not a number",
  portIn("server:\n  port: 9999\n", "port") === 9999 && Number.isNaN(portIn("server:\n  port: soon\n", "port")));
const plantRoute = routeBlock("routes:\n  - id: demo\n    uri: lb://DEMO\n    filters:\n      - StripPrefix=2\n", "demo");
ok("the route reader reads a planted gateway block",
  plantRoute.includes("uri: lb://DEMO") && plantRoute.includes("- StripPrefix=2"));
const plantCompose = composeBlock("\nservices:\n  demo:\n    ports:\n      - \"1234:1234\"\n\n  other:\n    ports:\n      - \"1:1\"\n", "demo");
ok("the compose reader reads one planted service block and stops at the next",
  plantCompose.includes("\"1234:1234\"") && !plantCompose.includes("other"));

const plantedTree = routeTree("gateway:\n  routes:\n    - id: inside\n      uri: lb://IN\n  orphan:\n    - id: escaped\n");
ok("the route-tree reader reports each item's real parent and can see a route that drifted out of the list",
  plantedTree.length === 2 &&
  plantedTree[0].id === "inside" && plantedTree[0].parent === "gateway.routes" &&
  plantedTree[1].id === "escaped" && plantedTree[1].parent === "gateway.orphan");

// ---- 1 · the descriptor ----------------------------------------------------------------
const ids = PLATFORM_SERVICES.map((s) => s.id);
const ports = PLATFORM_SERVICES.map((s) => s.port);
ok(`the descriptor names seven services in dependency order with unique ids and ports (${PLATFORM_SERVICES.map((s) => `${s.id}:${s.port}`).join(" ")})`,
  // M968: the discipline service joins the reactor — five services, one more domain reader.
  // M1058: the cache tier joins — six services, the first one with a real out-of-reactor dependency (Redis).
  // M1061: the messaging tier joins — seven services, the second with a real out-of-reactor dependency (RabbitMQ).
  PLATFORM_SERVICES.length === 7 && new Set(ids).size === 7 && new Set(ports).size === 7 &&
  ids.join(",") === "registry,config,gateway,league,discipline,cache,messaging" &&
  ports.join(",") === "8761,8888,8087,8081,8082,8083,8084");
ok("every non-registry service registers with the registry and none depends on itself",
  PLATFORM_SERVICES.filter((s) => s.id !== "registry").every((s) => s.dependsOn.includes("registry")) &&
  PLATFORM_SERVICES.every((s) => !s.dependsOn.includes(s.id)));
ok("the gateway descriptor and the circuit breaker agree with the gateway's own routing table",
  CIRCUIT_BREAKER.name === "leagueSummary" &&
  CIRCUIT_BREAKER.fallbackPath === "/fallback" &&
  CIRCUIT_BREAKER.waitSeconds === 1 &&
  GATEWAY_ROUTES.length === 5);

// ---- 2 · the reactor -------------------------------------------------------------------
const parentPom = read("services/pom.xml");
const modules = modulesIn(parentPom);
ok(`the parent pom lists exactly the descriptor's modules, in the same order (${modules.join(", ")})`,
  modules.length === PLATFORM_SERVICES.length &&
  modules.join(",") === PLATFORM_SERVICES.map((s) => s.module).join(","));
ok("the parent targets Java 21 and imports a Spring Cloud release train",
  /<java.version>21<\/java.version>/.test(parentPom) &&
  /<artifactId>spring-cloud-dependencies<\/artifactId>/.test(parentPom) &&
  /<version>\$\{spring-cloud.version\}<\/version>/.test(parentPom));

const pomFails = [];
for (const s of PLATFORM_SERVICES) {
  const p = `services/${s.module}/pom.xml`;
  if (!has(p)) { pomFails.push(`${s.module}: missing pom`); continue; }
  const xml = read(p);
  if (!new RegExp(`<artifactId>${s.module}</artifactId>`).test(xml)) pomFails.push(`${s.module}: artifactId`);
  if (!/<artifactId>football-os-services<\/artifactId>/.test(xml)) pomFails.push(`${s.module}: parent`);
  if (!/<groupId>com\.footballos<\/groupId>/.test(xml)) pomFails.push(`${s.module}: groupId`);
}
ok(`every module has a pom that names itself and points at the shared parent (${pomFails.join(" / ") || "clean"})`,
  pomFails.length === 0 && PLATFORM_SERVICES.length === 7);

// ---- 3 · the application classes -------------------------------------------------------
const registrySrc = walk("services/eureka-server/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
const gatewaySrc = walk("services/gateway/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
const leagueSrc = walk("services/league-service/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
ok("the registry has one Spring Boot entry point and enables the Eureka server",
  (registrySrc.match(/@SpringBootApplication/g) || []).length === 1 && registrySrc.includes("@EnableEurekaServer"));
ok("the gateway has one Spring Boot entry point and its pom carries the gateway starter",
  (gatewaySrc.match(/@SpringBootApplication/g) || []).length === 1 &&
  read("services/gateway/pom.xml").includes("spring-cloud-starter-gateway"));
const configSrc = walk("services/config-server/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
// The gateway strips exactly one segment, so the direct mapping is /league, not /api/league.
ok("the league service has one entry point and one read-only summary controller",
  (leagueSrc.match(/@SpringBootApplication/g) || []).length === 1 &&
  leagueSrc.includes("@RestController") && leagueSrc.includes("@RequestMapping(\"/league\")") &&
  leagueSrc.includes("@GetMapping(\"/summary\")") && !leagueSrc.includes("@PostMapping"));
ok("the config server has one entry point and enables the config server",
  (configSrc.match(/@SpringBootApplication/g) || []).length === 1 && configSrc.includes("@EnableConfigServer"));

// ---- 4 · ports and application names in the ymls ---------------------------------------
const ymlFails = [];
for (const s of PLATFORM_SERVICES) {
  const p = `services/${s.module}/src/main/resources/application.yml`;
  if (!has(p)) { ymlFails.push(`${s.module}: missing yml`); continue; }
  const yml = readYml(p);
  const port = portIn(yml, "port");
  const name = nameIn(yml);
  if (port !== s.port) ymlFails.push(`${s.module}: port ${port} != ${s.port}`);
  if (name !== s.appName) ymlFails.push(`${s.module}: name ${name} != ${s.appName}`);
}
ok(`each application.yml listens on the descriptor's port and registers under its app name (${ymlFails.join(" / ") || "clean"})`,
  ymlFails.length === 0);
ok(`the registry is the services' eureka default zone (${PLATFORM_SERVICES.find((s) => s.id === "registry").port})`,
  ["config-server", "gateway", "league-service", "discipline-service", "cache-service", "messaging-service"].every((m) =>
    readYml(`services/${m}/src/main/resources/application.yml`).includes(`http://localhost:${PLATFORM_SERVICES[0].port}/eureka/`)));

// ---- 4b · the actuator line: every service exposes health,info and nothing else ----------------------------
const actuatorInclude = (yml) => {
  const m = /^\s*include:\s*([\w,\s]+)\s*$/m.exec(yml);
  return m ? m[1].split(/[\s,]+/).filter(Boolean).sort().join(",") : "";
};
const actuatorFails = [];
for (const s of PLATFORM_SERVICES) {
  const yml = readYml(`services/${s.module}/src/main/resources/application.yml`);
  if (actuatorInclude(yml) !== "health,info") actuatorFails.push(`${s.module}: include ${actuatorInclude(yml) || "missing"}`);
  if (/^\s*include:\s*.*(metrics|env|shutdown|beans|heapdump|loggers)/m.test(yml)) actuatorFails.push(`${s.module}: richer endpoint`);
}
ok(`every service exposes exactly health,info and nothing richer (${actuatorFails.join(" / ") || "clean"})`,
  actuatorFails.length === 0 && PLATFORM_SERVICES.length === 7);

// ---- 5 · the gateway's own routes ------------------------------------------------------
const gatewayYml = readYml("services/gateway/src/main/resources/application.yml");
const routeFails = [];
for (const r of GATEWAY_ROUTES) {
  const target = PLATFORM_SERVICES.find((s) => s.id === r.target);
  const block = routeBlock(gatewayYml, r.id);
  if (!block) { routeFails.push(`${r.id}: missing`); continue; }
  if (!block.includes(`uri: lb://${target.appName.toUpperCase()}`)) routeFails.push(`${r.id}: uri`);
  if (!block.includes(`- Path=${r.path}`)) routeFails.push(`${r.id}: path`);
  if (!block.includes(`- StripPrefix=${r.stripPrefix}`)) routeFails.push(`${r.id}: strip`);
  // The CircuitBreaker must be written as structured YAML args — the inline `CircuitBreaker=name=x,
  // fallbackUri=...` shorthand makes the filter treat the whole string as the circuit's name
  // (fallback ends up null and every dead upstream surfaces as a bare 504 instead of /fallback).
  // Each route names its own breaker: the league family shares leagueSummary, the discipline
  // route carries disciplineClocks. Read as trimmed lines — no whitespace assumptions.
  const breakerFor = r.target === "discipline" ? "disciplineClocks" : CIRCUIT_BREAKER.name;
  const trimmed = block.split("\n").map((l) => l.trim());
  const breakerOk = trimmed.includes("- name: CircuitBreaker") && trimmed.includes("args:") &&
    trimmed.includes("name: " + breakerFor) && trimmed.includes("fallbackUri: forward:/fallback") &&
    trimmed.indexOf("name: " + breakerFor) > trimmed.indexOf("- name: CircuitBreaker");
  if (!breakerOk) routeFails.push(`${r.id}: circuit breaker`);
}
ok(`every descriptor route is written the same way in the gateway yml (${GATEWAY_ROUTES.map((r) => r.id).join(", ")}; ${routeFails.join(" / ") || "clean"})`,
  GATEWAY_ROUTES.length >= 1 && routeFails.length === 0);
const gatewayTree = routeTree(gatewayYml);
const misnested = gatewayTree.filter((r) => r.parent !== "spring.cloud.gateway.routes");
ok(`every gateway route is nested under spring.cloud.gateway.routes, not merely present as a line (${gatewayTree.length} items, ${misnested.map((r) => r.id).join(" / ") || "clean"})`,
  gatewayTree.length === GATEWAY_ROUTES.length && misnested.length === 0 &&
  gatewayTree.map((r) => r.id).join(",") === GATEWAY_ROUTES.map((r) => r.id).join(","));
ok("the gateway carries the resilience4j breaker the descriptor names, and its fallback path exists as a route in the gateway's own namespace",
  read("services/gateway/pom.xml").includes("spring-cloud-starter-circuitbreaker-reactor-resilience4j") &&
  read("services/gateway/src/main/java/com/footballos/gateway/FallbackRouter.java").includes(`"${CIRCUIT_BREAKER.fallbackPath}"`) &&
  read("services/gateway/src/main/java/com/footballos/gateway/FallbackRouter.java").includes("SERVICE_UNAVAILABLE") &&
  gatewayYml.includes(`instances:\n      ${CIRCUIT_BREAKER.name}:`) &&
  gatewayYml.includes("sliding-window-size: 3") &&
  gatewayYml.includes("failure-rate-threshold: 50"));

// ---- 6 · compose and Dockerfiles -------------------------------------------------------
const compose = readYml("services/docker-compose.yml");
const composeFails = [];
for (const s of PLATFORM_SERVICES) {
  const block = composeBlock(compose, s.module);
  if (!block) { composeFails.push(`${s.module}: missing service`); continue; }
  if (!block.includes(`"${s.port}:${s.port}"`)) composeFails.push(`${s.module}: port`);
  for (const depId of s.dependsOn) {
    const dep = PLATFORM_SERVICES.find((x) => x.id === depId);
    if (!block.includes(`- ${dep.module}`)) composeFails.push(`${s.module}: depends ${dep.module}`);
  }
  const dockerfile = `services/${s.module}/Dockerfile`;
  if (!has(dockerfile)) composeFails.push(`${s.module}: Dockerfile`);
  else if (!read(dockerfile).includes(`-pl ${s.module} -am`)) composeFails.push(`${s.module}: Dockerfile module`);
}
ok(`the compose file maps the descriptor's ports, honours the dependency edges and has one Dockerfile per module (${composeFails.join(" / ") || "clean"})`,
  composeFails.length === 0);
ok("the reactor's build context carries a .dockerignore that excludes every module's target/ — the image rebuilds from poms alone",
  has("services/.dockerignore") && read("services/.dockerignore").includes("target/"));

// ---- 6a · the config server and the league's config wiring -----------------------------------
const CONFIG_REPO = readYml("services/config-server/src/main/resources/config-repo/application.yml");
// M1066: the discipline clocks key must live under footballos.discipline, not drift back into the
// league block on a bad indent (the exact regression this proof now pins — a wrong indent used to
// hang `clocks-resource` under `league:` with 8 spaces, so @Value never saw it and only the default
// saved the boot). Read the two-space `discipline:` sibling and its four-space child as adjacent.
const DISCIPLINE_CLOCKS_WIRED = /^  discipline:\r?\n    clocks-resource: discipline-clocks\.json\s*$/m.test(CONFIG_REPO);
ok("the config server enables the config server and serves a native classpath repository whose three keys are what the league and discipline services read",
  has("services/config-server/src/main/java/com/footballos/config/ConfigApplication.java") &&
  has("services/config-server/src/main/resources/config-repo/application.yml") &&
  read("services/config-server/src/main/java/com/footballos/config/ConfigApplication.java").includes("@EnableConfigServer") &&
  readYml("services/config-server/src/main/resources/application.yml").includes("active: native") &&
  readYml("services/config-server/src/main/resources/application.yml").includes("search-locations: classpath:/config-repo/") &&
  CONFIG_REPO.includes("contract-resource: league-summary.json") &&
  CONFIG_REPO.includes("tables-resource: league-tables.json") &&
  CONFIG_REPO.includes("label: Demo World R1") &&
  DISCIPLINE_CLOCKS_WIRED);
ok("the league service imports the optional config server and takes the resource name from its own property instead of a hard-coded string",
  read("services/league-service/pom.xml").includes("spring-cloud-starter-config") &&
  read("services/league-service/pom.xml").includes("spring-boot-starter-actuator") &&
  readYml("services/league-service/src/main/resources/application.yml").includes("optional:configserver:http://localhost:8888") &&
  read("services/league-service/src/main/java/com/footballos/league/LeagueSummaryController.java").includes("@Value(\"${footballos.league.contract-resource:league-summary.json}\")"));
ok("the tables controller takes its resource name from the same optional-import door, not a compiled-in constant",
  read("services/league-service/src/main/java/com/footballos/league/LeagueTableController.java")
    .includes("@Value(\"${footballos.league.tables-resource:league-tables.json}\")"));

// ---- 6b · the world contract the league service serves ---------------------------------
const contractFile = read(WORLD_CONTRACT_PATH);
const contract = JSON.parse(contractFile);
const allMatches = footballProvider.matches();
const recounted = {
  clubs: footballProvider.clubs().length,
  players: footballProvider.players().length,
  competitions: footballProvider.competitions().length,
  matches: allMatches.length,
  finishedMatches: allMatches.filter((m) => m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null).length,
};
ok(`the checked-in contract recounts the provider independently (${JSON.stringify(contract.snapshot)})`,
  JSON.stringify(contract.snapshot) === JSON.stringify(recounted) &&
  recounted.clubs > 0 && recounted.players > 0 && recounted.matches > recounted.finishedMatches);
const rebuiltContract = await buildWorldContract(server);
ok(`the contract file is byte-for-byte what the exporter would write now (a sha256 over the counts)`,
  contractFile === serializeContract(rebuiltContract) &&
  contract.digest === contractDigest(recounted) && /^sha256-[0-9a-f]{64}$/.test(contract.digest));
ok(`the contract is a pure function of its snapshot (a repeated call agrees; one count moves the digest)`,
  contractDigest({ clubs: 1, players: 1, competitions: 1, matches: 1, finishedMatches: 0 }) ===
    contractDigest({ clubs: 1, players: 1, competitions: 1, matches: 1, finishedMatches: 0 }) &&
  contractDigest({ clubs: 2, players: 1, competitions: 1, matches: 1, finishedMatches: 0 }) !==
    contractDigest({ clubs: 1, players: 1, competitions: 1, matches: 1, finishedMatches: 0 }));
ok("the descriptor names the same resource, path and exporter the proof reads",
  LEAGUE_CONTRACT.path === WORLD_CONTRACT_PATH &&
  LEAGUE_CONTRACT.resource === "league-summary.json" &&
  LEAGUE_CONTRACT.exporter === "scripts/export-service-contract.mjs" &&
  has(LEAGUE_CONTRACT.exporter));
// M968: the discipline contract is named the same way its sibling is — same resource, same
// path, same exporter, read back from the descriptor rather than a hand copy.
const DISCIPLINE_CLOCKS_PATH = "services/discipline-service/src/main/resources/discipline-clocks.json";
ok("the descriptor names the discipline resource, path and exporter the proof reads",
  DISCIPLINE_CONTRACT.path === DISCIPLINE_CLOCKS_PATH &&
  DISCIPLINE_CONTRACT.resource === "discipline-clocks.json" &&
  DISCIPLINE_CONTRACT.exporter === "scripts/export-service-contract.mjs" &&
  has(DISCIPLINE_CONTRACT.exporter) && has(DISCIPLINE_CONTRACT.path));
const tablesFile = read(TABLES_PATH);
const tablesDoc = JSON.parse(tablesFile);
const rebuiltTables = await buildWorldTables(server);
const clubCounts = footballProvider.clubs().length;
ok(`the frozen tables recompute from the provider and match the checked-in file byte for byte (${tablesDoc.leagues} leagues, ${tablesDoc.leagues === Object.keys(tablesDoc.tables).length} tables, club rows from ${clubCounts})`,
  tablesFile === serializeTables(rebuiltTables) &&
  tablesDoc.leagues > 0 && tablesDoc.leagues === Object.keys(tablesDoc.tables).length &&
  tablesDoc.tables.ucl !== undefined && tablesDoc.tables.ucl.rows.length > 0 &&
  JSON.stringify(tablesDoc.tables.ucl.rows[0]) !== JSON.stringify(tablesDoc.tables.ucl.rows[1] ?? {}));
ok("the tables resource is served by the league service through the same frozen-contract discipline as the summary",
  rebuiltTables.tables.ucl.rows.length === tablesDoc.tables.ucl.rows.length &&
  rebuiltTables.tables.ucl.rows.every((r, i) => r.position === i + 1) &&
  Object.values(rebuiltTables.tables).every((t) => t.name.length > 0 && t.rows.length >= 2));
const leagueTableSrc = walk("services/league-service/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
ok("the league service carries a read-only table controller and the gateway routes it under the same breaker",
  leagueTableSrc.includes("LeagueTableController") &&
  leagueTableSrc.includes("/league/table") &&
  leagueTableSrc.includes("@PathVariable") &&
  leagueTableSrc.includes("ResponseStatusException(HttpStatus.NOT_FOUND") &&
  !leagueTableSrc.includes("@PostMapping") &&
  readYml("services/gateway/src/main/resources/application.yml").includes("- Path=/api/league/table/**"));
ok("the league controller loads that resource through Jackson and keeps the counts in the JSON",
  leagueSrc.includes("new ClassPathResource(contractResource)") &&
  leagueSrc.includes("TypeReference<Map<String, Object>>") &&
  !leagueSrc.includes("\"clubs\"") && !leagueSrc.includes("\"players\"") &&
  !leagueSrc.includes("\"matches\""));

// ---- 8 · the operator's half: the verifier and the runbook -----------------------------------
const VERIFY_SRC = read("scripts/verify-services.mjs");
const RUNBOOK_SRC = read("dev/platform-runbook.md");
// M1063: the witness and the runbook used to name the same four ports; the reactor then grew to
// seven modules and two brokers and only the descriptor kept up. Both operator documents must now
// name EVERY service port and the two out-of-reactor broker ports, or the human reading them is
// looking at an stale topology — the exact drift this clause is here to refuse.
const ALL_PORTS = PLATFORM_SERVICES.map((s) => String(s.port));
ok(`the witness and the runbook name the same ${ALL_PORTS.length} service ports (${ALL_PORTS.join(",")}) plus both brokers, the same lb target, fallback and config value`,
  VERIFY_SRC.includes("lb://LEAGUE-SERVICE") && RUNBOOK_SRC.includes("lb://LEAGUE-SERVICE") &&
  ALL_PORTS.every((p) => VERIFY_SRC.includes(p) && RUNBOOK_SRC.includes(p)) &&
  ["6379", "5672"].every((p) => VERIFY_SRC.includes(p) || RUNBOOK_SRC.includes(p)) &&
  VERIFY_SRC.includes("league-service is quiet") && RUNBOOK_SRC.includes("league-service is quiet") &&
  VERIFY_SRC.includes("Demo World R1") && RUNBOOK_SRC.includes("Demo World R1") &&
  VERIFY_SRC.includes("scripts/verify-services.mjs") &&
  RUNBOOK_SRC.includes("PLATFORM_LIVE") && RUNBOOK_SRC.includes("health,info") &&
  /\/actuator\/health/.test(RUNBOOK_SRC));
// The verifier's boot order is no longer trusted as a hand-typed list: it declares its DAG and
// boot list as JSON literals and refuses to start unless lib/boot-order.mjs proves the order is a
// valid topological order over the same edges the descriptor publishes.
ok("the verifier drives its boot order from the shared topological-order algorithm and a declared DAG",
  VERIFY_SRC.includes('from "./lib/boot-order.mjs"') &&
  VERIFY_SRC.includes("topologicalOrder(TOPOLOGY)") && VERIFY_SRC.includes("assertBootOrder(") &&
  /const TOPOLOGY = \[/.test(VERIFY_SRC) && /const BOOT_IDS = \[/.test(VERIFY_SRC) &&
  VERIFY_SRC.includes("canonical.cyclic.length") && VERIFY_SRC.includes("chosen.ok"));
// A positional kill means "league" only while the array keeps its exact order; the runbook itself
// warned about stale java processes. The stop target must be named, not indexed.
const verifyExec = VERIFY_SRC.split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");
ok("the circuit test names the league service it stops rather than a positional index",
  !/children\s*\[\s*\d+\s*\]\s*\.\s*kill/.test(verifyExec) &&
  /children\.get\(["']league["']\)/.test(verifyExec));
// The two broker-backed services are declared, BOOT on this host and degrade honestly instead of
// pretending — the verifier spawns them against a dead port (:3999) so this machine's foreign
// 6379/5672 are never dialed, then asserts the degraded-but-honest answers: redisUp:false, the
// live:false observe surface. A live broker round-trip is NOT claimed here; compose/CI own it.
ok("the runbook and witness keep the honest external-broker boundary for cache and messaging",
  /redis/i.test(RUNBOOK_SRC) && /rabbitmq/i.test(RUNBOOK_SRC) &&
  VERIFY_SRC.includes("SPRING_DATA_REDIS_PORT") && VERIFY_SRC.includes("SPRING_RABBITMQ_PORT") &&
  VERIFY_SRC.includes("3999") && VERIFY_SRC.includes("redisUp") && VERIFY_SRC.includes("live=false") &&
  /degraded/i.test(VERIFY_SRC) && /degraded/i.test(RUNBOOK_SRC) && /3999/.test(RUNBOOK_SRC));

// ---- 7 · the screen reads the descriptor, and the app never calls a service -----------
const SCREEN_PATH = "features/platform/PlatformAtlas.tsx";
const SCREEN = read(SCREEN_PATH);
ok("the atlas renders both descriptor arrays and never types a port itself",
  SCREEN.includes("from \"@/domain/platform\"") &&
  SCREEN.includes("PLATFORM_SERVICES.map") && SCREEN.includes("GATEWAY_ROUTES.map") &&
  SCREEN.includes("LEAGUE_CONTRACT.path") &&
  SCREEN.includes("PLATFORM_LIVE") && !/\b(8761|8888|8087|8081|8082|8083|8084)\b/.test(SCREEN) &&
  SCREEN.includes("t(\"platform.title\")") && SCREEN.includes("platform.boundaryTitle"));
ok("the atlas reads the exported contract file itself, not a second copy of the counts",
  SCREEN.includes("services/league-service/src/main/resources/league-summary.json") &&
  ["snapshot.clubs", "snapshot.players", "snapshot.matches", "snapshot.finishedMatches", "digest"]
    .every((field) => SCREEN.includes(field)));
const appFiles = ["src", "features", "domain", "data", "lib", "ui", "store", "i18n", "components"]
  .flatMap((d) => walk(d)).filter((f) => /\.(ts|tsx)$/.test(f) && f !== SCREEN_PATH);
const callers = appFiles.filter((f) => {
  const src = read(f);
  return src.includes("localhost:8087") || src.includes("localhost:8081") || src.includes("localhost:8761") || src.includes("localhost:8888") || src.includes("localhost:8084");
});
ok(`no app module reaches for a service port — the map is a descriptor, not a client (${callers.join(", ") || "none"})`,
  callers.length === 0 && appFiles.length > 100 && PLATFORM_LIVE === false &&
  !/\b(8761|8888|8087|8081|8082|8083|8084)\b/.test(SCREEN));
const APP = read("src/App.tsx");
const SHELL = read("features/shell/AppShell.tsx");
ok("the screen has a lazy route, a route branch and a sidebar entry",
  APP.includes("import(\"@/features/platform/PlatformAtlas\")") &&
  APP.includes("path === \"/platform\"") && APP.includes("<PlatformAtlas />") &&
  SHELL.includes("to: \"/platform\"") && SHELL.includes("t(\"nav.platform\")"));

// ---- 8 · the dictionary carries every key the screen reads ----------------------------
const screenKeys = [...new Set([...SCREEN.matchAll(/t\("([^"]+)"/g)].map((m) => m[1]))];
const localeIds = Object.keys(DICTIONARIES);
const missingKeys = [];
for (const key of [...screenKeys, "nav.platform"]) {
  for (const id of localeIds) if (!(key in DICTIONARIES[id])) missingKeys.push(`${id}:${key}`);
}
ok(`every key the atlas reads exists in all ${localeIds.length} locales (${screenKeys.length} screen keys + nav.platform; ${missingKeys.join(" / ") || "clean"})`,
  localeIds.length === 3 && screenKeys.length === 55 && missingKeys.length === 0);
ok("the interpolating rows hand their placeholders to every locale",
  localeIds.every((id) => /\{n\}/.test(DICTIONARIES[id]["platform.portLine"]) &&
    /\{n\}/.test(DICTIONARIES[id]["platform.stripPrefix"]) &&
    /\{list\}/.test(DICTIONARIES[id]["platform.plannedConsumers"]) &&
    /\{clubs\}/.test(DICTIONARIES[id]["platform.contractCounts"]) &&
    /\{finished\}/.test(DICTIONARIES[id]["platform.contractCounts"]) &&
    /\{digest\}/.test(DICTIONARIES[id]["platform.contractDigest"])));

// ---- 9 · the cache tier and its one out-of-reactor dependency (Redis) -----------------
const CACHE_POM = read("services/cache-service/pom.xml");
ok("the cache module names itself, points at the parent, and pulls in Spring Data Redis (the networking client)",
  CACHE_POM.includes("<artifactId>cache-service</artifactId>") &&
  CACHE_POM.includes("<groupId>com.footballos</groupId>") &&
  CACHE_POM.includes("spring-boot-starter-data-redis"));
const cacheYml = readYml("services/cache-service/src/main/resources/application.yml");
ok("the cache tier dials Redis (RESP over netty via Lettuce), honours a TTL, and exposes only health,info",
  cacheYml.includes("host: localhost") &&
  cacheYml.includes("port: 6379") &&
  /^\s*include:\s*health,info\s*$/m.test(cacheYml) &&
  cacheYml.includes("footballos:") &&
  cacheYml.includes("ttl-seconds: 60") &&
  cacheYml.includes("contract-resource: league-summary.json"));
const cacheSrc = walk("services/cache-service/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
ok("the cache tier is read-through: a controller, the league cache path, a stats endpoint and an evict",
  cacheSrc.includes("@RestController") &&
  cacheSrc.includes('@RequestMapping("/cache/league")') &&
  cacheSrc.includes('@GetMapping("/summary")') &&
  cacheSrc.includes('@GetMapping("/stats")') &&
  cacheSrc.includes("StringRedisTemplate") &&
  cacheSrc.includes("readSummary") &&
  cacheSrc.includes("evict") &&
  /public\s+long\s+ttlSeconds\s*\(/.test(cacheSrc));
const CACHE_RES = "services/cache-service/src/main/resources/league-summary.json";
const LEAGUE_RES = "services/league-service/src/main/resources/league-summary.json";
ok("the cache tier fronts the league service's frozen contract, byte-for-byte, so the two files are identical",
  has(CACHE_RES) && has(LEAGUE_RES) && read(CACHE_RES).length > 0 && read(CACHE_RES) === read(LEAGUE_RES));
ok("compose brings up Redis for the cache tier and the cache service waits on it",
  composeBlock(compose, "redis").includes("image: redis:7-alpine") &&
  composeBlock(compose, "redis").includes('"6379:6379"') &&
  composeBlock(compose, "cache-service").includes("- redis"));

// ---- 10 · the messaging tier and its one out-of-reactor broker (RabbitMQ) -----------------
// domain/queue.ts holds the NUMBERS; the Java policy defaults and the yml must agree with it.
// The Stream bindings are the wire twin of the pure fold: partition by key (per-key order), a
// durable competing group with max-attempts -> DLQ (termination), and prefetch (backpressure).
const { QUEUE_POLICY } = await server.ssrLoadModule("/domain/queue.ts");
const MSG_POM = read("services/messaging-service/pom.xml");
ok("the messaging module pulls in Spring Cloud Stream + the Rabbit binder, web and actuator, and has a Dockerfile",
  MSG_POM.includes("<artifactId>messaging-service</artifactId>") &&
  MSG_POM.includes("spring-cloud-stream") &&
  MSG_POM.includes("spring-cloud-stream-binder-rabbit") &&
  MSG_POM.includes("spring-boot-starter-web") &&
  MSG_POM.includes("spring-boot-starter-actuator") &&
  has("services/messaging-service/Dockerfile") &&
  read("services/messaging-service/Dockerfile").includes("-pl messaging-service -am"));

const MSG_YML = readYml("services/messaging-service/src/main/resources/application.yml");
// M1071: the explanatory comments above quote the REMOVED defects verbatim —
// `partition-key-expression: payload.key`, `partition-count: 8`, `partitioned: true`. Spring never
// parses a comment, so a raw `includes` would "find" a binding that is only prose and every negative
// (must-not-exist) assertion would fail on the documentation. Read the CONFIGURATION lines only.
const MSG_CFG = MSG_YML.split("\n").map((line) => line.replace(/#.*$/, "")).join("\n");
ok("the messaging yml binds three functional beans to a shared durable Rabbit queue with a dead-letter sink",
  MSG_CFG.includes("default-binder: rabbit") &&
  MSG_CFG.includes("definition: publishFixtures;processEvents;deadLetter") &&
  MSG_CFG.includes("publishFixtures-out-0:") &&
  MSG_CFG.includes("processEvents-in-0:") &&
  MSG_CFG.includes("deadLetter-in-0:") &&
  // M1071: broker-level partitioning (partition-count:8 + partitioned:true) is GONE — a live
  // witness proved a single instance consumed only partition-0 and silently dropped 7/8 messages
  // (sent:8/delivered:1). One shared durable group queue + 4 competing consumers carries the
  // at-least-once transport losslessly; the 8-shard decision lives in the consumer (shardOf/byShard).
  !MSG_CFG.includes("partition-key-expression: payload.key") &&
  !MSG_CFG.includes("partition-count:") &&
  !MSG_CFG.includes("partitioned: true") &&
  MSG_CFG.includes("group: footballos.pipeline") &&
  MSG_CFG.includes("concurrency: 4") &&
  MSG_CFG.includes("republish-to-dlq: true") &&
  MSG_CFG.includes("destination: " + BROKER.exchange) &&
  MSG_CFG.includes("destination: " + BROKER.dlq) &&
  MSG_CFG.includes("dlq-name: " + BROKER.dlq) &&
  MSG_CFG.includes("prefetch: " + QUEUE_POLICY.highWater) &&
  // M1071: the broker outage must degrade in bounded time, not park a Tomcat worker for Lettuce's
  // / Rabbit's implicit 60s. proof-messaging-resilience.mjs plants the removal of this bound.
  MSG_CFG.includes("connection-timeout: 2000"));
// The shard census is a CONSUMER-side semantic now, so it must still be read by the wire twin.
ok("the 8-shard decision survives as a consumer-side census (Java shardOf/byShard), the wire twin of the pure fold",
  QUEUE_POLICY.shards === 8 &&
  /shardOf\(/.test(read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineFunctions.java")) &&
  read("services/messaging-service/src/main/java/com/footballos/messaging/PipelineFunctions.java").includes("byShard") &&
  MSG_CFG.includes("shards: 8"));

// Three readers of one policy: the TypeScript fold, the Java defaults, the yml.
const javaPolicy = read("services/messaging-service/src/main/java/com/footballos/messaging/DeliveryPolicy.java");
const javaField = (name) => {
  const i = javaPolicy.indexOf(name + " = ");
  if (i < 0) return NaN;
  const m = /^[0-9]+/.exec(javaPolicy.slice(i + name.length + 3));
  return m ? Number(m[0]) : NaN;
};
const policyRows = [
  ["base-delay", "baseDelay", QUEUE_POLICY.baseDelay],
  ["cap-delay", "capDelay", QUEUE_POLICY.capDelay],
  ["max-attempts", "maxAttempts", QUEUE_POLICY.maxAttempts],
  ["high-water", "highWater", QUEUE_POLICY.highWater],
  ["low-water", "lowWater", QUEUE_POLICY.lowWater],
  ["shards", "shards", QUEUE_POLICY.shards],
];
const policyDrift = policyRows.filter(([k, j, t]) => portIn(MSG_CFG, k) !== t || javaField(j) !== t);
ok(`the yml, the Java defaults and the pure fold name one retry/water-mark policy (${policyRows.length} rows; ${policyDrift.map((r) => r[0]).join(" / ") || "clean"})`,
  policyDrift.length === 0);
ok("the broker's exchange and dead-letter queue are named identically in the descriptor, the yml and the Java defaults",
  javaPolicy.includes('"' + BROKER.exchange + '"') && javaPolicy.includes('"' + BROKER.dlq + '"') &&
  MSG_CFG.includes("exchange: " + BROKER.exchange) && MSG_CFG.includes("dlq: " + BROKER.dlq));

const MSG_SRC = walk("services/messaging-service/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
ok("the messaging service has one entry point, three functional beans, a seen-set idempotency door and an observe surface that stays honest",
  (MSG_SRC.match(/@SpringBootApplication/g) || []).length === 1 &&
  MSG_SRC.includes("Supplier<MatchEvent> publishFixtures") &&
  MSG_SRC.includes("Consumer<MatchEvent> processEvents") &&
  MSG_SRC.includes("Consumer<MatchEvent> deadLetter") &&
  MSG_SRC.includes("seen.add") && MSG_SRC.includes("StreamBridge") &&
  ["/summary", "/stats", "/policy", "/publish"].every((p) => MSG_SRC.includes('"' + p + '"')) &&
  // M1071: `live` is no longer a hardcoded false that lies when the broker is actually UP — it is
  // derived from a real AMQP connection probe (brokerLive()), so a working tier reports live:true
  // and an outage reports live:false. proof-messaging-resilience.mjs pins this with a planted arm.
  MSG_SRC.includes('"live", brokerLive()') && MSG_SRC.includes("createConnection()"));

ok("compose brings up the broker the descriptor names and the messaging service waits on it in-network",
  composeBlock(compose, "rabbitmq").includes("image: " + BROKER.image) &&
  composeBlock(compose, "rabbitmq").includes('"' + BROKER.port + ":" + BROKER.port + '"') &&
  composeBlock(compose, "rabbitmq").includes('"' + BROKER.managementPort + ":" + BROKER.managementPort + '"') &&
  composeBlock(compose, "messaging-service").includes("- rabbitmq") &&
  composeBlock(compose, "messaging-service").includes("SPRING_RABBITMQ_HOST: rabbitmq") &&
  composeBlock(compose, "messaging-service").includes('"8084:8084"'));

ok("the atlas reads the broker endpoint from the descriptor rather than a typed-in copy",
  ["BROKER.image", "BROKER.port", "BROKER.exchange", "BROKER.dlq"].every((f) => SCREEN.includes(f)) &&
  !SCREEN.includes("footballos.events") && !SCREEN.includes("rabbitmq:3-management"));
ok("the messaging route's planned consumer is the queue observatory and PLATFORM_LIVE stays false",
  GATEWAY_ROUTES.find((r) => r.id === "messaging-pipeline").consumers.join(",") === "/messaging" &&
  PLATFORM_LIVE === false);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
