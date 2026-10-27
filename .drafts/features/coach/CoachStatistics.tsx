import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function CoachStatistics() {
  const { t } = useI18n();
  const coaches = useMemo(() => footballProvider.coaches(), []);

  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  const coachData = useMemo(() => {
    return coaches.map(c => ({
      id: c.id,
      name: c.name,
      nationality: c.nationality,
      age: c.age,
      yearsAtClub: c.yearsAtClub,
      totalMatches: c.totalMatches,
      totalWins: c.totalWins,
      totalDraws: c.totalDraws,
      totalLosses: c.totalLosses,
      winRate: c.totalMatches > 0 ? Math.round((c.totalWins / c.totalMatches) * 100) : 0,
      trophies: c.trophies || 0,
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
          {coachData.slice(0, 6).map(c => (
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

  const c = coachData.find(pl => pl.id === selectedCoach)!;

  // 执教战绩统计
  const matchesPlayed = c.totalMatches;
  const matchesWon = c.totalWins;
  const matchesDrawn = c.totalDraws;
  const matchesLost = c.totalLosses;
  const winRate = Math.round((matchesWon / matchesPlayed) * 100);

  // 获得的荣誉
  const trophyLevels = useMemo(() => {
    const levels: Record<string, number> = {};
    for (let i = 0; i < c.trophies; i++) {
      const level = t(`trophy.level.${i}`) || "unknown";
      trophyLevels[level] = (trophyLevels[level] || 0) + 1;
    }
    return trophyLevels;
  }, [c.trophies]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("coach.coachStatisticsTitle")} />

      {/* 执教概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("coach.totalMatches")}
          value={c.totalMatches.toString()}
          subtitle={t("coach.matchesCoached")}
        />
        <StatTile
          title={t("coach.winRate")}
          value={`${winRate}%`}
          subtitle={t("coach.winRateDesc")}
          variant={winRate > 60 ? "primary" : winRate > 40 ? "warning" : "destructive"}
        />
        <StatTile
          title={t("coach.trophiesWon")}
          value={c.trophies.toString()}
          subtitle={t("coach.honours")}
        />
        <StatTile
          title={t("coach.yearsAtClub")}
          value={`${c.yearsAtClub}年`}
          subtitle={t("coach.coachAtClub")}
        />
      </div>

      {/* 战绩详情 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("coach.matchResults")} />
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-3 text-center">
            <div className="font-medium text-primary">胜</div>
            <div className="text-3xl font-bold text-green-600">{c.totalWins}</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="font-medium text-warning">平</div>
            <div className="text-3xl font-bold text-yellow-600">{c.totalDraws}</div>
          </div>
          <div className="border rounded p-3 text-center">
            <div className="font-medium text-danger">负</div>
            <div className="text-3xl font-bold text-red-600">{c.totalLosses}</div>
          </div>
        </div>
      </Panel>

      {/* 荣誉列表 */}
      {c.trophies > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("coach.trophyList")} />
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(trophyLevels).map(([level, count]) => (
              <div
                key={level}
                className="border rounded p-2 text-center"
              >
                <div className="font-medium">{t(`trophy.${level}`)}</div>
                <div className="text-sm text-muted-foreground">{count}座</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 执教风格/偏好 */}
      <Panel className="p-4">
        <SectionTitle title={t("coach.coachingStyle")} />
        <p className="text-sm text-muted-foreground">
          {t("coach.formationPreference", { formation: t(`formation.${c.preferredFormation}`) })}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {t("coach.tacticalApproach", { approach: t(`tactical.${c.tacticalApproach}`) })}
        </p>
      </Panel>
    </Panel>
  );
}