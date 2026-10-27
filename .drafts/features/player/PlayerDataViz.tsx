import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerDataViz() {
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
      marketValue: p.marketValue,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.dataVizTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForViz")}
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

  // 数据可视化
  const metrics = useMemo(() => ({
    overall: p.overall,
    potential: p.potential,
    age: p.age,
    marketValue: p.marketValue,
    wageEstimate: Math.floor(p.marketValue * 0.001),
  }), [p]);

  // 年龄与价值关系散点图数据
  const scatterData = useMemo(() => {
    const data = [];
    for (let i = 18; i <= 35; i++) {
      const value = Math.max(1000, p.marketValue * Math.pow(0.95, i - 22));
      data.push({ age: i, value: Math.round(value) });
    }
    return data;
  }, [p]);

  // 潜能与当前值关系
  const potentialGap = p.potential - p.overall;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.dataVizTitle")} />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("player.playerMetrics")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.potential")}</div>
              <div className="text-3xl font-bold text-green-600">{p.potential}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("player.marketValue")}</div>
              <div className="text-info">{t("currency.euro")} ${p.marketValue.toLocaleString()}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("player.valueAnalysis")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.wageEstimate")}</div>
              <div className="text-primary">${metrics.wageEstimate.toLocaleString()}/w</div>
            </div>
            <div>
              <div className="font-medium">{t("player.potentialGap")}</div>
              <div className={potentialGap > 0 ? "text-green-600" : "text-red-600"}
                font-medium>
                {potentialGap > 0 ? `+${potentialGap}` : potentialGap < 0 ? potentialGap : "平衡"}
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-info/10 rounded">
            <div className="font-medium">{t("player.developmentPotential")}</div>
            <div className="text-info">{t("player.hasGrowthSpace", { space: potentialGap > 0 ? potentialGap : 0 })}</div>
          </div>
        </Panel>
      </div>

      {/* 散点图：年龄 vs 价值 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.ageValueRelationship")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.ageAffectsValue", { age: p.age })}
        </p>
        <div className="h-64 rounded overflow-hidden bg-gray-100">
          {/* 散点图占位 */}
          <div className="h-full bg-gradient-to-b from-primary/10 to-transparent">
            <p className="text-center text-muted-foreground py-16">
              {t("player.scatterChartPlaceholder")}
            </p>
          </div>
        </div>
      </Panel>

      {/* 潜能分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.potentialAnalysis")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("player.currentOverall")}</div>
            <div className="text-2xl font-bold text-primary">{p.overall}★</div>
          </div>
          <div>
            <div className="font-medium">{t("player.targetPotential")}</div>
            <div className="text-2xl font-bold text-green-600">{p.potential}★</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("player.growthNeeded", { needed: potentialGap > 0 ? potentialGap : 0 })}</p
        >
      </Panel>
    </Panel>
  );
}