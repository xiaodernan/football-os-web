// M1160 · The Long Season — every fixture of the seven real leagues on one page.
// The whole 2026/27 season, folded from public-domain OpenFootball fixture files (CC0).
// A page you could print: one calendar per league, tap a league chip to switch.
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn, SEPARATOR } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type WireStatus } from "@/data/liveWire";
import { foldSacredBigWins, foldSacredCalendar, SACRED_FILTERS, type SacredFixture, type SacredFilter } from "@/domain/sacredCalendar";

const kickerClass = "text-[10px] uppercase tracking-[0.35em] text-primary";
const chip = "rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors";
const chipOn = CHIP_CLASS.optionOn;
const chipOff = CHIP_CLASS.optionOff;

const scoreCell = (f: SacredFixture) => {
  if (!f.played || !f.ft) return SEPARATOR;
  const [h, a] = f.ft;
  return `${h}${SEPARATOR}${a}`;
};

export function Sacred() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<LiveWirePayload | null>(null);
  const [status, setStatus] = useState<WireStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SacredFilter>("all");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchLiveWire()
      .then((p) => { if (!cancelled) {
        setPayload(p);
        setLeagueId((cur) => cur ?? p.leagues[0]?.id ?? null);
        setStatus("ready");
      } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  const fold = useMemo(() => (payload ? foldSacredCalendar(payload, filter) : null), [payload, filter]);
  const bigWins = useMemo(() => (payload ? foldSacredBigWins(payload, 4) : []), [payload]);
  const league = useMemo(() => (payload && leagueId ? payload.leagues.find((l) => l.id === leagueId) ?? null : null), [payload, leagueId]);

  const totalPlayed = fold?.playedFixtures ?? 0;
  const totalAll = fold?.totalFixtures ?? 0;

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className={kickerClass}>{t("longSeason.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("longSeason.title")}</h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("longSeason.subtitle")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {SACRED_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(chip, filter === f ? chipOn : chipOff)}
              >
                {t(`longSeason.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3" aria-label={t("longSeason.title")}>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : null}

      {status === "error" ? (
        <div className="p-6 text-center">
          <div className="text-sm font-semibold text-warning">{t("liveWire.errorTitle")}</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{t("liveWire.errorBody")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
            {t("liveWire.retry")}
          </Button>
        </div>
      ) : null}

      {status === "ready" && payload ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <div className="font-mono tabular-nums">{totalPlayed}/{totalAll} {t("liveWire.playedCaption")}</div>
            <div>{payload.source.name} · {payload.source.license}</div>
          </div>

          {bigWins.length > 0 ? (
            <section>
              <div className="flex items-baseline justify-between gap-3 border-b border-primary/30 pb-1">
                <h2 className="text-[10px] uppercase tracking-widest text-primary">{t("longSeason.bigWins")}</h2>
                <span className="font-mono text-[9px] text-muted-foreground">{t("longSeason.bigWinsHint")}</span>
              </div>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {bigWins.slice(0, 4).map((r, i) => (
                  <li key={`${r.league}-${r.date}-${i}`} className={cn("flex items-center gap-2 px-2 py-1.5 text-[11px]", PANEL_CLASS.panelGhost)}>
                    <span className="max-w-24 shrink-0 truncate font-mono text-[8.5px] uppercase text-primary">{r.league}</span>
                    <time dateTime={r.date} className="w-12 shrink-0 font-mono text-[9px] text-muted-foreground">{r.date.slice(5)}</time>
                    <span className="min-w-0 flex-1 truncate text-right font-medium text-foreground">{r.home}</span>
                    <span className="shrink-0 font-mono font-bold tabular-nums text-foreground">{r.ft[0]}{SEPARATOR}{r.ft[1]}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{r.away}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav aria-label={t("longSeason.tabLabel")} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
            {payload.leagues.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={leagueId === l.id}
                onClick={() => setLeagueId(l.id)}
                className={cn(chip, "shrink-0", leagueId === l.id ? chipOn : chipOff)}
              >
                {l.league}
              </button>
            ))}
          </nav>

          {league && fold ? (
            <section className="grid gap-2 md:grid-cols-2">
              {(fold.leagues.find((x) => x.id === league.id)?.rounds ?? []).map((round) => (
                <div key={round.round} className={cn("break-inside-avoid rounded-xl p-3", PANEL_CLASS.panelGhost)}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 border-b border-border/40 pb-1">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{round.round}</div>
                    <div className="font-mono text-[9px] tabular-nums text-muted-foreground">{round.played}/{round.total}</div>
                  </div>
                  <ul className="space-y-0.5">
                    {round.fixtures.map((f, i) => {
                      const ft = f.ft ?? null;
                      const homeWon = ft !== null && ft[0] > ft[1];
                      const awayWon = ft !== null && ft[1] > ft[0];
                      return (
                        <li key={`${f.home}-${f.away}-${i}`} className="flex items-center gap-1.5 text-[10px]">
                          <time dateTime={f.date} className="w-12 shrink-0 font-mono text-[8.5px] text-muted-foreground">{f.date.slice(5)}{f.time ? ` ·${f.time.slice(0, 5)}` : ""}</time>
                          <span className={cn("min-w-0 flex-1 truncate text-right", f.played ? (homeWon ? "font-semibold text-foreground" : "text-muted-foreground") : "text-muted-foreground")}>{f.home}</span>
                          <span className={cn("shrink-0 font-mono tabular-nums", f.played ? "font-bold text-foreground" : "text-muted-foreground/60")}>{scoreCell(f)}</span>
                          <span className={cn("min-w-0 flex-1 truncate", f.played ? (awayWon ? "font-semibold text-foreground" : "text-muted-foreground") : "text-muted-foreground")}>{f.away}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">{t("longSeason.method")}</p>
        </>
      ) : null}
    </div>
  );
}
