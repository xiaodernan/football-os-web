import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { pointsScenarios } from "@/domain/analytics";
import { maxBy, sum } from "@/domain/attributes";
import { ABSENT, cn, fmt2, pctOf } from "@/lib/utils";

export function PointsScenario() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const comp = getCompetition(compId);
  const rows = useMemo(() => pointsScenarios(compId, matches, clubs), [compId, matches, clubs]);
  const leader = rows[0] ?? null;
  const ceiling = rows.length ? maxBy(rows, (r) => r.maxPoints) : null;
  const chasers = rows.filter((r) => r.canCatchLeader);
  const totalLeft = sum(rows, (r) => r.remaining);
  const leaderPoints = leader?.points ?? 0;
  const maxCeiling = ceiling?.maxPoints ?? 0;
  const decided = rows.length > 0 && chasers.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("scenario.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("scenario.subtitle")}</p>
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

      {!leader || !ceiling ? (
        <Panel className="p-4">
          <EmptyState title={t("scenario.empty")} hint={t("scenario.emptyHint")} icon="📊" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("scenario.leader")}
              value={getClub(leader.clubId)?.short ?? ABSENT}
              sub={t("scenario.leaderSub", { pts: leader.points })}
            />
            <StatTile
              label={t("scenario.ceiling")}
              value={getClub(ceiling.clubId)?.short ?? ABSENT}
              sub={t("scenario.ceilingSub", { pts: ceiling.maxPoints })}
              tone="up"
            />
            <StatTile
              label={t("scenario.chasers")}
              value={chasers.length}
              sub={t("scenario.chasersSub", { n: rows.length })}
            />
            <StatTile label={t("scenario.remaining")} value={totalLeft} sub={comp?.name ?? ABSENT} />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("scenario.titleRace")} hint={comp?.name ?? ABSENT} />
            <p className={cn("mt-2 text-sm", decided ? "text-muted-foreground" : "text-foreground")}>
              {decided
                ? t("scenario.decided", { pts: leaderPoints })
                : t("scenario.open", { n: chasers.length, pts: leaderPoints })}
            </p>

            <div className="mt-3 hidden grid-cols-[1.5rem_1fr_3rem_3rem_3.5rem_4rem_3.5rem] gap-2 border-b pb-1 text-[11px] uppercase tracking-wide text-muted-foreground sm:grid">
              <span>#</span>
              <span>{t("scenario.colClub")}</span>
              <span className="text-right">{t("scenario.colPoints")}</span>
              <span className="text-right">{t("scenario.colLeft")}</span>
              <span className="text-right">{t("scenario.colCeiling")}</span>
              <span className="text-right">{t("scenario.colRate")}</span>
              <span className="text-right">{t("scenario.colGap")}</span>
            </div>

            <ul className="mt-1 space-y-1">
              {rows.map((r, i) => {
                const club = getClub(r.clubId);
                const isLeader = r.clubId === leader.clubId;
                const reachable = r.canCatchLeader;
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1.5rem_1fr_auto_auto] sm:grid-cols-[1.5rem_1fr_3rem_3rem_3.5rem_4rem_3.5rem]",
                      !isLeader && !reachable && "opacity-70",
                    )}
                  >
                    <div className="tabular-nums text-muted-foreground">{i + 1}</div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("scenario.record", { played: r.played })}
                          {!isLeader && (
                            <span className={cn("ml-2", reachable ? "text-success" : "text-muted-foreground")}>
                              {reachable ? t("scenario.inReach") : t("scenario.outOfReach")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-semibold tabular-nums">{r.points}</div>
                    <div className="text-right tabular-nums">{r.remaining}</div>
                    <div className="hidden text-right tabular-nums sm:block">{r.maxPoints}</div>
                    <div className="hidden text-right tabular-nums sm:block">{fmt2(r.ratePoints)}</div>
                    <div className="hidden text-right tabular-nums sm:block">
                      {isLeader ? ABSENT : r.behindLeader}
                    </div>
                    <div className="col-span-2 mt-1 h-1.5 w-full rounded-full bg-muted sm:hidden">
                      <div
                        className={cn("h-1.5 rounded-full", reachable ? BAR_FILL.good : BAR_FILL.low)}
                        style={{ width: maxCeiling > 0 ? pctOf(r.maxPoints, maxCeiling) : "0%" }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("scenario.method")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
