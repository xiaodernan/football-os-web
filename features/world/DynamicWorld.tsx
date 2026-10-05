import { useCallback, useEffect, useMemo, useState } from "react";
import { positionLabel } from "@/domain/rowText";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { runWorld, seasonLabel, formatMarket, type WorldInput, type SeasonStep } from "@/domain/worldEngine";
import { WORLD_KEY } from "@/domain/localData";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, LoadingBlock, ErrorState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STORE_KEY = WORLD_KEY;

function loadElapsed(): number {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return 0;
    const n = Number(JSON.parse(raw).seasonsElapsed);
    return Number.isFinite(n) && n >= 0 && n < 60 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function DynamicWorld() {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState<number>(() => loadElapsed());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ seasonsElapsed: elapsed }));
    } catch {
      /* storage may be unavailable; world sim still runs in-memory */
    }
  }, [elapsed]);

  const base = useMemo<WorldInput>(
    () => ({
      players: footballProvider.players(),
      clubs: footballProvider.clubs(),
      competitions: footballProvider.competitions(),
    }),
    [],
  );

  const snapshot = useMemo(() => {
    try {
      setError(null);
      return runWorld(base, elapsed);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Simulation failed"));
      return null;
    }
  }, [base, elapsed, nonce]);

  const advance = useCallback(() => {
    setBusy(true);
    // Brief async beat so the simulate action shows a real loading state.
    window.setTimeout(() => {
      setElapsed((n) => n + 1);
      setBusy(false);
    }, 450);
  }, []);

  const last: SeasonStep | undefined = snapshot?.history[snapshot.history.length - 1];
  const avgNow = last?.avgOverall ?? Math.round((base.players.reduce((s, p) => s + p.overall, 0) / base.players.length) * 10) / 10;
  const marketNow = last?.marketTotal ?? base.players.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("world.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("world.subtitle")} · {seasonLabel(elapsed)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setElapsed(0)} disabled={elapsed === 0}>
            {t("common.reset")}
          </Button>
          <Button size="sm" onClick={advance} disabled={busy || elapsed >= 60}>
            {busy ? t("world.simulating") : t("world.advance")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("world.seasons")} value={elapsed} sub={seasonLabel(elapsed)} />
        <StatTile label={t("world.squad")} value={snapshot ? snapshot.players.length : base.players.length} sub={t("world.sub.tracked")} />
        <StatTile label={t("world.avgOvr")} value={avgNow} tone={last && last.developments.length ? "up" : "neutral"} />
        <StatTile label={t("world.market")} value={formatMarket(marketNow)} sub={t("world.sub.market")} />
      </div>

      {!snapshot ? (
        <ErrorState error={error} retry={() => setNonce((n) => n + 1)} />
      ) : busy ? (
        <Panel className="p-4"><LoadingBlock rows={4} /></Panel>
      ) : elapsed === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("world.emptyTitle")} icon="⏱" hint={t("world.emptyHint")} />
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="p-4">
            <SectionTitle title={t("world.champions")} hint={last?.label} />
            <div className="divide-y">
              {last?.champions.map((c) => (
                <div key={c.compId} className="flex items-center gap-3 py-2.5">
                  <Crest colors={getClub(c.clubId)?.colors} short={getClub(c.clubId)?.short} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.clubName}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.compName}</div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{t("world.pts", { points: c.points })}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.developments")} hint={t("world.dev.hint")} />
            {last && last.developments.length ? (
              <div className="space-y-1.5">
                {last.developments.map((d) => (
                  <PlayerDelta key={d.id} name={d.name} clubId={d.clubId} from={d.from} to={d.to} delta={d.delta} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.dev.empty")}</p>
            )}
            {last && last.declines.length > 0 && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{t("world.declines")}</div>
                <div className="mt-1.5 space-y-1.5">
                  {last.declines.map((d) => <PlayerDelta key={d.id} name={d.name} clubId={d.clubId} from={d.from} to={d.to} delta={d.delta} />)}
                </div>
              </>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.prospects")} hint={t("world.prospects.hint")} />
            {last && last.prospects.length ? (
              <div className="space-y-1.5">
                {last.prospects.slice(0, 10).map((p) => (
                  <Link key={p.id} to={`/clubs/${p.clubId}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-secondary/40">
                    <span className="truncate">{p.name} <span className="text-xs text-muted-foreground">· {positionLabel(p.position, t)} · {p.age}</span></span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-muted-foreground">{p.overall}</span>
                      <Badge variant="outline" className="border-success/40 text-success">→ {p.potential}</Badge>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.prospects.empty")}</p>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.retired")} hint={t("world.retired.hint")} />
            {last && last.retired.length ? (
              <div className="space-y-1.5">
                {last.retired.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm">
                    <span className="truncate">{r.name} <span className="text-xs text-muted-foreground">· {getClub(r.clubId)?.name ?? r.clubId}</span></span>
                    <span className="font-mono text-xs text-muted-foreground">{t("world.ageOvr", { age: r.age, ovr: r.to })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.retired.empty")}</p>
            )}
          </Panel>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {t("world.disclaimer")}
      </p>
    </div>
  );
}

function PlayerDelta({ name, clubId, from, to, delta }: { name: string; clubId: string; from: number; to: number; delta: number }) {
  const up = delta > 0;
  return (
    <div className="flex items-center justify-between rounded-lg px-1 py-1 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Crest colors={getClub(clubId)?.colors} short={getClub(clubId)?.short} size={22} />
        <span className="truncate">{name}</span>
      </span>
      <span className="flex items-center gap-2 font-mono text-xs">
        <span className="text-muted-foreground">{from}</span>
        <span>→</span>
        <span className="font-semibold tabular-nums">{to}</span>
        <span className={up ? "text-success" : "text-destructive"}>{up ? "+" : ""}{delta}</span>
      </span>
    </div>
  );
}
