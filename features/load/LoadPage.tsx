import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { buildLoad, ZONE_LABEL, type LoadZone } from "@/domain/load";
import { DEMO_MODE } from "@/data/footballService";
import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";
import { ProgressLine } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ZONE_TONE: Record<LoadZone, string> = {
  none: "border-border bg-secondary/30 text-muted-foreground",
  under: "border-primary/40 bg-primary/10 text-primary",
  optimal: "border-success/40 bg-success/10 text-success",
  caution: "border-warning/40 bg-warning/10 text-warning",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

const ACWR_TONE = (z: LoadZone): "up" | "down" | "neutral" =>
  z === "high" || z === "caution" ? "down" : z === "optimal" ? "up" : "neutral";

export function LoadPage() {
  const { t } = useI18n();
  const { state, requestPlan } = useOs();
  const { navigate } = useRouter();
  const [building, setBuilding] = useState(false);

  const load = useMemo(
    () => buildLoad({ nowMs: Date.now(), sessions: state.sessions }),
    [state.sessions],
  );

  // A session only helps in the zones where adding load is the point. In the
  // high-risk spike band the honest advice is to rest, so we withhold the
  // "plan a session" action there rather than contradict the guidance.
  const canPlan = load.zone === "under" || load.zone === "optimal" || load.zone === "caution";
  const planMinutes = load.zone === "caution" ? 20 : 30;

  const buildForLoad = async () => {
    if (!canPlan || building) return;
    setBuilding(true);
    try {
      const plan = await requestPlan(t("ld.trainPrompt"), planMinutes);
      toast.success(
        t("ld.trainDone", { m: plan.session.targetMinutes, n: plan.session.exercises.length }),
      );
      navigate("/player/training");
    } catch {
      toast.error(t("ld.trainError"));
    } finally {
      setBuilding(false);
    }
  };

  const dailyPoints = useMemo(
    () =>
      load.daily.map((d) => ({
        label: new Date(d.date + "T00:00:00Z").toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
        value: d.load,
      })),
    [load.daily],
  );

  const maxWeek = Math.max(1, ...load.weekly.map((w) => w.load));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {t("ld.title")} {DEMO_MODE && <DemoBadge />}
          </h1>
          <p className="text-sm text-muted-foreground">{t("ld.subtitle")}</p>
        </div>
        <span className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground">{t("ld.baseline")}</span>
      </div>

      {!load.hasData ? (
        <Panel className="p-4">
          <EmptyState title={t("ld.emptyTitle")} hint={t("ld.emptyHint")} icon="◔" />
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/player/coach")}>{t("ld.goCoach")}</Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          {/* zone banner */}
          <div className={cn("rounded-xl border px-4 py-3", ZONE_TONE[load.zone])}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold uppercase tracking-widest">{ZONE_LABEL[load.zone]}</span>
              <span className="font-mono text-sm">{t("ld.acwr")} {load.acwr == null ? "—" : load.acwr.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-sm">{load.advice}</p>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatTile label={t("ld.acwr")} value={load.acwr == null ? "—" : load.acwr.toFixed(2)} tone={ACWR_TONE(load.zone)} sub={t("ld.acwrSub")} />
            <StatTile label={t("ld.weekLoad")} value={load.weekLoad} sub="AU · 7d" />
            <StatTile label={t("ld.acute")} value={load.acute} sub={`AU · ${t("ld.perDay")}`} />
            <StatTile label={t("ld.chronic")} value={load.chronic} sub={`AU · ${t("ld.perDay")}`} />
            <StatTile label={t("ld.monotony")} value={load.monotony == null ? "—" : load.monotony.toFixed(2)} sub={load.strain == null ? t("ld.needWeeks") : `${t("ld.strain")} ${load.strain}`} />
            <StatTile label={t("ld.sessions")} value={load.totalSessions} sub={`${load.durationMin} ${t("ld.minutesUnit")}`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* weekly bars */}
            <Panel className="p-4 lg:col-span-2">
              <SectionTitle title={t("ld.weeklyTitle")} hint={t("ld.weeklyHint")} />
              <div className="mt-3 flex items-end gap-2" style={{ height: 140 }}>
                {load.weekly.map((w) => (
                  <div key={w.weekStart} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="font-mono text-[10px] text-muted-foreground">{w.load || ""}</span>
                    <div
                      className={cn("w-full rounded-t transition-all", w.sessions ? "bg-primary" : "bg-muted")}
                      style={{ height: `${Math.max(2, (w.load / maxWeek) * 100)}%` }}
                      title={`${w.sessions} ${t("ld.sessions")}`}
                    />
                    <span className="text-[9px] text-muted-foreground">{t("ld.wk")}{" "}{load.weekly.indexOf(w) + 1}</span>
                  </div>
                ))}
              </div>
              {dailyPoints.length > 1 && (
                <div className="mt-4">
                  <div className="mb-1 text-xs text-muted-foreground">{t("ld.dailyTitle")}</div>
                  <ProgressLine points={dailyPoints} height={120} />
                </div>
              )}
            </Panel>

            {/* recommendation */}
            <div className="space-y-4">
              <Panel className="p-4">
                <SectionTitle title={t("ld.recoTitle")} hint={t("ld.recoHint")} />
                {load.recommendation ? (
                  <div className="mt-1">
                    <p className="text-sm">{load.recommendation.text}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("ld.confidence")}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${load.recommendation.confidence}%` }} />
                      </div>
                      <span className="font-mono">{load.recommendation.confidence}%</span>
                    </div>
                    {canPlan ? (
                      <Button size="sm" className="mt-3 w-full" onClick={buildForLoad} disabled={building}>
                        {building ? t("ld.trainBusy") : t("ld.plan")}
                      </Button>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">{t("ld.restNote")}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("ld.recoEmpty")}</p>
                )}
              </Panel>

              <Panel className="p-4">
                <SectionTitle title={t("ld.thresholdsTitle")} />
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <li><span className="font-mono">&lt;0.8</span> · {t("ld.zoneUnder")}</li>
                  <li><span className="font-mono">0.8–1.3</span> · {t("ld.zoneOptimal")}</li>
                  <li><span className="font-mono">1.3–1.5</span> · {t("ld.zoneCaution")}</li>
                  <li><span className="font-mono">&gt;1.5</span> · {t("ld.zoneHigh")}</li>
                </ul>
              </Panel>
            </div>
          </div>

          {/* evidence + sources */}
          <Panel className="p-4">
            <SectionTitle title={t("common.evidence")} hint={t("ld.evidenceHint")} />
            <ul className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {load.evidence.map((e, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary">›</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{t("ld.sources")}:</span>
              {load.sources.map((s, i) => (
                <span key={i} className="rounded border px-1.5 py-0.5">{s}</span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t("ld.disclaimer")}</p>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Link to="/review" className="text-xs text-primary hover:underline">{t("ld.linkReview")} →</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/player/progress" className="text-xs text-primary hover:underline">{t("ld.linkProgress")} →</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/history" className="text-xs text-primary hover:underline">{t("ld.linkHistory")} →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
