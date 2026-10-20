import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { formatDate, useI18n, type Locale } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { buildTimeline, groupByDay, dayKey, type TimelineKind } from "@/domain/history";
import { rowLine, type RowText } from "@/domain/rowText";
import { lessonById } from "@/domain/learn";
import { useLearnRecords, useFilmRecords } from "@/lib/hooks";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { cn, DAY_MS, isRealInstant } from "@/lib/utils";

const KINDS: { id: TimelineKind | "all"; icon: string; labelKey: string }[] = [
  { id: "all", icon: "≡", labelKey: "hist.all" },
  { id: "session", icon: "●", labelKey: "hist.kind.session" },
  { id: "plan", icon: "⚡", labelKey: "hist.kind.plan" },
  { id: "learn", icon: "◈", labelKey: "hist.kind.learn" },
  { id: "film", icon: "▣", labelKey: "hist.kind.film" },
  { id: "memory", icon: "❉", labelKey: "hist.kind.memory" },
];

const KIND_META: Record<TimelineKind, { icon: string; labelKey: string; tone: string }> = {
  session: { icon: "●", labelKey: "hist.kind.session", tone: "text-primary" },
  plan: { icon: "⚡", labelKey: "hist.kind.plan", tone: "text-info" },
  learn: { icon: "◈", labelKey: "hist.kind.learn", tone: "text-warning" },
  film: { icon: "▣", labelKey: "hist.kind.film", tone: "text-success" },
  memory: { icon: "❉", labelKey: "hist.kind.memory", tone: "text-muted-foreground" },
};

export function HistoryPage() {
  const { t, locale } = useI18n();
  const { state } = useOs();
  const [filter, setFilter] = useState<TimelineKind | "all">("all");

  const learn = useLearnRecords();
  const film = useFilmRecords();

  // A completed lesson's title is the catalogue's own word, so the timeline carries the KEY and
  // the reader resolves it. An id that matches no lesson is not a sentence anyone wrote — it is
  // the record's own value, shown as written.
  const lessonTitleRow = (id: string): RowText => {
    const l = lessonById(id);
    return l ? { key: l.titleKey } : { value: id };
  };

  const all = useMemo(
    () =>
      buildTimeline({
        sessions: state.sessions,
        plans: state.plans,
        memory: state.memory,
        learn: learn.map((r) => ({
          id: r.id,
          title: lessonTitleRow(r.id),
          completedAt: r.completedAt,
          quizCorrect: r.quizCorrect,
          attempts: r.attempts,
        })),
        film: film.map((c) => ({
          id: c.clipId,
          at: c.addedAt,
          fileName: c.report.fileName,
          durationSec: c.report.durationSec ?? 0,
          detections: c.report.events?.length ?? 0,
          scans: (c.report.events ?? []).filter((e) => e.kind === "scan").length,
          confidence: c.report.confidence ?? 0,
          recommendedFocus: c.report.recommendedFocus ?? [],
        })),
      }),
    [state, learn, film],
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
              <span>{t(k.labelKey)}</span>
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
              <SectionTitle title={dayLabel(g.day, t, locale)} hint={`${g.items.length} ${t("hist.events")}`} />
              <ol className="relative space-y-3 border-l border-border/60 pl-5">
                {g.items.map((e) => {
                  const meta = KIND_META[e.kind];
                  const detail = rowLine(e.detail, t);
                  return (
                    <li key={e.id} className="relative">
                      <span className={cn("absolute -left-[26px] top-0.5 grid h-4 w-4 place-items-center rounded-full border bg-card text-[9px]", meta.tone)}>
                        {meta.icon}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{rowLine(e.title, t)}</span>
                        {typeof e.xp === "number" && e.xp > 0 && (
                          <Badge variant="outline" className="font-mono text-success">+{e.xp} XP</Badge>
                        )}
                        {typeof e.score === "number" && (
                          <span className="text-[11px] text-muted-foreground">{e.score}/5</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={cn("uppercase tracking-wide", meta.tone)}>{t(meta.labelKey)}</span>
                        {detail && <span>· {detail}</span>}
                        <span>· {fmtTime(locale, e.at)}</span>
                      </div>
                      {e.growth && e.growth.some((g) => g.delta > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {e.growth.filter((g) => g.delta > 0).map((g) => (
                            <span key={g.key} className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">{t(`attr.name.${g.key}`)} +{g.delta}</span>
                          ))}
                        </div>
                      )}
                      {e.note && (
                        <div className="mt-1 border-l-2 border-border/60 pl-2 text-xs italic text-muted-foreground">
                          “{e.note}”
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

function dayLabel(key: string, t: (k: string) => string, locale: Locale): string {
  if (key === "invalid") return t("hist.invalid");
  const now = new Date();
  const today = dayKey(now.toISOString());
  const y = new Date(now.getTime() - DAY_MS);
  if (key === today) return t("hist.today");
  if (key === dayKey(y.toISOString())) return t("hist.yesterday");
  const [yy, mm, dd] = key.split("-").map(Number);
  return formatDate(locale, new Date(yy, mm - 1, dd), { month: "numeric", day: "numeric", year: "numeric" });
}

function fmtTime(locale: Locale, iso: string): string {
  const d = new Date(iso);
  if (!isRealInstant(d)) return "";
  return formatDate(locale, d, { hour: "2-digit", minute: "2-digit" });
}
