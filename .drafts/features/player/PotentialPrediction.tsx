import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PotentialPrediction() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      growthRate: Math.round((p.potential - p.overall) / Math.max(1, 25 - p.age) * 10) / 10,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.potentialTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerToViewPotential")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;
  const yearsToPotential = p.potential > p.overall ? Math.ceil((p.potential - p.overall) / Math.max(0.1, p.growthRate)) : 0;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.potentialTitle")} />
      
      {/* 球员潜能概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.overall")}
          value={p.overall.toLocaleString()}
          subtitle={t("player.currentRating")}
        />
        <StatTile
          title={t("player.potential")}
          value={p.potential.toLocaleString()}
          subtitle={t("player.ceilingRating")}
          variant="primary"
        />
        <StatTile
          title={t("player.age")}
          value={`${p.age}`}
          subtitle={t("player.yearsOld")}
        />
        <StatTile
          title={t("player.yearsToPotential")}
          value={yearsToPotential > 0 ? `${yearsToPotential}` + t("player.years") : t("player.atCeiling")}
          subtitle={t("player.yearsToReachCeiling")}
          variant={yearsToPotential > 0 ? "info" : "default"}
        />
      </div>

      {/* 潜能增长预测 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.potentialGrowth")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.estimatedGrowth", { current: p.overall, target: p.potential })}
        </p>
        <p className="text-xs text-secondary">
          {t("player.basedOnGrowthRate", { rate: p.growthRate })}
        </p>
      </Panel>

      {/* 属性对比 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.attributeComparison")} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedPlayer(null)}
        >
          {t("player.selectAnotherPlayer")}
        </Button>
      </Panel>
    </Panel>
  );
}