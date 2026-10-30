import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonBestGoals() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      gamesPlayed: p.gamesPlayed || 0,
      goals: p.goals || 0,
      assists: p.assists || 0,
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"top" | "byPosition">("top");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedByGoals = useMemo(
    () => [...playerData].sort((a, b) => b.goals - a.goals).slice(0, 10),
    [playerData]
  );

  const sortedByPosition = useMemo(() => {
    const positions = ["门将", "后卫", "中场", "前锋"];
    const result: Record<string, Array<{ name: string; goals: number }>> = {};
    positions.forEach(pos => {
      result[pos] = [];
    });
    playerData.forEach(p => {
      if (result[p.position as keyof typeof result] !== undefined) {
        result[p.position as keyof typeof result].push({ name: p.name, goals: p.goals });
      }
    });
    return result;
  }, [playerData]);

  const handleSelectView2 = (view: string) => {
    setSelectedView(view);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonBestGoals.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonBestGoals.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonBestGoals.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "top" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("top")}
        >
          {t("seasonBestGoals.topScorers")}
        </Button>
        <Button
          variant={setSelectedView === "byPosition" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byPosition")}
        >
          {t("seasonBestGoals.byPosition")}
        </Button>
      </div>

      {/* 进球榜 */}
      {setSelectedView === "top" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonBestGoals.goalsScorers")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonBestGoals.topScorers", { count: sortedByGoals.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByGoals.map((p, i) => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("seasonBestGoals.rank", { rank: i + 1 })}:
                {t("seasonBestGoals.{name}", { name: p.name })} - {p.goals}球</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 按位置分布 */}
      {setSelectedView === "byPosition" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonBestGoals.positionDistribution")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonBestGoals.totalGoals", { goals: playerData.reduce((sum, p) => sum + p.goals, 0) })} 赛季总进球</p>
          <div className="grid grid-cols-4 gap-3">
            ["门将", "后卫", "中场", "前锋"].map(pos => {
              const posPlayers = playerData.filter(p => p.position === pos);
              const total = posPlayers.reduce((sum, p) => sum + p.goals, 0);
              return (
                <div key={pos} className="border rounded p-3 text-center">
                  <div className="font-medium text-primary">{pos}</div>
                  <div>{total}球</div>
                  <div>{posPlayers.length}名球员</div>
                </div>
              );
            })
          </div>
        </Panel>
      )}

      {/* 球员详情 */}
      {/* 这里可以展开球员进球详情面板 */}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonBestGoals.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonBestGoals.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonBestGoals.totalSeasonGoals", {
            goals: playerData.reduce((sum, p) => sum + p.goals, 0),
          })} 赛季总进球</p>
        <p>
          {t("seasonBestGoals.avgGoalsPerTeam", {
            avg: (playerData.reduce((sum, p) => sum + p.goals, 0) / players.length).toFixed(1),
          })} 平均每名球员进球</p>
        </p>
      </Panel>
    </Panel>
  );
}