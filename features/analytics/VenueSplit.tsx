import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, DELTA_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { eventVenueClock, goalVenueClock, venueRhythm, venueSplit } from "@/domain/analytics";
import { deltaSign, maxBy } from "@/domain/attributes";
import { ABSENT, cn, fmt2, pctLabel, pctOf, signed } from "@/lib/utils";

export function VenueSplit() {
  const { t } = useI18n();
  const bandLabels = [t("timing.w1"), t("timing.w2"), t("timing.w3"), t("timing.w4"), t("timing.w5"), t("timing.w6")];
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const comp = getCompetition(compId);
  const venue = useMemo(() => venueSplit(compId, matches, clubs), [compId, matches, clubs]);
  // M788: the venue page's goals get a clock — whether the league's home advantage shows up in
  // the minutes, read off each GOAL event's side rather than the scorelines below.
  const clock = useMemo(() => goalVenueClock(compId, matches, clubs), [compId, matches, clubs]);
  const clockPeak = Math.max(1, ...clock.homeWindows, ...clock.awayWindows);
  const clockRows = [
    { label: t("venue.clockHome"), data: clock.homeWindows, total: clock.home, fill: BAR_FILL.info },
    { label: t("venue.clockAway"), data: clock.awayWindows, total: clock.away, fill: BAR_FILL.progress },
  ];
  // M943: the venue page's shots and saves get the same clock — which end takes its shots
  // where, and whose keeper answers there, read off the same six windows.
  const evClock = useMemo(() => eventVenueClock(compId, matches, clubs), [compId, matches, clubs]);
  // M948: the venue rhythm — each end's goals per card, window for window, joined off the
  // goal clock and the card clock this screen already draws.
  const rhythm = useMemo(() => venueRhythm(compId, matches, clubs), [compId, matches, clubs]);
  const evPeak = Math.max(
    1, ...evClock.homeShotsWindows, ...evClock.awayShotsWindows,
    ...evClock.homeSavesWindows, ...evClock.awaySavesWindows,
  );
  const evRows = [
    { label: t("venue.shotsHome"), data: evClock.homeShotsWindows, total: evClock.homeShots, fill: BAR_FILL.info },
    { label: t("venue.shotsAway"), data: evClock.awayShotsWindows, total: evClock.awayShots, fill: BAR_FILL.progress },
    { label: t("venue.savesHome"), data: evClock.homeSavesWindows, total: evClock.homeSaves, fill: BAR_FILL.good },
    { label: t("venue.savesAway"), data: evClock.awaySavesWindows, total: evClock.awaySaves, fill: BAR_FILL.low },
  ];
  const rows = venue.rows;
  const fortress = rows.length ? maxBy(rows, (r) => r.homeEdge) : null;
  const travellers = rows.length ? maxBy(rows, (r) => r.awayPpg) : null;
  const totalGoals = venue.homeGoals + venue.awayGoals;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("venue.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("venue.subtitle")}</p>
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

      {rows.length === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("venue.empty")} hint={t("venue.emptyHint")} icon="🏟️" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("venue.homeWins")}
              value={venue.homeWins}
              sub={t("venue.ofPlayed", { n: venue.played })}
              tone="up"
            />
            <StatTile label={t("venue.draws")} value={venue.draws} sub={t("venue.ofPlayed", { n: venue.played })} />
            <StatTile
              label={t("venue.awayWins")}
              value={venue.awayWins}
              sub={t("venue.ofPlayed", { n: venue.played })}
              tone="down"
            />
            <StatTile
              label={t("venue.goalShare")}
              value={totalGoals === 0 ? ABSENT : pctLabel(venue.homeGoals / totalGoals)}
              sub={t("venue.goalsSub", { home: venue.homeGoals, away: venue.awayGoals })}
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("venue.table")} hint={comp?.name ?? ABSENT} />
            <div className="mb-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="text-foreground">{t("venue.fortress")}</span>
                <span className="mx-1">·</span>
                {fortress
                  ? t("venue.fortressLine", {
                      club: getClub(fortress.clubId)?.short ?? ABSENT,
                      edge: fmt2(fortress.homeEdge),
                    })
                  : ABSENT}
              </div>
              <div>
                <span className="text-foreground">{t("venue.travellers")}</span>
                <span className="mx-1">·</span>
                {travellers
                  ? t("venue.travellersLine", {
                      club: getClub(travellers.clubId)?.short ?? ABSENT,
                      ppg: fmt2(travellers.awayPpg),
                    })
                  : ABSENT}
              </div>
            </div>

            <div className="hidden grid-cols-[1.5rem_1fr_6.5rem_6.5rem_4.5rem] gap-2 border-b pb-1 text-[11px] uppercase tracking-wide text-muted-foreground sm:grid">
              <span>#</span>
              <span>{t("venue.colClub")}</span>
              <span className="text-right">{t("venue.colHome")}</span>
              <span className="text-right">{t("venue.colAway")}</span>
              <span className="text-right">{t("venue.colEdge")}</span>
            </div>

            <ul className="mt-1 space-y-1">
              {rows.map((r, i) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[1.5rem_1fr_6.5rem_6.5rem_4.5rem]"
                  >
                    <div className="tabular-nums text-muted-foreground">{i + 1}</div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          <span>{t("venue.colHome")}</span>{" "}
                          {r.home.played === 0 ? ABSENT : t("venue.record", { w: r.home.won, d: r.home.drawn, l: r.home.lost })}
                          <span className="mx-1">·</span>
                          {r.home.played === 0 ? ABSENT : t("venue.pts", { n: r.homePoints })}
                          <span className="mx-1">·</span>
                          <span>{t("venue.colAway")}</span>{" "}
                          {r.away.played === 0 ? ABSENT : t("venue.record", { w: r.away.won, d: r.away.drawn, l: r.away.lost })}
                          <span className="mx-1">·</span>
                          {r.away.played === 0 ? ABSENT : t("venue.pts", { n: r.awayPoints })}
                        </div>
                      </div>
                    </div>
                    <div className="hidden text-right tabular-nums sm:block">
                      <div>{r.home.played === 0 ? ABSENT : t("venue.pts", { n: r.homePoints })}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.home.played === 0
                          ? ABSENT
                          : t("venue.record", { w: r.home.won, d: r.home.drawn, l: r.home.lost })}
                      </div>
                    </div>
                    <div className="hidden text-right tabular-nums sm:block">
                      <div>{r.away.played === 0 ? ABSENT : t("venue.pts", { n: r.awayPoints })}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.away.played === 0
                          ? ABSENT
                          : t("venue.record", { w: r.away.won, d: r.away.drawn, l: r.away.lost })}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-right font-mono text-sm tabular-nums",
                        DELTA_CLASS[deltaSign(r.homeEdge)],
                      )}
                    >
                      {signed(r.homeEdge)}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("venue.method")}</p>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("venue.clockTitle")} hint={t("venue.clockHint")} />
            {clock.home + clock.away === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("timing.emptyHint")}</p>
            ) : (
              <div className="mt-3 space-y-4">
                {clockRows.map((row) => (
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
                            <div className={cn("w-full rounded-sm", row.fill)} style={{ height: pctOf(n, clockPeak) }} />
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{bandLabels[b]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {[0, 1].map((end) => {
                  const label = end === 0 ? t("venue.clockHome") : t("venue.clockAway");
                  const series = end === 0 ? rhythm.home : rhythm.away;
                  const denominators = end === 0 ? clock.homeWindows : clock.awayWindows;
                  return (
                    <div key={label} className="mt-2 flex items-end gap-1">
                      <div className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">{t("venue.rhythmWord")} · {label}</div>
                      {series.map((ratio, b) => (
                        <div key={b} className="flex-1 text-center">
                          <div className={cn("font-mono text-[10px]", rhythm.peak?.end === (end === 0 ? "home" : "away") && rhythm.peak.band === b && "font-semibold text-primary")}>
                            {denominators[b] === 0 ? ABSENT : fmt2(ratio)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{bandLabels[b]}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {rhythm.peak
                ? t("venue.rhythmPeak", {
                    end: rhythm.peak.end === "home" ? t("venue.clockHome") : t("venue.clockAway"),
                    w: bandLabels[rhythm.peak.band],
                    n: fmt2((rhythm.peak.end === "home" ? rhythm.home : rhythm.away)[rhythm.peak.band]),
                  })
                : t("venue.rhythmQuiet")}
            </p>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("venue.clockShotsTitle")} hint={t("venue.clockShotsHint")} />
            {evClock.homeShots + evClock.awayShots + evClock.homeSaves + evClock.awaySaves === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("timing.emptyHint")}</p>
            ) : (
              <div className="mt-3 space-y-4">
                {evRows.map((row) => (
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
                            <div className={cn("w-full rounded-sm", row.fill)} style={{ height: pctOf(n, evPeak) }} />
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{bandLabels[b]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
