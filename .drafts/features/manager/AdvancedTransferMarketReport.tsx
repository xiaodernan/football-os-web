import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function AdvancedTransferMarketReport() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);

  // 转会市场分析数据
  const marketAnalysis = useMemo(() => {
    const totalPlayers = players.length;
    const highValuePlayers = players.filter(p => p.marketValue > 100000000);
    const lowValuePlayers = players.filter(p => p.marketValue < 10000000);
    const avgValue = players.reduce((sum, p) => sum + p.marketValue, 0) / totalPlayers;
    const valueRange = {
      min: Math.min(...players.map(p => p.marketValue)),
      max: Math.max(...players.map(p => p.marketValue)),
    };

    return {
      totalPlayers,
      highValuePlayers: highValuePlayers.length,
      lowValuePlayers: lowValuePlayers.length,
      avgValue: Math.round(avgValue),
      valueRange,
    };
  }, [players]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.advancedTransferMarketTitle")} />
      
      {/* 市场概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.totalPlayers")}
          value={marketAnalysis.totalPlayers.toLocaleString()}
          subtitle={t("manager.squadSize")}
        />
        <StatTile
          title={t("manager.highValuePlayers")}
          value={marketAnalysis.highValuePlayers.toLocaleString()}
          subtitle={t("manager.playersOver100M")}
        />
        <StatTile
          title={t("manager.lowValuePlayers")}
          value={marketAnalysis.lowValuePlayers.toLocaleString()}
          subtitle={t("manager.playersUnder10M")}
        />
        <StatTile
          title={t("manager.avgValue")}
          value={`${t("currency.euro")} ${marketAnalysis.avgValue.toLocaleString()}`}
          subtitle={t("manager.averageValue")}
        />
      </div>

      {/* 市场范围 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("marketRange")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("market.minValue")}
            value={`${t("currency.euro")} ${marketAnalysis.valueRange.min.toLocaleString()}`}
            subtitle={t("market.minValueDesc")}
          />
          <StatTile
            title={t("market.maxValue")}
            value={`${t("currency.euro")} ${marketAnalysis.valueRange.max.toLocaleString()}`}
            subtitle={t("market.maxValueDesc")}
          />
        </div>
      </Panel>

      {/* 市场分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("marketAnalysis")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("marketAnalysisDesc", {
            totalPlayers: marketAnalysis.totalPlayers,
            highValue: marketAnalysis.highValuePlayers,
          })}
        </p>
        <Button variant="outline" size="sm">
          {t("analyzeMarket")}
        </Button>
      </Panel>
    </Panel>
  );
}