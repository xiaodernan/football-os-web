import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL, DELTA_CLASS } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { last } from "@/domain/attributes";
import { cardSeverity, clubDisciplineResultClock, discipline, disciplineTrend, disciplineVenue, resultSeverity, strictness, redCardKings, statsBlockKings, venueSeverity, cardTiming, cardPerFoulKings } from "@/domain/analytics";
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
  // M948: each club's own red cards, split by the result its fixture went on to produce —
  // a sending-off in a winning cause and one in a lost one are different events.
  const redResult = useMemo(() => clubDisciplineResultClock(compId, matches, clubs), [compId, matches, clubs]);
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
  // M971: the two counts the clocks already print, divided — how often a club's booking ends red.
  // A club never booked has no severity to rank, so it takes no row here rather than a zero one.
  const severity = useMemo(() => cardSeverity(compId, matches, clubs), [compId, matches, clubs]);
  const severe = severity.rows.filter((r) => r.cards > 0);
  // M972: the same two counts divided once per end — a club booked at only one end has no pair
  // of shares to compare, so the fold counts it aside instead of ranking a one-sided gap.
  const severityEnds = useMemo(() => venueSeverity(compId, matches, clubs), [compId, matches, clubs]);
  // M973: the same two counts divided once per result — a club with no cards in both a won and a
  // lost match has no pair of rates to compare, so it takes no row and is counted aside instead.
  const severityResult = useMemo(() => resultSeverity(compId, matches, clubs), [compId, matches, clubs]);
  // M984: the strictness board reads the whole world, not one competition — no compId axis here.
  const strict = useMemo(() => strictness(matches), [matches]);
  const strictPeak = strict.rows.length ? Math.max(...strict.rows.map((r) => r.perMatch), 0.01) : 1;
  // M1018: the world's red card kings — the clubs sent off the most across every finished fixture.
  const redKingsBoard = useMemo(() => redCardKings(matches, clubs), [matches, clubs]);
  // M1021: the world's foulingest — clubs by fouls committed per fixture at world scale, same door.
  const foulBoard = useMemo(() => statsBlockKings(matches, clubs, "fouls"), [matches, clubs]);
  const foulPeak = foulBoard.rows.length ? foulBoard.rows[0].perMatch : 1;
  const taxBoard = useMemo(() => cardPerFoulKings(matches), [matches]);
  const taxPeak = taxBoard.rows.length ? taxBoard.rows[0].perFoul : 1;
  // M1032: the world's tackling kings — clubs by tackles won per fixture at world scale, same door.
  const tackleBoard = useMemo(() => statsBlockKings(matches, clubs, "tackles"), [matches, clubs]);
  const tacklePeak = tackleBoard.rows.length ? tackleBoard.rows[0].perMatch : 1;
  // M1019: the world's most loaded — clubs by yellows per match across every finished fixture, ranked.
  const yellowBoard = useMemo(() => statsBlockKings(matches, clubs, "yellows"), [matches, clubs]);
  const yellowPeak = yellowBoard.rows.length ? yellowBoard.rows[0].perMatch : 1;
  // M1054: the monks — the fewest-yellow end of the same boards, lowest charge first.
  const monkBoard = useMemo(() => statsBlockKings(matches, clubs, "yellows", "asc"), [matches, clubs]);
  const monkPeak = monkBoard.rows.length ? last(monkBoard.rows)!.perMatch : 1;
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

          {/* M951: the drawn-foul board — the mirror read of the card clock. Every booking
              has two clubs; this board names the club the booking was drawn against. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.drawnTitle")} hint={t("disc.drawnHint")} />
            {clock.drawners.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {clock.drawners.map((r) => {
                  const club = getClub(r.clubId);
                  return (
                    <li key={r.clubId} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Crest colors={club?.colors} short={club?.short} size={26} />
                        <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                          {club?.name ?? r.clubId}
                        </Link>
                      </div>
                      <div className="text-right tabular-nums">
                        {r.drawn}
                        <div className="text-xs text-muted-foreground">{t("disc.drawnWord")} · {t("disc.drawnShare", { n: fmt2(r.drawnShare) })}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* M948: the club red-result board — each club's own sendings-off, split by what
              its fixture went on to do. A red in a winning cause and one in a lost one are
              different events even when the minute agrees. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.redResultTitle")} hint={t("disc.redResultHint")} />
            {redResult.every((r) => r.won + r.drew + r.lost === 0) ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.redNone")}</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {redResult.filter((r) => r.won + r.drew + r.lost > 0).map((r) => {
                  const club = getClub(r.clubId);
                  return (
                    <li key={r.clubId} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Crest colors={club?.colors} short={club?.short} size={26} />
                        <Link to={`/clubs/${r.clubId}`} className="block truncate font-medium hover:text-primary">
                          {club?.name ?? r.clubId}
                        </Link>
                      </div>
                      <div className="text-right text-xs text-muted-foreground tabular-nums">
                        {t("disc.redResultLine", { w: r.won, d: r.drew, l: r.lost })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* M970: the volume boards above count cards; this one divides them — what share of a
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

          {/* M972: the board above gives each club one red share; this divides the same two counts
              at each end, for the clubs booked at both. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.sevVenueTitle")} hint={t("disc.sevVenueHint")} />
            {severityEnds.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.sevVenueNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.sevVenueLeague", {
                    h: fmt2(severityEnds.homeLeague),
                    a: fmt2(severityEnds.awayLeague),
                    s: signed(severityEnds.leagueShareGap),
                  })}
                </p>
                {severityEnds.singleVenue > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("disc.sevVenueSingle", { n: severityEnds.singleVenue })}
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {severityEnds.rows.map((r) => {
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
                              {t("disc.sevVenueRow", {
                                h: fmt2(r.homeShare),
                                hc: r.homeCards,
                                a: fmt2(r.awayShare),
                                ac: r.awayCards,
                              })}
                            </div>
                          </div>
                        </div>
                        <div className={cn("text-right tabular-nums", DELTA_CLASS[deltaSign(r.shareGap)])}>
                          {signed(r.shareGap)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
          {/* M973: the same two counts divided once per result — a club with no cards in both a
              won and a lost match has no pair of rates to compare. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.sevResultTitle")} hint={t("disc.sevResultHint")} />
            {severityResult.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.sevResultNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.sevResultLeague", {
                    w: fmt2(severityResult.wonLeague),
                    d: fmt2(severityResult.drewLeague),
                    l: fmt2(severityResult.lostLeague),
                    s: signed(severityResult.leagueTilt),
                  })}
                </p>
                {severityResult.singleResult > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("disc.sevResultSingle", { n: severityResult.singleResult })}
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {severityResult.rows.map((r) => {
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
                              {t("disc.sevResultRow", {
                                w: fmt2(r.wonShare),
                                wc: r.wonCards,
                                d: fmt2(r.drewShare),
                                dc: r.drewCards,
                                l: fmt2(r.lostShare),
                                lc: r.lostCards,
                              })}
                            </div>
                          </div>
                        </div>
                        <div className={cn("text-right tabular-nums", DELTA_CLASS[deltaSign(r.tilt)])}>
                          {signed(r.tilt)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
          {/* M984: the strictness board — the competitions ranked against each other by the cards
              their referees hand out per finished match. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.strictTitle")} hint={t("disc.strictHint")} />
            {strict.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.clockNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.strictWorld", { n: strict.matches, p: fmt2(strict.globalPerMatch) })}
                </p>
                <ul className="mt-2 space-y-1">
                  {strict.rows.map((r, i) => {
                    const comp = competitions.find((c) => c.id === r.competitionId);
                    return (
                      <li
                        key={r.competitionId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto_auto] sm:grid-cols-[2rem_1fr_auto_auto_minmax(90px,180px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{comp?.name ?? r.competitionId}</div>
                          <div className="text-xs text-muted-foreground">{t("disc.strictLine", { y: r.yellows, r: r.reds })}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {fmt2(r.perMatch)}
                          <div className="text-xs text-muted-foreground">{t("disc.perMatch")}</div>
                        </div>
                        <div className="text-right tabular-nums text-muted-foreground">
                          {r.bookings}
                          <div className="text-xs text-muted-foreground">{t("disc.strictCards")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.info)} style={{ width: pctOf(r.perMatch, strictPeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.strictMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1019: the world's most loaded — yellows per match, every club tallied from its own stats block. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.yellowTitle")} hint={t("disc.yellowHint")} />
            {yellowBoard.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.yellowNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.yellowWorld", { p: fmt2(yellowBoard.league), n: yellowBoard.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {yellowBoard.rows.map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(90px,180px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="min-w-0 flex items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {fmt2(r.perMatch)}
                          <div className="text-xs text-muted-foreground">{t("disc.yellowShare")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.low)} style={{ width: pctOf(r.perMatch, yellowPeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.yellowMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1054: the monks — the lowest-charge end of the same boards, lowest charge first. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.monkTitle")} hint={t("disc.monkHint")} />
            {monkBoard.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.monkNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.monkWorld", { p: fmt2(monkBoard.league), n: monkBoard.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {monkBoard.rows.slice(0, 6).map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(90px,180px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="min-w-0 flex items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {fmt2(r.perMatch)}
                          <div className="text-xs text-muted-foreground">{t("disc.monkShare")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.low)} style={{ width: pctOf(r.perMatch, monkPeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.monkMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1021: the world's foulingest — fouls committed per fixture, every side from its own stats block. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.foulTitle")} hint={t("disc.foulHint")} />
            {foulBoard.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.foulNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.foulWorld", { p: fmt2(foulBoard.league), n: foulBoard.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {foulBoard.rows.map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(90px,180px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="min-w-0 flex items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {fmt2(r.perMatch)}
                          <div className="text-xs text-muted-foreground">{t("disc.foulShare")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.low)} style={{ width: pctOf(r.perMatch, foulPeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.foulMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1049: the taxmen — cards per 100 fouls, who pays for playing it rough. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.taxTitle")} hint={t("disc.taxHint")} />
            {taxBoard.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.taxNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.taxWorld", { p: fmt2(taxBoard.world), n: taxBoard.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {taxBoard.rows.slice(0, 8).map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(90px,180px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="min-w-0 flex items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {fmt2(r.perFoul)}
                          <div className="text-xs text-muted-foreground">{t("disc.taxShare")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.low)} style={{ width: pctOf(r.perFoul, taxPeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.taxMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1032: the world's tackling kings — tackles won per fixture, every side from its own stats block. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.tackleTitle")} hint={t("disc.tackleHint")} />
            {tackleBoard.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.tackleNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.tackleWorld", { p: fmt2(tackleBoard.league), n: tackleBoard.rows.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {tackleBoard.rows.map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(90px,180px)]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="min-w-0 flex items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0 truncate font-medium">{club?.name ?? r.clubId}</div>
                        </div>
                        <div className="text-right tabular-nums">
                          {fmt2(r.perMatch)}
                          <div className="text-xs text-muted-foreground">{t("disc.tackleShare")}</div>
                        </div>
                        <div className="hidden sm:block">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className={cn("h-2 rounded-full", BAR_FILL.good)} style={{ width: pctOf(r.perMatch, tacklePeak) }} />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.tackleMethod")}</p>
              </>
            )}
          </Panel>

          {/* M1018: the world's red card kings — every club sent off across every finished fixture. */}
          <Panel className="p-5">
            <SectionTitle title={t("disc.redKingsTitle")} hint={t("disc.redKingsHint")} />
            {redKingsBoard.rows.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("disc.redKingsNone")}</p>
            ) : (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("disc.redKingsWorld", { n: redKingsBoard.matches, p: fmt2(redKingsBoard.perMatch) })}
                </p>
                <ul className="mt-2 space-y-1">
                  {redKingsBoard.rows.map((r, i) => {
                    const club = getClub(r.clubId);
                    return (
                      <li
                        key={r.clubId}
                        className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto]"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <div className="flex min-w-0 items-center gap-2">
                          <Crest colors={club?.colors} short={club?.short} size={22} />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                            <div className="text-xs text-muted-foreground">{t("disc.redKingsLine", { y: r.yellows })}</div>
                          </div>
                        </div>
                        <div className="text-right tabular-nums">
                          {r.reds}
                          <div className="text-xs text-muted-foreground">{t("disc.reds")}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{t("disc.redKingsMethod")}</p>
              </>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
