import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonDataViz() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const currentYear = new Date().getFullYear();

  // 模拟赛季实时数据
  const seasonData = useMemo(() => ({
    season: currentYear,
    matchesPlayed: 38,
    matchesCompleted: 30,
    goalsScored: 85,
    goalsConceded: 42,
    cleanSheets: 12,
    avgAttendance: 28500,
    possessionAvg: 52.3,
    shotsPerGame: 15.2,
    passesAccurate: 78.5,
    savePercentage: 71.2,
  }), []);

  const clubStats = useMemo(() => ({
    club: clubs[0],
    avgAge: 25.3,
    marketValue: 350000000,
    wageBill: 120000000,
    stadiumCapacity: 50000,
    attendanceRate: 87.5,
  }), [clubs]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.seasonDataVizTitle")} />

      {/* 赛季概览关键指标 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.season")}
          value={seasonData.season.toString()}
          subtitle={t("manager.currentSeason")}
        />
        <StatTile
          title={t("manager.matchesPlayed")}
          value={seasonData.matchesPlayed.toString()}
          subtitle={t("manager.matchesThisSeason")}
        />
        <StatTile
          title={t("manager.matchesCompleted")}
          value={seasonData.matchesCompleted.toString()}
          subtitle={t("manager.completed")}
        />
        <StatTile
          title={t("manager.goalsScored")}
          value={seasonData.goalsScored.toString()}
          subtitle={t("manager.totalGoals")}
        />
      </div>

      {/* 球队统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.teamStatistics")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.avgAttendance")}
            value={`${seasonData.avgAttendance.toLocaleString()}`}
            subtitle={t("manager.attendance")}
          />
          <StatTile
            title={t("manager.possessionAvg")}
            value={`${seasonData.possessionAvg.toFixed(1)}%`}
            subtitle={t("manager.possession")}
          />
          <StatTile
            title={t("manager.shotsPerGame")}
            value={seasonData.shotsPerGame.toFixed(1)}
            subtitle={t("manager.shotsPerGameDesc")}
          />
          <StatTile
            title={t("manager.passesAccurate")}
            value={`${seasonData.passesAccurate.toFixed(1)}%`}
            subtitle={t("manager.passesAccurateDesc")}
          />
        </div>
      </Panel>

      {/* 门将与防守 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.defenseStats")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.goalsConceded")}
            value={seasonData.goalsConceded.toString()}
            subtitle={t("manager.totalConceded")}
          />
          <StatTile
            title={t("manager.cleanSheets")}
            value={seasonData.cleanSheets.toString()}
            subtitle={t("manager.cleanSheetsDesc")}
          />
          <StatTile
            title={t("manager.savePercentage")}
            value={`${seasonData.savePercentage.toFixed(1)}%`}
            subtitle={t("manager.savePctDesc")}
          />
        </div>
      </Panel>

      {/* 球队价值与薪资 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.clubStats")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.marketValue")}
            value={`${t("currency.euro")} ${clubStats.marketValue.toLocaleString()}`}
            subtitle={t("manager.squadValue")}
          />
          <StatTile
            title={t("manager.wageBill")}
            value={`${t("currency.euro")} ${clubStats.wageBill.toLocaleString()}/w`}
            subtitle={t("manager.totalWageBill")}
          />
          <StatTile
            title={t("manager.stadiumCapacity")}
            value={clubStats.stadiumCapacity.toLocaleString()}
            subtitle={t("manager.stadiumCapacityDesc")}
          />
          <StatTile
            title={t("manager.attendanceRate")}
            value={`${seasonData.avgAttendance > 0 ? (clubStats.attendanceRate || 0).toFixed(1) : "0"}%`}
            subtitle={t("manager.attendanceRateDesc")}
          />
        </div>
      </Panel>
    </Panel>
  );
}