import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryPrediction() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      position: p.position,
      overall: p.overall,
      matchesPlayed: Math.floor(Math.random() * 38) + 1,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injuryPrediction.title") } />
        <p className="text-muted-foreground mb-4">
          {t("injuryPrediction.selectPlayer")}
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

  // 预测模型数据
  const riskFactors = useMemo(() => ({
    ageRisk: Math.round((p.age - 22) * 2 + 50), // 年龄风险因子
    loadRisk: Math.round((p.matchesPlayed / 38) * 60), // 负荷风险因子
    historyRisk: Math.random() > 0.6 ? "无主要伤病历史" : "有轻微伤病历史",
    currentForm: p.overall > 75 ? "良好" : p.overall > 65 ? "一般" : "需要关注",
  }), [p.age, p.matchesPlayed, p.overall]);

  const predictedInjury = useMemo(() => ({
    riskLevel: riskFactors.ageRisk > 70 || riskFactors.loadRisk > 70 ? "高" : riskFactors.ageRisk > 50 || riskFactors.loadRisk > 50 ? "中" : "低",
    predictedDays: Math.floor(Math.random() * 30) + 1,
    daysUntilNextMatch: Math.floor(Math.random() * 10) + 1,
    recommendation: riskFactors.ageRisk > 70 || riskFactors.loadRisk > 70 ? "建议轮换休息" : "正常训练监测",
  }), [riskFactors]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryPrediction.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("injuryPrediction.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryPrediction.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryPrediction.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryPrediction.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("injuryPrediction.riskAssessment") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryPrediction.ageRisk")}</div>
              <div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-yellow-500"
                    style={{ width: riskFactors.ageRisk + "%" }}
                  >
                    <span className="text-yellow-600 text-xs ml-2">{riskFactors.ageRisk}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium">{t("injuryPrediction.loadRisk")}</div>
              <div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-yellow-500"
                    style={{ width: riskFactors.loadRisk + "%" }}
                  >
                    <span className="text-yellow-600 text-xs ml-2">{riskFactors.loadRisk}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 预测结果 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("injuryPrediction.predictedInjury") } />
        <div className={`p-3 rounded ${predictedInjury.riskLevel === "高" ? "bg-red-50" : predictedInjury.riskLevel === "中" ? "bg-yellow-50" : "bg-green-50"}`}>
          <div className="font-medium text-{riskLevel === "高" ? "text-red-600" : riskLevel === "中" ? "text-yellow-600" : "text-green-600"}">
            {t(`injuryPrediction.riskLevel.${riskLevel}`)}
          </div>
          <p>{t("injuryPrediction.predictedDays", { days: predictedInjury.predictedDays })}</p>
          <p>{t("injuryPrediction.recommendation")}</p>
        </div>
      </Panel>

      {/* 风险因素详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("injuryPrediction.riskFactors") } />
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("injuryPrediction.ageFactor", { age: p.age })}</li>
          <li>{t("injuryPrediction.matchLoad", { matches: p.matchesPlayed })}</li>
          <li>{t("injuryPrediction.form", { form: riskFactors.currentForm })}</li>
          <li>{t("injuryPrediction.history", { history: riskFactors.historyRisk })}</li>
        </ul>
      </Panel>

      {/* 下一场比赛建议 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("injuryPrediction.nextMatchAdvice") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("injuryPrediction.nextMatch", { days: predictedInjury.daysUntilNextMatch })}</p>
        <p>{t("injuryPrediction.trainingLoad", { load: riskFactors.loadRisk })}</p>
      </Panel>
    </Panel>
  );
}