import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function LeagueStatisticsReport() {
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
        <SectionTitle title={t("leagueStatisticsReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("leagueStatisticsReport.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("leagueStatisticsReport.title")} />

      {/* 联赛积分榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueStatisticsReport.leagueTable")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("leagueStatisticsReport.season", { season: 2026 })}</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {sortedClubs.map((c, i) => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("leagueStatisticsReport.position", { position: i + 1 })}:
              {t("leagueStatisticsReport.{name}", { name: c.name })} - {t("leagueStatisticsReport.points", { points: c.points })}分</li>
          ))}
        </ol>
      </Panel>

      {/* 进球统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueStatisticsReport.goalsStats")} />
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

      {/* 胜负平 statistics */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueStatisticsReport.resultStats")} />
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

      {/* 进球差 statistics */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueStatisticsReport.goalDifference")} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">平均净胜球</div>
            <div>
              {(clubs.reduce((sum, c) => sum + c.goalsFor - c.goalsAgainst, 0) / clubs.length).toFixed(1)}
            </div>
          </div>
          <div>
            <div className="font-medium text-primary">最大净胜球</div>
            <div>
              {sortedClubs[0]?.goalsFor - sortedClubs[0]?.goalsAgainst >= 0 ? `+${sortedClubs[0]?.goalsFor - sortedClubs[0]?.goalsAgainst}` : sortedClubs[0]?.goalsFor - sortedClubs[0]?.goalsAgainst}
            </div>
          </div>
          <div>
            <div className="font-medium text-primary">最差净胜球</div>
            <div>
              {sortedClubs[sortedClubs.length - 1]?.goalsFor - sortedClubs[sortedClubs.length - 1]?.goalsAgainst >= 0 ? `+${sortedClubs[sortedClubs.length - 1]?.goalsFor - sortedClubs[sortedClubs.length - 1]?.goalsAgainst}` : sortedClubs[sortedClubs.length - 1]?.goalsFor - sortedClubs[sortedClubs.length - 1]?.goalsAgainst}
            </div>
          </div>
        </div>
      </Panel>

      {/* 球员统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueStatisticsReport.playerStats")} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">总球员数</div>
            <div>{players.length}</div>
          </div>
          <div>
            <div className="font-medium text-primary">平均总体评分</div>
            <div>{(playerData.reduce((sum, p) => sum + p.overall, 0) / playerData.length).toFixed(1)}★</div>
          </div>
          <div>
            <div className="font-medium text-primary">平均年龄</div>
            <div>{(playerData.reduce((sum, p) => sum + p.age, 0) / playerData.length).toFixed(1)}岁</div>
          </div>
        </div>
      </Panel>

      {/* 射手榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueStatisticsReport.topScorers")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {playerData
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 10)
            .map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("leagueStatisticsReport.rank", { rank: playerData.indexOf(p) + 1 })}:
                {t("leagueStatisticsReport.{name}", { name: p.name })} - {p.goals}球</li>
            ))}
        </ol>
      </Panel>

      {/* 助攻榜 */}
      <Panel className="p-4">
        <SectionTitle title={t("leagueStatisticsReport.topAssisters")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
          {playerData
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 10)
            .map(p => (
              <li key={p.id} className="font-medium text-warning mb-1">
                {t("leagueStatisticsReport.rank", { rank: playerData.indexOf(p) + 1 })}:
                {t("leagueStatisticsReport.{name}", { name: p.name })} - {p.assists}助</li>
            ))}
        </ol>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("leagueStatisticsReport.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("leagueStatisticsReport.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("leagueStatisticsReport.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("leagueStatisticsReport.totalMatches", {
            matches: clubs.reduce((sum, c) => sum + c.played, 0),
          })} 总比赛场次</p>
        <p>
          {t("leagueStatisticsReport.totalGoals", {
            goals: playerData.reduce((sum, p) => sum + p.goals, 0),
          })} 赛季总进球</p>
        </p>
      </Panel>
    </Panel>
  );
}