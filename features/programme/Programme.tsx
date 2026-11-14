import { useMemo } from "react";
import { Link } from "@/lib/router";
import { useI18n, fmtDateTime } from "@/i18n";
import { footballProvider, getClub, fixtureForecast } from "@/data/footballService";
import { tomorrowChapter } from "@/domain/tomorrow";
import { teamMetrics, headToHead, venueSplit } from "@/domain/analytics";
import { DemoBadge, Panel, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmt2, pct, SEPARATOR, ABSENT, signed } from "@/lib/utils";

/**
 * M1132 - The Matchday Programme: the night that's coming, set as a printable booklet.
 * Every figure folds from the frozen seed at render time (the same folds the pages you already
 * walk use): the Poisson eye (fixtureForecast), the table (teamMetrics, sorted by her own rule),
 * the ledger between the two clubs (headToHead) and the home edge (venueSplit). Nothing invented,
 * no network, and the Ctrl/Cmd+P away copy is the @media print block's job - the page hides nav
 * chrome, orbs and grids and hands the visitor a real booklet PDF.
 */
export function Programme() {
  const { t, locale } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const chapter = useMemo(() => tomorrowChapter(matches, clubs), [matches, clubs]);

  if (!chapter) {
    return (
      <div className="space-y-5">
        <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
          <div className="relative">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">{t("programme.title")}</h1>
            <DemoBadge />
          </div>
        </header>
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("tomorrow.noSeed")}</Panel>
      </div>
    );
  }

  const m = chapter.match;
  const comp = competitions.find((c) => c.id === m.competitionId);
  const home = getClub(m.homeClubId);
  const away = getClub(m.awayClubId);

  const metrics = useMemo(() => teamMetrics(m.competitionId, matches, clubs), [matches, clubs, m.competitionId]);
  const hIdx = metrics.findIndex((x) => x.clubId === m.homeClubId);
  const aIdx = metrics.findIndex((x) => x.clubId === m.awayClubId);
  const hMet = hIdx >= 0 ? metrics[hIdx] : undefined;
  const aMet = aIdx >= 0 ? metrics[aIdx] : undefined;
  const hPos = hIdx + 1;
  const aPos = aIdx + 1;

  const h2h = useMemo(() => headToHead(m.homeClubId, m.awayClubId, matches), [matches, m.homeClubId, m.awayClubId]);
  const vs = useMemo(() => venueSplit(m.competitionId, matches, clubs), [matches, clubs, m.competitionId]);
  const hSplit = vs.rows.find((r) => r.clubId === m.homeClubId);
  const aSplit = vs.rows.find((r) => r.clubId === m.awayClubId);

  const forecast = fixtureForecast(m.id);
  const pH = forecast ? pct(forecast.homePct) : 0;
  const pD = forecast ? pct(forecast.drawPct) : 0;
  const pA = forecast ? pct(forecast.awayPct) : 0;

  const form = (f?: readonly string[]) => (f && f.length ? f.join(" ") : ABSENT);
  const gd = (x?: { gf: number; ga: number }) => (x ? signed(x.gf - x.ga) : ABSENT);

  return (
    <div className="space-y-5">
      {/* The cover - tonight's fixture, framed as a print cover */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-8 print:break-inside-avoid", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-20 -top-20 h-48 w-48" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -bottom-16 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary">
            <span>{t("programme.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum mt-2 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-6xl print:text-black">
            {t("programme.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground print:text-black">{t("programme.subtitle")}</p>
          <div className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            {comp?.name ?? m.competitionId}
            {" · "}
            {fmtDateTime(locale, m.kickoff)}
          </div>
          <div className="mt-5 flex items-center justify-center gap-5">
            <Crest colors={home?.colors} short={home?.short} size={72} />
            <div className="text-4xl font-black text-muted-foreground print:text-black">{SEPARATOR}</div>
            <Crest colors={away?.colors} short={away?.short} size={72} />
          </div>
          <div className="mt-3 text-base font-bold sm:text-xl">
            {home?.name ?? m.homeClubId} <span className="text-muted-foreground">{SEPARATOR}</span> {away?.name ?? m.awayClubId}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary">{t("programme.stakes", { h: hPos, a: aPos, comp: comp?.name ?? m.competitionId })}</div>
        </div>
      </header>

      {/* The model's honest opinion of the night */}
      {forecast && (
        <section className={cn("rounded-2xl border p-6 print:break-inside-avoid", PANEL_CLASS.panelDeep)}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tomorrow.modelSays")}</h2>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{t("prophet.expectedTotalGoals", { n: fmt2(forecast.expectedTotalGoals) })}</span>
          </div>
          <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full border">
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
            <span>{t("prophet.mostLikely")} <span className="font-mono text-base tabular-nums text-primary">{forecast.mostLikelyScore.replace("-", SEPARATOR)}</span></span>
            <span>{t("programme.sample", { n: forecast.sample })}</span>
          </div>
        </section>
      )}

      {/* The vital signs, side by side */}
      <section className="grid gap-4 sm:grid-cols-2 print:break-inside-avoid">
        {[
          { met: hMet, tag: t("tomorrow.homeTag"), club: home, pos: hPos },
          { met: aMet, tag: t("tomorrow.awayTag"), club: away, pos: aPos },
        ].map(({ met, tag, club, pos }) => (
          <div key={tag} className={cn("rounded-2xl border p-5", PANEL_CLASS.panelQuiet)}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">{club?.name ?? tag}</h2>
              <span className={cn(CHIP_CLASS.badgePrimary, "rounded-md border px-2 py-0.5 text-[9px] uppercase tracking-widest")}>{tag}</span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.played")}</dt>
                <dd className="font-mono tabular-nums">{met?.played ?? 0}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.ppg")}</dt>
                <dd className="font-mono tabular-nums">{met ? fmt2(met.ppg) : ABSENT}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.result")}</dt>
                <dd className="font-mono tabular-nums">{met ? `${met.won}${SEPARATOR}${met.drawn}${SEPARATOR}${met.lost}` : ABSENT}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.goalDifference")}</dt>
                <dd className="font-mono tabular-nums">{gd(met)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.goals")}</dt>
                <dd className="font-mono tabular-nums">{met?.gf ?? 0}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.conceded")}</dt>
                <dd className="font-mono tabular-nums">{met?.ga ?? 0}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.cleanSheets")}</dt>
                <dd className="font-mono tabular-nums">{met?.cleanSheets ?? 0}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-b pb-1">
                <dt className="text-muted-foreground">{t("programme.form")}</dt>
                <dd className="font-mono tabular-nums">{form(met?.form)}</dd>
              </div>
            </dl>
            <div className="mt-2 text-[9px] uppercase tracking-widest text-muted-foreground">{t("programme.position", { n: pos })}</div>
          </div>
        ))}
      </section>

      {/* The books against each other */}
      <section className={cn("rounded-2xl border p-6 print:break-inside-avoid", PANEL_CLASS.panelDeep)}>
        <h2 className="text-sm font-bold">{t("programme.h2hTitle")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          <div>
            <div className="font-mono text-2xl font-black tabular-nums text-primary">{h2h.played}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("programme.h2hMeetings")}</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-black tabular-nums">
              {h2h.winsA}
              <span className="text-muted-foreground">{SEPARATOR}</span>
              {h2h.winsB}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("programme.h2hWins")}</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-black tabular-nums">{h2h.draws}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("programme.h2hDraws")}</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-black tabular-nums">{h2h.goalsA}<span className="text-muted-foreground">{SEPARATOR}</span>{h2h.goalsB}</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("programme.h2hGoals")}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          {h2h.biggest && <span>{t("programme.h2hBiggest", { n: Math.abs(h2h.biggest.goalsA - h2h.biggest.goalsB) })}</span>}
          {h2h.streak && (h2h.streak.side === "draw"
            ? <span>{t("programme.h2hStreakDraw", { n: h2h.streak.length })}</span>
            : <span>{t("programme.h2hStreakWon", { side: h2h.streak.side === "a" ? (home?.name ?? ABSENT) : (away?.name ?? ABSENT), n: h2h.streak.length })}</span>)}
        </div>
      </section>

      {/* Three keys to the match - numbers, not prophecy */}
      <section className={cn("rounded-2xl border p-6 print:break-inside-avoid", PANEL_CLASS.panelDeep)}>
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("programme.keysTitle")}</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {hMet && aMet && (
            <li>{t("programme.keyOne", { home: home?.name ?? m.homeClubId, away: away?.name ?? m.awayClubId, h: fmt2(hMet.attack), a: fmt2(aMet.defence) })}</li>
          )}
          {hSplit && aSplit && (
            <li>{t("programme.keyTwo", { home: home?.name ?? m.homeClubId, away: away?.name ?? m.awayClubId, h: fmt2(hSplit.homePpg), a: fmt2(aSplit.awayPpg) })}</li>
          )}
          {forecast && (
            <li>{t("programme.keyThree", { n: fmt2(forecast.expectedTotalGoals), score: forecast.mostLikelyScore.replace("-", SEPARATOR), p: forecast.mostLikelyPct })}</li>
          )}
        </ol>
      </section>

      {/* The back page - colophon and the two buttons */}
      <section className={cn("rounded-2xl border p-6 text-center print:break-inside-avoid", PANEL_CLASS.panelQuiet)}>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("programme.colophon")}</p>
        <p className="mt-2 text-[9px] uppercase tracking-widest text-muted-foreground">{t("programme.method")}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="fo-lift inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted"
          >
            {t("programme.print")}
          </button>
          <Link to={`/matches/${m.id}`} className="inline-flex items-center gap-2 text-xs text-primary hover:underline">
            {t("tomorrow.openFixture")}
          </Link>
          <Link to="/manual" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:underline">
            {t("manual.title")}
          </Link>
        </div>
      </section>
    </div>
  );
}
