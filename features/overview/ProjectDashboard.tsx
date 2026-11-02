import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ProjectDashboard() {
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

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.points - a.points),
    [clubData]
  );

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("projectDashboard.title")} />
        <p className="text-muted-foreground mb-4">
          {t("projectDashboard.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("projectDashboard.title")} />

      {/* 联盟概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("projectDashboard.leagueOverview")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("projectDashboard.totalClubs")}
            value={clubs.length}
            subtitle={t("projectOverview.league")}
          />
          <StatTile
            title={t("projectDashboard.totalPlayers")}
            value={players.length}
            subtitle={t("projectOverview.playerCount")}
          />
          <StatTile
            title={t("projectDashboard.totalMatches")}
            value={clubs.reduce((sum, c) => sum + c.played, 0)}
            subtitle={t("projectOverview.matches")}
          />
        </div>
      </Panel>

      {/* 积分榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("projectDashboard.leagueTable")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {sortedClubs.map((c, i) => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("projectDashboard.position", { position: i + 1 })}:
              {t("projectDashboard.{name}", { name: c.name })} - {t("projectDashboard.points", { points: c.points })}分</li>
          ))}
        </ol>
      </Panel>

      {/* 进球统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("projectDashboard.goalsStatistics")} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">总进球</div>
            <div>{clubs.reduce((sum, c) => sum + c.goalsFor, 0)}</div>
          </div>
          <div>
            <div className="font-medium text-primary">平均进球</div>
            <div>{(clubs.reduce((sum, c) => sum + c.goalsFor, 0) / clubs.length).toFixed(1)}</div>
          </div>
          <div>
            <div className="font-medium text-primary">总失球</div>
            <div>{clubs.reduce((sum, c) => sum + c.goalsAgainst, 0)}</div>
          </div>
        </div>
      </Panel>

      {/* 胜负平数据 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("projectDashboard.resultStatistics")} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">胜场</div>
            <div>{clubs.reduce((sum, c) => sum + c.wins, 0)}</div>
          </div>
          <div>
            <div className="font-medium text-primary">平局</div>
            <div>{clubs.reduce((sum, c) => sum + c.draws, 0)}</div>
          </div>
          <div>
            <div className="font-medium text-primary">负场</div>
            <div>{clubs.reduce((sum, c) => sum + c.losses, 0)}</div>
          </div>
        </div>
      </Panel>

      {/* 射手榜 */}
      <Panel className="p-4">
        <SectionTitle title={t("projectDashboard.topScorers")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {playerData
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5)
            .map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("projectDashboard.rank", { rank: playerData.indexOf(p) + 1 })}:
                {t("projectDashboard.{name}", { name: p.name })} - {p.goals}球</li>
            ))
        </ol>
      </Panel>

      {/* 助攻榜 */}
      <Panel className="p-4">
        <SectionTitle title={t("projectDashboard.assistsStatistics")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
          {playerData
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 5)
            .map(p => (
              <li key={p.id} className="font-medium text-warning mb-1">
                {t("projectDashboard.rank", { rank: playerData.indexOf(p) + 1 })}:
                {t("projectDashboard.{name}", { name: p.name })} - {p.assists}助</li>
            ))
        </ol>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("projectDashboard.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("projectDashboard.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("projectDashboard.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("projectDashboard.totalGoals", {
            goals: playerData.reduce((sum, p) => sum + p.goals, 0),
          })} 赛季总进球</p>
        <p>
          {t("projectDashboard.averageGoals", {
            avg: (playerData.reduce((sum, p) => sum + p.goals, 0) / players.length).toFixed(1),
          })} 平均每名球员进球</p>
        </p>
      </Panel>
    </Panel>
  );
}