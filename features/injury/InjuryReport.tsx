import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { footballProvider, getClub } from "@/data/footballService";
import { positionLabel } from "@/domain/rowText";
import type { PositionCode } from "@/domain/types";
import { injuryFor, fitnessFor, weekIndexOf, type InjuryDef } from "@/domain/playerCareer";
import { sum, byOverall } from "@/domain/attributes";
import { pctLabel, pctOf, cn } from "@/lib/utils";

interface AvailabilityRow {
  id: string;
  name: string;
  clubName: string;
  position: PositionCode;
  overall: number;
  fitness: number;
  injury: InjuryDef | null;
  /** 0 when fit; otherwise the injury's severity, so the unavailable sort first. */
  statusRank: number;
}

const SEVERITY_TONE = [CHIP_CLASS.muted, CHIP_CLASS.info, CHIP_CLASS.warning, CHIP_CLASS.destructive];

export function InjuryReport() {
  const { t } = useI18n();

  // Availability is derived from the career engine's own deterministic injury/fitness model,
  // seeded by player id and the current week — no stored injury state, no clock-built ids.
  const week = useMemo(() => weekIndexOf(new Date().toISOString()), []);

  const rows = useMemo<AvailabilityRow[]>(() => {
    return footballProvider.players().map((p) => {
      const injury = injuryFor(p.id, week);
      return {
        id: p.id,
        name: p.name,
        clubName: getClub(p.clubId)?.name ?? p.clubId,
        position: p.position,
        overall: p.overall,
        fitness: fitnessFor(p.id, week),
        injury,
        statusRank: injury ? injury.severity : 0,
      };
    });
  }, [week]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.statusRank - a.statusRank || byOverall(a, b)),
    [rows],
  );

  const outCount = rows.filter((r) => r.injury !== null).length;
  const avgFitness = rows.length > 0 ? sum(rows, (r) => r.fitness) / rows.length : 0;

  const injuryLabel = (key: string): string =>
    key === "hamstring"
      ? t("squad.availability.injury.hamstring")
      : key === "ankle"
        ? t("squad.availability.injury.ankle")
        : key === "groin"
          ? t("squad.availability.injury.groin")
          : t("squad.availability.injury.knee");

  if (rows.length === 0) {
    return <EmptyState title={t("squad.availability.title")} hint={t("squad.availability.empty")} icon="🩹" />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("squad.availability.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("squad.availability.subtitle")}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-muted-foreground">
            {t("squad.availability.summary", { out: outCount, total: rows.length })}
          </span>
          <span className="text-muted-foreground">
            {t("squad.availability.fitness")}: {pctLabel(avgFitness)}
          </span>
        </div>
      </Panel>

      <Panel className="p-5">
        <ul className="space-y-2">
          {sorted.map((r) => {
            const out = r.injury !== null;
            return (
              <li
                key={r.id}
                className={cn(
                  "rounded-lg border p-3",
                  out ? "border-destructive/40" : "border-border",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{r.name}</span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs",
                          out ? SEVERITY_TONE[r.injury?.severity ?? 1] : CHIP_CLASS.success,
                        )}
                      >
                        {out ? t("squad.availability.out") : t("squad.availability.available")}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.clubName} · {positionLabel(r.position, t)} · {r.overall}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    {r.injury ? (
                      <span className="text-destructive">
                        {injuryLabel(r.injury.key)} · {t("squad.availability.weeks", { n: r.injury.weeks })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("squad.availability.fitness")} {pctLabel(r.fitness)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", out ? "bg-destructive/50" : "bg-success")}
                    style={{ width: pctOf(r.fitness, 1) }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <DemoBadge />
    </div>
  );
}
