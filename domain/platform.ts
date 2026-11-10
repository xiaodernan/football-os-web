// The platform map (M1036) — one descriptor for the Spring Cloud skeleton under `services/`.
//
// Nothing in the SPA calls these services. The atlas screen renders the architecture the
// repository declares, and scripts/proof-services.mjs reads the same rows to hold the Maven
// modules, the compose ports and the gateway routes in step: a port that moves in a pom or in
// docker-compose.yml without moving here is a red gate, not a stale diagram.

export type ServiceId = "registry" | "config" | "gateway" | "league";

export interface PlatformService {
  id: ServiceId;
  /** The Maven module directory under services/ (and its artifactId). */
  module: string;
  /** The name the registry lists it under (spring.application.name). */
  appName: string;
  port: number;
  /** Edges point at the registry: the gateway resolves the league service by name. */
  dependsOn: readonly ServiceId[];
}

export interface GatewayRoute {
  /** The route id in gateway/src/main/resources/application.yml. */
  id: string;
  /** The Path predicate the gateway matches. */
  path: string;
  target: ServiceId;
  /** How many leading segments the gateway strips before forwarding. */
  stripPrefix: number;
  /** SPA routes that would read this route once it is wired — planned, not live. */
  consumers: readonly string[];
}

/** Registry first, then the config server, then the edge, then the domain service — the
 *  dependency order. The config server registers with Eureka like the other two does, so the
 *  registry stays the healthiest dead-simple thing to depend on. */
export const PLATFORM_SERVICES: readonly PlatformService[] = [
  { id: "registry", module: "eureka-server", appName: "football-os-registry", port: 8761, dependsOn: [] },
  { id: "config", module: "config-server", appName: "football-os-config", port: 8888, dependsOn: ["registry"] },
  { id: "gateway", module: "gateway", appName: "football-os-gateway", port: 8087, dependsOn: ["registry"] },
  { id: "league", module: "league-service", appName: "league-service", port: 8081, dependsOn: ["registry", "config"] },
];

/** Two routes, both StripPrefix=1, both breaking the same leagueSummary circuit. The table route
 *  shares the league service's frozen tables dump; the summary route serves the counts digest.
 *  Planned readers are plans, not call sites: nothing in the SPA fetches these today. */
export const GATEWAY_ROUTES: readonly GatewayRoute[] = [
  {
    id: "league-table",
    path: "/api/league/table/**",
    target: "league",
    stripPrefix: 1,
    consumers: ["/league-rules", "/run-in", "/title-race"],
  },
  {
    id: "league-summary",
    path: "/api/league/**",
    target: "league",
    stripPrefix: 1,
    consumers: ["/leaders", "/data", "/run-in"],
  },
];

/** The SPA does not call the gateway yet; the atlas prints this instead of a fake green dot. */
export const PLATFORM_LIVE = false;

/** The gateway's circuit breaker — what the atlas prints in place of a "status: ok".
 *  The league route carries a Resilience4j instance (name leagueSummary); when the circuit opens
 *  the request is forwarded to /fallback, where a canned 503 body stands until the league
 *  service comes back. */
export const CIRCUIT_BREAKER = {
  name: "leagueSummary",
  fallbackPath: "/fallback",
  waitSeconds: 1,
} as const;

/** The league service's read is an exported snapshot of this world, not a hand-written payload.
 *  scripts/export-service-contract.mjs writes it; proof-services.mjs refuses it when stale. */
export const LEAGUE_CONTRACT = {
  resource: "league-summary.json",
  path: "services/league-service/src/main/resources/league-summary.json",
  exporter: "scripts/export-service-contract.mjs",
} as const;
