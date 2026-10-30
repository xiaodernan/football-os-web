import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { eventClock } from "@/domain/analytics";
import { maxBy } from "@/domain/attributes";
import { ABSENT, cn, pctOf } from "@/lib/utils";

export function EventClock() {
  const { t } = useI18n();
  const bandLabels = [t("timing.w1"), t("timing.w2"), t("timing.w3"), t("timing.w4"), t("timing.w5"), t("timing.w6")];
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const clock = useMemo(() => eventClock(compId, matches, clubs), [compId, matches, clubs]);
  const bands = clock.shotsBands.map((n, b) => ({ b, n }));
  const busiest = clock.shots ? maxBy(bands, (x) => x.n) : null;
  const peak = Math.max(1, ...clock.shotsBands, ...clock.savesBands, ...clock.varBands, ...clock.facedBands);
  const rows = [
    { label: t("clock.shots"), data: clock.shotsBands, fill: BAR_FILL.info },
    { label: t("clock.saves"), data: clock.savesBands, fill: BAR_FILL.low },
    { label: t("clock.vars"), data: clock.varBands, fill: BAR_FILL.bad },
    // M628: the same clock read from the defending end, window for window.
    { label: t("clock.faced"), data: clock.facedBands, fill: BAR_FILL.progress },
  ];
  // M625: the same clock read from the defending end — the five clubs that face the most shots.
  const siege = clock.siege.slice(0, 5);
  // M712: the defending end at the late window only — the clubs that take the most of the last
  // fifteen minutes, off the same fold. A club with nothing late has no row here rather than a
  // zero, so the board names who is actually under late siege.
  const lateSiege = clock.lateSiege.filter((r) => r.lateFaced > 0).slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("clock.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("clock.subtitle")}</p>
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

      {clock.matches === 0 ? (
        <Panel className="p-4">
          <EmptyState title={t("clock.empty")} hint={t("clock.emptyHint")} icon="◵" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label={t("clock.shots")} value={clock.shots} sub={t("clock.shotsSub", { n: clock.matches })} />
            <StatTile label={t("clock.saves")} value={clock.saves} tone="down" />
            <StatTile label={t("clock.vars")} value={clock.vars} sub={t("clock.varsSub", { n: clock.matches })} tone="down" />
            <StatTile
              label={t("clock.busiest")}
              value={busiest ? bandLabels[busiest.b] : ABSENT}
              sub={busiest ? t("clock.busiestSub", { n: busiest.n }) : t("clock.emptyShort")}
            />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("clock.bandsTitle")} hint={t("clock.bandsHint")} />
            <div className="mt-3 space-y-4">
              {rows.map((row) => (
                <div key={row.label}>
                  <div className="text-xs text-muted-foreground">{row.label}</div>
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
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("clock.boardTitle")} hint={t("clock.boardHint")} />
            <ul className="mt-2 space-y-1">
              {clock.rows.map((r) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">{t("clock.record", { l: r.lateShots, p: r.lateShare })}</div>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.shots}
                      <div className="text-xs text-muted-foreground">{t("clock.shots")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.saves}
                      <div className="text-xs text-muted-foreground">{t("clock.saves")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.vars}
                      <div className="text-xs text-muted-foreground">{t("clock.vars")}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("clock.method")}</p>
          </Panel>

          <Panel className="p-5">
            <SectionTitle title={t("clock.siegeTitle")} hint={t("clock.siegeHint")} />
            <ul className="mt-2 space-y-1">
              {siege.map((r) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">{t("clock.stopLine", { p: r.stopShare })}</div>
                        {/* A club that faced nothing has no busiest window to name. */}
                        {r.faced > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {t("clock.siegeBand", { band: bandLabels[r.worstBand], p: r.lateFacedShare })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.faced}
                      <div className="text-xs text-muted-foreground">{t("clock.faced")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {r.stops}
                      <div className="text-xs text-muted-foreground">{t("clock.stops")}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
          {/* M712: nobody was hit late in this competition reads no board rather than five
              empty rows — the same silence the siege rows keep for a club that faced nothing. */}
          {lateSiege.length > 0 && (
            <Panel className="p-5">
              <SectionTitle title={t("clock.lateSiegeTitle")} hint={t("clock.lateSiegeHint")} />
              <ul className="mt-2 space-y-1">
                {lateSiege.map((r) => {
                  const club = getClub(r.clubId);
                  return (
                    <li
                      key={r.clubId}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Crest colors={club?.colors} short={club?.short} size={26} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("clock.lateSiegeLine", { n: r.lateFaced, f: r.faced, p: r.lateFacedShare })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        {r.lateFaced}
                        <div className="text-xs text-muted-foreground">{t("timing.w6")}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
