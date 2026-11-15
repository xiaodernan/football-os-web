// M1150 · The Journey — your passport across the endless world.
// Nine chapters; every stop is a real route. Completion is real: it is folded from this device's
// own visit trail, its onboarding trail and its saved Dream XI — never invented.
// The next-door recommendation is simply the first unseen stop, in reading order.

import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { DREAM_XI_KEY, browserStore, readJson } from "@/domain/localData";
import { foldJourney } from "@/domain/journey";
import { Panel, PANEL_CLASS, BAR_FILL, CHIP_CLASS } from "@/ui/primitives";
import { fmt1, pctOf } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Journey() {
  const { t } = useI18n();
  const { state } = useOs();

  const xiPicked = useMemo(() => {
    const held = readJson<{ picked: string[] }>(browserStore(), DREAM_XI_KEY, { picked: [] }).value;
    return held.picked.length;
  }, []);
  const fold = useMemo(() => foldJourney(browserStore(), state, xiPicked === 11), [state, xiPicked]);
  const ringRadius = 54;
  const circumference = 2 * Math.PI * ringRadius;
  const dash = (fold.percent / 100) * circumference;

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -top-14 h-56 w-56 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 bottom-[-20%] h-64 w-64 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative flex flex-wrap items-center gap-6">
          {/* The world ring */}
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={t("journey.ringAria", { pct: fmt1(fold.percent) })}>
              <circle cx="70" cy="70" r={ringRadius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeOpacity="0.35" />
              <circle cx="70" cy="70" r={ringRadius} fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text font-mono text-3xl font-black tabular-nums text-transparent">{Math.round(fold.percent)}%</div>
              <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{t("journey.worldDone", { done: fold.doneStops, total: fold.totalStops, pct: fmt1(fold.percent) })}</div>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("journey.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("journey.title")}</h1>
            <p className="mt-2 max-w-xl text-xs text-muted-foreground">{t("journey.subtitle")}</p>
            {fold.nextStop ? (
              <Link to={fold.nextStop} className="fo-lift mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold text-primary">
                {t("journey.nextTitle")} {fold.nextStop} →
              </Link>
            ) : (
              <p className="mt-4 text-xs font-semibold text-primary">{t("journey.allWalked")}</p>
            )}
          </div>
        </div>
      </header>

      {/* Nine chapters */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fold.chapters.map((ch) => {
          return (
            <Panel key={ch.id} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest">{t(ch.titleKey)}</h2>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{t(ch.hintKey)}</p>
                </div>
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums", ch.complete ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{ch.done}/{ch.count}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                <div className={cn("h-full rounded", ch.complete ? BAR_FILL.good : BAR_FILL.progress)} style={{ width: ch.count ? pctOf(ch.done, ch.count) : "0%" }} />
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1">
                {ch.stops.map((s) => (
                  <li key={s.path}>
                    <Link to={s.path} title={t(s.visited ? "journey.visited" : "journey.notYet")} className={cn("flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[9px] font-mono transition-colors hover:bg-muted", s.visited ? "border-primary/40 text-foreground" : "text-muted-foreground")}>
                      <span aria-hidden className={s.visited ? "text-primary" : "text-muted-foreground/50"}>{t(s.visited ? "journey.markDone" : "journey.markOpen")}</span>
                      <span className="truncate">{s.path}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-muted-foreground">{t("journey.footnote")}</p>
    </div>
  );
}
