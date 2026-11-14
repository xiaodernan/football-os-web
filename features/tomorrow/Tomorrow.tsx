import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n, fmtDateTime } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { tomorrowChapter } from "@/domain/tomorrow";
import { DemoBadge, Panel, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmt2, pct, SEPARATOR } from "@/lib/utils";

/**
 * M1125 · the chapter the world is waiting for. The scheduled fixture the seed's own club ratings
 * single out as the night the stadium is sold out — told big: both crests, the combined overall,
 * the odds band, the Poisson scoreline. Everything here is fold or provider — nothing invented,
 * and the oddness of the seed is met as honestly as everything else in this world.
 */
export function Tomorrow() {
  const { t, locale } = useI18n();
  const chapter = useMemo(() => tomorrowChapter(footballProvider.matches(), footballProvider.clubs()), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name ?? id;

  if (!chapter) {
    return (
      <div className="space-y-5">
        <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
          <div className="relative">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">{t("tomorrow.title")}</h1>
            <DemoBadge />
          </div>
        </header>
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("tomorrow.noSeed")}</Panel>
      </div>
    );
  }

  const home = getClub(chapter.match.homeClubId);
  const away = getClub(chapter.match.awayClubId);
  const pH = pct(chapter.home), pD = pct(chapter.draw), pA = pct(chapter.away);

  return (
    <div className="space-y-5">
      {/* Hero — the night, framed as a chapter underway */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-20 -top-20 h-48 w-48" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -bottom-16 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary">{t("tomorrow.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum mt-2 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-6xl">
            {t("tomorrow.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">{t("tomorrow.subtitle")}</p>
        </div>
      </header>

      {/* The chapter — the two names, commanded to play, the odds between them out loud */}
      <section className={cn("overflow-hidden rounded-2xl border p-6 sm:p-8", PANEL_CLASS.panelDeep)}>
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{fmtDateTime(locale, chapter.match.kickoff)}</span>
          <span aria-hidden>·</span>
          <span>{compName(chapter.competitionId)}</span>
          {chapter.cold && <span className={cn(CHIP_CLASS.badgeWarning, "rounded-md px-2 py-0.5 text-[9px]")}>{t("tomorrow.unmeasured")}</span>}
        </div>

        {/* The two headlines — crests, names, overalls */}
        <div className="mt-6 grid grid-cols-3 items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <Crest colors={home?.colors} short={home?.short} size={104} />
            <div className="text-center">
              <div className="text-base font-bold leading-tight sm:text-2xl">{home?.name ?? chapter.match.homeClubId}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tomorrow.homeTag")}</div>
            </div>
            <div className="font-mono text-xs tabular-nums text-primary">{t("tomorrow.overall", { n: chapter.homeOverall })}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tomorrow.combinedOvr", { n: chapter.combinedOverall })}</div>
            <div className="mt-1 font-mono text-4xl font-black tabular-nums leading-none text-primary sm:text-6xl">
              {chapter.match.homeGoals == null ? t("tomorrow.versus") : `${chapter.match.homeGoals}${SEPARATOR}${chapter.match.awayGoals}`}
            </div>
            <div className="mt-2 text-[9px] uppercase tracking-widest text-muted-foreground">{t("tomorrow.incompleteStory")}</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Crest colors={away?.colors} short={away?.short} size={104} />
            <div className="text-center">
              <div className="text-base font-bold leading-tight sm:text-2xl">{away?.name ?? chapter.match.awayClubId}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tomorrow.awayTag")}</div>
            </div>
            <div className="font-mono text-xs tabular-nums text-primary">{t("tomorrow.overall", { n: chapter.awayOverall })}</div>
          </div>
        </div>

        {/* The model's honest opinion of the night */}
        <div className={cn("mt-6 rounded-xl p-4", PANEL_CLASS.panelQuiet)}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tomorrow.modelSays")}</div>
            <div className="font-mono text-sm tabular-nums">{t("prophet.expectedTotalGoals", { n: fmt2(chapter.expectedTotalGoals) })}</div>
          </div>
          <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full border">
            <div className="h-full bg-primary" style={{ width: `${pH}%` }} />
            <div className="h-full bg-secondary" style={{ width: `${pD}%` }} />
            <div className="h-full bg-info" style={{ width: `${pA}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
            <span>{t("prophet.homeWin", { n: pH })}</span>
            <span>{t("prophet.draw", { n: pD })}</span>
            <span>{t("prophet.awayWin", { n: pA })}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span>{t("prophet.mostLikely")} <span className="font-mono text-base tabular-nums text-primary">{chapter.mostLikelyScore.replace("-", SEPARATOR)}</span></span>
            <span>{t("tomorrow.sideMetrics", { h: fmt2(chapter.homeLambda), a: fmt2(chapter.awayLambda) })}</span>
          </div>
        </div>

        {/* Outbound to the fixture */}
        <div className="mt-5 text-center">
          <Link to={`/matches/${chapter.match.id}`} className="inline-flex items-center gap-2 text-xs text-primary hover:underline">
            {t("tomorrow.openFixture")}
          </Link>
        </div>
      </section>

      {/* The honesty line */}
      <p className="text-center text-[11px] text-muted-foreground">{t("tomorrow.method")}</p>
    </div>
  );
}
