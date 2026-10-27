import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TacticalDashboard() {
  const { t } = useI18n();

  // 模拟战术数据
  const metrics = useMemo(() => ({
    possession: 58,
    shots: 15,
    shotsOnTarget: 5,
    corners: 8,
    fouls: 12,
    offsides: 3,
    interceptions: 20,
    tackles: 45,
    clearances: 30,
    goalKicks: 12,
    throwIns: 25
  }), []);

  const formatPercent = (value: number) => `${value}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <Panel className="p-6">
      <SectionTitle title={t("tactical.dashboardTitle")} />
      
      {/* 关键绩效指标 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatTile
          title={t("tactical.possession")}
          value={formatPercent(metrics.possession)}
          subtitle={t("tactical.possessionOf")}
          variant="primary"
        />
        <StatTile
          title={t("tactical.shots")}
          value={formatNumber(metrics.shots)}
          subtitle={t("tactical.totalShots")}
        />
        <StatTile
          title={t("tactical.soT")}
          value={formatNumber(metrics.shotsOnTarget)}
          subtitle={t("tactical.shotsOnTarget")}
          variant="success"
        />
        <StatTile
          title={t("tactical.corners")}
          value={formatNumber(metrics.corners)}
          subtitle={t("tactical.cornerKicks")}
        />
      </div>

      {/* 防守数据 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatTile
          title={t("tackles")}
          value={formatNumber(metrics.tackles)}
          subtitle={t("tacklesAttempted")}
        />
        <StatTile
          title={t("tackles.successRate")}
          value={`${Math.round(metrics.tackles > 0 ? (metrics.tackles / (metrics.tackles + 5)) * 100 : 0)}%`}
          subtitle={t("tackles.success")}
        />
        <StatTile
          title={t("clearances")}
          value={formatNumber(metrics.clearances)}
          subtitle={t("clearancesMade")}
        />
        <StatTile
          title={t("interceptions")}
          value={formatNumber(metrics.interceptions)}
          subtitle={t("interceptionsMade")}
        />
      </div>

      {/* 进攻数据 */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          title={t("fouls")}
          value={formatNumber(metrics.fouls)}
          subtitle={t("foulsCommitted")}
        />
        <StatTile
          title={t("offsides")}
          value={formatNumber(metrics.offsides)}
          subtitle={t("offsidesCount")}
        />
        <StatTile
          title={t("goalKicks")}
          value={formatNumber(metrics.goalKicks)}
          subtitle={t("goalKicksAwarded")}
        />
        <StatTile
          title={t("throwIns")}
          value={formatNumber(metrics.throwIns)}
          subtitle={t("throwInsAwarded")}
        />
      </div>
    </Panel>
  );
}