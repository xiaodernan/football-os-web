import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function CoachCareerProfile() {
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
      totalTrophies: c.trophies || 0,
      achievements: c.achievements || [],
      badges: c.badges || [],
    }));
  }, [coaches]);

  const handleSelectCoach = (coachId: string) => {
    setSelectedCoach(coachId);
  };

  if (!selectedCoach) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("coach.coachCareerTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("coach.selectCoachForProfile")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {coachData.slice(0, 8).map(c => (
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

  // 计算执教生涯统计
  const totalCareerYears = c.yearsAtClub;
  const totalTrophies = c.trophies || 0;
  const totalGames = c.totalMatches;
  const totalWins = c.totalWins;

  // 获得的里程碑徽章
  const milestoneBadges = useMemo(() => {
    const badges: string[] = [];
    if (totalWins >= 100) badges.push("century-wins");
    if (totalTrophies >= 5) badges.push("five-trophies");
    if (totalGames >= 200) badges.push("two-hundred-games");
    if (totalCareerYears >= 10) badges.push("ten-years");
    return badges;
  }, [totalWins, totalTrophies, totalGames, totalCareerYears]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("coach.coachCareerTitle")} />

      {/* 教练概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("coach.totalCareerYears")}
          value={`${totalCareerYears}年`}
          subtitle={t("coach.yearsExercising")}
        />
        <StatTile
          title={t("coach.totalTrophies")}
          value={totalTrophies.toString()}
          subtitle={t("coach.honoursWon")}
        />
        <StatTile
          title={t("coach.totalGames")}
          value={totalGames.toString()}
          subtitle={t("coach.totalMatchesCoached")}
        />
        <StatTile
          title={t("coach.winPercentage")}
          value={`${Math.round((totalWins / totalGames) * 100)}%`}
          subtitle={t("coach.winRateDesc")}
        />
      </div>

      {/* 里程碑徽章 */}
      {milestoneBadges.length > 0 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("coach.milestoneBadges")} />
          <div className="grid grid-cols-3 gap-2">
            {milestoneBadges.map(badge => (
              <div
                key={badge}
                className={`border rounded p-2 text-center ${
                  badge === "century-wins" ? "bg-blue-500 text-white" :
                  badge === "five-trophies" ? "bg-gold-500 text-black" :
                  badge === "two-hundred-games" ? "bg-green-500 text-white" :
                  badge === "ten-years" ? "bg-purple-500 text-white" : "bg-gray-500 text-white"
                }`}
              >
                {t(`badge.${badge}`)}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 执教生涯详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("coach.careerDetails")} />
        <div className="space-y-4">
          <div>
            <div className="font-medium">{t("coach.club")}</div>
            <div className="text-muted-foreground">{t("coach.{clubName}", { clubName: c.name })}</div>
          </div>
          <div>
            <div className="font-medium">{t("coach.nationality")}</div>
            <div className="text-muted-foreground">{t(`nationality.${c.nationality}`) || c.nationality}</div>
          </div>
          <div>
            <div className="font-medium">{t("coach.age")}</div>
            <div className="text-muted-foreground">{c.age}岁</div>
          </div>
          <div>
            <div className="font-medium">{t("coach.achievements")}</div>
            <div className="text-sm text-muted-foreground">
              {c.achievements?.length > 0 ? c.achievements.join(", ") : t("coach.noMajorAchievements")}
            </div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}