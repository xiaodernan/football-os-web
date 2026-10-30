import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TopScorersList() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"goals" | "assists">("goals");

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      goals: p.goals || 0,
      assists: p.assists || 0,
    }));
  }, [players]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedByGoals = [...playerData]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10);

  const sortedByAssists = [...playerData]
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 10);

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("topScorersList.title")} />
        <p className="text-muted-foreground mb-4">
          {t("topScorersList.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("topScorersList.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "goals" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("goals")}
        >
          {t("topScorersList.goals")}
        </Button>
        <Button
          variant={setSelectedView === "assists" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("assists")}
        >
          {t("topScorersList.assists")}
        </Button>
      </div>

      {/* 进球榜 */}
      {setSelectedView === "goals" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("topScorersList.goalsScorers")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("topScorersList.topScorers", { count: sortedByGoals.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByGoals.map((p, i) => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("topScorersList.rank", { rank: i + 1 })}:
                {t("topScorersList.{name}", { name: p.name })} - {p.goals}球
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 助攻榜 */}
      {setSelectedView === "assists" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("topScorersList.assistsScorers")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("topScorersList.topAssists", { count: sortedByAssists.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
            {sortedByAssists.map((p, i) => (
              <li key={p.id} className="font-medium text-warning mb-1">
                {t("topScorersList.rank", { rank: i + 1 })}:
                {t("topScorersList.{name}", { name: p.name })} - {p.assists}次
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {/* 这里可以展开球员详情面板 */

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("topScorersList.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("topScorersList.totalPlayers", { count: players.length })} 名球员</p>
        <p>{t("topScorersList.avgGoals", { avg: (players.reduce((sum, p) => sum + p.goals, 0) / players.length).toFixed(1) })} 平均进球</p>
        <p>{t("topScorersList.avgAssists", { avg: (players.reduce((sum, p) => sum + p.assists, 0) / players.length).toFixed(1) })} 平均助攻</p>
      </Panel>
    </Panel>
  );
}