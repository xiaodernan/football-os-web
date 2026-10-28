import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerMarketTrend() {
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
        <SectionTitle title={t("player.marketValueTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForTrend")}
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
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 模拟市值趋势数据 (最近12个月)
  const trendData = useMemo(() => {
    const history = [];
    const baseValue = p.marketValue;
    for (let i = 0; i <= 12; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const growthRate = (p.potential - p.overall) / 100 * (1 - (p.age - 22) * 0.02);
      const value = Math.max(1000, baseValue * Math.pow(1 + growthRate, i / 12));
      history.push({
        month: month.toISOString().split("T")[0],
        value: Math.round(value),
      });
    }
    return history;
  }, [p]);

  const currentValue = p.marketValue;
  const predictedValue = trendData[trendData.length - 1]?.value || currentValue;
  const totalChange = predictedValue - currentValue;
  const totalChangePercent = Math.round((totalChange / currentValue) * 100);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.marketValueTitle")} />

      {/* 市值概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.currentValue")}
          value=`${t("currency.euro")} ${currentValue.toLocaleString()}`
          subtitle={t("player.marketValue)}
        />
        <StatTile
          title={t("player.predictedValue12M")}
          value={totalChange >= 0 ? `+${t("currency.euro")} ${totalChange.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(totalChange).toLocaleString()}`}
          variant={totalChange >= 0 ? "primary" : "destructive"}
          subtitle={t("player.in12M)}
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

      {/* 数据表格 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.historyData")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("player.month")}</th>
                <th className="text-left p-3 border border-gray-200">{t("player.value")}</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map(item => (
                <tr key={item.month} className="border-b">
                  <td className="p-3">
                    {item.month.split("-")[1] + "/" + item.month.split("-")[2]}
                  </td>
                  <td className="p-3">
                    {t("currency.euro")} {item.value.toLocaleString()}
                  </td>
                </tr>
              ))
            </tbody>
          </table>
        </div>
      </Panel>
    </Panel>
  );
}