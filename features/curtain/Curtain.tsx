// M1162 · Curtain Up — the next round every real league has left to play.
// One deliberately quiet page: the artifact is the truth, nothing is projected.
// Seven cards, one per league, ordered by the file's own league id; if a league has no more
// committed fixtures the slot is honestly empty and says so — never filled with an invented date.
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { PANEL_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type WireStatus } from "@/data/liveWire";
import { foldCurtain, type CurtainFold } from "@/domain/curtain";

export function Curtain() {
  const { t } = useI18n();
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

  const fold: CurtainFold | null = payload ? foldCurtain(payload) : null;

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-violet -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("curtain.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("curtain.title")}</h1>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{t("curtain.subtitle")}</p>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("curtain.title")}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        </div>
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

      {status === "ready" && fold ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <div className="font-mono tabular-nums">{t("curtain.tiles.meta", { played: fold.playedFixtures, next: fold.nextFixtures, all: fold.totalFixtures })}</div>
            <div className="font-mono uppercase tracking-widest">{t("curtain.tag")}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fold.cards.map((card) => (
              <div key={card.leagueId} className={cn("rounded-xl p-4", PANEL_CLASS.panelGhost)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 font-mono text-[9px] uppercase tracking-widest text-primary">{card.round}</div>
                  <div className="font-mono text-[9px] tabular-nums text-muted-foreground">{card.playedFixtures}/{card.totalFixtures}</div>
                </div>
                <h2 className="mt-0.5 truncate text-sm font-bold text-foreground">{card.league}</h2>
                <ul className="mt-2 space-y-0.5">
                  {card.fixtures.length === 0 ? (
                    <li className="py-2 text-xs text-muted-foreground">{t("curtain.empty")}</li>
                  ) : card.fixtures.map((f, i) => (
                    <li key={`${f.home}-${f.away}-${i}`} className="flex items-center gap-1.5 text-[10px]">
                      <time dateTime={f.date} className="w-12 shrink-0 font-mono text-[8.5px] text-muted-foreground">{f.date.slice(5)}{f.time ? ` ·${f.time.slice(0, 5)}` : ""}</time>
                      <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">{f.home}</span>
                      <span className="shrink-0 font-mono tabular-nums text-muted-foreground/50">{t("common.vs")}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{f.away}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">{t("curtain.method")}</p>
        </>
      ) : null}
    </div>
  );
}
