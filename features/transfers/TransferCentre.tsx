import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { getClub, formatValue } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { transferRumours, clubOf, availableKinds, type RumourLink } from "@/domain/transfers";
import { newsKindLabel, rowLine } from "@/domain/rowText";
import { sum } from "@/domain/attributes";
import type { NewsArticle } from "@/domain/types";
import { Panel, SectionTitle, Crest, PositionTag, EmptyState, StatTile, DemoBadge } from "@/ui/primitives";
import { Badge } from "@/components/ui/badge";
import {cn, pctLabel, ABSENT } from "@/lib/utils";

const KIND_TONE: Record<NewsArticle["kind"], string> = {
  Rumor: "border-warning/50 text-warning",
  Reported: "border-info/50 text-info",
  Confirmed: "border-success/50 text-success",
  Analysis: "border-border text-muted-foreground",
  Opinion: "border-border text-muted-foreground",
};

export function TransferCentre() {
  const { t } = useI18n();
  const { state } = useOs();
  const viewerClubId = state.profile?.favoriteClubId ?? undefined;
  const viewerClub = viewerClubId ? getClub(viewerClubId) : undefined;
  const kinds = useMemo(() => availableKinds(), []);
  const [active, setActive] = useState<Set<NewsArticle["kind"]>>(() => new Set(kinds));

  const all = useMemo(() => transferRumours(viewerClubId), [viewerClubId]);
  const rows = useMemo(() => all.filter((r) => active.has(r.kind)), [all, active]);

  const toggle = (k: NewsArticle["kind"]) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next.size ? next : new Set([k]);
    });

  const confirmed = all.filter((r) => r.kind === "Confirmed").length;
  const targets = all.filter((r) => r.isTarget).length;
  const totalFee = sum(rows, (r) => r.askingFee);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("transfers.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewerClub ? (
              <>
                {t("transfers.subtitleFor")}{" "}
                <span className="inline-flex items-center gap-1 align-middle font-medium text-foreground">
                  <Crest colors={viewerClub.colors} short={viewerClub.short} size={16} />
                  {viewerClub.name}
                </span>{" "}
                — <Link to="/clubs" className="text-primary hover:underline">{t("transfers.changeClub")}</Link>
              </>
            ) : (
              t("transfers.subtitle")
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("transfers.statLinks")} value={all.length} sub={t("transfers.statLinksSub")} />
        <StatTile label={t("transfers.confirmed")} value={confirmed} tone={confirmed ? "up" : "neutral"} />
        <StatTile label={t("transfers.fitTargets")} value={viewerClub ? targets : ABSENT} sub={viewerClub ? t("transfers.fitTargetsSub") : t("transfers.setClub")} tone={targets ? "up" : "neutral"} />
        <StatTile label={t("transfers.totalAsk")} value={rows.length ? formatValue(totalFee) : ABSENT} sub={t("transfers.totalAskSub")} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{t("transfers.filter")}</span>
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active.has(k) ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30",
            )}
          >
            {newsKindLabel(k, t)}
          </button>
        ))}
      </div>

      {!rows.length ? (
        <Panel className="p-4">
          <EmptyState title={t("transfers.empty")} icon="£" hint={t("transfers.emptyHint")} />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((r) => <RumourCard key={r.articleId} r={r} showFit={!!viewerClub} />)}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{t("transfers.disclaimer")}</p>
    </div>
  );
}

function RumourCard({ r, showFit }: { r: RumourLink; showFit: boolean }) {
  const { t } = useI18n();
  const club = clubOf(r.playerId);
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Crest colors={club?.colors} short={club?.short} size={34} />
          <div className="min-w-0">
            <Link to={`/players/${r.playerId}`} className="truncate font-semibold hover:text-primary hover:underline">{r.playerName}</Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <PositionTag position={r.position} />
              <span>{r.age}y</span>
              <span>·</span>
              <Link to={`/clubs/${r.fromClubId}`} className="hover:text-primary hover:underline">{r.fromClubName}</Link>
            </div>
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-[10px]", KIND_TONE[r.kind])}>{newsKindLabel(r.kind, t)}</Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-sm">{rowLine(r.title, t)}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Cell label={t("transfers.askingFee")} value={formatValue(r.askingFee)} />
        <Cell label={t("transfers.valueIndex")} value={`${r.valueIndex}`} sub={t("transfers.valueIndexSub")} />
        <Cell label={t("transfers.headroom")} value={`+${r.headroom}`} sub={t("transfers.potential")} />
      </div>

      {showFit && r.fitScore != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("transfers.fit")}</span>
            <span className={cn("font-mono font-semibold tabular-nums", r.isTarget ? "text-success" : "text-foreground")}>
              {r.fitScore}{r.isTarget && <span className="ml-1 text-[10px] font-normal">{t("transfers.priority")}</span>}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className={cn("h-full rounded-full", r.isTarget ? "bg-success" : "bg-info")} style={{ width: `${r.fitScore}%` }} />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="truncate">{r.source}</span>
          <Badge variant="outline" className="text-[10px]">{pctLabel(r.credibility)}</Badge>
        </span>
        <Link to={`/news/${r.articleId}`} className="text-primary hover:underline">{t("transfers.viewSource")} →</Link>
      </div>
    </Panel>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card/50 px-2 py-1.5">
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}
