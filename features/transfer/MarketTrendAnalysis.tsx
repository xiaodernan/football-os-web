import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MarketTrendAnalysis() {
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
        <SectionTitle title={t("marketTrend.title") } />
        <p className="text-muted-foreground mb-4">
          {t("marketTrend.selectPlayer")}
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

  // 模拟市场趋势数据 (过去12个月)
  const trendData = useMemo(() => {
    const history = [];
    const baseValue = p.marketValue;
    for (let i = 11; i >= 0; i--) {
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

  // 趋势方向
  const trendDirection = useMemo(() => {
    if (totalChangePercent > 10) return "强势上涨";
    if (totalChangePercent > 0) return "温和上涨";
    if (totalChangePercent > -10) return "稳定";
    if (totalChangePercent > -20) return "温和下跌";
    return "强势下跌";
  }, [totalChangePercent]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("marketTrend.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("marketTrend.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("marketTrend.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("marketTrend.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("marketTrend.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("marketTrend.currentValue") } />
          <div className="text-3xl font-bold text-primary">{t("currency.euro")} {currentValue.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">{t("marketTrend.marketValue")}</p>
        </Panel>
      </div>

      {/* 趋势概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("marketTrend.trendOverview") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("marketTrend.currentValue")}</div>
            <div>{t("currency.euro")} {currentValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">{t("marketTrend.predictedValue12M")}</div>
            <div>{t("currency.euro")} {predictedValue.toLocaleString()}</div>
          </div>
        </div>
        <div>
          <div className="font-medium">{t("marketTrend.change12M")}</div>
          <div>{totalChangePercent >= 0 ? `+${totalChangePercent}%` : `${totalChangePercent}%`}</div>
        </div>
      </Panel>

      {/* 趋势图 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("marketTrend.trendChart") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("marketTrend.past12Months")}
        </p>
        <div className="h-64 rounded bg-gray-100">
          {/* 趋势图占位 */}
          <div className="h-full bg-gradient-to-b from-primary/10 to-transparent">
            <p className="text-center text-muted-foreground py-16">
              {t("marketTrend.chartPlaceholder")}
            </p>
          </div>
        </div>
      </Panel>

      {/* 趋势分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("marketTrend.trendAnalysis") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("marketTrend.trendDirection")}</div>
            <div className={trendDirection === "强势上涨" ? "text-green-600" : trendDirection === "温和上涨" ? "text-primary" : trendDirection === "稳定" ? "text-warning" : trendDirection === "温和下跌" ? "text-orange-600" : "text-red-600"}>
              {trendDirection}
            </div>
          </div>
          <div>
            <div className="font-medium">{t("marketTrend.changePercent")}</div>
            <div>{totalChangePercent >= 0 ? `+${totalChangePercent}%` : `${totalChangePercent}%`}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("marketTrend.basedOn")}</div>
          <div>{t("marketTrend.potentialGrowth", { growth: p.potential - p.overall })}</div>
        </div>
      </Panel>

      {/* 数据表格 */}
      <Panel className="p-4">
        <SectionTitle title={t("marketTrend.monthlyData") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("marketTrend.monthlyValues")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("marketTrend.month")}</th>
                <th className="text-left p-3 border border-gray-200">{t("marketTrend.value")}</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map(item => (
                <tr key={item.month} className="border-b">
                  <td className="p-3">{item.month.split("-")[1] + "/" + item.month.split("-")[2]}</td>
                  <td className="p-3">{t("currency.euro")} {item.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Panel>
  );
}