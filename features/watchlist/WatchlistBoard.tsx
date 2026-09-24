import { useMemo, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { getPlayer, getClub, formatValue } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { headroom, valueIndex, primeYears, templateEdge } from "@/domain/scouting";
import type { PlayerRef } from "@/domain/types";
import { Panel, SectionTitle, Crest, PositionTag, EmptyState, StatTile, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Sort = "value" | "potential" | "overall" | "age";

export function WatchlistBoard() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const { state, toggleWatch } = useOs();
  const [sort, setSort] = useState<Sort>("value");
  const [picked, setPicked] = useState<string[]>([]);

  const players = useMemo(() => {
    const list = state.watchlist.map(getPlayer).filter(Boolean) as PlayerRef[];
    const cmp: Record<Sort, (a: PlayerRef, b: PlayerRef) => number> = {
      value: (a, b) => valueIndex(b) - valueIndex(a),
      potential: (a, b) => b.potential - a.potential || headroom(b) - headroom(a),
      overall: (a, b) => b.overall - a.overall,
      age: (a, b) => a.age - b.age || b.potential - a.potential,
    };
    return [...list].sort(cmp[sort]);
  }, [state.watchlist, sort]);

  const togglePick = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)));

  const canCompare = picked.length === 2;

  if (!players.length) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("watch.title")}</h1>
          <DemoBadge />
        </div>
        <Panel className="p-6">
          <EmptyState title={t("watch.empty")} icon="☆" hint={t("watch.emptyHint")} />
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" onClick={() => navigate("/scouting")}>{t("watch.goScouting")}</Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/football")}>{t("watch.goWorld")}</Button>
          </div>
        </Panel>
      </div>
    );
  }

  const avgValue = Math.round(players.reduce((s, p) => s + p.value, 0) / players.length);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("watch.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("watch.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("watch.sort")}</span>
          <div className="flex gap-1.5">
            {(["value", "potential", "overall", "age"] as Sort[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  sort === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30",
                )}
              >
                {t(`watch.sort.${s}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t("watch.count")} value={players.length} />
        <StatTile label={t("watch.avgValue")} value={formatValue(avgValue)} />
        <StatTile label={t("watch.picked")} value={picked.length} sub={`${picked.length}/2`} tone={canCompare ? "up" : "neutral"} />
      </div>

      <Panel className="p-0">
        <div className="flex items-center justify-between px-4 pt-4">
          <SectionTitle title={t("watch.board")} hint={t("watch.boardHint")} />
          <Button size="sm" disabled={!canCompare} onClick={() => navigate(`/compare?a=${picked[0]}&b=${picked[1]}`)}>
            {t("watch.compare")}
          </Button>
        </div>
        <div className="mt-2 divide-y">
          {players.map((p) => {
            const club = getClub(p.clubId);
            const on = picked.includes(p.id);
            return (
              <div key={p.id} className={cn("flex items-center gap-3 px-4 py-2.5", on && "bg-primary/5")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => togglePick(p.id)}
                  aria-label={`Select ${p.name}`}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                <Crest colors={club?.colors} short={club?.short} size={30} />
                <div className="min-w-0 flex-1">
                  <Link to={`/players/${p.id}`} className="truncate text-sm font-medium hover:text-primary hover:underline">{p.name}</Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PositionTag position={p.position} />
                    <span>{p.age}y</span>
                    <span>·</span>
                    <span className="truncate">{club?.name}</span>
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="font-mono text-sm tabular-nums">{formatValue(p.value)}</div>
                  <div className="text-[11px] text-muted-foreground">{t("watch.asking")} {formatValue(Math.round(p.value * 1.1))}</div>
                </div>
                <div className="w-14 text-right">
                  <div className="font-mono text-sm font-semibold tabular-nums">{p.overall}</div>
                  <div className="text-[11px] text-muted-foreground">↗ {p.potential}</div>
                </div>
                <div className="hidden w-16 text-right md:block">
                  <div className="font-mono text-sm tabular-nums">{valueIndex(p).toFixed(1)}</div>
                  <div className="text-[11px] text-muted-foreground">{t("watch.vindex")}</div>
                </div>
                <div className="hidden w-16 text-right md:block">
                  <div className="font-mono text-sm tabular-nums">+{headroom(p)}</div>
                  <div className="text-[11px] text-muted-foreground">{t("watch.headroom")}</div>
                </div>
                {(() => {
                  const edge = templateEdge(p);
                  if (!edge) return null;
                  return (
                    <div className="hidden w-28 text-right xl:block" title={t("watch.templateHint")}>
                      <div className={cn("font-mono text-sm tabular-nums", edge.bestDelta > 0 ? "text-success" : "text-muted-foreground")}>
                        {t(`compare.cat.${edge.bestCategory}`)} {edge.bestDelta > 0 ? `+${edge.bestDelta}` : edge.bestDelta}
                      </div>
                      <div className={cn("text-[11px] tabular-nums", edge.worstDelta < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {t(`compare.cat.${edge.worstCategory}`)} {edge.worstDelta > 0 ? `+${edge.worstDelta}` : edge.worstDelta}
                      </div>
                    </div>
                  );
                })()}
                <div className="hidden w-16 text-right lg:block">
                  <div className="font-mono text-sm tabular-nums">{primeYears(p)}</div>
                  <div className="text-[11px] text-muted-foreground">{t("watch.prime")}</div>
                </div>
                <button onClick={() => toggleWatch(p.id)} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Remove ${p.name}`}>✕</button>
              </div>
            );
          })}
        </div>
      </Panel>

      <p className="text-[11px] text-muted-foreground">{t("watch.disclaimer")}</p>
    </div>
  );
}
