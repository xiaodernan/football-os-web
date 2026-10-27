import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MarketValuePrediction() {
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
      currentValue: p.marketValue,
      predictedValue: 0, // will calculate
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.marketValueTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerToViewValue")}
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
  
  // 预测算法：基于Overall、潜能、年龄的市值增长预测
  const predictedValue = Math.round(
    p.currentValue * (1 + (p.potential - p.overall) / 100) * Math.pow(0.95, p.age - 22)
  );

  const valueChange = predictedValue - p.currentValue;
  const valueChangePercent = Math.round((valueChange / p.currentValue) * 100);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.marketValueTitle")} />
      
      {/* 球员市值概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.currentValue")}
          value={`${t("currency.euro")} ${p.currentValue.toLocaleString()}`}
          subtitle={t("player.marketValue")}
        />
        <StatTile
          title={t("player.predictedValue")}
          value={predictedValue >= p.currentValue ? `+${t("currency.euro")} ${predictedValue.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(predictedValue - p.currentValue).toLocaleString()}`}
          variant={predictedValue >= p.currentValue ? "primary" : "destructive"}
        />
        <StatTile
          title={t("player.valueChangePercent")}
          value={`${valueChangePercent >= 0 ? '+' : ''}${valueChangePercent}%`}
          subtitle={t("player.predictedChange")}
        />
      </div>

      {/* 预测依据 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.predictedValueBasedOn")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.basedOnOverallPotentialAge", {
            overall: p.overall,
            potential: p.potential,
            age: p.age,
          })}
        </p>
        <p className="text-xs text-secondary">
          {t("player.marketFactors", {
            currentValue: t("currency.euro") + " " + p.currentValue.toLocaleString(),
          })}
        </p>
      </Panel>

      {/* 市值趋势 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.marketTrend")} />
        <p className="text-sm text-muted-foreground">
          {t("player.marketTrendDesc", { change: valueChangePercent > 0 ? '+' : '' })} 
        </p>
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