import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { discipline, disciplineTrend, disciplineVenue } from "@/domain/analytics";
import { maxBy } from "@/domain/attributes";
import { ABSENT, cn, fmt2, pctOf } from "@/lib/utils";

export function Discipline() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const board = useMemo(() => discipline(compId, matches, clubs), [compId, matches, clubs]);
  const trend = useMemo(() => disciplineTrend(compId, matches), [compId, matches]);
  const venue = useMemo(() => disciplineVenue(compId, matches, clubs), [compId, matches, clubs]);
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
        </>
      )}
    </div>
  );
}
