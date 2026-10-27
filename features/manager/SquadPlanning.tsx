import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { footballProvider } from "@/data/footballService";
import { positionLabel } from "@/domain/rowText";
import { byOverall } from "@/domain/attributes";
import { ABSENT } from "@/lib/utils";

const FORMATIONS = ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-2-3-1"] as const;

export function SquadPlanning() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const [formation, setFormation] = useState<string | null>(null);

  // The strongest eleven by overall; everyone else is a substitute.
  const ranked = useMemo(() => [...players].sort(byOverall), [players]);
  const startingXI = useMemo(() => ranked.slice(0, 11), [ranked]);
  const substitutes = useMemo(() => ranked.slice(11), [ranked]);

  if (players.length === 0) {
    return <EmptyState title={t("mgr.squadPlanningTitle")} hint={t("mgr.selectFormation")} icon="🧩" />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-5">
        <SectionTitle title={t("mgr.squadPlanningTitle")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("mgr.selectFormation")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FORMATIONS.map((fmt) => (
            <Button
              key={fmt}
              variant={formation === fmt ? "default" : "outline"}
              size="sm"
              onClick={() => setFormation(fmt)}
            >
              {fmt}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("mgr.startingXI", { formation: formation ?? ABSENT })} />
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {startingXI.map((p) => (
            <div key={p.id} className="rounded-lg border p-2 text-center">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="text-primary">{p.overall}★</div>
              <div className="text-xs text-muted-foreground">{positionLabel(p.position, t)}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title={t("mgr.substitutes")} />
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {substitutes.slice(0, 8).map((p) => (
            <div key={p.id} className="rounded-lg border p-2 text-center">
              <div className="truncate text-xs font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.overall}★</div>
            </div>
          ))}
        </div>
      </Panel>

      <DemoBadge />
    </div>
  );
}
