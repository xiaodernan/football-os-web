import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferMarketReport() {
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
      position: p.position,
      marketValue: p.marketValue,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transfer.marketReportTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("transfer.selectPlayerForReport")}
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

  // 市场价值分析
  const valueHistory = useMemo(() => {
    const history = [];
    const base = p.marketValue;
    for (let i = 0; i <= 12; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const growthRate = (p.potential - p.overall) / 100 * (1 - (p.age - 22) * 0.02);
      const value = Math.max(1000, base * Math.pow(1 + growthRate, i / 12));
      history.push({
        month: month.toISOString().split("T")[0],
        value: Math.round(value),
      });
    }
    return history;
  }, [p]);

  const currentValue = p.marketValue;
  const predictedValue = valueHistory[valueHistory.length - 1]?.value || currentValue;
  const totalChange = predictedValue - currentValue;
  const totalChangePercent = Math.round((totalChange / currentValue) * 100);

  // 趋势方向
  const trendDirection = totalChange >= 0 ? "up" : "down";
  const trendClass = totalChange >= 0 ? "primary" : "destructive";

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transfer.marketReportTitle")} />

      {/* 市场价值概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.currentValue")}
          value={`${t("currency.euro")} ${currentValue.toLocaleString()}`}
          subtitle={t("player.marketValue")}
        />
        <StatTile
          title={t("player.predictedValue12M")}
          value={totalChange >= 0 ? `+${t("currency.euro")} ${totalChange.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(totalChange).toLocaleString()}`}
          variant={totalChange >= 0 ? "primary" : "destructive"}
          subtitle={t("player.in12M")}
        />
      </div>

      {/* 趋势图 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.valueTrend12M")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.trend12MDesc", { current: `${t("currency.euro")} ${currentValue.toLocaleString()}`, predicted: `${t("currency.euro")} ${predictedValue.toLocaleString()}` })}
        </p>
        <p className="text-xs text-secondary">
          {t("player.basedOnGrowth", { growth: totalChangePercent > 0 ? '+' : '' })}
        </p>
      </Panel>

      {/* 趋势分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.trendAnalysis")} />
        <p className="text-sm text-muted-foreground">
          {t("player.trendAnalysisDesc", { change: totalChangePercent > 0 ? '+' : '' })}
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