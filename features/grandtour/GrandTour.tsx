// M1155 · The Grand Tour — seven tables, one wire, no imagination.
// The whole epic folds from the committed same-origin artifact (public/live-wire.json) — zero network at runtime, zero invented numbers.
import { useEffect, useState } from "react";
import { useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, SEPARATOR, clamp, safeDiv, ABSENT, fmt2 } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type WireStatus } from "@/data/liveWire";
import { foldGrandTour, type GrandTourFold, type LeagueTour } from "@/domain/grandTour";

const FORM_CLASS: Record<string, string> = {
  W: CHIP_CLASS.success,
  D: CHIP_CLASS.mutedSoft,
  L: CHIP_CLASS.destructive,
};

const crownPill = (crown: LeagueTour["crown"]) =>
  crown === "locked" ? CHIP_CLASS.primary : CHIP_CLASS.warning;

export function GrandTour() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [payload, setPayload] = useState<LiveWirePayload | null>(null);
  const [status, setStatus] = useState<WireStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchLiveWire()
      .then((p) => { if (!cancelled) { setPayload(p); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  const fold: GrandTourFold | null = payload ? foldGrandTour(payload) : null;

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-violet -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("tour.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("tour.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("tour.subtitle")}</p>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3" aria-label={t("liveWire.loading")}>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : null}

      {status === "error" ? (
        <Panel className="p-6 text-center">
          <div className="text-sm font-semibold text-warning">{t("liveWire.errorTitle")}</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{t("liveWire.errorBody")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
            {t("liveWire.retry")}
          </Button>
        </Panel>
      ) : null}

      {status === "ready" && fold ? (
        <>
          {/* the chase — tightest races first, drama per round ordered */}
          <Panel className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tour.chase")}</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t("tour.chaseHint")}</p>
              </div>
              <button type="button" className="font-mono text-[10px] uppercase tracking-widest text-primary underline-offset-2 hover:underline" onClick={() => navigate("/live-wire")}>
                {t("tour.openWire")}
              </button>
            </div>
            <ol className="mt-3 grid gap-2">
              {fold.chase.map((row, i) => (
                <li key={row.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-xs", PANEL_CLASS.panelGhost)}>
                  <span className="w-6 shrink-0 text-center font-mono text-sm font-black text-primary">{i + 1}</span>
                  <span className="w-40 min-w-0 shrink-0 truncate font-semibold text-foreground">{row.league}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.leader || ABSENT} · {row.leaderPts} {t("data.th.pts")}</span>
                  <span className="hidden font-mono text-[10px] tabular-nums text-muted-foreground/70 lg:inline">{fmt2(row.dramaPerRound)}</span>
                  <span className="hidden font-mono tabular-nums text-muted-foreground sm:inline">{t("tour.gap", { n: row.gap })}</span>
                  <span className="hidden font-mono tabular-nums text-muted-foreground md:inline">{t("tour.remaining", { n: row.remaining })}</span>
                  <span className={cn("shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest", crownPill(row.crown))}>{row.crown === "locked" ? t("tour.crownLocked") : t("tour.crownAlive")}</span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* the seven leaders, card by card — real names, real numbers */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tour.leaders")}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {fold.widestCrown ? t("tour.widestGap", { gap: fold.widestCrown.gap, leader: fold.widestCrown.leader }) : null}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fold.leagues.map((l) => (
              <Panel key={l.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l.season} · {l.played}/{l.total}</div>
                    <h3 className="mt-0.5 truncate text-sm font-bold text-foreground">{l.league}</h3>
                  </div>
                  <span className={cn("shrink-0 rounded-md border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest", crownPill(l.crown))}>{l.crown === "locked" ? t("tour.crownLocked") : t("tour.crownAlive")}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-black leading-tight text-foreground">{l.leader || ABSENT}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{t("tour.second", { second: l.second || ABSENT, pts: l.secondPts })}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tabular-nums text-transparent">{l.leaderPts}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("data.th.pts")}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="inline-flex gap-1">
                    {l.leaderForm.split("").map((letter, i) => (
                      <span key={i} className={cn("inline-flex h-5 w-5 items-center justify-center rounded border text-[9px] font-bold", FORM_CLASS[letter] ?? FORM_CLASS.D)}>{letter}</span>
                    ))}
                  </div>
                  <div className="font-mono text-[10px] tabular-nums text-muted-foreground">{t("tour.remaining", { n: l.remaining })}</div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary/70" style={{ width: `${clamp(safeDiv(l.played * 100, l.total), 0, 100)}%` }} /></div>
              </Panel>
            ))}
          </div>

          {/* the loudest committed results */}
          <Panel className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tour.loudest")}</div>
            {fold.biggestWins.length === 0 ? (
              <div className="mt-3 text-xs text-muted-foreground">{t("tour.emptyBig")}</div>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {fold.biggestWins.map((r, i) => (
                  <li key={`${r.league}-${r.date}-${i}`} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs", PANEL_CLASS.panelGhost)}>
                    <span className="max-w-28 shrink-0 truncate font-mono text-[9px] uppercase text-primary">{r.league}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.home}</span>
                    <span className="shrink-0 font-mono font-bold tabular-nums text-foreground">{r.ft[0]}{SEPARATOR}{r.ft[1]}</span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{r.away}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">{t("tour.method")}</p>
        </>
      ) : null}
    </div>
  );
}
