import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerDevelopmentAssessment() {
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
        <SectionTitle title={t("player.devAssessmentTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForAssessment")}
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

  // 发展评估数据
  const projectedGrowth = useMemo(() => {
    const growth = (p.potential - p.overall) * 0.1;
    return {
      overallProjected: Math.min(p.overall + Math.floor(growth), p.potential),
      potentialProjected: p.potential,
      yearsUntilPeak: p.age < 25 ? 25 - p.age : 1,
      expectedIncrementalOverall: Math.floor((p.potential - p.overall) * (1 - (p.age - 22) * 0.05)),
    };
  }, [p.overall, p.potential, p.age]);

  // 发展阶段
  const developmentStage = useMemo(() => {
    if (p.age < 20 && p.overall < 70) return "青年提潜";
    if (p.age >= 20 && p.age < 24 && p.overall >= 70) return "黄金发展期";
    if (p.age >= 24 && p.age < 28 && p.overall >= 80) return "巅峰期";
    if (p.age >= 28) return "经验丰富";
    return "需评估";
  }, [p.age, p.overall]);

  // 强项与改进
  const strengths = useMemo(() => {
    const strengths: string[] = [];
    if (p.overall >= 80) strengths.push(t("strength.technical"));
    if (p.potential >= 85) strengths.push(t("strength.mental"));
    if (p.age < 23) strengths.push(t("strength.youth"));
    return strengths;
  }, [p.overall, p.potential, p.age]);

  const improvementAreas = useMemo(() => {
    const areas: string[] = [];
    if (p.overall < 75) areas.push(t("improvement.technical"));
    if (p.age > 25) areas.push(t("improvement.physical"));
    if (p.cards && p.cards > 5) areas.push(t("improvement.discipline"));
    return areas;
  }, [p.overall, p.age]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.devAssessmentTitle")} />

      {/* 发展概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("player.currentStats")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.potential")}</div>
              <div className="text-3xl font-bold text-green-600">{p.potential}★</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="font-medium">{t("player.age")}</div>
            <div className="text-muted-foreground">{p.age}岁</div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("player.projectedGrowth")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.projectedOverall")}</div>
              <div className="text-2xl font-bold text-primary">{projectedGrowth.overallProjected}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.yearsUntilPeak")}</div>
              <div className="text-muted-foreground">{projectedGrowth.yearsUntilPeak}年</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-info/10 rounded">
            <div className="font-medium">{t("player.expectedIncremental")}</div>
            <div className="text-info">{projectedGrowth.expectedIncrementalOverall}★</div>
          </div>
        </Panel>
      </div>

      {/* 发展阶段 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.developmentStage")} />
        <div className="p-3 rounded ${
          ["青年提潜", "黄金发展期"].includes(developmentStage) ? "bg-green-50" : "bg-blue-50"
        }">
          <div className="font-medium">{t(`stage.${developmentStage}`)}</div>
          <p className="text-sm text-muted-foreground mt-1">
            {t(`stageDesc.${developmentStage}`) || ""}
          </p>
        </div>
      </Panel>

      {/* 强项与改进 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.strengthsAndAreas")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-primary">{t("player.strongItems")}</div>
            <ul className="text-sm text-primary mt-1">
              {strengths.map(s => (
                <li key={s} className="mb-1">
                  {t(`strength.${s}`)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-medium text-warning">{t("player.improvementAreas")}</div>
            <ul className="text-sm text-warning mt-1">
              {improvementAreas.map(a => (
                <li key={a} className="mb-1">
                  {t(`improvement.${a}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {/* 建议 */}
      {improvementAreas.length > 0 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("player.developmentSuggestions")} />
          <p className="text-sm text-warning">
            {t("player.focusOn", { areas: improvementAreas.join("、") })}
          </p>
          <Button variant="outline" size="sm">
            {t("player.viewDevelopmentPlan")}
          </Button>
        </Panel>
      )}
    </Panel>
  );
}