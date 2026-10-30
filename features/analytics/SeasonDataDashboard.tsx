import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonDataDashboard() {
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
      marketValue: c.marketValue || 0,
      wageBill: c.wageBill || 0,
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
      rating: p.rating || 0,
      marketValue: p.marketValue || 0,
      contractYear: p.contractYear || 0,
      weeklyWage: p.weeklyWage || 0,
    }));
  }, [players]);

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.points - a.points),
    [clubData]
  );

  const [selectedTab, setSelectedTab] = useState<"overview" | "players" | "clubs">("overview");

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonDataDashboard.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonDataDashboard.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonDataDashboard.title")} />

      {/* 标签切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedTab === "overview" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("overview")}
        >
          {t("seasonDataDashboard.overview")}
        </Button>
        <Button
          variant={setSelectedTab === "players" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("players")}
        >
          {t("seasonDataDashboard.players")}
        </Button>
        <Button
          variant={setSelectedTab === "clubs" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("clubs")}
        >
          {t("seasonDataDashboard.clubs")}
        </Button>
      </div>

      {/* 概览 */}
      {setSelectedTab === "overview" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonDataDashboard.overview")} />
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              title={t("seasonDataDashboard.totalClubs")}
              value={clubs.length}
              subtitle={t("seasonDataDashboard.league")}
            />
            <StatTile
              title={t("seasonDataDashboard.totalPlayers")}
              value={players.length}
              subtitle={t("seasonDataDashboard.playerCount")}
            />
            <StatTile
              title={t("seasonDataDashboard.totalMatches")}
              value={clubs.reduce((sum, c) => sum + c.played, 0)}
              subtitle={t("seasonDataDashboard.matches")}
            />
          </div>
        </Panel>
      )}

      {/* 球员数据 */}
      {setSelectedTab === "players" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonDataDashboard.players")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionTitle title={t("seasonDataDashboard.topScorers")} />
              <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
                {playerData
                  .sort((a, b) => b.goals - a.goals)
                  .slice(0, 5)
                  .map(p => (
                    <li key={p.id} className="font-medium text-primary mb-1">
                      {t("seasonDataDashboard.rank", { rank: playerData.indexOf(p) + 1 })}:
                      {t("seasonDataDashboard.{name}", { name: p.name })} - {p.goals}球</li>
                  ))}
              </ol>
            </div>
            <div>
              <SectionTitle title={t("seasonDataDashboard.topAssisters")} />
              <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
                {playerData
                  .sort((a, b) => b.assists - a.assists)
                  .slice(0, 5)
                  .map(p => (
                    <li key={p.id} className="font-medium text-warning mb-1">
                      {t("seasonDataDashboard.rank", { rank: playerData.indexOf(p) + 1 })}:
                      {t("seasonDataDashboard.{name}", { name: p.name })} - {p.assists}助</li>
                  ))}
              </ol>
            </div>
          </div>
          <div className="mt-4">
            <SectionTitle title={t("seasonDataDashboard.playerStats")} />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="font-medium text-primary">平均总体评分</div>
                <div>{(playerData.reduce((sum, p) => sum + p.overall, 0) / playerData.length).toFixed(1)}★</div>
              </div>
              <div>
                <div className="font-medium text-primary">平均年龄</div>
                <div>{(playerData.reduce((sum, p) => sum + p.age, 0) / playerData.length).toFixed(1)}岁</div>
              </div>
              <div>
                <div className="font-medium text-primary">平均比赛评分</div>
                <div>{(playerData.reduce((sum, p) => sum + p.rating, 0) / playerData.length).toFixed(1)}/10</div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 俱乐部数据 */}
      {setSelectedTab === "clubs" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonDataDashboard.clubs")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedClubs.map((c, i) => (
              <li key={c.id} className="font-medium text-primary mb-1">
                {t("seasonDataDashboard.position", { position: i + 1 })}:
                {t("seasonDataDashboard.{name}", { name: c.name })} - {t("seasonDataDashboard.points", { points: c.points })}分 - {t("seasonDataDashboard.goalDifference", {
                  diff: c.goalsFor - c.goalsAgainst >= 0 ? `+${c.goalsFor - c.goalsAgainst}` : c.goalsFor - c.goalsAgainst,
                })}</li>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <SectionTitle title={t("seasonDataDashboard.clubStats")} />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="font-medium text-primary">平均积分</div>
                <div>{(clubData.reduce((sum, c) => sum + c.points, 0) / clubData.length).toFixed(1)}</div>
              </div>
              <div>
                <div className="font-medium text-primary">平均进球</div>
                <div>{(clubData.reduce((sum, c) => sum + c.goalsFor, 0) / clubData.length).toFixed(1)}</div>
              </div>
              <div>
                <div className="font-medium text-primary">平均失球</div>
                <div>{(clubData.reduce((sum, c) => sum + c.goalsAgainst, 0) / clubData.length).toFixed(1)}</div>
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonDataDashboard.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonDataDashboard.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonDataDashboard.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonDataDashboard.marketTotal", {
            amount: clubData.reduce((sum, c) => sum + c.marketValue, 0).toLocaleString(),
          })} 联盟总市值
        </p>
        <p>
          {t("seasonDataDashboard.totalWages", {
            amount: clubData.reduce((sum, c) => sum + c.wageBill, 0).toLocaleString(),
          })} 联盟总周薪
        </p>
      </Panel>
    </Panel>
  );
}