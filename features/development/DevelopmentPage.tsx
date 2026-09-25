import { useMemo, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { analyzeGap, type GapItem } from "@/domain/gap";
import { projectGrowth } from "@/domain/projection";
import { POSITION_GROUPS } from "@/domain/attributes";
import { attributeGoalTitle } from "@/domain/goals";
import type { PositionGroup } from "@/domain/types";
import { DEMO_MODE } from "@/data/footballService";
import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

function GapRow({ item, kind, action }: { item: GapItem; kind: "priority" | "strength"; action?: ReactNode }) {
  const { t } = useI18n();
  const max = Math.max(item.actual, item.target, 1);
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="min-w-0 truncate font-medium">{t(`attr.name.${item.key}`)}</span>
        <span className="ml-2 flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
          <span>{item.actual}</span>
          <span className="text-muted-foreground">/ {item.target}</span>
          <Badge variant="outline" className={cn(kind === "priority" ? "text-warning" : "text-success")}>
            {item.delta > 0 ? `−${item.delta}` : `+${Math.abs(item.delta)}`}
          </Badge>
          {action}
        </span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-secondary">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", kind === "priority" ? "bg-warning/70" : "bg-success/70")}
          style={{ width: `${(item.actual / max) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: `${(item.target / max) * 100}%` }}
          title={t("dv.roleTarget", { target: item.target })}
        />
      </div>
    </div>
  );
}

export function DevelopmentPage() {
  const { t } = useI18n();
  const { state, addGoal, requestPlan } = useOs();
  const { navigate } = useRouter();
  const profile = state.profile;
  const [group, setGroup] = useState<PositionGroup>(profile?.positionGroup ?? "CM");
  const [weeks, setWeeks] = useState(8);
  const [perWeek, setPerWeek] = useState(3);
  const [blocking, setBlocking] = useState(false);

  const analysis = useMemo(
    () => (profile ? analyzeGap({ attributes: profile.attributes, group }) : null),
    [profile, group],
  );

  const projection = useMemo(() => {
    if (!analysis || !profile) return null;
    const focus = analysis.priorities.slice(0, 4).map((p) => p.key);
    if (!focus.length) return null;
    const proj = projectGrowth({ attributes: profile.attributes, focusKeys: focus, sessionsPerWeek: perWeek, weeks, rating: 4 });
    const after = analyzeGap({ attributes: proj.projectedAttributes, group });
    return { proj, after };
  }, [analysis, profile, group, weeks, perWeek]);

  const isTracked = (key: string) => state.goals.some((g) => g.metric === "attribute" && g.key === key);
  const track = (it: GapItem) => {
    addGoal({ title: attributeGoalTitle(it.key), metric: "attribute", key: it.key, target: Math.round(it.target), current: Math.round(it.actual) });
    toast.success(t("dv.goalToast", { a: t(`attr.name.${it.key}`) }));
  };

  const startBlock = async () => {
    const keys = (analysis?.priorities ?? []).slice(0, 2).map((p) => p.key);
    if (!keys.length) return;
    setBlocking(true);
    try {
      const plan = await requestPlan(t("dv.blockPrompt"), 30, keys);
      toast.success(t("dv.blockDone", { n: plan.session.exercises.length, m: plan.session.targetMinutes }));
      navigate("/player/training");
    } catch {
      toast.error(t("dv.blockError"));
    } finally {
      setBlocking(false);
    }
  };

  if (!profile || !analysis) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">{t("dv.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dv.subtitle")}</p>
        </div>
        <Panel className="p-4">
          <EmptyState title={t("dv.noProfile")} hint={t("dv.noProfileHint")} icon="◈" />
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate("/profile")}>{t("dv.goProfile")}</Button>
          </div>
        </Panel>
      </div>
    );
  }

  const readinessTone: "up" | "neutral" = analysis.readiness >= 80 ? "up" : "neutral";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {t("dv.title")} {DEMO_MODE && <DemoBadge />}
          </h1>
          <p className="text-sm text-muted-foreground">{t("dv.subtitle")}</p>
        </div>
        <span className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground">{t("dv.modelNote")}</span>
      </div>

      {/* role selector */}
      <div className="flex flex-wrap gap-2">
        {POSITION_GROUPS.map((g) => {
          const active = g.id === group;
          const isOwn = g.id === profile.positionGroup;
          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {g.id}
              {isOwn && <span className="ml-1 opacity-70">·</span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label={t("dv.readiness")} value={`${analysis.readiness}%`} tone={readinessTone} sub={t(`group.${analysis.group}`)} />
          <StatTile label={t("dv.overall")} value={analysis.overall} sub={t("dv.tier", { n: Math.round(analysis.skill * 100) })} />
          <StatTile label={t("dv.priorities")} value={analysis.priorities.length} sub={t("dv.toWork")} />
          <StatTile label={t("dv.strengths")} value={analysis.strengths.length} tone="up" sub={t("dv.atTarget")} />
        </div>

        <Panel className="p-4">
          <SectionTitle title={t("dv.readiness")} hint={t("dv.readinessHint")} />
          <Progress value={analysis.readiness} className="mt-2" />
          <p className="mt-2 text-xs text-muted-foreground">{t("dv.readinessDesc")}</p>
        </Panel>

        <Panel className="p-4">
          <SectionTitle
            title={t("dv.priorities")}
            hint={t("dv.prioritiesHint")}
            action={
              analysis.priorities.length ? (
                <Link
                  to={`/player/coach?f=${analysis.priorities.slice(0, 2).map((p) => p.key).join(",")}`}
                  className="text-xs text-primary hover:underline"
                >
                  {t("dv.planFocus")} →
                </Link>
              ) : undefined
            }
          />
          {analysis.priorities.length ? (
            <div className="mt-3 space-y-2">
              {analysis.priorities.map((it) => (
                <GapRow
                  key={it.key}
                  item={it}
                  kind="priority"
                  action={
                    isTracked(it.key) ? (
                      <Badge variant="outline" className="text-success">{t("dv.tracked")} ✓</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => track(it)}>{t("dv.track")}</Button>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("dv.noGaps")}</p>
          )}
          {analysis.priorities.length > 0 && (
            <div className="mt-3 border-t border-border/50 pt-3">
              <Button size="sm" disabled={blocking} onClick={startBlock}>
                {blocking ? t("dv.blockBusy") : t("dv.blockCta")}
              </Button>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t("dv.blockHint")}</p>
            </div>
          )}
        </Panel>

        {projection && (
          <Panel className="p-4">
            <SectionTitle
              title={t("dv.projTitle")}
              hint={t("dv.projHint")}
              action={
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1 text-muted-foreground">
                    {t("dv.projWeeks")}
                    <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="rounded border border-border/60 bg-transparent px-1 py-0.5 text-foreground">
                      {[4, 8, 12, 16].map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-1 text-muted-foreground">
                    {t("dv.projPerWeek")}
                    <select value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} className="rounded border border-border/60 bg-transparent px-1 py-0.5 text-foreground">
                      {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </label>
                </div>
              }
            />
            <div className="mt-3 flex items-center gap-4 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("dv.readiness")}</div>
                <div className="font-mono tabular-nums">{analysis.readiness}% → <span className="text-success">{projection.after.readiness}%</span></div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("dv.overall")}</div>
                <div className="font-mono tabular-nums">{projection.proj.overallBefore} → <span className="text-success">{projection.proj.overallAfter}</span></div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {projection.proj.items.map((it) => (
                <div key={it.key} className="flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate">{t(`attr.name.${it.key}`)}</span>
                  <span className="ml-2 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {it.from} → {it.to} <span className="text-success">+{it.delta}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">{t("dv.projDisclaimer", { n: projection.proj.items.length })}</p>
          </Panel>
        )}

        <Panel className="p-4">
          <SectionTitle title={t("dv.strengths")} hint={t("dv.strengthsHint")} />
          {analysis.strengths.length ? (
            <div className="mt-3 space-y-2">
              {analysis.strengths.map((it) => <GapRow key={it.key} item={it} kind="strength" />)}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("dv.noStrengths")}</p>
          )}
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("dv.evidence")} />
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {analysis.evidence.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
          <div className="mt-3">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("dv.confidence")}: {analysis.confidence}%</span>
            <Progress value={analysis.confidence} className="mt-1" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {analysis.sources.map((s, i) => <span key={i}>↳ {s}</span>)}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t("dv.disclaimer")}</p>
        </Panel>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link to="/profile" className="text-primary hover:underline">{t("dv.linkProfile")} →</Link>
          <Link to="/player/attributes" className="text-primary hover:underline">{t("dv.linkAttributes")} →</Link>
          <Link to="/review" className="text-primary hover:underline">{t("dv.linkReview")} →</Link>
        </div>
      </div>
    </div>
  );
}
