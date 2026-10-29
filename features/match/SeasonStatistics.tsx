import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonStatistics() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟赛季统计数据
  const stats = useMemo(() => ({
    totalMatches: 380,
    totalGoals: 1056,
    avgGoalsPerMatch: 2.78,
    totalShots: 4520,
    shotsOnTarget: 1850,
    totalCorners: 2850,
    totalYellowCards: 920,
    totalRedCards: 24,
    homeWinRate: 45.5,
    awayWinRate: 32.2,
    avgAttendance: 25000,
    totalAttendance: 9500000,
  }), []);

  // 联赛排名统计
  const leagueStats = useMemo(() => ({
    leaders: [
      { name: "最佳射手", goals: 28, player: "前锋A" },
      { name: "最佳助攻", assists: 15, player: "中场B" },
      { name: "最稳门将", cleanSheets: 22, player: "门将1" },
    ],
    topTeams: [
      { name: "冠军队伍", points: 92, gd: +45 },
      { name: "亚军队伍", points: 88, gd: +38 },
      { name: "季军队伍", points: 82, gd: +32 },
    ],
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonStatistics.title") } />

      {/* 赛季概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("seasonStatistics.totalMatches")}
          value={stats.totalMatches.toLocaleString()}
          subtitle={t("seasonMatchesPlayed")}
        />
        <StatTile
          title={t("seasonStatistics.totalGoals")}
          value={stats.totalGoals.toLocaleString()}
          subtitle={t("seasonTotalGoals")}
        />
        <StatTile
          title={t("seasonStatistics.avgGoals")}
          value={stats.avgGoalsPerMatch.toFixed(2)}
          subtitle={t("seasonAvgPerMatch")}
        />
        <StatTile
          title={t("seasonStatistics.totalShots")}
          value={stats.totalShots.toLocaleString()}
          subtitle={t("seasonTotalShots")}
        />
      </div>

      {/* 效率与纪律 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("seasonStatistics.shotsEfficiency")}
          value={(stats.shotsOnTarget / stats.totalShots * 100).toFixed(1)}%
          subtitle={t("seasonShotsOnTargetPct")}
        />
        <StatTile
          title={t("seasonStatistics.discipline")}
          value={`${stats.totalYellowCards}黄牌 ${stats.totalRedCards}红牌`}
          subtitle={t("seasonCardStats")}
        />
      </div>

      {/* 积分与排名 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonStatistics.leagueTable") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonStatistics.pointsRanking")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("seasonStatistics.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonStatistics.team")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonStatistics.points")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonStatistics.goalDiff")}</th>
              </tr>
            </thead>
            <tbody>
              {leagueStats.leaders.map((item, index) => (
                <tr key={item.player} className="border-b">
                  <td className="p-3 font-medium text-primary">{index + 1}</td>
                  <td className="p-3 font-medium">{item.player}</td>
                  <td className="p-3">{item.goals > item.assists ? item.goals : item.assists}</td>
                  <td className="p-3"></td>
                </tr>
              ))}
              {leagueStats.topTeams.map((team, index) => (
                <tr key={team.name} className="border-b bg-gray-50">
                  <td className="p-3 font-medium text-primary">{index + 1}</td>
                  <td className="p-3 font-medium truncate">{team.name}</td>
                  <td className="p-3">{team.points}</td>
                  <td className="p-3">{team.gd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 出勤与观众 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonStatistics.attendance") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("seasonStatistics.avgAttendance")}</div>
            <div className="text-2xl text-primary">{stats.avgAttendance.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">{t("seasonStatistics.totalAttendance")}</div>
            <div className="text-success">{t("currency.euro")} {stats.totalAttendance.toLocaleString()}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("seasonStatistics.attendanceGrowth")}
        </p>
      </Panel>
    </Panel>
  );
}