import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonPrediction() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

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
      goalDifference: (c.goalsFor || 0) - (c.goalsAgainst || 0),
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonPrediction.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonPrediction.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonPrediction.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("seasonPrediction.selectClub")}</div>
        </div>
      </div>

      {/* 预测分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonPrediction.predictions")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonPrediction.basedOn", { games: 38 })}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("seasonPrediction.finalPoints")}
            value={selectedClub ? clubData.find(c => c.id === selectedClub)?.points : '—'}
            subtitle={t("seasonPrediction.outOf", { total: 114 })}
            status={selectedClub ? clubData.find(c => c.id === selectedClub)?.points >= 75 ? "success" : "info" : "default"}
          />
          <StatTile
            title={t("seasonPrediction.position")}
            value={selectedClub ? clubData.find(c => c.id === selectedClub)?.position : '—'}
            subtitle={t("seasonPrediction.outOf", { total: 20 })}
          />
        </div>
      </Panel>

      {/* 降级预测 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonPrediction.relegation")} />
        <p className="text-sm text-danger mb-3">
          {t("seasonPrediction.relegationRisk")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-danger">
          {[19, 20].map(pos => {
            const team = clubData.find(t => t.position === pos);
            return team ? (
              <li key={pos} className="font-medium text-danger">
                {t("seasonPrediction.position", { position: pos })}: {t("seasonPrediction.{name}", { name: team.name })} - {t("seasonPrediction.relegation")}
              </li>
            ) : null;
          })}
        </ul>
      </Panel>

      {/* 欧洲资格预测 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonPrediction.european")} />
        <p className="text-sm text-primary mb-3">
          {t("seasonPrediction.europeanQualification")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-primary">
          {[1, 2, 3, 4].map(pos => {
            const team = clubData.sort((a, b) => b.points - a.points)[0];
            return team ? (
              <li key={pos} className="font-medium text-primary">
                {t("seasonPrediction.position", { position: pos })}: {t("seasonPrediction.{name}", { name: team.name })} - {t("seasonPrediction.uefaChampionsLeague")}</li>
            ) : null;
          })}
        </ul>
        <p>{t("seasonPrediction.eloLeague", { positions: [5, 6, 7, 8] })}</p>
      </Panel>

      {/* 关键比赛分析 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonPrediction.keyMatches")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonPrediction.remainingGames", { games: 38 })}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("seasonPrediction.titleRaceDecider")}</li>
          <li>{t("seasonPrediction.relegationSixPointer")}</li>
          <li>{t("seasonPrediction.finalDay")}</li>
        </ul>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("seasonPrediction.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("seasonPrediction.totalTeams", { total: clubs.length })}</p>
        <p>{t("seasonPrediction.leader", { leader: clubData.sort((a, b) => b.points - a.points)[0]?.name || '' })}</p>
        <p>{t("seasonPrediction.pointsGap", { gap: clubData.sort((a, b) => b.points - a.points)[0]?.points - clubData.sort((a, b) => a.points - b.points)[1]?.points || 0 })}</p>
      </Panel>
    </Panel>
  );
}