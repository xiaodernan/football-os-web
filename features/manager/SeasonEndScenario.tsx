import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonEndScenario() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  // 模拟积分榜数据
  const clubsData = useMemo(() => clubs.map(c => ({
    id: c.id,
    name: c.name,
    played: 38,
    wins: Math.floor(Math.random() * 20) + 10,
    draws: Math.floor(Math.random() * 10) + 8,
    losses: 38 - (Math.floor(Math.random() * 20) + 10) - Math.floor(Math.random() * 10) - 8,
    goalsFor: Math.floor(Math.random() * 60) + 30,
    goalsAgainst: Math.floor(Math.random() * 50) + 20,
  })), []);

  // 计算积分和净胜球
  const processedClubs = useMemo(() => {
    return clubsData.map(c => ({
      ...c,
      points: c.wins * 3 + c.draws,
      goalDifference: c.goalsFor - c.goalsAgainst,
    }));
  }, [clubsData]);

  // 排序：按积分倒序，净胜球和进球数作为次要排序标准
  const sortedClubs = useMemo(() => {
    return [...processedClubs].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [processedClubs]);

  // 关键比赛场次
  const remainingMatches = useMemo(() => ({
    total: 38 - 30, // 假设已进行30轮
    remaining: 8,
    canWinLeague: sortedClubs[0].points + 8 * 3, // 假设剩余全赢
    currentLeaderPoints: sortedClubs[0].points,
  }), [sortedClubs]);

  // 降级区分界线（倒数第3名）
  const relegationZone = sortedClubs.slice(-3);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.seasonEndScenarioTitle")} />

      {/* 积分榜概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("manager.leagueLeader")} />
          <div className="text-2xl font-bold text-primary">{t(`team.${sortedClubs[0].name}`)}</div>
          <div className="text-muted-foreground">积分: {sortedClubs[0].points}</div>
          <div className="text-sm text-muted-foreground">净胜球: {sortedClubs[0].goalDifference}</div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("manager.relegationZone")} />
          <div className="grid grid-cols-3 gap-2">
            {relegationZone.map((c, i) => (
              <div key={i} className="border rounded p-2 text-center text-sm">
                {t(`position.${sortedClubs.length - 3 + i}`)}
                <div>{t(`team.${c.name}`)}</div>
                <div>{c.points}分</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 关键情景分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.keyScenarios")} />
        
        {/* 莙联情景 */}
        <Panel className="p-4 mb-3" style={{ borderColor: "green", borderStyle: "dashed" }}>
          <div className="font-medium text-green-600">{t("manager.cannotBeRelegated", { 
            points: sortedClubs[0].points + 1,
            remaining: remainingMatches.remaining 
          })}</div>
          <p className="text-green-600 text-sm">
            {t("manager.minimumPointsSafe", { points: sortedClubs[0].points + 1 })}
          </p>
        </Panel>

        {/* 欧战资格情景 */}
        <Panel className="p-4 mb-3" style={{ borderColor: "blue", borderStyle: "dashed" }}>
          <div className="font-medium text-blue-600">{t("manager.europaLeagueQualification", { 
            points: sortedClubs[1].points + 1,
            current: sortedClubs[1].points 
          })}</div>
          <p className="text-blue-600 text-sm">
            {t("manager.currentPoints", { points: sortedClubs[1].points })}
          </p>
        </Panel>

        {/* 降级危机 */}
        {relegationZone[0].points < 30 && (
          <Panel className="p-4 mb-3" style={{ borderColor: "red", borderStyle: "dashed" }}>
            <div className="font-medium text-red-600">{t("manager.relegationDanger", { 
              points: relegationZone[0].points,
              remaining: remainingMatches.remaining 
            })}</div>
            <p className="text-red-600 text-sm">
              {t("manager.maximumPointsRelegated", { points: relegationZone[0].points + remainingMatches.remaining * 3 })}
            </p>
          </div>
        )}
      </Panel>

      {/* 积分情景模拟 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.scenarioSimulation")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.scenarioDescription", { 
            currentLeader: sortedClubs[0].points,
            remainingGames: remainingMatches.remaining,
            maxPoints: sortedClubs[0].points + remainingMatches.remaining * 3
          })}</p>
          <p className="text-xs text-secondary">
            {t("manager.scenarioExplanation")}
          </p>
        </Panel>
      </Panel>
    </Panel>
  );
}