import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { squadDepth } from "@/domain/depth";
import { Panel, SectionTitle, EmptyState, DemoBadge, Crest, StatTile, BAR_FILL } from "@/ui/primitives";
import { fmt2 } from "@/lib/utils";

// M1234 · The Cliff — the squad depth board. Every other board ranks the top; this one measures
// the drop from a club's best player to its eleventh — the distance between a table position and
// an injury crisis. The steepest cliff leads, and the bar is the cliff itself.
export function SquadDepth() {
  const { t } = useI18n();
  const fold = useMemo(() => squadDepth(footballProvider.players(), footballProvider.clubs()), []);
  const peak = fold.rows.length ? Math.max(...fold.rows.map((r) => r.cliff)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("depth.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("depth.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("depth.tileSteep")}
          value={fold.steepest ? `${fold.steepest.cliff}` : "—"}
          sub={fold.steepest ? (getClub(fold.steepest.clubId)?.name ?? fold.steepest.clubId) : t("depth.none")}
          tone="down"
        />
        <StatTile
          label={t("depth.tileShallow")}
          value={fold.shallowest ? `${fold.shallowest.cliff}` : "—"}
          sub={fold.shallowest ? (getClub(fold.shallowest.clubId)?.name ?? fold.shallowest.clubId) : t("depth.none")}
          tone="up"
        />
        <StatTile label={t("depth.tileAvg")} value={fmt2(fold.leagueAvg)} sub={t("depth.clubsN", { n: fold.rows.length })} />
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("depth.board")} hint={t("depth.boardHint")} />
        {fold.rows.length === 0 ? (
          <EmptyState title={t("depth.none")} />
        ) : (
          <ul className="mt-2 space-y-1.5">
            {fold.rows.map((r, i) => {
              const club = getClub(r.clubId);
              return (
                <li key={r.clubId} className="rounded-lg border px-2.5 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                    <Crest colors={club?.colors} short={club?.short} size={22} />
                    <span className="truncate font-medium">{club?.name ?? r.clubId}</span>
                    <span className="ml-auto shrink-0 font-mono font-semibold text-primary">{t("depth.cliffN", { n: r.cliff })}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("depth.rowLine", { s: r.squad, x: fmt2(r.xiAvg), b: fmt2(r.benchAvg), best: r.best })}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className={BAR_FILL.bad} style={{ width: `${peak ? (r.cliff / peak) * 100 : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t("depth.method")}</p>
      </Panel>
    </div>
  );
}
