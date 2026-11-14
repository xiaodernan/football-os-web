import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { CHIP_CLASS, Panel, SectionTitle, DemoBadge, PANEL_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { GATEWAY_ROUTES, LEAGUE_CONTRACT, PLATFORM_LIVE, PLATFORM_SERVICES, CIRCUIT_BREAKER, HTTP_VALIDATORS, REDIS, BROKER, type ServiceId } from "@/domain/platform";
import leagueContract from "../../services/league-service/src/main/resources/league-summary.json";

/**
 * M1036: the platform atlas — the Spring Cloud skeleton the repository declares, drawn from
 * domain/platform.ts. Every port, name and route comes from the descriptor; none is typed here,
 * so this screen cannot drift from the poms, the compose file or the gateway's own yml.
 * It is a map, not a status board: PLATFORM_LIVE is false and the page says so.
 *
 * M1104: the optional fleet panel IS a status board — the honest probe described above.
 */
const SPRING_FLEET_URL = "/api/spring/fleet";

export function PlatformAtlas() {
  const { t } = useI18n();

  const copy: Record<ServiceId, { name: string; role: string }> = {
    registry: { name: t("platform.svcRegistry"), role: t("platform.svcRegistryRole") },
    config: { name: t("platform.svcConfig"), role: t("platform.svcConfigRole") },
    gateway: { name: t("platform.svcGateway"), role: t("platform.svcGatewayRole") },
    league: { name: t("platform.svcLeague"), role: t("platform.svcLeagueRole") },
    discipline: { name: t("platform.svcDiscipline"), role: t("platform.svcDisciplineRole") },
    cache: { name: t("platform.svcCache"), role: t("platform.svcCacheRole") },
    messaging: { name: t("platform.svcMessaging"), role: t("platform.svcMessagingRole") },
  };

  const kindFor = (id: ServiceId) =>
    id === "registry" ? t("platform.kindRegistry")
      : id === "config" ? t("platform.kindConfig")
        : id === "gateway" ? t("platform.kindEdge")
          : id === "cache" ? t("platform.kindCache")
            : id === "messaging" ? t("platform.kindMessaging")
              : t("platform.kindDomain");

  // M1104 · the Spring fleet probe — polled only if you armed SPRING_<ID>_BASE on this dev/preview
  // server. The response NEVER carries a base URL; unset services come back configured:false and
  // their tile prints "not armed". 503/unconfigured → the panel prints the honest unset line.
  const [fleet, setFleet] = useState(null as null | { ok: boolean; reason?: string; services?: Array<{ id: ServiceId; configured: boolean; up: boolean | null; ms: number | null; reason?: string | null }> | null });
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(SPRING_FLEET_URL, { cache: "no-store", signal: AbortSignal.timeout(4000) });
        const body = await r.json();
        if (alive) setFleet({ ok: r.ok && body?.ok === true, reason: body?.reason ?? null, services: body?.services ?? null });
      } catch {
        if (alive) setFleet({ ok: false, reason: "unreachable" });
      }
    };
    void tick();
    const iv = window.setInterval(tick, 10_000);
    return () => { alive = false; window.clearInterval(iv); };
  }, []);
  const armed = fleet?.services?.filter((s) => s.configured) ?? [];
  const upCount = armed.filter((s) => s.up === true).length;

  return (
    <div className="space-y-5">
      {/* Cinematic hero for the platform atlas — the descriptor stays the truth. */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-4", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-14 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-cyan -right-12 -bottom-10 h-36 w-36" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">{t("platform.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("platform.subtitle")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={cn(CHIP_CLASS.muted, "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-widest")}>
              {t("platform.descriptorBadge")}
            </span>
            <span className="text-[11px] uppercase tracking-widest text-primary">
              {PLATFORM_LIVE ? t("platform.liveOn") : t("platform.liveOff")}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("platform.liveLine")}</p>
        </div>
      </header>

      <Panel className="p-5">
        <SectionTitle title={t("platform.topoTitle")} hint={t("platform.topoHint")} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLATFORM_SERVICES.map((service) => (
            <div key={service.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-sm font-medium">{copy[service.id].name}</span>
                <span className={cn(CHIP_CLASS.muted, "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest")}>
                  {kindFor(service.id)}
                </span>
              </div>
              <div className="mt-2 truncate font-mono text-xs text-muted-foreground">{service.appName}</div>
              <div className="mt-2 font-mono text-xl font-bold tabular-nums">
                {t("platform.portLine", { n: service.port })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{copy[service.id].role}</p>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {t("platform.dependsLabel")}
                {" · "}
                {service.dependsOn.length === 0
                  ? t("platform.noDeps")
                  : service.dependsOn.map((dep) => copy[dep].name).join(" · ")}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("platform.topoMethod")}</p>
      </Panel>

      {/* M1104 · the honest fleet probe — server-side only; tiles print what Spring's own health says. */}
      <Panel className="p-5">
        <SectionTitle title={t("platform.fleetTitle")} hint={t("platform.fleetHint")} />
        <div className="mt-3 text-sm">
          {fleet === null && <div className="text-muted-foreground">{t("platform.fleetLoading")}</div>}
          {fleet !== null && fleet.reason === "unconfigured" && (
            <div className="text-muted-foreground">{t("platform.fleetUnconfigured")}</div>
          )}
          {fleet !== null && fleet.reason !== "unconfigured" && fleet.services && (
            <>
              <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-primary">
                {t("platform.fleetSummary", { armed: armed.length, up: upCount })}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {fleet.services.map((service) => (
                  <div key={service.id} className="rounded-lg border p-3">
                    <div className="text-sm font-medium">{copy[service.id]?.name ?? service.id}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest",
                        !service.configured
                          ? CHIP_CLASS.mutedSoft
                          : service.up === true
                            ? CHIP_CLASS.success
                            : CHIP_CLASS.destructive,
                      )}>
                        {!service.configured
                          ? t("platform.fleetNotArmed")
                          : service.up === true
                            ? t("platform.fleetUp", { ms: service.ms ?? 0 })
                            : t("platform.fleetDown", { reason: service.reason ?? "" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("platform.fleetBoundary")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("platform.routesTitle")} hint={t("platform.routesHint")} />
        <ul className="mt-3 space-y-1">
          {GATEWAY_ROUTES.map((route) => (
            <li
              key={route.id}
              className="grid items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[1fr_auto_1fr]"
            >
              <span className="min-w-0 truncate font-mono text-xs">{route.path}</span>
              <span className="hidden text-center text-muted-foreground sm:block">{"→"}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{copy[route.target].name}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("platform.stripPrefix", { n: route.stripPrefix })}
                  {" · "}
                  {t("platform.plannedConsumers", { list: route.consumers.join(" · ") })}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t("platform.routesMethod")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("platform.boundaryTitle")} />
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li className="rounded-lg border px-3 py-2">{t("platform.realModules")}</li>
          <li className="rounded-lg border px-3 py-2">{t("platform.realCompose")}</li>
          <li className="rounded-lg border px-3 py-2">{t("platform.notStarted")}</li>
          <li className="rounded-lg border px-3 py-2">{t("platform.notData")}</li>
          <li className="rounded-lg border px-3 py-2">
            <span className="block">{t("platform.contractLine")}</span>
            <span className="mt-1 block truncate font-mono text-xs">{LEAGUE_CONTRACT.path}</span>
            <span className="mt-1 block font-mono text-xs text-foreground">
              {t("platform.contractCounts", {
                clubs: leagueContract.snapshot.clubs,
                players: leagueContract.snapshot.players,
                matches: leagueContract.snapshot.matches,
                finished: leagueContract.snapshot.finishedMatches,
              })}
            </span>
            <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
              {t("platform.contractDigest", { digest: leagueContract.digest })}
            </span>
          </li>
          <li className="rounded-lg border px-3 py-2">{t("platform.circuitFallback")}</li>
          <li className="rounded-lg border px-3 py-2">{t("platform.configWiring")}</li>
          <li className="rounded-lg border px-3 py-2">
            <span className="block">{t("platform.redisLine", { image: REDIS.image, port: REDIS.port })}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{t("platform.cacheBoundary")}</span>
          </li>
          <li className="rounded-lg border px-3 py-2">
            <span className="block">{t("platform.redisTablesLine", { resource: REDIS.tablesResource, ttl: REDIS.tablesTtlSeconds })}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{t("platform.redisTablesBoundary")}</span>
          </li>
          <li className="rounded-lg border px-3 py-2">
            <span className="block">{t("platform.brokerLine", { image: BROKER.image, port: BROKER.port })}</span>
            <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">{t("platform.exchangeLine", { exchange: BROKER.exchange, dlq: BROKER.dlq })}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{t("platform.messagingBoundary")}</span>
          </li>
          <li className="rounded-lg border px-3 py-2">
            <span className="block">{t("platform.validatorLine", {
              n: HTTP_VALIDATORS.guarded.length,
              algorithm: HTTP_VALIDATORS.algorithm,
            })}</span>
            <span className="mt-1 block truncate font-mono text-[11px] text-foreground">
              {HTTP_VALIDATORS.guarded.map((e) => e.viaGateway).join(" · ")}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{t("platform.validatorBoundary")}</span>
          </li>
        </ul>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("platform.breakerLine", { name: CIRCUIT_BREAKER.name, path: CIRCUIT_BREAKER.fallbackPath, s: CIRCUIT_BREAKER.waitSeconds })}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t("platform.witnessLine")}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{t("platform.witnessCmd")}</p>
      </Panel>
    </div>
  );
}
