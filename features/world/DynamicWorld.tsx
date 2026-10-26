import { useCallback, useEffect, useMemo, useState } from "react";
import { positionLabel } from "@/domain/rowText";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { fmtMoney } from "@/lib/utils";
import { runWorld, seasonLabel, type WorldInput, type SeasonStep } from "@/domain/worldEngine";
import { sum, last } from "@/domain/attributes";
import { WORLD_KEY, browserStore, readJson, writeJson } from "@/domain/localData";
import { round1 } from "@/domain/scouting";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, LoadingBlock, ErrorState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { ProgressLine } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STORE_KEY = WORLD_KEY;

function loadElapsed(): number {
  // M331: through the door. `browserStore()` answers null for a document that is not allowed
  // one — reading the `localStorage` accessor itself throws `SecurityError` there — and
  // `readJson` keeps a corrupt row from being read as a number of seasons.
  const { value, present } = readJson<{ seasonsElapsed?: unknown } | null>(browserStore(), STORE_KEY, null);
  if (!present || !value) return 0;
  const n = Number(value.seasonsElapsed);
  return Number.isFinite(n) && n >= 0 && n < 60 ? Math.floor(n) : 0;
}

export function DynamicWorld() {
  const { t } = useI18n();
  const [elapsed, setElapsed] = useState<number>(() => loadElapsed());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    // M331: through the door, so a refused write is answered rather than swallowed.
    writeJson(browserStore(), STORE_KEY, { seasonsElapsed: elapsed });
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

  const latest: SeasonStep | undefined = snapshot ? last(snapshot.history) : undefined;
  const history: SeasonStep[] = snapshot?.history ?? [];
  const avgNow = latest?.avgOverall ?? round1(sum(base.players, (p) => p.overall) / base.players.length);
  const marketNow = latest?.marketTotal ?? sum(base.players, (p) => p.value);

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
        <StatTile label={t("world.avgOvr")} value={avgNow} tone={latest && latest.developments.length ? "up" : "neutral"} />
        <StatTile label={t("world.market")} value={fmtMoney(marketNow)} sub={t("world.sub.market")} />
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
            <SectionTitle title={t("world.champions")} hint={latest?.label} />
            <div className="divide-y">
              {latest?.champions.map((c) => (
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
            {latest && latest.developments.length ? (
              <div className="space-y-1.5">
                {latest.developments.map((d) => (
                  <PlayerDelta key={d.id} name={d.name} clubId={d.clubId} from={d.from} to={d.to} delta={d.delta} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.dev.empty")}</p>
            )}
            {latest && latest.declines.length > 0 && (
              <>
                <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{t("world.declines")}</div>
                <div className="mt-1.5 space-y-1.5">
                  {latest.declines.map((d) => <PlayerDelta key={d.id} name={d.name} clubId={d.clubId} from={d.from} to={d.to} delta={d.delta} />)}
                </div>
              </>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("world.prospects")} hint={t("world.prospects.hint")} />
            {latest && latest.prospects.length ? (
              <div className="space-y-1.5">
                {latest.prospects.slice(0, 10).map((p) => (
                  <Link key={p.id} to={`/clubs/${p.clubId}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-secondary/40">
                    <span className="truncate">{p.name} <span className="text-xs text-muted-foreground">· {positionLabel(p.position, t)} · {p.age}</span></span>
                    <span className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-muted-foreground">{p.overall}</span>
                      <Badge variant="outline" className={CHIP_CLASS.badgeSuccess}>→ {p.potential}</Badge>
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
            {latest && latest.retired.length ? (
              <div className="space-y-1.5">
                {latest.retired.map((r) => (
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

          <Panel className="p-4">
            <SectionTitle title={t("world.history.title")} hint={t("world.history.hint")} />
            {history.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-48">
                    <ProgressLine points={history.map((s) => ({ label: s.label, value: s.avgOverall }))} />
                  </div>
                  <div className="h-48">
                    <ProgressLine points={history.map((s) => ({ label: s.label, value: s.marketTotal }))} />
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{t("world.history.champions")}</span>
                  </div>
                  {history.slice().reverse().map((s) => (
                    <div key={s.index} className="flex items-center justify-between text-sm border-b border-b-border/50 pb-1 last:border-0">
                      <span className="font-mono text-muted-foreground">{s.label}</span>
                      <div className="flex items-center gap-2">
                        {s.champions.map((c) => (
                          <span key={c.compId} className="truncate min-w-0">
                            {c.clubName} · {c.compName} <span className="text-muted-foreground">{t("world.pts", { points: c.points })}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("world.history.empty")}</p>
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
