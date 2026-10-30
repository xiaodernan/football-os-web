import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonEndReport() {
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
        <SectionTitle title={t("seasonEndReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonEndReport.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonEndReport.title")} />

      {/* 联赛总结 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonEndReport.leagueSummary")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonEndReport.season", { season: 2026 })}</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {sortedClubs.map((c, i) => (
            <li key={c.id} className="font-medium text-primary mb-1">
              {t("seasonEndReport.position", { position: i + 1 })}:
              {t("seasonEndReport.{name}", { name: c.name })} - {t("seasonEndReport.points", { points: c.points })}分</li>
          ))}
        </ol>
      </Panel>

      {/* 进球统计 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonEndReport.goalsSummary")} />
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
        <SectionTitle title={t("seasonEndReport.resultSummary")} />
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
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonEndReport.topScorers")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {playerData
            .sort((a, b) => b.goals - a.goals)
            .slice(0, 5)
            .map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("seasonEndReport.rank", { rank: playerData.indexOf(p) + 1 })}:
                {t("seasonEndReport.{name}", { name: p.name })} - {p.goals}球</li>
            ))}
        </ol>
      </Panel>

      {/* 助攻榜 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonEndReport.assistsSummary")} />
        <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
          {playerData
            .sort((a, b) => b.assists - a.assists)
            .slice(0, 5)
            .map(p => (
              <li key={p.id} className="font-medium text-warning mb-1">
                {t("seasonEndReport.rank", { rank: playerData.indexOf(p) + 1 })}:
                {t("seasonEndReport.{name}", { name: p.name })} - {p.assists}助</li>
            ))
        </ol>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonEndReport.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonEndReport.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("seasonEndReport.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("seasonEndReport.totalGoals", {
            goals: playerData.reduce((sum, p) => sum + p.goals, 0),
          })} 赛季总进球</p>
        <p>
          {t("seasonEndReport.averageGoals", {
            avg: (playerData.reduce((sum, p) => sum + p.goals, 0) / players.length).toFixed(1),
          })} 平均每名球员进球</p>
        </p>
      </Panel>
    </Panel>
  );
}