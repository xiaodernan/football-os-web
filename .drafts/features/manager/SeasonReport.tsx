import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonReport() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  // 模拟赛季报告数据
  const seasonStats = useMemo(() => ({
    season: currentYear,
    totalMatches: 38,
    homeMatches: 19,
    awayMatches: 19,
    homeWins: 12,
    homeDraws: 4,
    homeLosses: 3,
    awayWins: 5,
    awayDraws: 6,
    awayLosses: 8,
    goalsFor: 68,
    goalsAgainst: 34,
    cleanSheets: 12,
    penaltiesScored: 5,
    penaltiesMissed: 2,
    attendenceTotal: 855000,
    attendenceAvg: 22500,
  }), []);

  const teamStats = useMemo(() => clubs.map(c => ({
    id: c.id,
    name: c.name,
    played: 38,
    won: Math.floor(Math.random() * 20) + 10,
    drawn: Math.floor(Math.random() * 10) + 8,
    lost: 38 - (Math.floor(Math.random() * 20) + 10) - Math.floor(Math.random() * 10) - 8,
    goalsFor: Math.floor(Math.random() * 60) + 30,
    goalsAgainst: Math.floor(Math.random() * 50) + 20,
    points: Math.floor(Math.random() * 20) + 50,
    goalDifference: 0, // calculated
  })), [clubs]);

  // 排序按积分
  const sortedTeams = useMemo(() => {
    return [...teamStats].sort((a, b) => b.points - a.points);
  }, [teamStats]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.seasonReportTitle")} />

      {/* 赛季概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.season")}
          value={seasonStats.season.toString()}
          subtitle={t("manager.currentSeason")}
        />
        <StatTile
          title={t("manager.totalMatches")}
          value={seasonStats.totalMatches.toString()}
          subtitle={t("manager.totalGames")}
        />
        <StatTile
          title={t("manager.goalsFor")}
          value={seasonStats.goalsFor.toString()}
          subtitle={t("manager.totalGoalsFor")}
        />
        <StatTile
          title={t("manager.goalsAgainst")}
          value={seasonStats.goalsAgainst.toString()}
          subtitle={t("manager.totalGoalsAgainst")}
        />
      </div>

      {/* 主/客场统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.homeAwayStats")} />
        <div className="grid grid-cols-2 gap-3">
          <Panel className="p-3">
            <SectionTitle title={t("manager.home")} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="border rounded p-2 text-center">
                <div className="font-medium text-primary">胜</div>
                <div className="text-2xl font-bold text-green-600">{seasonStats.homeWins}</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="font-medium text-warning">平</div>
                <div className="text-2xl font-bold text-yellow-600">{seasonStats.homeDraws}</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="font-medium text-danger">负</div>
                <div className="text-2xl font-bold text-red-600">{seasonStats.homeLosses}</div>
              </div>
            </div>
          </Panel>
          <Panel className="p-3">
            <SectionTitle title={t("manager.away")} />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="border rounded p-2 text-center">
                <div className="font-medium text-primary">胜</div>
                <div className="text-2xl font-bold text-green-600">{seasonStats.awayWins}</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="font-medium text-warning">平</div>
                <div className="text-2xl font-bold text-yellow-600">{seasonStats.awayDraws}</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="font-medium text-danger">负</div>
                <div className="text-2xl font-bold text-red-600">{seasonStats.awayLosses}</div>
              </div>
            </div>
          </Panel>
        </div>
      </Panel>

      {/* 联赛积分榜 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.leagueTable")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.pointsSystem", { system: "3分制" })}
        </p>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {sortedTeams.slice(0, 10).map((team, index) => (
            <div
              key={team.id}
              className={`border-b p-3 flex items-center ${
                index === 0 ? "bg-gold-100 text-gold-800 font-bold" :
                index === 1 ? "bg-silver-100 text-silver-800 font-medium" :
                index === 2 ? "bg-bronze-100 text-bronze-800 font-medium" :
                ""
              }`}
            >
              <div className="w-8 text-center font-medium">{index + 1}</div>
              <div className="w-40 truncate">{t(`team.${team.name}`)}</div>
              <div className="w-16 text-center">{team.played}</div>
              <div className="w-16 text-center">{team.won}</div>
              <div className="w-16 text-center">{team.drawn}</div>
              <div className="w-16 text-center">{team.lost}</div>
              <div className="w-16 text-center">{team.points}</div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.alert(t("manager.viewFullTable"))}
        >
          {t("manager.viewFull")}
        </Button>
      </Panel>
    </Panel>
  );
}