import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonSummary() {
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

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.points - a.points),
    [clubData]
  );

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

  const topScorers = useMemo(
    () => [...playerData].sort((a, b) => b.goals - a.goals).slice(0, 5),
    [playerData]
  );

  const topAssisters = useMemo(
    () => [...playerData].sort((a, b) => b.assists - a.assists).slice(0, 5),
    [playerData]
  );

  const handleViewClub = (clubId: string) => {
    // navigate or set state
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonSummary.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonSummary.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonSummary.title")} />

      {/* 联盟积分榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.leagueTable")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonSummary.leagueSeason", { season: 2026 })}</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {sortedClubs.map((c, i) => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("seasonSummary.position", { position: i + 1 })}:
              {t("seasonSummary.{name}", { name: c.name })} - {t("seasonSummary.points", { points: c.points })}分</li>
          ))}
        </ol>
      </Panel>

      {/* 进球助攻榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.topScorersTitle")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionTitle title={t("seasonSummary.topScorers")} />
            <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
              {topScorers.map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("seasonSummary.rank", { rank: topScorers.indexOf(p) + 1 })}:
                  {t("seasonSummary.{name}", { name: p.name })} - {p.goals}球</li>
              ))}
            </ol>
          </div>
          <div>
            <SectionTitle title={t("seasonSummary.topAssisters")} />
            <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
              {topAssisters.map(p => (
                <li key={p.id} className="font-medium text-warning mb-1">
                  {t("seasonSummary.rank", { rank: topAssisters.indexOf(p) + 1 })}:
                  {t("seasonSummary.{name}", { name: p.name })} - {p.assists}助</li>
              ))}
            </ol>
          </div>
        </div>
      </Panel>

      {/* 赛季统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.seasonStats")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("seasonSummary.totalMatches")}
            value={clubs.reduce((sum, c) => sum + c.played, 0)}
            subtitle={t("seasonSummary.matches")}
          />
          <StatTile
            title={t("seasonSummary.totalGoals")}
            value={clubs.reduce((sum, c) => sum + c.goalsFor, 0)}
            subtitle={t("seasonSummary.goals")}
          />
          <StatTile
            title={t("seasonSummary.totalPoints")}
            value={(clubs.reduce((sum, c) => sum + c.points, 0) /
              clubs.length).toFixed(1)}
            subtitle={t("seasonSummary.avgPoints")}
          />
        </div>
      </Panel>

      {/* 降级/升级区域 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonSummary.relegationBattle")} />
        <p className="text-sm text-danger mb-3">
          {t("seasonSummary.bottomTeams")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-danger">
          {[19, 20].map(pos => {
            const team = sortedClubs.find(t => t.position === pos);
            return team ? (
              <li key={pos} className="font-medium text-danger">
                {t("seasonSummary.position", { position: pos })}:
                {t("seasonSummary.{name}", { name: team.name })} - {t("seasonSummary.relegation")}</li>
            ) : null;
          })}
        </ul>
      </Panel>

      {/* 欧洲资格 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonSummary.europeanQualification")} />
        <p className="text-sm text-primary mb-3">
          {t("seasonSummary.top4Qualify")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-primary">
          {[1, 2, 3, 4].map(pos => {
            const team = sortedClubs.sort((a, b) => b.points - a.points)[0];
            return team ? (
              <li key={pos} className="font-medium text-primary">
                {t("seasonSummary.position", { position: pos })}:
                {t("seasonSummary.{name}", { name: team.name })} - {t("seasonSummary.uefaChampionsLeague")}</li>
            ) : null;
          })}
        </ul>
      </Panel>

      {/* 俱乐部详情 */}
      {sortedClubs.length > 0 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("seasonSummary.clubDetail")} />
          const c = sortedClubs[0];

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("seasonSummary.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("seasonSummary.position")}</div>
              <div>{c.position}位</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonSummary.points")}</div>
            <div className="text-3xl text-primary">{c.points}分</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("seasonSummary.goalDifference")}</div>
            <div>
              {c.goalsFor - c.goalsAgainst >= 0 ? `+${c.goalsFor - c.goalsAgainst}` : c.goalsFor - c.goalsAgainst}
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonSummary.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonSummary.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonSummary.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonSummary.avgAge", {
            avg: (players.reduce((sum, p) => sum + p.age, 0) / players.length).toFixed(1),
          })} 平均年龄
        </p>
        <p>
          {t("seasonSummary.avgOverall", {
            avg: (players.reduce((sum, p) => sum + p.overall, 0) / players.length).toFixed(1),
          })} 平均总体评分
        </p>
      </Panel>
    </Panel>
  );
}