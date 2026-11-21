import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { keeperUnion } from "@/domain/keepers";
import { Panel, SectionTitle, EmptyState, DemoBadge, Crest, StatTile, BAR_FILL } from "@/ui/primitives";
import { fmt2 } from "@/lib/utils";

// M1231 — the keepers' union: the world's goalkeepers, named. The leaders' wall board ranks the
// clubs whose defence held; this screen names who stood between the posts for each of them, and
// reads the very same clean-sheet fold so the two screens cannot disagree about a sheet.
export function KeepersUnion() {
  const { t } = useI18n();
  const fold = useMemo(
    () => keeperUnion(footballProvider.players(), footballProvider.clubs(), footballProvider.matches()),
    [],
  );
  const peak = fold.rows.length ? Math.max(...fold.rows.map((r) => r.rate)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("keep.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("keep.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("keep.tileBest")}
          value={fold.best ? fold.best.name : "—"}
          sub={fold.best ? t("keep.overallN", { n: fold.best.overall }) : t("keep.none")}
          tone="up"
        />
        <StatTile
          label={t("keep.tileWall")}
          value={fold.bestWall ? (getClub(fold.bestWall.clubId)?.short ?? fold.bestWall.clubId) : "—"}
          sub={fold.bestWall ? t("keep.rateN", { n: fmt2(fold.bestWall.rate) }) : t("keep.none")}
          tone="up"
        />
        <StatTile label={t("keep.tileCount")} value={fold.keepers} sub={t("keep.clubsN", { n: fold.clubs })} />
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("keep.board")} hint={t("keep.boardHint")} />
        {fold.rows.length === 0 ? (
          <EmptyState title={t("keep.none")} />
        ) : (
          <ul className="mt-2 space-y-1.5">
            {fold.rows.map((r, i) => {
              const club = getClub(r.clubId);
              return (
                <li key={r.playerId} className="rounded-lg border px-2.5 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                    <Crest colors={club?.colors} short={club?.short} size={22} />
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{club?.name ?? r.clubId}</span>
                    <span className="ml-auto shrink-0 font-mono text-primary">{r.overall}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("keep.rowLine", { c: r.cleanSheets, p: r.played, r: fmt2(r.rate) })}</span>
                    <span className="ml-auto shrink-0">
                      {r.age} · {r.nation}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={BAR_FILL.good}
                      style={{ width: `${peak ? (r.rate / peak) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t("keep.method")}</p>
      </Panel>
    </div>
  );
}
