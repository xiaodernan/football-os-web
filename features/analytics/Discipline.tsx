import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL, DELTA_CLASS } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { discipline, disciplineTrend, disciplineVenue, cardTiming, cardSeverity, clubResultCards } from "@/domain/analytics";
import { deltaSign, maxBy } from "@/domain/attributes";
import { ABSENT, cn, fmt2, pctOf, signed } from "@/lib/utils";

export function Discipline() {
  const { t } = useI18n();
  const bandLabels = [t("timing.w1"), t("timing.w2"), t("timing.w3"), t("timing.w4"), t("timing.w5"), t("timing.w6")];
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const board = useMemo(() => discipline(compId, matches, clubs), [compId, matches, clubs]);
  const trend = useMemo(() => disciplineTrend(compId, matches), [compId, matches]);
  const venue = useMemo(() => disciplineVenue(compId, matches, clubs), [compId, matches, clubs]);
  // M779: the same bookings the ledger counts, read by the minute they arrived — the first and
  // last window of the same six the clock uses.
  const clock = useMemo(() => cardTiming(compId, matches, clubs), [compId, matches, clubs]);
  const booked = clock.rows.filter((r) => r.cards > 0);
  const peakWindow = Math.max(1, ...clock.windows);
  // M787: the league curve split by the end each card was earned at — the venue board below
  // reads rates by club, this reads the same clock by side.
  const venuePeak = Math.max(1, ...clock.homeWindows, ...clock.awayWindows);
  const venueRows = [
    { label: t("disc.venueClockHome"), data: clock.homeWindows, fill: BAR_FILL.info },
    { label: t("disc.venueClockAway"), data: clock.awayWindows, fill: BAR_FILL.progress },
  ];
  // M789: each red club's own six-window series, read against the other red rows rather than
  // only against the league, so the red board shows where the sendings-off fell.
  const redPeak = Math.max(1, ...clock.redRows.map((r) => Math.max(...r.bands)));
  // M948: the two counts the clocks already print, divided — how often a club's booking ends red.
  // A club never booked has no severity to rank, so it takes no row here rather than a zero one.
  const severity = useMemo(() => cardSeverity(compId, matches, clubs), [compId, matches, clubs]);
  const severe = severity.rows.filter((r) => r.cards > 0);
  // M950: the result clock above, charged to the club that was booked rather than to the league.
  const results = useMemo(() => clubResultCards(compId, matches, clubs), [compId, matches, clubs]);
  // A gap needs both ends: a club with one venue played reads a zero rate it has not earned.
  const split = venue.rows.filter((r) => r.playedHome > 0 && r.playedAway > 0).slice(0, 5);
  const counted = board.rows.filter((r) => r.played > 0);
  const most = counted.length ? maxBy(counted, (r) => r.bookings) : null;
  const peak = Math.max(1, ...board.rows.map((r) => r.bookingsPerMatch));
  const foulsPerMatch = board.matches ? fmt2(board.fouls / board.matches) : ABSENT;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("disc.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("disc.subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {competitions.map((c) => (
          <button
            key={c.id}
            onClick={() => setCompId(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              compId === c.id ? CHIP_CLASS.filterOn : CHIP_CLASS.filterOff,
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {!most || board.matches === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("disc.empty")} hint={t("disc.emptyHint")} icon="▨" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t("disc.yellows")} value={board.yellows} sub={t("disc.playedSub", { n: board.matches })} />
            <StatTile label={t("disc.reds")} value={board.reds} sub={t("disc.redsSub")} tone="down" />
            <StatTile label={t("disc.perMatch")} value={fmt2(board.perMatch)} sub={t("disc.perMatchSub", { f: foulsPerMatch })} />
            <StatTile
              label={t("disc.most")}
              value={getClub(most.clubId)?.short ?? ABSENT}
              sub={t("disc.mostSub", { b: most.bookings, y: most.yellows })}
              tone="down"
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("disc.boardTitle")} hint={t("disc.boardHint")} />
            <ul className="mt-2 space-y-1">
              {board.rows.map((r) => {
                const club = getClub(r.clubId);
                const idle = r.played === 0;
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_minmax(110px,200px)]",
                      idle && "opacity-60",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                          {club?.name ?? r.clubId}
                        </Link>
                        <div className="text-xs text-muted-foreground">{t("disc.record", { p: r.played })}</div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.yellows}
                      <div className="text-xs text-muted-foreground">{t("disc.colYellows")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.reds}
                      <div className="text-xs text-muted-foreground">{t("disc.colReds")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.fouls}
                      <div className="text-xs text-muted-foreground">{t("disc.colFouls")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={cn("h-2 rounded-full", BAR_FILL.low)} style={{ width: pctOf(r.bookingsPerMatch, peak) }} />
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {idle ? t("disc.none") : t("disc.rowLine", { b: r.bookings, f: r.fouls })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("disc.method")}</p>
          </Panel>

          {/* M626: the same cards split by the end they were earned at. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.venueTitle")} hint={t("disc.venueHint")} />
            <p className="mt-2 text-xs text-muted-foreground">{t("disc.venueLeague", { h: fmt2(venue.home.perMatch), a: fmt2(venue.away.perMatch) })}</p>
            {split.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.venueNone")}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {split.map((r) => {
                  const club = getClub(r.clubId);
                  return (
                    <li
                      key={r.clubId}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Crest colors={club?.colors} short={club?.short} size={26} />
                        <div className="min-w-0">
                          <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                            {club?.name ?? r.clubId}
                          </Link>
                          <div className="text-xs text-muted-foreground">{t("disc.venueGap", { g: fmt2(r.gap) })}</div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        {fmt2(r.homePerMatch)}
                        <div className="text-xs text-muted-foreground">{t("disc.venueHome")}</div>
                      </div>
                      <div className="text-right tabular-nums">
                        {fmt2(r.awayPerMatch)}
                        <div className="text-xs text-muted-foreground">{t("disc.venueAway")}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("disc.trendTitle")} hint={t("disc.trendHint")} />
            <div className="mt-3 flex items-end gap-1">
              {trend.rounds.map((r) => (
                <div key={r.round} className="flex-1 text-center">
                  <div className="font-mono text-[10px] text-muted-foreground">{r.inRound}</div>
                  <div className="mx-auto mt-0.5 h-12 w-full">
                    <div
                      className={cn("w-full rounded-sm", BAR_FILL.bad)}
                      style={{ height: pctOf(r.inRound, Math.max(1, trend.peak)) }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{t("disc.round", { r: r.round })}</div>
                  <div className="text-[10px] text-muted-foreground">{t("disc.trendTotal", { c: r.cards })}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* M785: every card in the competition on the same six windows as a league curve — the
              round trend above asks when in the season, this one asks when in the match. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.windowTitle")} hint={t("disc.windowHint")} />
            {clock.windows.every((n) => n === 0) ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <div className="mt-3 flex items-end gap-1">
                {clock.windows.map((n, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="font-mono text-[10px] text-muted-foreground">{n}</div>
                    <div className="mx-auto mt-0.5 h-12 w-full">
                      <div
                        className={cn("w-full rounded-sm", BAR_FILL.bad)}
                        style={{ height: pctOf(n, peakWindow) }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{bandLabels[i]}</div>
                    {clock.redWindows[i] > 0 && (
                      <div className="text-[10px] text-muted-foreground">{t("disc.redTotal", { n: clock.redWindows[i] })}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* M787: that same curve split by the end the card was earned at, so a league's home
              and away clocks can be read against each other rather than only in total. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.venueClockTitle")} hint={t("disc.venueClockHint")} />
            {clock.windows.every((n) => n === 0) ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <div className="mt-3 space-y-4">
                {venueRows.map((row) => (
                  <div key={row.label}>
                    <div className="text-xs text-muted-foreground">{row.label}</div>
                    <div className="mt-1 flex items-end gap-1">
                      {row.data.map((n, i) => (
                        <div key={i} className="flex-1 text-center">
                          <div className="font-mono text-[10px] text-muted-foreground">{n}</div>
                          <div className="mx-auto mt-0.5 h-10 w-full">
                            <div className={cn("w-full rounded-sm", row.fill)} style={{ height: pctOf(n, venuePeak) }} />
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{bandLabels[i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* M779: the bookings by the minute they arrived — the same six windows the event
              clock folds shots into, read at the card end. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.clockTitle")} hint={t("disc.clockHint")} />
            {booked.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {booked.map((r) => {
                  const club = getClub(r.clubId);
                  return (
                    <li key={r.clubId} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Crest colors={club?.colors} short={club?.short} size={26} />
                        <div className="min-w-0">
                          <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                            {club?.name ?? r.clubId}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {t("clock.strikeLine", {
                              e: r.earlyCards,
                              p: fmt2(r.earlyShare),
                              l: r.lateCards,
                              q: fmt2(r.lateShare),
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        {r.cards}
                        <div className="text-xs text-muted-foreground">{t("disc.clockTotal", { n: r.cards })}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* M783: the red card on its own — the same six windows, but only the sendings-off,
              with the window that holds most of each club's reds. M789: and each club's own
              series under its row, so two clubs on one red each are told apart by when. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.redTitle")} hint={t("disc.redHint")} />
            {clock.redRows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.redNone")}</p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-6 gap-1 px-3">
                  {bandLabels.map((label, i) => (
                    <div key={i} className="text-center text-[10px] text-muted-foreground">{label}</div>
                  ))}
                </div>
                <ul className="mt-1 space-y-1">
                  {clock.redRows.map((r) => {
                    const club = getClub(r.clubId);
                    return (
                      <li key={r.clubId} className="rounded-lg border px-3 py-2 text-sm">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <Crest colors={club?.colors} short={club?.short} size={26} />
                            <div className="min-w-0">
                              <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                                {club?.name ?? r.clubId}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {t("disc.redLine", { w: bandLabels[r.peakBand], n: r.peakCount })}
                              </div>
                            </div>
                          </div>
                          <div className="text-right tabular-nums">
                            {r.reds}
                            <div className="text-xs text-muted-foreground">{t("disc.redTotal", { n: r.reds })}</div>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-6 gap-1">
                          {r.bands.map((n, b) => (
                            <div key={b} className="text-center">
                              <div className="mx-auto h-5 w-full">
                                <div className={cn("w-full rounded-sm", BAR_FILL.bad)} style={{ height: pctOf(n, redPeak) }} />
                              </div>
                              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{n}</div>
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>

          {/* M944: the contrast board — where a club's sendings-off land against where its
              own bookings land, the first and last window shares side by side with the gap
              the two reads leave between them. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.contrastTitle")} hint={t("disc.contrastHint")} />
            {clock.contrast.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.contrastNone")}</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {clock.contrast.map((r) => {
                  const club = getClub(r.clubId);
                  return (
                    <li key={r.clubId} className="rounded-lg border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={26} />
                          <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                            {club?.name ?? r.clubId}
                          </Link>
                        </div>
                        <div className="text-right text-xs text-muted-foreground tabular-nums">
                          {t("disc.contrastCards")} {r.cards} · {t("disc.contrastReds")} {r.reds}
                        </div>
                      </div>
                      <div className="mt-1.5 space-y-0.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t("disc.contrastEarly")}</span>
                          <span className="font-mono tabular-nums">
                            {fmt2(r.earlyCardShare)}% / {fmt2(r.earlyRedShare)}%
                            <span className={cn("ml-2", DELTA_CLASS[deltaSign(r.earlyGap)])}>{signed(r.earlyGap)}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{t("disc.contrastLate")}</span>
                          <span className="font-mono tabular-nums">
                            {fmt2(r.lateCardShare)}% / {fmt2(r.lateRedShare)}%
                            <span className={cn("ml-2", DELTA_CLASS[deltaSign(r.lateGap)])}>{signed(r.lateGap)}</span>
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* M945: the result clock — the same cards, split by what the booked side's match
              went on to do. A booking in a lost cause and one in a winning effort land on
              the same six windows, three series side by side. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.resultTitle")} hint={t("disc.resultHint")} />
            {clock.resultClock.won + clock.resultClock.drew + clock.resultClock.lost === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.contrastNone")}</p>
            ) : (
              <div className="mt-3 space-y-4">
                {[
                  { label: t("disc.resultWon"), data: clock.resultClock.wonWindows, total: clock.resultClock.won, fill: BAR_FILL.good },
                  { label: t("disc.resultDrew"), data: clock.resultClock.drewWindows, total: clock.resultClock.drew, fill: BAR_FILL.info },
                  { label: t("disc.resultLost"), data: clock.resultClock.lostWindows, total: clock.resultClock.lost, fill: BAR_FILL.bad },
                ].map((row) => {
                  const peak = Math.max(1, ...clock.resultClock.wonWindows, ...clock.resultClock.drewWindows, ...clock.resultClock.lostWindows);
                  return (
                    <div key={row.label}>
                      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                        <span>{row.label}</span>
                        <span className="font-mono">{row.total}</span>
                      </div>
                      <div className="mt-1 flex items-end gap-1">
                        {row.data.map((n, b) => (
                          <div key={b} className="flex-1 text-center">
                            <div className="font-mono text-[10px] text-muted-foreground">{n}</div>
                            <div className="mx-auto mt-0.5 h-10 w-full">
                              <div className={cn("w-full rounded-sm", row.fill)} style={{ height: pctOf(n, peak) }} />
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">{bandLabels[b]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* M948: the volume boards above count cards; this one divides them — what share of a
              club's own bookings ends red, and where. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.sevTitle")} hint={t("disc.sevHint")} />
            {severe.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">{t("disc.sevLeague", { p: fmt2(severity.league) })}</p>
                <ul className="mt-2 space-y-1">
                  {severe.map((r) => {
                    const club = getClub(r.clubId);
                    return (
                      <li key={r.clubId} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={26} />
                          <div className="min-w-0">
                            <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                              {club?.name ?? r.clubId}
                            </Link>
                            <div className="text-xs text-muted-foreground">{t("disc.sevRow", { p: fmt2(r.redShare), c: r.cards })}</div>
                            {r.worst && (
                              <div className="text-xs text-muted-foreground">
                                {t("disc.sevPeak", { w: bandLabels[r.worst.band], p: fmt2(r.worst.share) })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          {r.reds}
                          <div className="text-xs text-muted-foreground">{t("disc.redTotal", { n: r.reds })}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>

          {/* M950: the league's result clock handed to each club — the same three counts the
              panel above folds, charged to the club that was booked. The right column is the
              losing share minus the winning one, in percentage points. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.resultClubTitle")} hint={t("disc.resultClubHint")} />
            {results.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.resultClubLeague", {
                    l: fmt2(results.league.lostShare),
                    w: fmt2(results.league.wonShare),
                    s: signed(results.league.edge),
                  })}
                </p>
                <ul className="mt-2 space-y-1">
                  {results.rows.map((r) => {
                    const club = getClub(r.clubId);
                    return (
                      <li key={r.clubId} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={26} />
                          <div className="min-w-0">
                            <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                              {club?.name ?? r.clubId}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {t("disc.resultClubRow", { p: fmt2(r.lostShare), c: r.cards })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("disc.resultWon")} {r.won} · {t("disc.resultDrew")} {r.drew} ·{" "}
                              {t("disc.resultLost")} {r.lost} · {t("disc.resultClubGap", { p: fmt2(r.wonShare) })}
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "text-right font-mono text-sm tabular-nums",
                            DELTA_CLASS[deltaSign(r.edge)],
                          )}
                        >
                          {signed(r.edge)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
