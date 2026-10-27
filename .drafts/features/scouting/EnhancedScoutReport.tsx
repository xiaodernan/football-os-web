import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function EnhancedScoutReport() {
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
      value: p.marketValue,
      wage: p.wage,
      position: p.position,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scouting.scoutReportTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("scouting.selectPlayerToCompare")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {t("scouting.", { 0: p.name })[0]}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 潜能评分计算
  const potentialScore = Math.round((p.overall + p.potential) / 2);
  const growthRate = Math.round((p.potential - p.overall) / Math.max(1, 25 - p.age) * 10) / 10;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scouting.scoutReportTitle")} />
      
      {/* 球员概览 */}
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
          title={t("player.potentialScore")}
          value={potentialScore.toLocaleString()}
          subtitle={t("player.potentialScoreDesc", { score: potentialScore })}
        />
        <StatTile
          title={t("player.growthRate")}
          value={p.growthRate > 0 ? `${p.growthRate}` + t("player.pointsPerSeason") : t("player.atCeiling")}
          subtitle={t("player.estimatedGrowth")}
        />
      </div>

      {/* 球员属性 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.attributes")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.overallBreakdown")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {/* 属性卡片将在这里渲染 */}
          <div />
          <div />
          <div />
        </div>
      </Panel>

      {/* 球员比较 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.comparison")} />
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