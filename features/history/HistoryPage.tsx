import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { buildTimeline, groupByDay, type TimelineKind } from "@/domain/history";
import { LESSONS } from "@/domain/learn";
import { useLearnRecords } from "@/lib/hooks";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const KINDS: { id: TimelineKind | "all"; icon: string; label: string }[] = [
  { id: "all", icon: "≡", label: "hist.all" },
  { id: "session", icon: "●", label: "hist.kind.session" },
  { id: "plan", icon: "⚡", label: "hist.kind.plan" },
  { id: "learn", icon: "◈", label: "hist.kind.learn" },
  { id: "memory", icon: "❉", label: "hist.kind.memory" },
];

const KIND_META: Record<TimelineKind, { icon: string; label: string; tone: string }> = {
  session: { icon: "●", label: "hist.kind.session", tone: "text-primary" },
  plan: { icon: "⚡", label: "hist.kind.plan", tone: "text-info" },
  learn: { icon: "◈", label: "hist.kind.learn", tone: "text-warning" },
  memory: { icon: "❉", label: "hist.kind.memory", tone: "text-muted-foreground" },
};

export function HistoryPage() {
  const { t } = useI18n();
  const { state } = useOs();
  const [filter, setFilter] = useState<TimelineKind | "all">("all");

  const learn = useLearnRecords();

  const all = useMemo(
    () =>
      buildTimeline({
        sessions: state.sessions,
        plans: state.plans,
        memory: state.memory,
        learn: learn.map((r) => ({
          id: r.id,
          title: LESSONS.find((l) => l.id === r.id)?.title ?? r.id,
          completedAt: r.completedAt,
          quizCorrect: r.quizCorrect,
          attempts: r.attempts,
        })),
      }),
    [state, learn],
  );
  const filtered = useMemo(() => (filter === "all" ? all : all.filter((e) => e.kind === filter)), [all, filter]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("hist.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("hist.subtitle")}</p>
        </div>
        <Link to="/profile" className="text-sm text-primary hover:underline">{t("hist.backToProfile")} →</Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => {
          const count = k.id === "all" ? all.length : all.filter((e) => e.kind === k.id).length;
          return (
            <button
              key={k.id}
              onClick={() => setFilter(k.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                filter === k.id ? "border-primary/40 bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{k.icon}</span>
              <span>{t(k.label)}</span>
              <span className="font-mono tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <Panel className="p-6">
          <EmptyState title={t("hist.empty")} hint={t("hist.emptyHint")} icon="⧗" />
        </Panel>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <Panel key={g.day} className="p-4">
              <SectionTitle title={dayLabel(g.day, t)} hint={`${g.items.length} ${t("hist.events")}`} />
              <ol className="relative space-y-3 border-l border-border/60 pl-5">
                {g.items.map((e) => {
                  const meta = KIND_META[e.kind];
                  return (
                    <li key={e.id} className="relative">
                      <span className={cn("absolute -left-[26px] top-0.5 grid h-4 w-4 place-items-center rounded-full border bg-card text-[9px]", meta.tone)}>
                        {meta.icon}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{e.title}</span>
                        {typeof e.xp === "number" && e.xp > 0 && (
                          <Badge variant="outline" className="font-mono text-success">+{e.xp} XP</Badge>
                        )}
                        {typeof e.score === "number" && (
                          <span className="text-[11px] text-muted-foreground">{e.score}/5</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={cn("uppercase tracking-wide", meta.tone)}>{t(meta.label)}</span>
                        {e.detail && <span>· {e.detail}</span>}
                        <span>· {fmtTime(e.at)}</span>
                      </div>
                      {e.growth && e.growth.some((g) => g.delta > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {e.growth.filter((g) => g.delta > 0).map((g) => (
                            <span key={g.key} className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">{g.label} +{g.delta}</span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Panel>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{t("hist.disclaimer")}</p>
    </div>
  );
}

function dayLabel(key: string, t: (k: string) => string): string {
  if (key === "invalid") return t("hist.invalid");
  const now = new Date();
  const today = keyOf(now);
  const y = new Date(now.getTime() - 86400000);
  if (key === today) return t("hist.today");
  if (key === keyOf(y)) return t("hist.yesterday");
  const [yy, mm, dd] = key.split("-").map(Number);
  return `${mm}/${dd}/${yy}`;
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
