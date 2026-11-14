import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { upsetsBoard } from "@/domain/upsets";
import { DemoBadge, Panel, Crest, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmt2, pct, SEPARATOR } from "@/lib/utils";

/**
 * M1124 · The Upsets — the nights this world outran its own prediction.
 * Every card here is the same Poisson model the Prophet uses, read backwards on the fixtures the
 * seed already finished: the nights the favourite did not take the day, ranked by the shock
 * multiplier (1 over the probability the model assigned to what actually happened).
 */
const DATE_OPTS = { month: "short", day: "numeric" } as const;

export function Upsets() {
  const { t, locale } = useI18n();
  const rows = useMemo(() => upsetsBoard(footballProvider.matches(), footballProvider.clubs(), 10), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      {/* Cinematic hero — the night the model's eye was outrun */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -bottom-14 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              {t("upsets.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("upsets.subtitle")}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("upsets.noSeed")}</Panel>
      ) : (
        <ol className="grid gap-4">
          {rows.map((r, i) => {
            const home = getClub(r.match.homeClubId);
            const away = getClub(r.match.awayClubId);
            const pH = pct(r.home), pD = pct(r.draw), pA = pct(r.away);
            return (
              <li key={r.match.id}>
                <article className={cn("overflow-hidden rounded-2xl border p-4 sm:p-5", PANEL_CLASS.panelDeep)}>
                  <div className="flex items-center gap-4">
                    <div className="grid w-8 shrink-0 place-items-center font-mono text-[11px] font-bold text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span>{formatDate(locale, r.match.kickoff, DATE_OPTS)}</span>
                        <span aria-hidden>·</span>
                        <span>{compName(r.competitionId)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-5 sm:gap-8">
                        <Crest colors={home?.colors} short={home?.short} size={52} />
                        <div className="text-center">
                          <div className="text-3xl font-black tabular-nums leading-none text-primary sm:text-4xl">
                            {r.match.homeGoals}{SEPARATOR}{r.match.awayGoals}
                          </div>
                          <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t("prophet.mostLikely")} {r.mostLikelyScore.replace("-", SEPARATOR)}
                          </div>
                        </div>
                        <Crest colors={away?.colors} short={away?.short} size={52} />
                      </div>
                      <div className="mt-2 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
                        {home?.short} <span aria-hidden="true" className="text-muted-foreground/60">{SEPARATOR}</span> {away?.short}
                        <span className="text-muted-foreground"> · <Link to={`/matches/${r.match.id}`} className="text-primary hover:underline">{t("upsets.saidRow", { score: r.mostLikelyScore })}</Link></span>
                      </div>
                      {/* The odds band — the three outcomes at the moment the model read them, before the night happened */}
                      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full border">
                        <div className="h-full bg-primary/70" style={{ width: `${pH}%` }} />
                        <div className="h-full bg-secondary" style={{ width: `${pD}%` }} />
                        <div className="h-full bg-info" style={{ width: `${pA}%` }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
                        <span>{t("prophet.homeWin", { n: pH })}</span>
                        <span>{t("prophet.draw", { n: pD })}</span>
                        <span>{t("prophet.awayWin", { n: pA })}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
                        <span>{t("prophet.expectedTotalGoals", { n: fmt2(r.expectedTotalGoals) })}</span>
                        <span>{t("prophet.expectedGoals", { home: fmt2(r.homeLambda), away: fmt2(r.awayLambda) })}</span>
                      </div>
                    </div>
                    {/* The headline number — the shock multiplier, the night's true scandal */}
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-3xl font-black tabular-nums leading-none text-destructive sm:text-4xl">
                        {fmt2(r.shock)}<span className="text-base">×</span>
                      </div>
                      <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                        {t("upsets.shockLabel")}
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
      <p className="text-center text-[11px] text-muted-foreground">{t("upsets.shockMethod")}</p>
    </div>
  );
}
