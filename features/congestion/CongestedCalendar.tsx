import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { fixtureCongestion } from "@/domain/congestion";
import { Panel, SectionTitle, EmptyState, DemoBadge, Crest, StatTile, BAR_FILL } from "@/ui/primitives";
import { fmt2 } from "@/lib/utils";

// M1232 — the congested calendar: the fixture spacing board. Every other screen reads what
// happened inside a match; this one reads the distance between them — the turnaround each club's
// legs actually get. The tightest turn leads, and the bar is the tightest turn, because that is
// the number that hurts.
export function CongestedCalendar() {
  const { t } = useI18n();
  const fold = useMemo(
    () => fixtureCongestion(footballProvider.matches(), footballProvider.clubs()),
    [],
  );
  const peak = fold.rows.length ? Math.max(...fold.rows.map((r) => r.minRest)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("con.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("con.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("con.tileTight")}
          value={fold.tightest ? `${fold.tightest.minRest}d` : "—"}
          sub={fold.tightest ? (getClub(fold.tightest.clubId)?.name ?? fold.tightest.clubId) : t("con.none")}
          tone="down"
        />
        <StatTile label={t("con.tileAvg")} value={`${fmt2(fold.leagueAvg)}d`} sub={t("con.gapsN", { n: fold.gaps })} />
        <StatTile
          label={t("con.tileCrowded")}
          value={fold.rows.reduce((s, r) => s + r.crowded, 0)}
          sub={t("con.crowdedHint")}
        />
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("con.board")} hint={t("con.boardHint")} />
        {fold.rows.length === 0 ? (
          <EmptyState title={t("con.none")} />
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
                    <span className="ml-auto shrink-0 font-mono font-semibold text-primary">{r.minRest}d</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("con.rowLine", { m: fmt2(r.avgRest), c: r.crowded, f: r.fixtures })}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={BAR_FILL.bad}
                      style={{ width: `${peak ? (r.minRest / peak) * 100 : 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t("con.method")}</p>
      </Panel>
    </div>
  );
}
