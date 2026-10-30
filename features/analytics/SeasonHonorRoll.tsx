import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonHonorRoll() {
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
        <SectionTitle title={t("seasonHonorRoll.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonHonorRoll.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonHonorRoll.title")} />

      {/* 联赛荣誉 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonHonorRoll.leagueHonors")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          <li>{t("seasonHonorRoll.champion", { club: sortedClubs[0]?.name })} 冠军</li>
          <li>{t("seasonHonorRunnerUp", { club: sortedClubs[1]?.name })} 亚军</li>
          <li>{t("seasonHonorRoll.relegation", { club: sortedClubs[sortedClubs.length - 1]?.name })} 降级</li>
        </ol>
      </Panel>

      {/* 射王与最佳球员 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonHonorRoll.topScorerAndBestPlayer")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">射王</div>
            <div>{sortedByGoals[0]?.name} - {sortedByGoals[0]?.goals}球</div>
          </div>
          <div>
            <div className="font-medium text-primary">最佳球员</div>
            <div>{sortedByRating[0]?.name}</div>
          </div>
        </div>
      </Panel>

      {/* 赛季统计摘要 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonHonorRoll.seasonStatistics")} />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium text-primary">总进球</div>
            <div>{playerData.reduce((sum, p) => sum + p.goals, 0)}</div>
          </div>
          <div>
            <div className="font-medium text-primary">总助攻</div>
            <div>{playerData.reduce((sum, p) => sum + p.assists, 0)}</div>
          </div>
          <div>
            <div className="font-medium text-primary">总比赛</div>
            <div>{clubs.reduce((sum, c) => sum + c.played, 0)}</div>
          </div>
        </div>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonHonorRoll.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonHonorRoll.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonHonorRoll.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonHonorRoll.totalGoals", {
            goals: playerData.reduce((sum, p) => sum + p.goals, 0),
          })} 赛季总进球</p>
        </p>
      </Panel>
    </Panel>
  );
}