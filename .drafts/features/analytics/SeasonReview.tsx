import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonReview() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const leagueTable = useMemo(() => {
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
      goalDifference: (c.goalsFor || 0) - (c.goalsAgainst || 0),
    }));
  }, [clubs]);

  const [selectedView, setSelectedView] = useState<"table" | "summary">("table");

  const sortedTable = [...leagueTable].sort((a, b) => {
    const pDiff = b.points - a.points;
    return pDiff !== 0 ? pDiff : b.goalDifference - a.goalDifference;
  });

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!leagueTable.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonReview.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonReview.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonReview.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "table" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("table")}
        >
          {t("seasonReview.leagueTable")}
        </Button>
        <Button
          variant={setSelectedView === "summary" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("summary")}
        >
          {t("seasonReview.summary")}
        </Button>
      </div>

      {/* 联赛积分榜 */}
      {setSelectedView === "table" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonReview.finalTable")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonReview.season", { season: new Date().getFullYear })}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted-foreground">
              <thead>
                <tr>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.position")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.team")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.played")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.won")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.draw")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.lost")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.goalDifference")}</th>
                  <th className="text-left p-3 border border-gray-200 text-center">{t("seasonReview.points")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.map(c => (
                  <tr key={c.id} className="border-b">
                    <td className="p-3 text-center font-medium text-primary">{c.position}</td>
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-center">{c.played}</td>
                    <td className="p-3 text-center">{c.won}</td>
                    <td className="p-3 text-center">{c.drawn}</td>
                    <td className="p-3 text-center">{c.lost}</td>
                    <td className="p-3 text-center">{c.goalDifference >= 0 ? `+${c.goalDifference}` : c.goalDifference}</td>
                    <td className="p-3 text-center font-bold text-primary">{c.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* 赛季总结 */}
      {setSelectedView === "summary" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonReview.seasonSummary")} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("seasonReview.totalTeams")}
              value={leagueTable.length}
              subtitle={t("seasonReview.teams")}
            />
            <StatTile
              title={t("seasonReview.totalMatches")}
              value={(leagueTable.reduce((sum, c) => sum + c.played, 0) / 2).toLocaleString()}
              subtitle={t("seasonReview.matches")}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <StatTile
              title={t("seasonReview.totalGoals")}
              value={(leagueTable.reduce((sum, c) => sum + c.goalsFor, 0)).toLocaleString()}
              subtitle={t("seasonReview.goals")}
            />
            <StatTile
              title={t("seasonReview.avgGoals")}
              value={(leagueTable.reduce((sum, c) => sum + c.goalsFor, 0) / leagueTable.length / (leagueTable[0].played || 1) * 100).toFixed(2)}
              subtitle={t("seasonReview.perGame")}
            />
          </div>
        </Panel>
      )}

      {/* 降级区 */}
      {setSelectedView === "table" && (
        <Panel className="p-4">
          <SectionTitle title={t("seasonReview.relegationZone")} />
          <p className="text-sm text-danger mb-3">
            {t("seasonReview.relegation")}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-danger">
            {[19, 20].map(pos => {
              const team = sortedTable.find(t => t.position === pos);
              return team ? (
                <li key={pos} className="font-medium text-danger">
                  {t("seasonReview.position", { position: pos })}: {t("seasonReview.{name}", { name: team.name })}</li>
              ) : null;
            })}
          </ul>
        </Panel>
      )}

      {/* 欧洲资格 */}
      {setSelectedView === "table" && (
        <Panel className="p-4">
          <SectionTitle title={t("seasonReview.europeanQualification")} />
          <p className="text-sm text-primary mb-3">
            {t("seasonReview.european")}</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-primary">
            {[1, 2, 3, 4].map(pos => {
              const team = sortedTable.find(t => t.position === pos);
              return team ? (
                <li key={pos} className="font-medium text-primary">
                  {t("seasonReview.position", { position: pos })}: {t("seasonReview.{name}", { name: team.name })} - {t("seasonReview.uefaChampionsLeague")}</li>
              ) : null;
            })}
          </ul>
          <p>{t("seasonReview.eloLeague", { positions: [5, 6, 7, 8] })}</p>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("seasonReview.clubDetail")} />
          const c = leagueTable.find(club => club.id === selectedClub)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("seasonReview.name")}</div>
              <div className="text-2xl text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("seasonReview.finalPosition")}</div>
              <div>{c.position}位</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("seasonReview.points")}</div>
            <div className="text-2xl text-primary">{c.points}分</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("seasonReview.goalDifference")}</div>
            <div>{c.goalDifference >= 0 ? `+${c.goalDifference}` : c.goalDifference}</div>
          </div>
        </Panel>
      )}

      {/* 赛季关键数据 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonReview.keyStats")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("seasonReview.champions")}
            value={sortedTable[0]?.name || ''}
            subtitle={t("seasonReview.position", { position: 1 })}
          />
          <StatTile
            title={t("seasonReview.runnerUp")}
            value={sortedTable[1]?.name || ''}
            subtitle={t("seasonReview.position", { position: 2 })}
          />
          <StatTile
            title={t("seasonReview.third")}
            value={sortedTable[2]?.name || ''}
            subtitle={t("seasonReview.position", { position: 3 })}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("seasonReview.goldenBoot")}</p>
      </Panel>
    </Panel>
  );
}