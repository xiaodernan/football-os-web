import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { talentMap } from "@/domain/nations";
import { Panel, SectionTitle, EmptyState, DemoBadge, StatTile, BAR_FILL } from "@/ui/primitives";
import { ABSENT, fmt2 } from "@/lib/utils";

// M1237 · The Talent Map — the world by nation. Every other board ranks clubs and players; this
// one asks where the talent comes from: who supplies the most, who supplies the best, and what
// the average side of a nation looks like. Read off the roster the world already carries.
export function TalentMap() {
  const { t } = useI18n();
  const fold = useMemo(() => talentMap(footballProvider.players()), []);
  const peak = fold.rows.length ? Math.max(...fold.rows.map((r) => r.avg)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("nat.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("nat.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label={t("nat.tileStrongest")}
          value={fold.strongest?.nation ?? ABSENT}
          sub={fold.strongest ? t("nat.bestN", { n: fold.strongest.best, name: fold.strongest.bestName }) : t("nat.none")}
          tone="up"
        />
        <StatTile
          label={t("nat.tileDeepest")}
          value={fold.deepest?.nation ?? ABSENT}
          sub={fold.deepest ? t("nat.playersN", { n: fold.deepest.players }) : t("nat.none")}
        />
        <StatTile label={t("nat.tileAvg")} value={fmt2(fold.worldAvg)} sub={t("nat.scaleN", { n: fold.nations, p: fold.players })} />
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("nat.board")} hint={t("nat.boardHint")} />
        {fold.rows.length === 0 ? (
          <EmptyState title={t("nat.none")} />
        ) : (
          <ul className="mt-2 space-y-1.5">
            {fold.rows.map((r, i) => (
              <li key={r.nation} className="rounded-lg border px-2.5 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 shrink-0 text-muted-foreground">{i + 1}</span>
                  <span className="truncate font-medium">{r.nation}</span>
                  <span className="ml-auto shrink-0 font-mono font-semibold text-primary">{r.best}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("nat.rowLine", { p: r.players, best: r.bestName, avg: fmt2(r.avg) })}</span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className={BAR_FILL.info} style={{ width: `${peak ? (r.avg / peak) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t("nat.method")}</p>
      </Panel>
    </div>
  );
}
