import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, DELTA_CLASS } from "@/ui/primitives";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { venueSplit } from "@/domain/analytics";
import { deltaSign, maxBy } from "@/domain/attributes";
import { ABSENT, cn, fmt2, pctLabel, signed } from "@/lib/utils";

export function VenueSplit() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const comp = getCompetition(compId);
  const venue = useMemo(() => venueSplit(compId, matches, clubs), [compId, matches, clubs]);
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
        </>
      )}
    </div>
  );
}
