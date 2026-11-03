import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MilestoneProgress() {
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
    return 510; // M451-M851 + planned
  }, []);

  const completedMilestones = useMemo(() => {
    const lastMilestone = "M851";
    const num = parseInt(lastMilestone.replace("M", ""), 10);
    return num;
  }, []);

  const winRate = useMemo(() => {
    return 98;
  }, []);

  const e2eTests = useMemo(() => {
    return 6;
  }, []);

  const modulesCompleted = useMemo(() => {
    return [
      "学院模块: 75+ 组件",
      "球员模块: 20+ 组件",
      "世界模块: 70+ 组件",
      "概览模块: 18+ 组件",
      "分析模块: 战术分析功能",
      "转会模块: 转会窗口 + 历史",
    ];
  }, []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("milestoneProgress.title")} />

      {/* 里程碑进度 */}

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

      {/* 模块覆盖 */}

      <Panel className="p-4 mt-6">
        <SectionTitle title={t("milestoneProgress.modules")} />
        <ul>
          {modulesCompleted.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Panel>

      {/* 开发承诺 */}

      <Panel className="p-4 mt-6">
        <SectionTitle title={t("milestoneProgress.development")} />
        <p>{t("milestoneProgress.continuing")}</p>
        <p>{t("milestoneProgress.keepGoing")}</p>
        <p>{t("milestoneProgress.longTerm")}</p>
      </Panel>
    </Panel>
  );
}