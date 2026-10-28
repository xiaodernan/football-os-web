import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { goalTiming } from "@/domain/analytics";
import { maxBy, sum } from "@/domain/attributes";
import { ABSENT, cn, pctLabel, pctOf } from "@/lib/utils";

const BANDS = [0, 1, 2, 3, 4, 5];

export function GoalTiming() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const rows = useMemo(() => goalTiming(compId, matches, clubs), [compId, matches, clubs]);
  // The six window labels are read once, so the bars, the tiles and the list all name a window the
  // same way — and a dictionary that is missing one of the six fails here rather than printing a key.
  const bandLabels = [t("timing.w1"), t("timing.w2"), t("timing.w3"), t("timing.w4"), t("timing.w5"), t("timing.w6")];
  const totals = BANDS.map((i) => sum(rows, (r) => r.scoredBands[i] + r.concededBands[i]));
  const busiest = maxBy(BANDS, (i) => totals[i]);
  const busiestCount = totals[busiest] ?? 0;
  const peak = busiestCount > 0 ? busiestCount : 1;
  const scoredTotal = sum(rows, (r) => r.scored);
  const lateTotal = sum(rows, (r) => r.lateScored);
  // Sorted by late share, so the list reads "who scores latest" first; the tiles take the largest
  // late scorer and the largest late leaker, which the share sort does not guarantee to be row one.
  const latest = rows.length ? maxBy(rows, (r) => r.lateScored) : null;
  const leakiest = rows.length ? maxBy(rows, (r) => r.lateConceded) : null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("timing.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("timing.subtitle")}</p>
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

      {!latest || !leakiest || scoredTotal === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("timing.empty")} hint={t("timing.emptyHint")} icon="⏱" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("timing.busiest")}
              value={bandLabels[busiest]}
              sub={t("timing.busiestSub", { n: busiestCount })}
            />
            <StatTile
              label={t("timing.late")}
              value={pctLabel(lateTotal / scoredTotal)}
              sub={t("timing.lateSub", { n: lateTotal })}
              tone="down"
            />
            <StatTile
              label={t("timing.latest")}
              value={latest.lateScored > 0 ? (getClub(latest.clubId)?.short ?? ABSENT) : ABSENT}
              sub={latest.lateScored > 0 ? t("timing.latestSub", { s: latest.lateScored, n: latest.scored }) : t("timing.none")}
              tone="up"
            />
            <StatTile
              label={t("timing.leakiest")}
              value={leakiest.lateConceded > 0 ? (getClub(leakiest.clubId)?.short ?? ABSENT) : ABSENT}
              sub={leakiest.lateConceded > 0 ? t("timing.leakiestSub", { n: leakiest.lateConceded }) : t("timing.none")}
              tone="down"
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("timing.bandsTitle")} hint={t("timing.bandsHint")} />
            <div className="mt-3 grid grid-cols-6 gap-2">
              {BANDS.map((i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="text-xs tabular-nums text-muted-foreground">{totals[i]}</div>
                  <div className="flex h-16 w-full items-end justify-center gap-1">
                    <div
                      className={cn("w-1/3 rounded-t", BAR_FILL.info)}
                      style={{ height: pctOf(sum(rows, (r) => r.scoredBands[i]), peak) }}
                    />
                    <div
                      className={cn("w-1/3 rounded-t", BAR_FILL.low)}
                      style={{ height: pctOf(sum(rows, (r) => r.concededBands[i]), peak) }}
                    />
                  </div>
                  <div className="text-center text-[11px] text-muted-foreground">{bandLabels[i]}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className={cn("inline-block h-2 w-2 rounded-sm", BAR_FILL.info)} />
                {t("timing.colScored")}
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("inline-block h-2 w-2 rounded-sm", BAR_FILL.low)} />
                {t("timing.colConceded")}
              </span>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("timing.boardTitle")} hint={t("timing.boardHint")} />
            <ul className="mt-2 space-y-1">
              {rows.map((r) => {
                const club = getClub(r.clubId);
                const idle = r.scored === 0 && r.conceded === 0;
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_minmax(110px,200px)]",
                      idle && "opacity-60",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("timing.record", { s: r.scored, c: r.conceded })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.scored}
                      <div className="text-xs text-muted-foreground">{t("timing.colScored")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.conceded}
                      <div className="text-xs text-muted-foreground">{t("timing.colConceded")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={cn("h-2 rounded-full", BAR_FILL.low)} style={{ width: pctOf(r.lateShare, 100) }} />
                      </div>
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {idle ? t("timing.none") : t("timing.lateLine", { s: r.lateScored, c: r.lateConceded })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("timing.method")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
