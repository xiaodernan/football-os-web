import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, Crest, EmptyState, DemoBadge, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { footballProvider, getClub, getCompetition } from "@/data/footballService";
import { runIn } from "@/domain/analytics";
import { last, sum } from "@/domain/attributes";
import { ABSENT, cn, fmt2, pctOf } from "@/lib/utils";

export function RunIn() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const [compId, setCompId] = useState(() => competitions[0]?.id ?? "");

  const comp = getCompetition(compId);
  const rows = useMemo(() => runIn(compId, matches, clubs), [compId, matches, clubs]);
  // The domain sorts hardest first; clubs with nothing left sit last at zero, so the
  // difficulty read is taken from the rows that actually have fixtures.
  const withFixtures = rows.filter((r) => r.remaining > 0);
  const hardest = withFixtures[0] ?? null;
  const easiest = last(withFixtures) ?? null;
  const maxPpg = hardest?.avgOppPpg ?? 0;
  const totalLeft = sum(withFixtures, (r) => r.remaining);
  const leagueAvg = withFixtures.length ? fmt2(sum(withFixtures, (r) => r.avgOppPpg) / withFixtures.length) : ABSENT;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("runIn.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("runIn.subtitle")}</p>
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

      {!hardest || !easiest ? (
        <Panel className="p-4">
          <EmptyState title={t("runIn.empty")} hint={t("runIn.emptyHint")} icon="🗓" />
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("runIn.toughest")}
              value={getClub(hardest.clubId)?.short ?? ABSENT}
              sub={t("runIn.ppgSub", { n: fmt2(hardest.avgOppPpg) })}
              tone="down"
            />
            <StatTile
              label={t("runIn.easiest")}
              value={getClub(easiest.clubId)?.short ?? ABSENT}
              sub={t("runIn.ppgSub", { n: fmt2(easiest.avgOppPpg) })}
              tone="up"
            />
            <StatTile label={t("runIn.remaining")} value={totalLeft} sub={comp?.name ?? ABSENT} />
            <StatTile label={t("runIn.leagueAvg")} value={leagueAvg} sub={t("runIn.ppgSub", { n: leagueAvg })} />
          </div>

          <Panel className="p-5">
            <SectionTitle title={t("runIn.boardTitle")} hint={t("runIn.boardHint")} />
            <ul className="mt-2 space-y-1">
              {rows.map((r) => {
                const club = getClub(r.clubId);
                const idle = r.remaining === 0;
                return (
                  <li
                    key={r.clubId}
                    className={cn(
                      "grid items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      "grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_minmax(90px,180px)]",
                      idle && "opacity-60",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Crest colors={club?.colors} short={club?.short} size={26} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("runIn.record", { pts: r.points, played: r.played })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tabular-nums">{r.remaining}</div>
                      <div className="text-xs text-muted-foreground">{t("runIn.colLeft")}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      {idle ? ABSENT : fmt2(r.avgOppPpg)}
                      <div className="text-xs text-muted-foreground">{t("runIn.colAvgOpp")}</div>
                    </div>
                    <div className="hidden sm:block">
                      {idle ? null : (
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className={cn("h-2 rounded-full", BAR_FILL.info)} style={{ width: pctOf(r.avgOppPpg, maxPpg) }} />
                        </div>
                      )}
                      <div className="mt-1 truncate text-[11px] text-muted-foreground">
                        {idle
                          ? t("runIn.noFixtures")
                          : `${t("runIn.opponents")} ${r.opponents.map((id) => getClub(id)?.short ?? id).join(" · ")}`}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("runIn.method")}</p>
          </Panel>
        </>
      )}
    </div>
  );
}
