import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerDevelopment() {
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
      rating: p.rating || 0,
      marketValue: p.marketValue || 0,
      contractYear: p.contractYear || 0,
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"growth" "potential">("growth");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedByPotential = useMemo(
    () => [...playerData].sort((a, b) => b.potential - a.potential),
    [playerData]
  );

  const sortedByOverall = useMemo(
    () => [...playerData].sort((a, b) => b.overall - a.overall),
    [playerData]
  );

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerDevelopment.title")} />
        <p className="text-muted-foreground mb-4">
          {t("playerDevelopment.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerDevelopment.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "growth" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("growth")}
        >
          {t("playerDevelopment.growth")}
        </Button>
        <Button
          variant={setSelectedView === "potential" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("potential")}
        >
          {t("playerDevelopment.potential")}
        </Button>
      </div>

      {/* 成长曲线 */}
      {setSelectedView === "growth" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("playerDevelopment.growthCurve")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("playerDevelopment.trackProgress")}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByPotential.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("playerDevelopment.rank", { rank: sortedByPotential.indexOf(p) + 1 })}:
                {t("playerDevelopment.{name}", { name: p.name })} - 
                {t("playerDevelopment.overall", { overall: p.overall })}★ → {t("playerDevelopment.potential", { potential: p.potential })}★ - 
                {t("playerDevelopment.age", { age: p.age })}岁 - 
                {t("playerDevelopment.games", { games: p.gamesPlayed })}场</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 潜力榜 */}
      {setSelectedView === "potential" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("playerDevelopment.potentialLeader")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByOverall.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("playerDevelopment.rank", { rank: sortedByOverall.indexOf(p) + 1 })}:
                {t("playerDevelopment.{name}", { name: p.name })} - {t("playerDevelopment.potential", { potential: p.potential })}★</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 球员详情 */}
      {/* 这里可以展开球员发展详情面板 */}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("playerDevelopment.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("playerDevelopment.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("playerDevelopment.avgPotential", {
            avg: (playerData.reduce((sum, p) => sum + p.potential, 0) / playerData.length).toFixed(1),
          })} 平均潜能评分</p>
        <p>
          {t("playerDevelopment.avgOverall", {
            avg: (playerData.reduce((sum, p) => sum + p.overall, 0) / playerData.length).toFixed(1),
          })} 平均总体评分</p>
        <p>
          {t("playerDevelopment.youngestPlayer", {
            player: playerData.sort((a, b) => a.age - b.age)[0]?.name,
          })} 最年轻球员</p>
        <p>
          {t("playerDevelopment.oldestPlayer", {
            player: playerData.sort((a, b) => b.age - a.age)[0]?.name,
          })} 最年长球员</p>
      </Panel>
    </Panel>
  );
}