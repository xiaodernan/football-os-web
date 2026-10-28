import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerFiveYearPlan() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.fiveYearPlanTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForPlan")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 五年发展预测
  const fiveYearPlan = useMemo(() => {
    const plan = [];
    let currentOverall = p.overall;
    let yearsUntilPeak = p.age < 25 ? 25 - p.age : 1;

    for (let year = 1; year <= 5; year++) {
      const growthRate = 0.1 * Math.max(0.1, 1 - (p.age + year - 22) * 0.05);
      const incrementalOverall = Math.floor((p.potential - currentOverall) * growthRate);
      currentOverall = Math.min(currentOverall + incrementalOverall, p.potential);

      plan.push({
        year: year,
        projectedOverall: currentOverall,
        yearsToPeak: yearsUntilPeak - year + 1,
        developmentFocus:
          year <= 2 ? "技术基础" :
          year <= 4 ? "战术理解" :
          "经验与领导力",
      });
    }

    return plan;
  }, [p.overall, p.potential, p.age]);

  // 发展阶段
  const developmentStage = useMemo(() => {
    if (p.age < 20) return "青年提潜期";
    if (p.age >= 20 && p.age < 24) return "黄金发展期";
    if (p.age >= 24 && p.age < 28) return "巅峰期";
    return "经验丰富期";
  }, [p.age]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.fiveYearPlanTitle")} />

      {/* 发展概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("player.currentPosition")} />
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            <div className="text-muted-foreground">{p.position}</div>
          </div>
          <div className="mt-3">
            <div className="font-medium">{t("player.currentAge")}</div>
            <div className="text-muted-foreground">{p.age}岁</div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("player.fiveYearProjections")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.finalOverall")}</div>
              <div className="text-2xl font-bold text-primary">{fiveYearPlan[4].projectedOverall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.peakYear")}</div>
              <div className="text-muted-foreground">{fiveYearPlan[2].yearsToPeak}年后达到巅峰</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 五年发展路线图 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.developmentRoadmap")} />
        <div className="grid grid-cols-5 gap-2">
          {fiveYearPlan.map(stage => (
            <div key={stage.year} className={`border rounded p-1 text-center ${
              stage.year === 1 ? "bg-primary-100 text-primary" :
              stage.year === 3 ? "bg-warning-100 text-warning" :
              "bg-gray-100 text-gray-600"
            }`}
            >
              <div className="font-small">{t(`year.${stage.year}`)}</div>
              <div className="text-xs">{stage.developmentFocus}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 发展阶段 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.developmentStage")} />
        <div className="p-3 rounded ${
          developmentStage === "黄金发展期" ? "bg-green-50" :
          developmentStage === "巅峰期" ? "bg-blue-50" :
          "bg-purple-50"
        }">
          <div className="font-medium">{t(`stage.${developmentStage}`)}</div>
          <p className="text-sm text-muted-foreground mt-1">
            {t(`stageDesc.${developmentStage}`) || ""}
          </p>
        </div>
      </Panel>

      {/* 建议 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("player.recommendations")} />
        <p className="text-sm text-muted-foreground">
          {t("player.focusOn", { age: p.age, stage: developmentStage })}
        </p>
        <Button variant="outline" size="sm">
          {t("player.viewFullPlan")}
        </Button>
      </Panel>
    </Panel>
  );
}