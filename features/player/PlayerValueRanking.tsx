import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { footballProvider, getClub } from "@/data/footballService";
import { positionLabel } from "@/domain/rowText";
import { byOverall, byValueDesc, maxBy } from "@/domain/attributes";
import { round1 } from "@/domain/scouting";
import type { PositionCode } from "@/domain/types";
import { fmtMoney } from "@/lib/utils";

type SortKey = "value" | "overall";

interface ValueRow {
  id: string;
  name: string;
  clubName: string;
  position: PositionCode;
  age: number;
  overall: number;
  value: number;
  /** Overall rating bought per million euro of market value — the bargain metric. */
  efficiency: number;
}

export function PlayerValueRanking() {
  const { t } = useI18n();
  const [sort, setSort] = useState<SortKey>("value");

  const rows = useMemo<ValueRow[]>(() => {
    return footballProvider.players().map((p) => ({
      id: p.id,
      name: p.name,
      clubName: getClub(p.clubId)?.name ?? p.clubId,
      position: p.position,
      age: p.age,
      overall: p.overall,
      value: p.value,
      efficiency: p.value > 0 ? round1(p.overall / (p.value / 1_000_000)) : 0,
    }));
  }, [t]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    return sort === "overall" ? copy.sort(byOverall) : copy.sort(byValueDesc);
  }, [rows, sort]);

  // The best bargain is the strongest rating per euro, never the cheapest player.
  const bestValue = useMemo(() => {
    const priced = rows.filter((r) => r.value > 0);
    if (priced.length === 0) return null;
    return maxBy(priced, (r) => r.efficiency);
  }, [rows]);

  const maxValue = useMemo(() => rows.reduce((m, r) => Math.max(m, r.value), 0), [rows]);

  if (rows.length === 0) {
    return <EmptyState title={t("player.valueBoard.title")} hint={t("player.valueBoard.empty")} icon="💰" />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("player.valueBoard.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("player.valueBoard.subtitle")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={sort === "value" ? "default" : "outline"} onClick={() => setSort("value")}>
            {t("player.valueBoard.sortByValue")}
          </Button>
          <Button size="sm" variant={sort === "overall" ? "default" : "outline"} onClick={() => setSort("overall")}>
            {t("player.valueBoard.sortByOverall")}
          </Button>
        </div>
        {bestValue && (
          <p className="mt-3 text-sm text-primary">
            {t("player.valueBoard.bestValueHint", {
              name: bestValue.name,
              value: fmtMoney(bestValue.value),
              efficiency: bestValue.efficiency,
            })}
          </p>
        )}
      </Panel>

      <Panel className="p-5">
        <div className="hidden gap-2 px-2 text-xs text-muted-foreground sm:grid sm:grid-cols-[2rem_1fr_6rem_4rem_3rem_3rem_6rem_5rem]">
          <span>{t("player.valueBoard.colRank")}</span>
          <span>{t("player.valueBoard.colPlayer")}</span>
          <span>{t("player.valueBoard.colClub")}</span>
          <span>{t("player.valueBoard.colPosition")}</span>
          <span className="text-right">{t("player.valueBoard.colAge")}</span>
          <span className="text-right">{t("player.valueBoard.colOverall")}</span>
          <span className="text-right">{t("player.valueBoard.colValue")}</span>
          <span className="text-right">{t("player.valueBoard.colEfficiency")}</span>
        </div>
        <ul className="mt-2 space-y-1">
          {sorted.map((r, i) => (
            <li
              key={r.id}
              className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg border px-2 py-2 text-sm sm:grid-cols-[2rem_1fr_6rem_4rem_3rem_3rem_6rem_5rem]"
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 truncate font-medium">{r.name}</span>
              <span className="truncate text-xs text-muted-foreground sm:text-sm">{r.clubName}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{positionLabel(r.position, t)}</span>
              <span className="hidden text-right sm:block">{r.age}</span>
              <span className="text-right font-medium">{r.overall}</span>
              <span className="text-right">{fmtMoney(r.value)}</span>
              <span className="text-right text-xs text-muted-foreground">
                {r.efficiency} / €M
              </span>
              <div className="col-span-3 mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary sm:hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${maxValue > 0 ? (r.value / maxValue) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <DemoBadge />
    </div>
  );
}
