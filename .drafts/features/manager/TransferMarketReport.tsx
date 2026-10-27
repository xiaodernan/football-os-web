import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferMarketReport() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const competitions = footballProvider.competitions();

  // 转会市场数据统计
  const marketStats = useMemo(() => {
    const totalPlayers = players.length;
    const highValuePlayers = players.filter(p => p.marketValue > 50000000);
    const totalTransferBudget = 500000000; // 模拟总转会预算
    const totalSpent = highValuePlayers.reduce((sum, p) => sum + p.marketValue, 0);

    return {
      totalPlayers,
      highValuePlayers: highValuePlayers.length,
      totalTransferBudget,
      totalSpent,
      remainingBudget: totalTransferBudget - totalSpent,
      avgPlayerValue: Math.round(players.reduce((sum, p) => sum + p.marketValue, 0) / totalPlayers),
    };
  }, [players]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.transferMarketReportTitle")} />
      
      {/* 市场概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.totalPlayers")}
          value={marketStats.totalPlayers.toLocaleString()}
          subtitle={t("manager.squadSize")}
        />
        <StatTile
          title={t("manager.highValuePlayers")}
          value={marketStats.highValuePlayers.toLocaleString()}
          subtitle={t("manager.playersOver50M")}
        />
        <StatTile
          title={t("manager.totalBudget")}
          value={`${t("currency.euro")} ${marketStats.totalTransferBudget.toLocaleString()}`}
          subtitle={t("manager.annualBudget")}
        />
        <StatTile
          title={t("manager.remainingBudget")}
          value={marketStats.remainingBudget >= 0 ? `+${t("currency.euro")} ${marketStats.remainingBudget.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(marketStats.remainingBudget).toLocaleString()}`}
          variant={marketStats.remainingBudget >= 0 ? "primary" : "destructive"}
        />
      </div>

      {/* 市场分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("marketAnalysis")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("marketAnalysisDesc", {
            totalPlayers: marketStats.totalPlayers,
            highValue: marketStats.highValuePlayers,
          })}
        </p>
        <Button variant="outline" size="sm">
          {t("analyzeMarket")}
        </Button>
      </Panel>

      {/* 预算明细 */}
      <Panel className="p-4">
        <SectionTitle title={t("budgetBreakdown")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("budgetSpent")}
            value={`-${t("currency.euro")} ${marketStats.totalSpent.toLocaleString()}`}
            subtitle={t("budgetSpentDesc")}
          />
          <StatTile
            title={t("budgetRemaining")}
            value={marketStats.remainingBudget >= 0 ? `+${t("currency.euro")} ${marketStats.remainingBudget.toLocaleString()}` : `-${t("currency.euro")} ${Math.abs(marketStats.remainingBudget).toLocaleString()}`}
            variant={marketStats.remainingBudget >= 0 ? "primary" : "destructive"}
          />
        </div>
      </Panel>
    </Panel>
  );
}