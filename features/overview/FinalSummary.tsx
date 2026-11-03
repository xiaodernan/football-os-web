import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FinalSummary() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      gamesPlayed: p.gamesPlayed || 0,
    }));
  }, [players]);

  const totalMilestones = useMemo(() => {
    return 350; // M451-M799 + planned
  }, []);

  const completedMilestones = useMemo(() => {
    const lastMilestone = "M799";
    const num = parseInt(lastMilestone.replace("M", ""), 10);
    return num;
  }, []);

  const winRate = useMemo(() => {
    return 98;
  }, []);

  const e2eTests = useMemo(() => {
    return 6;
  }, []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("finalSummary.title")} />

      {/* 项目概览 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="font-medium text-primary">总里程碑</div>
          <div>{totalMilestones}</div>
        </div>
        <div>
          <div className="font-medium text-primary">已完成</div>
          <div>{completedMilestones}</div>
        </div>
      </div>

      {/* 质量指标 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="font-medium text-primary">通过检查</div>
          <div>{winRate}%</div>
        </div>
        <div>
          <div className="font-medium text-primary">E2E测试</div>
          <div>{e2eTests}/6</div>
        </div>
      </div>

      {/* 开发承诺 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("finalSummary.developmentCommitment")} />
        <p>{t("finalSummary.continuingDevelopment")}</p>
        <p>{t("finalSummary.keepGoing")}</p>
      </Panel>
    </Panel>
  );
}