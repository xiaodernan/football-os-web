import { useMemo } from "react";
import { Link } from "@/lib/router";
import { Panel, SectionTitle, StatTile, Crest, DemoBadge, EmptyState, BAR_FILL } from "@/ui/primitives";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { academyIntake } from "@/domain/academy";
import { positionGroupLabel } from "@/domain/rowText";
import { sum } from "@/domain/attributes";
import { cn, pctOf } from "@/lib/utils";

// M1028: the academy — the seeded world's U-21 intake, read off the same player records the
// player page reads. Nothing invented, nothing stored: two boards folded on every visit, one
// about clubs (where the unfinished talent lives) and one about people (the jewels themselves).

export function AcademyPage() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);
  const board = useMemo(() => academyIntake(clubs, players), [clubs, players]);
  const supplyPeak = board.supply.length ? Math.max(...board.supply.map((r) => r.upside), 1) : 1;
  const elitePeak = board.elite.length ? board.elite[0].potential : 1;
  const supplyTotal = sum(board.supply, (r) => r.upside);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{t("acad.title")}</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("acad.subtitle")}</p>
      </div>

      <Panel className="p-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label={t("acad.tileClubs")} value={board.supply.length} sub={t("acad.tileClubsSub")} />
          <StatTile label={t("acad.tilePlayers")} value={board.players} sub={t("acad.tilePlayersSub")} />
          <StatTile label={t("acad.tileUpside")} value={supplyTotal} sub={t("acad.tileUpsideSub")} />
          <StatTile label={t("acad.tileJewel")} value={board.elite[0]?.potential ?? 0} sub={board.elite[0] ? board.elite[0].name : t("acad.noJewel")} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("acad.worldLine")}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("acad.supplyTitle")} hint={t("acad.supplyHint")} />
        {board.supply.length === 0 ? (
          <EmptyState title={t("acad.noneTitle")} hint={t("acad.noneHint")} icon="🌱" />
        ) : (
          <>
            <ul className="mt-2 space-y-1">
              {board.supply.map((r, i) => {
                const club = getClub(r.clubId);
                return (
                  <li
                    key={r.clubId}
                    className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(110px,200px)]"
                  >
                    <span className="text-muted-foreground">{i + 1}</span>
                    <Link to={`/clubs/${r.clubId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                      <Crest colors={club?.colors} short={club?.short} size={22} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{club?.name ?? r.clubId}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("acad.rowLine", { n: r.u21, g: r.jewelName, p: r.jewelPotential, a: r.jewelAge })}
                        </div>
                      </div>
                    </Link>
                    <div className="text-right tabular-nums">
                      <div className="font-semibold">+{r.upside}</div>
                      <div className="text-xs text-muted-foreground">{t("watch.headroom")}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={cn("h-2 rounded-full", BAR_FILL.good)} style={{ width: pctOf(r.upside, supplyPeak) }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">{t("acad.supplyMethod")}</p>
          </>
        )}
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("acad.eliteTitle")} hint={t("acad.eliteHint")} />
        {board.elite.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("acad.noneTitle")}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {board.elite.map((p, i) => {
              const club = getClub(p.clubId);
              return (
                <li
                  key={p.playerId}
                  className="grid items-center gap-3 rounded-lg border px-3 py-2 text-sm grid-cols-[2rem_1fr_auto] sm:grid-cols-[2rem_1fr_auto_minmax(110px,200px)]"
                >
                  <span className="text-muted-foreground">{i + 1}</span>
                  <Link to={`/player/${p.playerId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                    <Crest colors={club?.colors} short={club?.short} size={22} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("acad.eliteLine", { p: positionGroupLabel(p.positionGroup, t), a: p.age, c: club?.short ?? p.clubId, o: p.overall })}
                      </div>
                    </div>
                  </Link>
                  <div className="text-right tabular-nums">
                    <div className="font-semibold">{p.potential}</div>
                    <div className="text-xs text-muted-foreground">{t("watch.headroom")}</div>
                  </div>
                  <div className="hidden sm:block">
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className={cn("h-2 rounded-full", BAR_FILL.progress)} style={{ width: pctOf(p.potential, elitePeak) }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("acad.eliteMethod")}</p>
      </Panel>
    </div>
  );
}
