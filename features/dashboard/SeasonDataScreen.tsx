import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonDataScreen() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟赛季数据
  const leagues = useMemo(() => ([
    { id: "1", name: "英超", country: "England", matches: 380, goals: 1056, avgGoals: 2.78, yellowCards: 920, redCards: 24 },
    { id: "2", name: "西甲", country: "Spain", matches: 380, goals: 1023, avgGoals: 2.69, yellowCards: 890, redCards: 21 },
    { id: "3", name: "德甲", country: "Germany", matches: 306, goals: 850, avgGoals: 2.78, yellowCards: 720, redCards: 18 },
    { id: "4", name: "意甲", country: "Italy", matches: 380, goals: 890, avgGoals: 2.34, yellowCards: 850, redCards: 22 },
    { id: "5", name: "法甲", country: "France", matches: 380, goals: 910, avgGoals: 2.39, yellowCards: 870, redCards: 19 },
  ] as const));

  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  if (!selectedLeague) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("dashboard.seasonDataTitle") } />
        <p className="text-muted-foreground mb-4">
          {t("dashboard.selectLeagueForDetails")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {leagues.map(league => (
            <Button
              key={league.id}
              variant="outline"
              size="sm"
              onClick={() => setSelectedLeague(league.id)}
            >
              {league.name} ({league.country})
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const league = leagues.find(l => l.id === selectedLeague)!;

  // 赛季统计指标
  const seasonStats = useMemo(() => ({
    totalMatches: league.matches,
    totalGoals: league.goals,
    avgGoalsPerMatch: league.avgGoals,
    totalYellowCards: league.yellowCards,
    totalRedCards: league.redCards,
    goalPer90: (league.goals / (league.matches / 10)).toFixed(2),
  }), [league]);

  // 球队数据模拟
  const teams = useMemo(() => ([
    { id: "1", name: "Manchester City", played: 38, won: 28, drawn: 8, lost: 2, goalsFor: 95, goalsAgainst: 25, points: 92 },
    { id: "2", name: "Arsenal", played: 38, won: 26, drawn: 8, lost: 4, goalsFor: 85, goalsAgainst: 31, points: 86 },
    { id: "3", name: "Liverpool", played: 38, won: 24, drawn: 10, lost: 4, goalsFor: 88, goalsAgainst: 34, points: 82 },
    { id: "4", name: "Manchester United", played: 38, won: 20, drawn: 10, lost: 8, goalsFor: 75, goalsAgainst: 45, points: 70 },
    { id: "5", name: "Chelsea", played: 38, won: 18, drawn: 12, lost: 8, goalsFor: 68, goalsAgainst: 43, points: 66 },
  ] as const));

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.points - a.points), [teams]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("dashboard.seasonDataTitle") } />

      {/* 选择联赛 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("dashboard.leagueSelection") } />
        <p className="text-muted-foreground mb-3">
          {t("dashboard.selectedLeague", { league: league.name })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {leagues.map(l => (
            <Button
              key={l.id}
              variant={l.id === selectedLeague ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedLeague(l.id)}
            >
              {l.name} ({l.country})
            </Button>
          ))}
        </div>
      </Panel>

      {/* 赛季概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("dashboard.totalMatches")}
          value={league.matches.toLocaleString()}
          subtitle={t("dashboard.matchesPlayed")}
        />
        <StatTile
          title={t("dashboard.totalGoals")}
          value={league.goals.toLocaleString()}
          subtitle={t("dashboard.totalGoalsScored")}
        />
        <StatTile
          title={t("dashboard.avgGoals")}
          value={league.avgGoals.toFixed(2)}
          subtitle={t("dashboard.averagePerMatch")}
        />
        <StatTile
          title={t("dashboard.yellowCards")}
          value={league.yellowCards.toLocaleString()}
          subtitle={t("dashboard.totalYellowCards")}
        />
        <StatTile
          title={t("dashboard.redCards")}
          value={league.redCards.toLocaleString()}
          subtitle={t("dashboard.totalRedCards")}
        />
      </div>

      {/* 积分榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("dashboard.leagueTable") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("dashboard.pointsSystem", { system: "3分制" })}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.team")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.played")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.wins")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.draws")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.losses")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.points")}</th>
                <th className="text-left p-3 border border-gray-200">{t("dashboard.goalDifference")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => (
                <tr key={team.id} className="border-b">
                  <td className="p-3 font-medium text-primary">{index + 1}</td>
                  <td className="p-3 font-medium truncate">{team.name}</td>
                  <td className="p-3">{team.played}</td>
                  <td className="p-3">{team.won}</td>
                  <td className="p-3">{team.drawn}</td>
                  <td className="p-3">{team.lost}</td>
                  <td className="p-3">{team.points}</td>
                  <td className="p-3">{team.goalsFor - team.goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedLeague(null)}
        >
          {t("dashboard.backToLeagues")}
        </Button>
      </Panel>

      {/* 关键统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("dashboard.keyStatistics") } />
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-3">
            <div className="font-medium">{t("dashboard.goalPer90")}</div>
            <div className="text-2xl font-bold text-primary">{seasonStats.goalPer90} 球/90分钟</div>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium">{t("dashboard.cardRate")}</div>
            <div className="text-2xl font-bold text-warning">
              {seasonStats.totalYellowCards}黄牌 {seasonStats.totalRedCards}红牌
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium">{t("dashboard.scorerRate")}</div>
            <div className="text-2xl font-bold text-green-600">
              {seasonStats.totalGoals / league.matches > 3 ? "进攻火爆" : "一般"}
            </div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}