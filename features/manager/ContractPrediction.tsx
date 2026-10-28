import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ContractPrediction() {
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
      contractExpiry: p.contractExpiry,
      wage: p.wage,
      marketValue: p.marketValue,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("contractPrediction.title") } />
        <p className="text-muted-foreground mb-4">
          {t("contractPrediction.selectPlayer")}
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
          ))}
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 合同预测计算
  const yearsUntilExpiry = useMemo(() => {
    const today = new Date();
    const expiryDate = new Date(p.contractExpiry);
    const diffTime = Math.max(0, expiryDate.getTime() - today.getTime());
    const diffYears = Math.round(diffTime / (1000 * 60 * 60 * 24 * 365));
    return diffYears <= 5 ? diffYears : 0;
  }, [p.contractExpiry]);

  const renewalProbability = useMemo(() => {
    // 基于年龄、当前薪资、市场价值和合同剩余时间计算
    const ageFactor = Math.max(0.1, 1 - (p.age - 24) * 0.05);
    const valueFactor = p.marketValue > 0 ? Math.min(1, p.marketValue / 50000000) : 0.5;
    const contractFactor = yearsUntilExpiry / 5;
    const baseProbability = ageFactor * 0.4 + valueFactor * 0.3 + contractFactor * 0.3;
    return Math.round(Math.max(0, Math.min(1, baseProbability)) * 100);
  }, [p.age, p.marketValue, yearsUntilExpiry]);

  const predictedRenewalYear = useMemo(() => {
    if (yearsUntilExpiry <= 0) return new Date().getFullYear();
    const today = new Date();
    return new Date(today.getFullYear() + yearsUntilExpiry, today.getMonth(), today.getDate());
  }, [yearsUntilExpiry]);

  const salaryIncreaseRate = useMemo(() => {
    // 基于潜能值和当前整体评分预测薪资增长
    const potentialRatio = p.potential > 0 ? p.overall / p.potential : 1;
    return Math.round(100 * (1 - potentialRatio * 0.8)) / 100;
  }, [p.overall, p.potential]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("contractPrediction.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("contractPrediction.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("contractPrediction.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("contractPrediction.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("contractPrediction.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("contractPrediction.contractExpiry")}</div>
              <div className={`${p.contractExpiry ? "" : "text-danger"} font-medium}`}>
                {p.contractExpiry || t("contractPrediction.unknown")}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("contractPrediction.contractInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("contractPrediction.yearsRemaining")}</div>
              <div className="text-2xl font-bold ${yearsUntilExpiry > 0 ? "text-primary" : "text-danger"}">
                {yearsUntilExpiry}{t("contractPrediction.years")}
              </div>
            </div>
            <div>
              <div className="font-medium">{t("contractPrediction.renewalProbability")}</div>
              <div className={renewalProbability >= 70 ? "text-green-600" : renewalProbability >= 40 ? "text-warning" : "text-danger"}>
                {renewalProbability}%
              </div>
            </div>
            <div>
              <div className="font-medium">{t("contractPrediction.predictedRenewal")}</div>
              <div className="text-muted-foreground">{t("contractPrediction.year", { year: predictedRenewalYear.getFullYear() })}</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-100 rounded">
            <div className="font-medium">{t("contractPrediction.salaryTrend")}</div>
            <div className="text-sm text-muted-foreground">
              {t("contractPrediction.annualChange", { rate: (salaryIncreaseRate * 100).toFixed(1) }%)}
            </div>
          </div>
        </Panel>
      </div>

      {/* 预测分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("contractPrediction.predictionAnalysis") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("contractPrediction.riskLevel")}</div>
            <div className={renewalProbability >= 70 ? "text-green-600" : renewalProbability >= 40 ? "text-warning" : "text-danger"}>
              {t(`risk.${renewalProbability >= 70 ? "low" : renewalProbability >= 40 ? "medium" : "high"}`)}
            </div>
          </div>
          <div>
            <div className="font-medium">{t("contractPrediction.confidence")}</div>
            <div className="text-sm text-muted-foreground">
              {t(`confidence.${Math.round(renewalProbability / 20)}of5`)}
            </div>
          </div>
        </div>
      </Panel>

      {/* 建议 */}
      {renewalProbability >= 70 && (
        <Panel className="p-4 mb-6 bg-green-50">
          <SectionTitle title={t("contractPrediction.positiveOutlook") } />
          <p>{t("contractPrediction.highProbabilityRenew", { player: p.name, year: predictedRenewalYear.getFullYear() })}</p>
        </Panel>
      )}

      {renewalProbability >= 40 && renewalProbability < 70 && (
        <Panel className="p-4 mb-6 bg-yellow-50">
          <SectionTitle title={t("contractPrediction.moderateOutlook") } />
          <p>{t("contractPrediction.mediumProbabilityRenew", { player: p.name })}</p>
        </Panel>
      )}

      {renewalProbability < 40 && (
        <Panel className="p-4 mb-6 bg-red-50">
          <SectionTitle title={t("contractPrediction.negativeOutlook") } />
          <p>{t("contractPrediction.lowProbabilityRenew", { player: p.name })}</p>
        </Panel>
      )}
    </Panel>
  );
}