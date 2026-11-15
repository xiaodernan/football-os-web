// M1156 · The Dispatch — the real wires folded into a printable broadsheet.
// What the night desk would print from the seven public top flights: date, crowns, chases, loudest results.
// Nothing beyond the committed CC0 wire; the frozen seeded world remains a separate universe.
// Prints clean on A4 portrait: the chrome disappears, the fold remains (see the print variants).
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, SEPARATOR, signed } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type LiveWireZone, type WireStatus } from "@/data/liveWire";
import { foldGrandTour, type GrandTourFold, type LeagueTour } from "@/domain/grandTour";

const ZONE_DOT: Record<NonNullable<LiveWireZone>, string> = {
  ucl: "bg-success",
  europa: "bg-info",
  playoff: "bg-warning",
  relegation: "bg-destructive",
};

const crownPill = (crown: LeagueTour["crown"]) =>
  crown === "locked" ? CHIP_CLASS.primary : CHIP_CLASS.warning;

export function Dispatch() {
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

  const fold: GrandTourFold | null = payload ? foldGrandTour(payload) : null;
  const generated = payload?.generated_at ?? "";

  return (
    <div className="space-y-5 print:bg-white print:space-y-4 print:text-black">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:rounded-none print:border-b print:border-black print:bg-transparent print:px-0 print:py-3", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -bottom-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:hidden" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.35em] text-primary print:text-black">{t("dispatch.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl print:text-black">{t("dispatch.title")}</h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground print:text-[#333]">{t("dispatch.subtitle")}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground print:text-[#333]">{t("dispatch.edition", { at: generated.slice(0, 10) })}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()}>{t("dispatch.print")}</Button>
          </div>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3 print:hidden" aria-label={t("liveWire.loading")}>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : null}

      {status === "error" ? (
        <Panel className="p-6 text-center print:hidden">
          <div className="text-sm font-semibold text-warning">{t("liveWire.errorTitle")}</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{t("liveWire.errorBody")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
            {t("liveWire.retry")}
          </Button>
        </Panel>
      ) : null}

      {status === "ready" && payload && fold ? (
        <>
          <section className="break-inside-avoid space-y-2 print:space-y-1">
            <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1 print:border-black">
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground print:text-black">{t("tour.chase")}</h2>
              <span className="font-mono text-[9px] text-muted-foreground print:text-[#333]">{t("tour.chaseHint")}</span>
            </div>
            <ol className="grid gap-1.5">
              {fold.chase.map((row, i) => (
                <li key={row.id} className="flex items-center gap-2 text-[11px] leading-snug print:text-[8.5px]">
                  <span className="w-5 shrink-0 text-center font-mono font-black text-primary print:text-black">{i + 1}</span>
                  <span className="w-36 min-w-0 shrink-0 truncate font-semibold">{row.league}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground print:text-[#333]">{row.leader} · {row.leaderPts} {t("data.th.pts")}</span>
                  <span className="hidden font-mono tabular-nums text-muted-foreground print:text-[#333] sm:inline">{t("tour.gap", { n: row.gap })}</span>
                  <span className="hidden font-mono tabular-nums text-muted-foreground print:text-[#333] md:inline">{t("tour.remaining", { n: row.remaining })}</span>
                  <span className={cn("shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-widest", crownPill(row.crown), "print:border-black print:bg-transparent print:text-black")}>{row.crown === "locked" ? t("tour.crownLocked") : t("tour.crownAlive")}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-4 lg:grid-cols-2 print:grid-cols-1 print:gap-3">
            {payload.leagues.map((l) => (
              <div key={l.id} className="break-inside-avoid space-y-1.5 border-t border-border/60 pt-2 print:border-black">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">{l.league}</h3>
                  <span className="font-mono text-[9px] text-muted-foreground print:text-[#333]">{l.playedFixtures}/{l.totalFixtures} · {payload.source.license}</span>
                </div>
                <table className="w-full border-collapse text-[10px] leading-snug print:text-[7px]">
                  <thead>
                    <tr className="text-[8.5px] uppercase tracking-widest text-muted-foreground print:text-[#333]">
                      <th className="py-0.5 text-left">#</th>
                      <th className="py-0.5 text-left">{t("common.club")}</th>
                      <th className="py-0.5 text-right">{t("data.th.p")}</th>
                      <th className="py-0.5 text-right">{t("data.th.w")}</th>
                      <th className="py-0.5 text-right">{t("data.th.d")}</th>
                      <th className="py-0.5 text-right">{t("data.th.l")}</th>
                      <th className="py-0.5 text-right">{t("fw.table.gf")}</th>
                      <th className="py-0.5 text-right">{t("fw.table.ga")}</th>
                      <th className="py-0.5 text-right">{t("fw.table.gd")}</th>
                      <th className="py-0.5 text-right">{t("data.th.pts")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {l.table.map((row) => (
                      <tr key={row.team} className="border-t border-border/40 print:border-[#bbb]">
                        <td className="py-0.5 font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1.5">
                            {row.zone ? <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", ZONE_DOT[row.zone], "print:hidden")} /> : <span aria-hidden className="h-1.5 w-1.5" />}
                            {row.pos}
                          </span>
                        </td>
                        <td className="py-0.5 font-medium">{row.team}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{row.played}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{row.won}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{row.drawn}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{row.lost}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{row.gf}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{row.ga}</td>
                        <td className="py-0.5 text-right font-mono tabular-nums">{signed(row.gd)}</td>
                        <td className="py-0.5 text-right font-mono font-bold tabular-nums">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="grid gap-0.5 text-[9px] text-muted-foreground print:text-[#333]">
                  {l.recent.slice(0, 5).map((m, i) => (
                    <li key={`${m.date}-${i}`} className="truncate font-mono tabular-nums">{m.date.slice(5)} {m.home} {m.ft[0]}{SEPARATOR}{m.ft[1]} {m.away}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="break-inside-avoid space-y-2 print:space-y-1">
            <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1 print:border-black">
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground print:text-black">{t("tour.loudest")}</h2>
              <span className="font-mono text-[9px] text-muted-foreground print:text-[#333]">{t("tour.loudestHint")}</span>
            </div>
            {fold.biggestWins.length === 0 ? (
              <div className="text-[10px] text-muted-foreground print:text-[#333]">{t("tour.emptyBig")}</div>
            ) : (
              <ul className="grid gap-1.5 sm:grid-cols-2 print:grid-cols-1">
                {fold.biggestWins.map((r, i) => (
                  <li key={`${r.league}-${r.date}-${i}`} className="flex items-center gap-2 border border-border/50 px-2 py-1 text-[10px] print:border-[#bbb]">
                    <span className="max-w-24 shrink-0 truncate font-mono text-[8.5px] uppercase text-primary print:text-black">{r.league}</span>
                    <span className="min-w-0 flex-1 truncate">{r.home}</span>
                    <span className="shrink-0 font-mono font-bold tabular-nums">{r.ft[0]}{SEPARATOR}{r.ft[1]}</span>
                    <span className="min-w-0 flex-1 truncate">{r.away}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className={cn(CHIP_CLASS.muted, "pt-2 text-[9px] leading-snug text-muted-foreground print:border-black print:text-[#333]")}>
            {t("tour.method")}{" "}
            <span className="font-mono">{payload.source.name} · {payload.source.license}</span>
          </p>
        </>
      ) : null}
    </div>
  );
}
