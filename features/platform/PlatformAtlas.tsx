import { useI18n } from "@/i18n";
import { CHIP_CLASS, Panel, SectionTitle } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { GATEWAY_ROUTES, PLATFORM_LIVE, PLATFORM_SERVICES, type ServiceId } from "@/domain/platform";

/**
 * M1036: the platform atlas — the Spring Cloud skeleton the repository declares, drawn from
 * domain/platform.ts. Every port, name and route comes from the descriptor; none is typed here,
 * so this screen cannot drift from the poms, the compose file or the gateway's own yml.
 * It is a map, not a status board: PLATFORM_LIVE is false and the page says so.
 */
export function PlatformAtlas() {
  const { t } = useI18n();

  const copy: Record<ServiceId, { name: string; role: string }> = {
    registry: { name: t("platform.svcRegistry"), role: t("platform.svcRegistryRole") },
    gateway: { name: t("platform.svcGateway"), role: t("platform.svcGatewayRole") },
    league: { name: t("platform.svcLeague"), role: t("platform.svcLeagueRole") },
  };

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("platform.title")} hint={t("platform.subtitle")} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={cn(CHIP_CLASS.muted, "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-widest")}>
            {t("platform.descriptorBadge")}
          </span>
          <span className="text-[11px] uppercase tracking-widest text-primary">
            {PLATFORM_LIVE ? t("platform.liveOn") : t("platform.liveOff")}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("platform.liveLine")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("platform.topoTitle")} hint={t("platform.topoHint")} />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PLATFORM_SERVICES.map((service) => (
            <div key={service.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 text-sm font-medium">{copy[service.id].name}</span>
                <span className={cn(CHIP_CLASS.muted, "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest")}>
                  {service.id === "registry"
                    ? t("platform.kindRegistry")
                    : service.id === "gateway"
                      ? t("platform.kindEdge")
                      : t("platform.kindDomain")}
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
        </ul>
      </Panel>
    </div>
  );
}
