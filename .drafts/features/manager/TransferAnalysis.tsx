import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";
import { getSeasonStats, SeasonStats } from "@/features/world/seasonStats";

export function TransferAnalysis() {
  const { t } = useI18n();
  const stats = useMemo(() => getSeasonStats(), []);
  const players = useMemo(() => footballProvider.players(), []);
  const competitions = footballProvider.competitions();

  // 转会数据统计
  const transferMetrics = useMemo(() => {
    const totalPlayers = players.length;
    const highValuePlayers = players.filter(p => p.marketValue > 50000000);
    const avgAge = Math.round(
      players.reduce((sum, p) => sum + p.age, 0) / totalPlayers
    );
    const avgOverall = Math.round(
      players.reduce((sum, p) => sum + p.overall, 0) / totalPlayers
    );

    return {
      totalPlayers,
      highValuePlayers: highValuePlayers.length,
      avgAge,
      avgOverall,
      totalGoals: stats.goals,
      totalAssists: stats.assists
    };
  }, [players, stats]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.transferAnalysisTitle")} />
      
      {/* 球员市场概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.totalPlayers")}
          value={transferMetrics.totalPlayers.toLocaleString()}
          subtitle={t("manager.squadSize")}
        />
        <StatTile
          title={t("manager.avgAge")}
          value={`${transferMetrics.avgAge}`}
          subtitle={t("manager.averageAge")}
        />
        <StatTile
          title={t("manager.avgOverall")}
          value={`${transferMetrics.avgOverall}★`}
          subtitle={t("manager.averageRating")}
        />
        <StatTile
          title={t("manager.highValuePlayers")}
          value={transferMetrics.highValuePlayers.toLocaleString()}
          subtitle={t("manager.playersOver50M")}
        />
      </div>

      {/* 赛季统计关联 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.seasonStats")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("goals")}
            value={transferMetrics.totalGoals.toLocaleString()}
            subtitle={t("goalsThisSeason")}
          />
          <StatTile
            title={t("assists")}
            value={transferMetrics.totalAssists.toLocaleString()}
            subtitle={t("assistsThisSeason")}
          />
        </div>
      </Panel>

      {/* 转会建议 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.transferSuggestions")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.dataDrivenDecisions")}
        </p>
        <Button variant="outline" size="sm">
          {t("manager.analyzeTransferMarket")}
        </Button>
      </Panel>
    </Panel>
  );
}