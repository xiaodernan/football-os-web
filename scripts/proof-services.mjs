import { createServer } from "vite";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildWorldContract,
  contractDigest,
  serializeContract,
  CONTRACT_PATH as WORLD_CONTRACT_PATH,
} from "./lib/world-contract.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const has = (p) => existsSync(resolve(root, p));

// M1036: the platform atlas — the Spring Cloud skeleton under services/ and the descriptor in
// domain/platform.ts must agree row for row. This proof parses the poms, the application ymls,
// the compose file and the screen, and refuses a port, name or route that moved on one side
// only. It also holds the honesty line: the SPA does not call any of these services.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { PLATFORM_SERVICES, GATEWAY_ROUTES, PLATFORM_LIVE, LEAGUE_CONTRACT } = await server.ssrLoadModule("/domain/platform.ts");
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

// ---- 1 · the descriptor ----------------------------------------------------------------
const ids = PLATFORM_SERVICES.map((s) => s.id);
const ports = PLATFORM_SERVICES.map((s) => s.port);
ok(`the descriptor names three services in dependency order with unique ids and ports (${PLATFORM_SERVICES.map((s) => `${s.id}:${s.port}`).join(" ")})`,
  PLATFORM_SERVICES.length === 3 && new Set(ids).size === 3 && new Set(ports).size === 3 &&
  ids.join(",") === "registry,gateway,league" && ports.join(",") === "8761,8080,8081");
ok("both non-registry services register with the registry and none depends on itself",
  PLATFORM_SERVICES.filter((s) => s.id !== "registry").every((s) => s.dependsOn.join(",") === "registry") &&
  PLATFORM_SERVICES.every((s) => !s.dependsOn.includes(s.id)));

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
  pomFails.length === 0 && PLATFORM_SERVICES.length === 3);

// ---- 3 · the application classes -------------------------------------------------------
const registrySrc = walk("services/eureka-server/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
const gatewaySrc = walk("services/gateway/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
const leagueSrc = walk("services/league-service/src").filter((f) => f.endsWith(".java")).map(read).join("\n");
ok("the registry has one Spring Boot entry point and enables the Eureka server",
  (registrySrc.match(/@SpringBootApplication/g) || []).length === 1 && registrySrc.includes("@EnableEurekaServer"));
ok("the gateway has one Spring Boot entry point and its pom carries the gateway starter",
  (gatewaySrc.match(/@SpringBootApplication/g) || []).length === 1 &&
  read("services/gateway/pom.xml").includes("spring-cloud-starter-gateway"));
ok("the league service has one entry point and one read-only summary controller",
  (leagueSrc.match(/@SpringBootApplication/g) || []).length === 1 &&
  leagueSrc.includes("@RestController") && leagueSrc.includes("@RequestMapping(\"/api/league\")") &&
  leagueSrc.includes("@GetMapping(\"/summary\")") && !leagueSrc.includes("@PostMapping"));

// ---- 4 · ports and application names in the ymls ---------------------------------------
const ymlFails = [];
for (const s of PLATFORM_SERVICES) {
  const p = `services/${s.module}/src/main/resources/application.yml`;
  if (!has(p)) { ymlFails.push(`${s.module}: missing yml`); continue; }
  const yml = read(p);
  const port = portIn(yml, "port");
  const name = nameIn(yml);
  if (port !== s.port) ymlFails.push(`${s.module}: port ${port} != ${s.port}`);
  if (name !== s.appName) ymlFails.push(`${s.module}: name ${name} != ${s.appName}`);
}
ok(`each application.yml listens on the descriptor's port and registers under its app name (${ymlFails.join(" / ") || "clean"})`,
  ymlFails.length === 0);
ok(`the registry is the services' eureka default zone (${PLATFORM_SERVICES.find((s) => s.id === "registry").port})`,
  ["gateway", "league-service"].every((m) =>
    read(`services/${m}/src/main/resources/application.yml`).includes(`http://localhost:${PLATFORM_SERVICES[0].port}/eureka/`)));

// ---- 5 · the gateway's own routes ------------------------------------------------------
const gatewayYml = read("services/gateway/src/main/resources/application.yml");
const routeFails = [];
for (const r of GATEWAY_ROUTES) {
  const target = PLATFORM_SERVICES.find((s) => s.id === r.target);
  const block = routeBlock(gatewayYml, r.id);
  if (!block) { routeFails.push(`${r.id}: missing`); continue; }
  if (!block.includes(`uri: lb://${target.appName.toUpperCase()}`)) routeFails.push(`${r.id}: uri`);
  if (!block.includes(`- Path=${r.path}`)) routeFails.push(`${r.id}: path`);
  if (!block.includes(`- StripPrefix=${r.stripPrefix}`)) routeFails.push(`${r.id}: strip`);
}
ok(`every descriptor route is written the same way in the gateway yml (${GATEWAY_ROUTES.map((r) => r.id).join(", ")}; ${routeFails.join(" / ") || "clean"})`,
  GATEWAY_ROUTES.length >= 1 && routeFails.length === 0);

// ---- 6 · compose and Dockerfiles -------------------------------------------------------
const compose = read("services/docker-compose.yml");
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
ok("the league controller loads that resource through Jackson and keeps the counts in the JSON",
  leagueSrc.includes("new ClassPathResource(\"league-summary.json\")") &&
  leagueSrc.includes("TypeReference<Map<String, Object>>") &&
  !leagueSrc.includes("\"clubs\"") && !leagueSrc.includes("\"players\"") &&
  !leagueSrc.includes("\"matches\""));

// ---- 7 · the screen reads the descriptor, and the app never calls a service -----------
const SCREEN_PATH = "features/platform/PlatformAtlas.tsx";
const SCREEN = read(SCREEN_PATH);
ok("the atlas renders both descriptor arrays and never types a port itself",
  SCREEN.includes("from \"@/domain/platform\"") &&
  SCREEN.includes("PLATFORM_SERVICES.map") && SCREEN.includes("GATEWAY_ROUTES.map") &&
  SCREEN.includes("LEAGUE_CONTRACT.path") &&
  SCREEN.includes("PLATFORM_LIVE") && !/\b(8761|8080|8081)\b/.test(SCREEN) &&
  SCREEN.includes("t(\"platform.title\")") && SCREEN.includes("platform.boundaryTitle"));
ok("the atlas reads the exported contract file itself, not a second copy of the counts",
  SCREEN.includes("services/league-service/src/main/resources/league-summary.json") &&
  ["snapshot.clubs", "snapshot.players", "snapshot.matches", "snapshot.finishedMatches", "digest"]
    .every((field) => SCREEN.includes(field)));
const appFiles = ["src", "features", "domain", "data", "lib", "ui", "store", "i18n", "components"]
  .flatMap((d) => walk(d)).filter((f) => /\.(ts|tsx)$/.test(f) && f !== SCREEN_PATH);
const callers = appFiles.filter((f) => {
  const src = read(f);
  return src.includes("localhost:8080") || src.includes("localhost:8081") || src.includes("localhost:8761");
});
ok(`no app module reaches for a service port — the map is a descriptor, not a client (${callers.join(", ") || "none"})`,
  callers.length === 0 && appFiles.length > 100 && PLATFORM_LIVE === false);
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
  localeIds.length === 3 && screenKeys.length === 34 && missingKeys.length === 0);
ok("the interpolating rows hand their placeholders to every locale",
  localeIds.every((id) => /\{n\}/.test(DICTIONARIES[id]["platform.portLine"]) &&
    /\{n\}/.test(DICTIONARIES[id]["platform.stripPrefix"]) &&
    /\{list\}/.test(DICTIONARIES[id]["platform.plannedConsumers"]) &&
    /\{clubs\}/.test(DICTIONARIES[id]["platform.contractCounts"]) &&
    /\{finished\}/.test(DICTIONARIES[id]["platform.contractCounts"]) &&
    /\{digest\}/.test(DICTIONARIES[id]["platform.contractDigest"])));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
