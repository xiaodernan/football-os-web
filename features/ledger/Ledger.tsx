// M1164 · The Ledger — the wire's arithmetic, laid flat.
// One page, seven league cards, every figure recomputed from the committed CC0 fold and
// checked against the table the file carries. The page never estimates, never projects;
// if the file's own homework is off, the card says so out loud.
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { PANEL_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type WireStatus } from "@/data/liveWire";
import { foldWireLedger, type LedgerFold } from "@/domain/wireLedger";
import { PrinterIcon } from "lucide-react";

export function Ledger() {
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

  const fold: LedgerFold | null = payload ? foldWireLedger(payload) : null;

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:block", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -right-16 -top-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-orb fo-orb-amber -left-16 -bottom-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:hidden" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("ledger.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent print:text-black sm:text-5xl">{t("ledger.title")}</h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground print:text-black">{t("ledger.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()} aria-label={t("ledger.printHint")}>
            <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> {t("ledger.print")}
          </Button>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("ledger.title")}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground print:text-black">
            <div className="font-mono tabular-nums">{t("ledger.meta", { played: fold.totalPlayed, goals: fold.totalGoals, leagues: fold.cards.length })}</div>
            <div className="font-mono uppercase tracking-widest">{t("ledger.tag")}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-2">
            {fold.cards.map((card) => (
              <div key={card.leagueId} className={cn("rounded-xl p-4 print:break-inside-avoid", PANEL_CLASS.panelGhost)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{card.season}</div>
                  <div className="font-mono text-[9px] tabular-nums text-muted-foreground">{card.playedFixtures}/{card.totalFixtures}</div>
                </div>
                <h2 className="mt-0.5 truncate text-sm font-bold text-foreground print:text-black">{card.league}</h2>
                <dl className="mt-2 space-y-1.5 text-[10px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-muted-foreground">{t("ledger.attack")}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold text-foreground"><span>{card.attack.team}</span> <span className="font-mono tabular-nums text-primary">{card.attack.value}</span></dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-muted-foreground">{t("ledger.leakiest")}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold text-foreground"><span>{card.leakiest.team}</span> <span className="font-mono tabular-nums text-destructive">{card.leakiest.value}</span></dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-muted-foreground">{t("ledger.form")}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold text-foreground"><span>{card.form.team}</span> <span className="font-mono tabular-nums text-primary">{card.form.letters}</span></dd>
                  </div>
                </dl>
                <div className="mt-2 border-t pt-1.5 font-mono text-[9px] text-muted-foreground">
                  {t("ledger.drift", { n: card.drift })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground print:text-black">{t("ledger.method")}</p>
        </>
      ) : null}
    </div>
  );
}
