import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TeamDataViz() {
  const { t } = useI18n();

  // 模拟球队数据
  const data = useMemo(() => ({
    possession: [45, 50, 55, 60, 65, 58, 52],
    scores: [1, 2, 0, 3, 2, 1, 2],
    conceded: [0, 1, 2, 1, 0, 1, 1],
    wins: [1, 1, 0, 1, 1, 0, 1],
    attendence: [25000, 30000, 28000, 32000, 26000, 29000, 31000],
  }), []);

  const formatNumber = (value: number) => value.toLocaleString();
  const avgPossession = ((data.possession.reduce((a, b) => a + b, 0) / data.possession.length)).toFixed(1);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.dataVizTitle")} />
      
      {/* 关键指标 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.avgPossession")}
          value={`${avgPossession}%`}
          subtitle={t("manager.avgPossessionDesc")}
        />
        <StatTile
          title={t("manager.totalWins")}
          value={data.wins.reduce((a, b) => a + b, 0).toString()}
          subtitle={t("manager.totalWinsDesc")}
        />
        <StatTile
          title={t("manager.totalScores")}
          value={data.scores.reduce((a, b) => a + b, 0).toString()}
          subtitle={t("manager.totalScoresDesc")}
        />
        <StatTile
          title={t("manager.attendanceAvg")}
          value={`${(data.attendence.reduce((a, b) => a + b, 0) / data.attendence.length).toLocaleString()}`}
          subtitle={t("manager.avgAttendance")}
        />
      </div>

      {/* 数据趋势 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.dataTrend")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.sevenGamesTrend")}
        </p>
      </Panel>
    </Panel>
  );
}