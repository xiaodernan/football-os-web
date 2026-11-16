// M1165 · The World Table — one Elo ordering across the seven real leagues.
// The screen is a reading surface; every row was folded from the committed CC0 artifact by
// domain/worldTable.ts, first in date order. The model is never consulted; the file is the
// only pundit allowed in this room.
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { PANEL_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, signed } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type WireStatus } from "@/data/liveWire";
import { foldWorldTable, type WorldTableFold } from "@/domain/worldTable";
import { deltaSign } from "@/domain/attributes";
import { PrinterIcon } from "lucide-react";

// The screen's own naming doors: the "all" tab is a value, never copy — declaring it here keeps
// the raw-UI scan's child-string rule off the JSX expression and holds the spelling in one place.
const ALL_ID = "all";
const PODIUM = 3;
const TAB_ON = "border-info/60 bg-info/10 text-info";
const DELTA_TONE = { up: "text-success", down: "text-destructive", flat: "text-muted-foreground" } as const;

export function WorldTable() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<LiveWirePayload | null>(null);
  const [status, setStatus] = useState<WireStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [leagueId, setLeagueId] = useState<string>(ALL_ID);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchLiveWire()
      .then((p) => { if (!cancelled) { setPayload(p); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  const fold: WorldTableFold | null = payload ? foldWorldTable(payload) : null;
  const rows = useMemo(
    () => (fold ? (leagueId === ALL_ID ? fold.rows : fold.rows.filter((r) => r.leagueId === leagueId)) : []),
    [fold, leagueId],
  );
  const tabs = useMemo(() => [ALL_ID, ...(payload?.leagues.map((l) => l.id) ?? [])], [payload]);

  const leagues = payload?.leagues ?? [];

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:block", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-orb fo-orb-sky -left-16 -bottom-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:hidden" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-info">{t("worldTable.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-info via-primary to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent print:text-black sm:text-5xl">{t("worldTable.title")}</h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground print:text-black">{t("worldTable.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()} aria-label={t("worldTable.printHint")}>
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> {t("worldTable.print")}
          </Button>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3" aria-label={t("worldTable.title")}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground print:text-black">
            <div className="font-mono tabular-nums">{t("worldTable.meta", { clubs: fold.clubs, fixtures: fold.fixtures, goals: fold.goals })}</div>
            <div className="font-mono uppercase tracking-widest">{t("worldTable.tag")}</div>
          </div>

          <div className="flex flex-wrap gap-1.5 print:hidden">
            {tabs.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setLeagueId(id)}
                aria-pressed={leagueId === id}
                className={cn(
                  "rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  leagueId === id ? TAB_ON : "border-border text-muted-foreground hover:border-info/40 hover:text-foreground",
                )}
              >
                {id === ALL_ID ? t("longSeason.filter.all") : leagues.find((l) => l.id === id)?.league ?? id}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border/60 print:border-black print:shadow-none">
            <table className="w-full text-left text-[11px] tabular-nums">
              <thead className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th scope="col" className="px-2 py-2 text-right">{t("worldTable.rank")}</th>
                  <th scope="col" className="px-2 py-2">{t("common.club")}</th>
                  <th scope="col" className="hidden px-2 py-2 md:table-cell">{t("worldTable.leagueCol")}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t("fw.table.p")}</th>
                  <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">{t("fw.table.gf")}</th>
                  <th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">{t("fw.table.ga")}</th>
                  <th scope="col" className="px-2 py-2 text-right">{t("fw.table.gd")}</th>
                  <th scope="col" className="px-2 py-2 text-right">Δ</th>
                  <th scope="col" className="px-2 py-2 text-right">{t("worldTable.elo")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.club}
                    className={cn(
                      "border-t border-border/40 print:border-black/30",
                      i < PODIUM ? "bg-info/5" : "",
                    )}
                  >
                    <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{i + 1}</td>
                    <td className="min-w-0 truncate px-2 py-1.5 font-semibold text-foreground print:text-black">{r.club}</td>
                    <td className="hidden px-2 py-1.5 text-muted-foreground md:table-cell">{r.league}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{r.played}</td>
                    <td className="hidden px-2 py-1.5 text-right text-muted-foreground sm:table-cell">{r.gf}</td>
                    <td className="hidden px-2 py-1.5 text-right text-muted-foreground sm:table-cell">{r.ga}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{signed(r.gd)}</td>
                    <td className={cn("px-2 py-1.5 text-right font-mono", DELTA_TONE[deltaSign(r.delta)])}>{signed(r.delta)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-foreground print:text-black">{r.elo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {fold.rocket && fold.rocket.delta > 0 ? (
              <div className={cn("rounded-xl p-3", PANEL_CLASS.panelGhost)}>
                <div className="font-mono text-[9px] uppercase tracking-widest text-success">{t("worldTable.rocketLabel")}</div>
                <div className="mt-0.5 text-xs text-foreground">{t("worldTable.rocket", { club: fold.rocket.club, delta: fold.rocket.delta })}</div>
              </div>
            ) : null}
            {fold.slump && fold.slump.delta < 0 ? (
              <div className={cn("rounded-xl p-3", PANEL_CLASS.panelGhost)}>
                <div className="font-mono text-[9px] uppercase tracking-widest text-destructive">{t("worldTable.slumpLabel")}</div>
                <div className="mt-0.5 text-xs text-foreground">{t("worldTable.slump", { club: fold.slump.club, delta: fold.slump.delta })}</div>
              </div>
            ) : null}
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground print:text-black">{t("worldTable.method")}</p>
        </>
      ) : null}
    </div>
  );
}
