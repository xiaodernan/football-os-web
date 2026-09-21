import { useMemo, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { analyzeGap, type GapItem } from "@/domain/gap";
import { POSITION_GROUPS } from "@/domain/attributes";
import type { PositionGroup } from "@/domain/types";
import { DEMO_MODE } from "@/data/footballService";
import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function GapRow({ item, kind }: { item: GapItem; kind: "priority" | "strength" }) {
  const max = Math.max(item.actual, item.target, 1);
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/20 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="min-w-0 truncate font-medium">{item.label}</span>
        <span className="ml-2 flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
          <span>{item.actual}</span>
          <span className="text-muted-foreground">/ {item.target}</span>
          <Badge variant="outline" className={cn(kind === "priority" ? "text-warning" : "text-success")}>
            {item.delta > 0 ? `−${item.delta}` : `+${Math.abs(item.delta)}`}
          </Badge>
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
          title={`role target ${item.target}`}
        />
      </div>
    </div>
  );
}

export function DevelopmentPage() {
  const { t } = useI18n();
  const { state } = useOs();
  const { navigate } = useRouter();
  const profile = state.profile;
  const [group, setGroup] = useState<PositionGroup>(profile?.positionGroup ?? "CM");

  const analysis = useMemo(
    () => (profile ? analyzeGap({ attributes: profile.attributes, group }) : null),
    [profile, group],
  );

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
          <StatTile label={t("dv.readiness")} value={`${analysis.readiness}%`} tone={readinessTone} sub={analysis.groupLabel} />
          <StatTile label={t("dv.overall")} value={analysis.overall} sub={t("dv.tier").replace("{n}", String(Math.round(analysis.skill * 100)))} />
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
            action={<Link to="/player/coach" className="text-xs text-primary hover:underline">{t("dv.planFocus")} →</Link>}
          />
          {analysis.priorities.length ? (
            <div className="mt-3 space-y-2">
              {analysis.priorities.map((it) => <GapRow key={it.key} item={it} kind="priority" />)}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("dv.noGaps")}</p>
          )}
        </Panel>

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
