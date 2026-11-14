import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { derbyRivalries, competitionNames } from "@/domain/derby";
import { DemoBadge, Panel, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, safeDiv, SEPARATOR } from "@/lib/utils";

/**
 * M1121 · The Derby Codex — the pairings this world has been made to meet the most.
 * Everything here is a fold over the finished fixtures: meetings, goals, the W/D/L split,
 * the widest swing, shared stages, the last score. Nothing is a derby by fiat; the world's
 * own fixture list is the only judge, and ties break deterministically so the same seed always
 * prints the same codex.
 */
export function DerbyRoom() {
  const { t, locale } = useI18n();
  const rows = useMemo(() => derbyRivalries(footballProvider.matches(), 8), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);

  return (
    <div className="space-y-5">
      {/* Cinematic hero — the codex, framed as two archways facing off */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-14 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -top-12 h-40 w-40" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              {t("derby.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("derby.subtitle")}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("derby.noSeed")}</Panel>
      ) : (
        <ol className="grid gap-4">
          {rows.map((r, i) => {
            const home = getClub(r.homeId);
            const away = getClub(r.awayId);
            const homeShare = safeDiv(r.homeWins, r.meetings) * 100;
            const drawShare = safeDiv(r.draws, r.meetings) * 100;
            const awayShare = safeDiv(r.awayWins, r.meetings) * 100;
            const shared = competitionNames(r.competitionIds, competitions);
            return (
              <li key={`${r.homeId}-${r.awayId}`}>
                <article className={cn("overflow-hidden rounded-2xl border p-4 sm:p-5", PANEL_CLASS.panelDeep)}>
                  <div className="flex items-center gap-4">
                    <div className="grid w-10 shrink-0 place-items-center font-mono text-xs font-bold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      {/* The pairing — id-sorted ids, so the same seed prints the same order every time */}
                      <div className="flex items-center justify-center gap-4 sm:gap-8">
                        <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-3">
                          <Crest colors={home?.colors} short={home?.short} size={56} />
                          <div className="text-center sm:text-left">
                            <div className="text-sm font-bold leading-tight sm:text-base">{home?.name ?? r.homeId}</div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {r.homeWins}W · {t("derby.drawsShort", { n: r.draws })} · {r.awayWins}L
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono text-3xl font-black tabular-nums leading-none text-primary sm:text-4xl">
                            {r.meetings}
                          </div>
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t("derby.meetingsTile")}
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-col items-center gap-1 sm:flex-row-reverse sm:items-center sm:gap-3">
                          <Crest colors={away?.colors} short={away?.short} size={56} />
                          <div className="text-center sm:text-right">
                            <div className="text-sm font-bold leading-tight sm:text-base">{away?.name ?? r.awayId}</div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {r.awayWins}W · {t("derby.drawsShort", { n: r.draws })} · {r.homeWins}L
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* The W/D/L band — segmented by the pairing's own truth */}
                      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full border">
                        <div className="h-full bg-primary" style={{ width: `${homeShare}%` }} />
                        <div className="h-full bg-secondary" style={{ width: `${drawShare}%` }} />
                        <div className="h-full bg-info" style={{ width: `${awayShare}%` }} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-2 py-1 text-[10px]")}>
                          {t("derby.aggGoals", { n: r.goals })}
                        </span>
                        <span className={cn(CHIP_CLASS.mutedSoft, "rounded-md px-2 py-1 text-[10px]")}>
                          {t("derby.widest", { n: r.widest })}
                        </span>
                        {shared.map((n) => (
                          <span key={n} className={cn(CHIP_CLASS.labelPrimary, "rounded-md px-2 py-1 text-[10px]")}>{n}</span>
                        ))}
                        <Link to={`/matches/${r.lastMatchId}`} className="text-[11px] text-primary underline underline-offset-2 hover:text-primary/80">
                          {t("derby.lastMet", { date: formatDate(locale, r.lastKickoff) })} · {r.lastHomeGoals}{SEPARATOR}{r.lastAwayGoals}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {/* The honesty line */}
      <p className="text-center text-[11px] text-muted-foreground">{t("derby.method")}</p>
    </div>
  );
}
