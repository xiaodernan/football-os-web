import { useMemo, useState } from "react";
import { useI18n, formatDate } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { ProgressLine } from "@/ui/charts";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { titleRace } from "@/domain/analytics";
import { last } from "@/domain/attributes";
import { cn, pctOf } from "@/lib/utils";

// A format specifier is not a word a visitor reads, but written inside a render hole the
// raw-UI scan reads every literal there as copy — the same two hits DataRoom paid at M170.
const WEEK_DAY: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

export function TitleRace() {
  const { t, locale } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const comp = getCompetition(compId);
  const race = useMemo(() => titleRace(compId, matches, clubs), [compId, matches, clubs]);
  const latest = last(race.weeks);
  const leader = latest ? getClub(latest.leaderId) : undefined;
  const second = latest ? getClub(latest.secondId) : undefined;
  const chart = race.weeks.map((w) => ({
    label: formatDate(locale, w.to, WEEK_DAY),
    value: w.gap,
  }));
  const rows = [...race.weeks].reverse();

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("race.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("race.subtitle")}</p>
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

      {!latest ? (
        <Panel className="p-4">
          <EmptyState title={t("race.empty")} hint={t("race.emptyHint")} icon="📈" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("race.leader")}
              value={leader?.short ?? latest.leaderId}
              sub={t("race.leaderSub", { pts: latest.leaderPoints })}
            />
            <StatTile
              label={t("race.gap")}
              value={race.currentGap}
              sub={t("race.gapSub", { second: second?.short ?? latest.secondId })}
              tone={race.currentGap > 0 ? "up" : undefined}
            />
            <StatTile
              label={t("race.changes")}
              value={race.leadChanges}
              sub={t("race.changesSub", { weeks: race.weeks.length })}
            />
            <StatTile
              label={t("race.widest")}
              value={race.biggestGap}
              sub={t("race.widestSub", { week: race.biggestGapWeek })}
            />
          </div>

          {chart.length > 1 && (
            <Panel className="p-5">
              <SectionTitle title={t("race.chart")} hint={t("race.chartHint")} />
              <div className="mt-3">
                <ProgressLine points={chart} height={180} />
              </div>
            </Panel>
          )}

          <Panel className="p-5">
            <SectionTitle title={t("race.table")} hint={comp?.name ?? latest.leaderId} />
            <div className="mt-3 hidden grid-cols-[7rem_1fr_1fr_4rem] gap-2 border-b pb-1 text-[11px] uppercase tracking-wide text-muted-foreground sm:grid">
              <span>{t("race.colWeek")}</span>
              <span>{t("race.colLeader")}</span>
              <span>{t("race.colSecond")}</span>
              <span className="text-right">{t("race.colGap")}</span>
            </div>
            <ul className="mt-1 space-y-1">
              {rows.map((w) => {
                const first = getClub(w.leaderId);
                const chaser = getClub(w.secondId);
                const widest = w.week === race.biggestGapWeek;
                return (
                  <li
                    key={w.week}
                    className={cn(
                      "grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm sm:grid-cols-[7rem_1fr_1fr_4rem]",
                      widest && "border-primary/40",
                    )}
                  >
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(locale, w.to, WEEK_DAY)}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={first?.colors} short={first?.short} size={22} />
                      <span className="truncate font-medium">{first?.name ?? w.leaderId}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{w.leaderPoints}</span>
                    </div>
                    <div className="hidden min-w-0 items-center gap-2 sm:flex">
                      <Crest colors={chaser?.colors} short={chaser?.short} size={22} />
                      <span className="truncate text-muted-foreground">{chaser?.name ?? w.secondId}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{w.secondPoints}</span>
                    </div>
                    <div className="text-right font-semibold tabular-nums">{w.gap}</div>
                    <div className="col-span-2 h-1.5 w-full rounded-full bg-muted sm:hidden">
                      <div
                        className={cn("h-1.5 rounded-full", widest ? BAR_FILL.good : BAR_FILL.info)}
                        style={{ width: pctOf(w.gap, race.biggestGap || 1) }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("race.method")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
