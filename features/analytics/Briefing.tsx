import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n, formatDate } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { briefing } from "@/domain/analytics";
import { useOs } from "@/store/useFootballOS";
import { ABSENT, cn, fmt2 } from "@/lib/utils";

// A format option bag is not interface copy: inside a render hole the raw-UI scan reads every
// literal as a word on the page, so the kickoff spec lives here and goes through the date door.
const KICKOFF_TIME: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function Briefing() {
  const { t, locale } = useI18n();
  const { state } = useOs();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const [clubId, setClubId] = useState(() => state.profile?.favoriteClubId ?? clubs[0]?.id ?? "");

  const brief = useMemo(() => (clubId ? briefing(clubId, matches, clubs) : null), [clubId, matches, clubs]);
  const club = getClub(clubId);
  const comp = brief ? getCompetition(brief.fixture.competitionId) : undefined;
  const opponent = brief ? getClub(brief.opponentId) : undefined;
  const us = brief?.us ?? null;
  const them = brief?.them ?? null;
  const cal = brief?.runInRow ?? null;
  const venueRow = brief?.venueRow ?? null;
  const record = brief?.record ?? null;
  const race = brief?.race ?? null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("briefing.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("briefing.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t("briefing.pick")}</span>
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm"
        >
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {!brief ? (
        <Panel className="p-4">
          <EmptyState title={t("briefing.empty")} hint={t("briefing.emptyHint")} icon="📋" />
        </Panel>
      ) : (
        <>
          <Panel className="p-5">
            <SectionTitle title={t("briefing.nextUp")} hint={comp?.name ?? ABSENT} />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Crest colors={club?.colors} short={club?.short} size={34} />
                <span className="truncate font-semibold">{club?.name ?? brief.clubId}</span>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  brief.side === "home" ? CHIP_CLASS.success : CHIP_CLASS.muted,
                )}
              >
                {brief.side === "home" ? t("briefing.sideHome") : t("briefing.sideAway")}
              </span>
              <span className="text-sm text-muted-foreground">{t("common.vs")}</span>
              <div className="flex min-w-0 items-center gap-2">
                <Crest colors={opponent?.colors} short={opponent?.short} size={34} />
                <span className="truncate font-semibold">{opponent?.name ?? brief.opponentId}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">{formatDate(locale, brief.fixture.kickoff, KICKOFF_TIME)}</span>
              <span>·</span>
              <span>{t("briefing.round", { n: brief.fixture.round })}</span>
              <span>·</span>
              <Link to={`/matches/${brief.fixture.id}`} className="font-medium text-primary hover:underline">
                {t("briefing.openMatch")}
              </Link>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {them
                ? t("briefing.opponentLine", { pts: them.points, played: them.played, max: them.maxPoints })
                : ABSENT}
            </p>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("briefing.points")}
              value={us ? us.points : ABSENT}
              sub={us ? t("briefing.pointsSub", { played: us.played }) : undefined}
            />
            <StatTile
              label={t("briefing.ceiling")}
              value={us ? us.maxPoints : ABSENT}
              sub={us ? t("briefing.ceilingSub", { behind: us.behindLeader }) : undefined}
            />
            <StatTile
              label={t("briefing.left")}
              value={cal ? cal.remaining : ABSENT}
              sub={cal ? t("briefing.leftSub", { avg: fmt2(cal.avgOppPpg) }) : undefined}
            />
            <StatTile
              label={t("briefing.edge")}
              value={venueRow ? fmt2(venueRow.homeEdge) : ABSENT}
              sub={
                venueRow
                  ? t("briefing.edgeSub", { home: fmt2(venueRow.homePpg), away: fmt2(venueRow.awayPpg) })
                  : undefined
              }
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("briefing.steps")} hint={t("briefing.stepsHint")} />
            <ul className="mt-3 space-y-1.5">
              <li>
                <Link
                  to="/scenarios"
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t("briefing.stepTable")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {us
                        ? t("briefing.stepTableLine", {
                            pts: us.points,
                            played: us.played,
                            max: us.maxPoints,
                            behind: us.behindLeader,
                          })
                        : ABSENT}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t("briefing.open")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/run-in"
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t("briefing.stepRunIn")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {cal ? t("briefing.stepRunInLine", { left: cal.remaining, avg: fmt2(cal.avgOppPpg) }) : ABSENT}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t("briefing.open")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/home-away"
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t("briefing.stepVenue")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {venueRow
                        ? t("briefing.stepVenueLine", {
                            home: fmt2(venueRow.homePpg),
                            away: fmt2(venueRow.awayPpg),
                            edge: fmt2(venueRow.homeEdge),
                          })
                        : ABSENT}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t("briefing.open")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/head-to-head"
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t("briefing.stepRecord")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {record && record.played > 0
                        ? t("briefing.stepRecordLine", {
                            meetings: record.played,
                            w: record.winsA,
                            d: record.draws,
                            l: record.winsB,
                            gf: record.goalsA,
                            ga: record.goalsB,
                          })
                        : t("briefing.noMeetings")}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t("briefing.open")}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/title-race"
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{t("briefing.stepRace")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {race
                        ? t("briefing.stepRaceLine", { gap: race.currentGap, changes: race.leadChanges })
                        : ABSENT}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t("briefing.open")}</span>
                </Link>
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("briefing.method")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
