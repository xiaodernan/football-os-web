// The platform map (M1036) — one descriptor for the Spring Cloud skeleton under `services/`.
//
// Nothing in the SPA calls these services. The atlas screen renders the architecture the
// repository declares, and scripts/proof-services.mjs reads the same rows to hold the Maven
// modules, the compose ports and the gateway routes in step: a port that moves in a pom or in
// docker-compose.yml without moving here is a red gate, not a stale diagram.

export type ServiceId = "registry" | "gateway" | "league";

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

/** Registry first, then the edge, then the domain service — the dependency order. */
export const PLATFORM_SERVICES: readonly PlatformService[] = [
  { id: "registry", module: "eureka-server", appName: "football-os-registry", port: 8761, dependsOn: [] },
  { id: "gateway", module: "gateway", appName: "football-os-gateway", port: 8080, dependsOn: ["registry"] },
  { id: "league", module: "league-service", appName: "league-service", port: 8081, dependsOn: ["registry"] },
];

export const GATEWAY_ROUTES: readonly GatewayRoute[] = [
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

/** The league service's read is an exported snapshot of this world, not a hand-written payload.
 *  scripts/export-service-contract.mjs writes it; proof-services.mjs refuses it when stale. */
export const LEAGUE_CONTRACT = {
  resource: "league-summary.json",
  path: "services/league-service/src/main/resources/league-summary.json",
  exporter: "scripts/export-service-contract.mjs",
} as const;
