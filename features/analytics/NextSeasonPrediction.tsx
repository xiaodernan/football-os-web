import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function NextSeasonPrediction() {
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
      marketValue: p.marketValue || 0,
      goals: p.goals || 0,
      assists: p.assists || 0,
    }));
  }, [players]);

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.points - a.points),
    [clubData]
  );

  const [selectedView, setSelectedView] = useState<"promotion" | "relegation" | "europe">("promotion");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const relegatedTeams = useMemo(() => {
    return sortedClubs.filter(c => c.position >= 19);
  }, [sortedClubs]);

  const championsLeagueQualifiers = useMemo(() => {
    return sortedClubs.filter(c => [1, 2, 3, 4].includes(c.position));
  }, [sortedClubs]);

  const europaLeagueQualifiers = useMemo(() => {
    return sortedClubs.filter(c => [5, 6, 7, 8].includes(c.position));
  }, [sortedClubs]);

  const handleSelectView2 = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("nextSeasonPrediction.title")} />
        <p className="text-muted-foreground mb-4">
          {t("nextSeasonPrediction.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("nextSeasonPrediction.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "promotion" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("promotion")}
        >
          {t("nextSeasonPrediction.promotion")}
        </Button>
        <Button
          variant={setSelectedView === "relegation" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("relegation")}
        >
          {t("nextSeasonPrediction.relegation")}
        </Button>
        <Button
          variant={setSelectedView === "europe" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("europe")}
        >
          {t("nextSeasonPrediction.europe")}
        </Button>
      </div>

      {/* 升级区域 */}
      {setSelectedView === "promotion" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("nextSeasonPrediction.promotionZone")} />
          <p className="text-sm text-success mb-3">
            {t("nextSeasonPrediction.promotionCandidates")}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-success">
            {sortedClubs
              .filter(c => c.position <= 3 && c.position >= 1) // Promotion spots
              .map(c => (
                <li key={c.id} className="font-medium text-success mb-1">
                  {t("nextSeasonPrediction.position", { position: c.position })}:
                  {t("nextSeasonPrediction.{name}", { name: c.name })} - {t("nextSeasonPrediction.promotion")}</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 降级区域 */}
      {setSelectedView === "relegation" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("nextSeasonPrediction.relegationZone")} />
          <p className="text-sm text-danger mb-3">
            {t("nextSeasonPrediction.relegationCandidates")}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-danger">
            {relegatedTeams.map(c => (
              <li key={c.id} className="font-medium text-danger mb-1">
                {t("nextSeasonPrediction.position", { position: c.position })}:
                {t("nextSeasonPrediction.{name}", { name: c.name })} - {t("nextSeasonPrediction.relegation")}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 欧洲资格 */}
      {setSelectedView === "europe" && (
        <Panel className="p-4">
          <SectionTitle title={t("nextSeasonPrediction.europeanQualification")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <SectionTitle title={t("nextSeasonPrediction.championsLeague")} />
              <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
                {[1, 2, 3, 4].map(pos => {
                  const team = sortedClubs.find(t => t.position === pos);
                  return team ? (
                    <li key={pos}>
                      {t("nextSeasonPrediction.position", { position: pos })}:
                      {t("nextSeasonPrediction.{name}", { name: team.name })} - {t("nextSeasonPrediction.uefaChampionsLeague")}
                    </li>
                  ) : null;
                })}
              </ol>
            </div>
            <div>
              <SectionTitle title={t("nextSeasonPrediction EuropaLeague")} />
              <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
                {[5, 6, 7, 8].map(pos => {
                  const team = sortedClubs.find(t => t.position === pos);
                  return team ? (
                    <li key={pos}>
                      {t("nextSeasonPrediction.position", { position: pos })}:
                      {t("nextSeasonPrediction.{name}", { name: team.name })} - {t("nextSeasonPrediction.europaLeague")}
                    </li>
                  ) : null;
                })}
              </ol>
            </div>
            <div>
              <SectionTitle title={t("nextSeasonPrediction.conferenceLeague")} />
              <ol className="list-decimal list-inside space-y-1 text-sm text-info">
                {[9, 10].map(pos => {
                  const team = sortedClubs.find(t => t.position === pos);
                  return team ? (
                    <li key={pos}>
                      {t("nextSeasonPrediction.position", { position: pos })}:
                      {t("nextSeasonPrediction.{name}", { name: team.name })} - {t("nextSeasonPrediction.conferenceLeague")}
                    </li>
                  ) : null;
                })}
              </ol>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("nextSeasonPrediction.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("nextSeasonPrediction.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("nextSeasonPrediction.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("nextSeasonPrediction.promotionRelegation", {
            promotion: sortedClubs.filter(c => c.position <= 3).length,
            relegation: relegatedTeams.length,
          })} 升降级名额</p>
        </p>
        <p>
          {t("nextSeasonPrediction.europaQualification", {
            cl: championsLeagueQualifiers.length,
            el: europaLeagueQualifiers.length,
          })} 欧洲资格名额</p>
        </p>
      </Panel>
    </Panel>
  );
}