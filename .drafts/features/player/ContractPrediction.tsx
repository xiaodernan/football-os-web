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
      contractYear: p.contractYear,
      currentValue: p.marketValue,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.contractPredictionTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForContractPrediction")}
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

  // 预测合同续约概率：基于年龄、潜能、当前评分的综合评估
  const renewalProbability = Math.round(
    100 * (1 - Math.abs(p.potential - p.overall) / 100) * Math.pow(0.98, p.age - 22)
  );

  // 预测续约年份
  const yearsUntilExpiry = p.contractYear - new Date().getFullYear();
  const predictedRenewalYear = yearsUntilExpiry > 0 ? new Date().getFullYear() + yearsUntilExpiry : new Date().getFullYear();

  // 续约谈判筹码
  const negotiationLeverage = renewalProbability > 70 ? "strong" : renewalProbability > 40 ? "moderate" : "weak";

  const probabilityClass = renewalProbability > 70 ? "primary" : renewalProbability > 40 ? "warning" : "destructive";

  const renewalTiming =
    yearsUntilExpiry > 3 ? t("player.renewalLongTerm")
    : yearsUntilExpiry > 1 ? t("player.renewalMediumTerm")
    : yearsUntilExpiry > 0 ? t("player.renewalImmediate")
    : t("player.renewalShortTerm");

  if (yearsUntilExpiry > 3) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.contractPredictionTitle")} />

        {/* 续约概率概览 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatTile
            title={t("player.renewalProbability")}
            value={`${renewalProbability}%`}
            subtitle={t("player.renewalChance")}
            variant={probabilityClass}
          />
          <StatTile
            title={t("player.contractYearsRemaining")}
            value={`${yearsUntilExpiry}年`}
            subtitle={t("player.contractYears")}
          />
          <StatTile
            title={t("player.negotiationLeverage")}
            value={t(`player.leverage.${negotiationLeverage}`)}
            subtitle={t("player.negotiationDesc")}
          />
        </div>

        {/* 预测续约时间 */}
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("player.predictedRenewalTime")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("player.renewalTiming", { timing: renewalTiming })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("player.predictedRenewalYear", { year: predictedRenewalYear })}\n
          </p>
        </Panel>

        {/* 影响因素 */}
        <Panel className="p-4">
          <SectionTitle title={t("player.factorsInfluence")} />
          <p className="text-sm text-muted-foreground">
            {t("player.basedOnAgePotentialForm", {
              age: p.age,
              potential: p.potential,
              overall: p.overall,
            })}
          </p>
          <p className="text-xs text-secondary">
            {t("player.contractTerms", {
              currentValue: `${t("currency.euro")} ${p.currentValue.toLocaleString()}`,
            })}
          </p>
        </Panel>
      </Panel>
    );
  }

  if (yearsUntilExpiry === 1) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.contractPredictionTitle")} />

        {/* 关键年度提醒 */}
        <Panel className="p-4 mb-6" style={{ borderColor: "orange" }}>
          <SectionTitle title={t("player.contractExpiringNextSeason")} />
          <p className="text-orange-600 mb-3">
            {t("player.contractExpiresThisSeason")}
          </p>
          <p className="text-sm text-orange-500">
            {t("player.urgentRenewalRequired")}
          </p>
        </Panel>

        {/* 预测概览 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatTile
            title={t("player.renewalProbability")}
            value={`${renewalProbability}%`}
            subtitle={t("player.renewalChance")}
            variant={probabilityClass}
          />
          <StatTile
            title={t("player.contractStatus")}
            value={t("player.expiringSoon")}
            subtitle={t("player.oneSeasonLeft")}
          />
        </div>

        {/* 建议操作 */}
        <Panel className="p-4">
          <SectionTitle title={t("player.recommendedAction")} />
          <Button variant="outline" size="sm">
            {t("player.initiateContractTalk")}
          </Button>
          <Button variant="destructive" size="sm">
            {t("player.listForTransfer")}
          </Button>
        </Panel>
      </Panel>
    );
  }

  // 合同正常状态
  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.contractPredictionTitle")} />

      {/* 合同状态概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.contractYearsRemaining")}
          value={`${yearsUntilExpiry}年`}
          subtitle={t("player.contractYears")}
        />
        <StatTile
          title={t("player.renewalProbability")}
          value={`${renewalProbability}%`}
          subtitle={t("player.renewalChance")}
          variant={probabilityClass}
        />
        <StatTile
          title={t("player.negotiationLeverage")}
          value={t(`player.leverage.${negotiationLeverage}`)}
          subtitle={t("player.negotiationDesc")}
        />
      </div>

      {/* 预测续约时间 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.predictedRenewalTime")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.renewalTiming", { timing: renewalTiming })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("player.predictedRenewalYear", { year: predictedRenewalYear })}
        </p>
      </Panel>

      {/* 影响因素 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.factorsInfluence")} />
        <p className="text-sm text-muted-foreground">
          {t("player.basedOnAgePotentialForm", {
            age: p.age,
            potential: p.potential,
            overall: p.overall,
          })}
        </p>
        <p className="text-xs text-secondary">
          {t("player.contractTerms", {
            currentValue: `${t("currency.euro")} ${p.currentValue.toLocaleString()}`,
          })}
        </p>
      </Panel>
    </Panel>
  );
}