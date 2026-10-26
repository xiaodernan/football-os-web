import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function CoachStatistics() {
  const { t } = useI18n();
  const coaches = useMemo(() => footballProvider.coaches ? footballProvider.coaches() : [], []);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  const coachData = useMemo(() => {
    return coaches.map(c => ({
      id: c.id,
      name: c.name,
      totalMatches: c.totalMatches || 0,
      wins: c.wins || 0,
      draws: c.draws || 0,
      losses: c.losses || 0,
      winRate: c.winRate || 0,
      avgGoalsFor: c.avgGoalsFor || 0,
      avgGoalsAgainst: c.avgGoalsAgainst || 0,
    }));
  }, [coaches]);

  const handleSelectCoach = (coachId: string) => {
    setSelectedCoach(coachId);
  };

  if (!selectedCoach) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("coach.coachStatisticsTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("coach.selectCoachToViewStats")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {coaches.slice(0, 6).map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectCoach(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const coach = coachData.find(c => c.id === selectedCoach)!;
  const winRatePercent = coach.winRate * 100;
  const gamesPlayed = coach.totalMatches;
  const winGames = coach.wins;
  const drawGames = coach.draws;
  const lossGames = coach.losses;
  const goalsForAvg = coach.avgGoalsFor.toFixed(1);
  const goalsAgainstAvg = coach.avgGoalsAgainst.toFixed(1);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("coach.coachStatisticsTitle")} />
      
      {/* 执教概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("coach.totalGames")}
          value=gamesPlayed.toLocaleString()
          subtitle={t("coach.games")}
        />
        <StatTile
          title={t("coach.winRate")}
          value=`${winRatePercent.toFixed(1)}%`
          subtitle={t("coach.winRateDesc")}
          variant="primary"
        />
        <StatTile
          title={t("coach.goalsForAvg")}
          value=`${goalsForAvg} ${t("goalsPerGame")}`
          subtitle={t("coach.averageGoalsFor")}
        />
        <StatTile
          title={t("coach.goalsAgainstAvg")}
          value=`${goalsAgainstAvg} ${t("goalsPerGame")}`
          subtitle={t("coach.averageGoalsAgainst")}
        />
      </div>

      {/* 战绩明细 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("coach.record")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile title={t("coach.wins")} value={winGames.toLocaleString()} subtitle={t("coach.wins")} />
          <StatTile title={t("coach.draws")} value=drawGames.toLocaleString() subtitle={t("coach.draws")} />
          <StatTile title={t("coach.losses")} value=lossGames.toLocaleString() subtitle={t("coach.losses")} />
        </div>
      </Panel>

      {/* 进球数据 */}
      <Panel className="p-4">
        <SectionTitle title={t("coach.goalStatistics")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("coach.goalsStatisticsDesc")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile title={t("coach.goalsFor")} value={goalsForAvg} subtitle={t("goalsFor")} />
          <StatTile title={t("coach.goalsAgainst")} value={goalsAgainstAvg} subtitle={t("goalsAgainst")} />
        </div>
      </Panel>

      {/* 选换教练 */}
      <Panel className="p-4">
        <SectionTitle title={t("coach.selectAnotherCoach")} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedCoach(null)}
        >
          {t("coach.selectAnotherCoach")}
        </Button>
      </Panel>
    </Panel>
  );
}