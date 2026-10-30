import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonHighlights() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
    }));
  }, [clubs]);

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

  const [selectedView, setSelectedView] = useState<"results" "playerPerformances" "milestones">("results");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.points - a.points),
    [clubData]
  );

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonHighlights.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonHighlights.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonHighlights.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "results" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("results")}
        >
          {t("seasonHighlights.results")}
        </Button>
        <Button
          variant={setSelectedView === "playerPerformances" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("playerPerformances")}
        >
          {t("seasonHighlights.playerPerformances")}
        </Button>
        <Button
          variant={setSelectedView === "milestones" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("milestones")}
        >
          {t("seasonHighlights.milestones")}
        </Button>
      </div>

      {/* 赛季结果 */}
      {setSelectedView === "results" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonHighlights.seasonResult")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("seasonHighlights.champion")}</div>
              <div className="text-2xl text-primary">{sortedClubs[0]?.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("seasonHighlights.runnerUp")}</div>
              <div className="text-2xl text-primary">
                {sortedClubs[1]?.name}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-medium text-primary">{t("seasonHighlights.relegation")}</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-danger">
              {[19, 20].map(pos => {
                const team = sortedClubs.find(t => t.position === pos);
                return team ? (
                  <li key={pos}>
                    {t("seasonHighlights.position", { position: pos })}:
                    {t("seasonHighlights.{name}", { name: team.name })}
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </Panel>
      )}

      {/* 球员表现 */}
      {setSelectedView === "playerPerformances" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonHighlights.playerPerformances")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionTitle title={t("seasonHighlights.topScorer")} />
              <p className="text-sm text-primary">
                {t("seasonHighlights.{name}", {
                  name: playerData.sort((a, b) => b.goals - a.goals)[0]?.name,
                })} - {t("seasonHighlights.{goals}", { goals: playerData.sort((a, b) => b.goals - a.goals)[0]?.goals })}球</p>
            </div>
            <div>
              <SectionTitle title={t("seasonHighlights.bestPlayer")} />
              <p className="text-sm text-primary">
                {t("seasonHighlights.{name}", {
                  name: playerData.sort((a, b) => b.rating - a.rating)[0]?.name,
                })} - {t("seasonHighlights.rating", { rating: playerData.sort((a, b) => b.rating - a.rating)[0]?.rating })}评分</p>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 里程碑 */}
      {setSelectedView === "milestones" && (
        <Panel className="p-4">
          <SectionTitle title={t("seasonHighlights.milestones")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            <li>
              {t("seasonHighlights.mostGoals", {
                goals: playerData.reduce((sum, p) => sum + p.goals, 0),
              })} 赛季总进球数
            </li>
            <li>
              {t("seasonHighlights.averageGoals", {
                avg: (playerData.reduce((sum, p) => sum + p.goals, 0) / players.length).toFixed(1),
              })} 平均每名球员进球数
            </li>
            <li>
              {t("seasonHighlights.championClub", {
                club: sortedClubs[0]?.name,
              })} 夺冠球队
            </li>
            <li>
              {t("seasonHighlights.totalMatches", {
                matches: clubData.reduce((sum, c) => sum + c.played, 0),
              })} 总比赛场次
            </li>
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonHighlights.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonHighlights.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonHighlights.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonHighlights.totalGoals", {
            goals: playerData.reduce((sum, p) => sum + p.goals, 0),
          })} 赛季总进球</p>
        </p>
      </Panel>
    </Panel>
  );
}