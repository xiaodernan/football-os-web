import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CoachAnalytics() {
  const { t } = useI18n();

  // 模拟教练数据
  const analyticsData = useMemo(() => ({
    totalCoaches: 25,
    avgWinRate: 58,
    avgGoalsPerGame: 1.4,
    avgPossession: 55,
    topPerformer: {
      name: "Carlos Martinez",
      winRate: 75,
      avgGoals: 2.3,
    },
    tacticalEffectiveness: {
      possessionPlay: 65,
      counterAttack: 55,
      setPieces: 70,
    },
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("coach.analyticsTitle")} />
      
      {/* 教练概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("coach.totalCoaches")}
          value=analyticsData.totalCoaches.toString()
          subtitle={t("coach.coachCount")}
        />
        <StatTile
          title={t("coach.avgWinRate")}
          value=`${analyticsData.avgWinRate}%`
          subtitle={t("coach.winRate")}
          variant="primary"
        />
        <StatTile
          title={t("coach.avgGoalsPerGame")}
          value=analyticsData.avgGoalsPerGame.toFixed(1)
          subtitle={t("coach.goalsPerGame")}
        />
        <StatTile
          title={t("coach.avgPossession")}
          value=`${analyticsData.avgPossession}%`
          subtitle={t("coach.possession")}
        />
      </div>

      {/* 战术效果 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("coach.tacticalEffectiveness")} />
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            title={t("coach.possessionPlay")}
            value=`${analyticsData.tacticalEffectiveness.possessionPlay}%`
            subtitle={t("coach.possessionPlayDesc")}
          />
          <StatTile
            title={t("coach.counterAttack")}
            value=`${analyticsData.tacticalEffectiveness.counterAttack}%`
            subtitle={t("coach.counterAttackDesc")}
          />
          <StatTile
            title={t("coach.setPieces")}
            value=`${analyticsData.tacticalEffectiveness.setPieces}%`
            subtitle={t("coach.setPiecesDesc")}
          />
        </div>
      </Panel>

      {/* 顶级教练 */}
      <Panel className="p-4">
        <SectionTitle title={t("coach.topPerformer")} />
        <StatTile
          title={t("coach.topPerformerName")}
          value=analyticsData.topPerformer.name
          subtitle={t("coach.coachName")}
        />
        <StatTile
          title={t("coach.topPerformerWinRate")}
          value=`${analyticsData.topPerformer.winRate}%`
          subtitle={t("coach.winRate")}
          variant="primary"
        />
        <StatTile
          title={t("coach.topPerformerGoals")}
          value=`${analyticsData.topPerformer.avgGoals} ${t("coach.goalsPerGame")}`
          subtitle={t("coach.avgGoals")}
        />
      </Panel>
    </Panel>
  );
}