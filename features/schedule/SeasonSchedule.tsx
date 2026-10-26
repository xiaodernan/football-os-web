import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonSchedule() {
  const { t } = useI18n();
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const currentYear = new Date().getFullYear();

  // 模拟赛季日程数据
  const mockSchedule = useMemo(() => {
    const games = [];
    const teams = ["Team A", "Team B", "Team C", "Team D", "Team E", "Team F"];
    
    for (let i = 0; i < 10; i++) {
      const day = new Date();
      day.setDate(currentYear % 30 + i * 3);
      games.push({
        id: `game-${i}`,
        date: day.toISOString().split("T")[0],
        homeTeam: teams[i % teams.length],
        awayTeam: teams[(i + 2) % teams.length],
        status: i < 3 ? "scheduled" : (i < 7 ? "in_progress" : "completed"),
        competition: competitions[i % competitions.length]?.name || "League"
      });
    }
    return games;
  }, [competitions]);

  const statusCounts = useMemo(() => {
    const counts = { scheduled: 0, in_progress: 0, completed: 0 };
    mockSchedule.forEach(g => { counts[g.status]++; });
    return counts;
  }, [mockSchedule]);

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("schedule.seasonScheduleTitle")} />
        
        {/* 状态概览 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <StatTile
              key={status}
              title={t(`schedule.${status}`)}
              value={count.toLocaleString()}
              subtitle={t("schedule.matches")}
            />
          ))}
        </div>

        {/* 日程列表 */}
        {mockSchedule.length > 0 && (
          <Panel className="p-4">
            <SectionTitle title={t("schedule.upcomingMatches")} />
            <div className="space-y-3">
              {mockSchedule.map(game => (
                <div
                  key={game.id}
                  className="border rounded p-3 flex items-center {game.status === 'scheduled' ? 'bg-blue-50' : game.status === 'in_progress' ? 'bg-yellow-50' : 'bg-green-50'}"
                >
                  <div className="flex-1">
                    <div className="font-medium">{game.homeTeam} vs {game.awayTeam}</div>
                    <div className="text-xs text-muted-foreground">{t(`schedule.${game.competition}`)}</div>
                  </div>
                  <div className="text-center px-2">
                    <div className="font-medium">{t(`schedule.${game.status}`)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* 无赛事提示 */}
        {mockSchedule.length === 0 && (
          <EmptyState
            title={t("schedule.noMatchesTitle")}
            icon="📅"
            hint={t("schedule.noMatchesHint")}
          />
        )}
      </Panel>
    </div>
  );
}