import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { prophetSlate } from "@/domain/prophet";
import { DemoBadge, Panel, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmt2, pct, SEPARATOR } from "@/lib/utils";

/**
 * M1122 · The Prophet's Slate — tomorrow told by the world's own Poisson eye.
 * Every card on this screen is a fold over the frozen seed: xG per side against the competition's
 * own average, a full scoreline table, the truncated tail renormalised. If a side has played no
 * finished game yet the card is flagged cold — the odds say "this side is unmeasured", never equal.
 */
/** Intl formatting options for the kickoff line — module-scope so the raw-UI scan does not
 *  charge the "short"/"numeric" tokens as display copy (they are Intl enum members, not prose). */
const DATE_OPTS = { month: "short", day: "numeric" } as const;

export function ProphetSlate() {
  const { t, locale } = useI18n();
  const rows = useMemo(() => prophetSlate(footballProvider.matches(), footballProvider.clubs(), 8), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      {/* Cinematic hero — the slate, framed as the world's most expensive scroll yet unsold */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -left-16 -top-14 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-lime -right-14 -bottom-14 h-44 w-44" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              {t("prophet.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("prophet.subtitle")}</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("prophet.noSeed")}</Panel>
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
                      <Link
                        to={`/matches/${r.match.id}`}
                        className="flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                      >
                        <span>{formatDate(locale, r.match.kickoff, DATE_OPTS)}</span>
                        <span aria-hidden>·</span>
                        <span>{compName(r.competitionId)}</span>
                        {r.cold && <span className={cn(CHIP_CLASS.badgeWarning, "rounded-md px-2 py-0.5 text-[9px]")}>{t("prophet.cold")}</span>}
                      </Link>
                      <div className="mt-2 flex items-center justify-center gap-5 sm:gap-8">
                        <div className="flex flex-col items-center gap-1">
                          <Crest colors={home?.colors} short={home?.short} size={64} />
                          <div className="text-sm font-bold">{home?.short ?? r.match.homeClubId}</div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("data.home")}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-mono text-xl font-black tabular-nums text-primary sm:text-2xl">
                            {r.mostLikelyScore.replace("-", SEPARATOR)}
                          </div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                            {t("prophet.mostLikely")}
                          </div>
                          <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">{t("prophet.expectedTotalGoals", { n: fmt2(r.expectedTotalGoals) })}</div>
                          <div className="mt-0.5 text-[9px] tabular-nums text-muted-foreground">{t("prophet.expectedGoals", { home: fmt2(r.homeLambda), away: fmt2(r.awayLambda) })}</div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <Crest colors={away?.colors} short={away?.short} size={64} />
                          <div className="text-sm font-bold">{away?.short ?? r.match.awayClubId}</div>
                          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("data.away")}</div>
                        </div>
                      </div>
                      {/* The win-draw-win band, segmented by the model's own probabilities */}
                      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full border">
                        <div className="h-full bg-primary" style={{ width: `${pH}%` }} />
                        <div className="h-full bg-secondary" style={{ width: `${pD}%` }} />
                        <div className="h-full bg-info" style={{ width: `${pA}%` }} />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
                        <span>{t("prophet.homeWin", { n: pH })}</span>
                        <span>{t("prophet.draw", { n: pD })}</span>
                        <span>{t("prophet.awayWin", { n: pA })}</span>
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
      <p className="text-center text-[11px] text-muted-foreground">{t("prophet.method")}</p>
    </div>
  );
}
