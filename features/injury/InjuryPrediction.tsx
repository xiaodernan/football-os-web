import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InjuryPrediction() {
  const { t } = useI18n();

  // 模拟伤病预测数据
  const injuryRisks = useMemo(() => [
    { playerName: "John Smith", riskLevel: "High", riskFactors: ["High training load", "Previous hamstring injury"], predictedDaysOut: 21 },
    { playerName: "Maria Garcia", riskLevel: "Medium", riskFactors: ["Moderate training load"], predictedDaysOut: 14 },
    { playerName: "Tom Brown", riskLevel: "Low", riskFactors: ["Low training load"], predictedDaysOut: 7 },
  ], []);

  const riskLevels = useMemo(() => {
    const map: Record<string, string> = {};
    injuryRisks.forEach(item => {
      map[item.riskLevel] = (map[item.riskLevel] || 0) + 1;
    });
    return map;
  }, []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injury.injuryPredictionTitle")} />
      
      {/* 风险概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("injury.totalPlayers")}
          value=injuryRisks.length.toString()
          subtitle={t("injury.players")}
        />
        <StatTile
          title={t("injury.riskDistribution")}
          value=Object.keys(riskLevels).length > 0 ? Object.keys(riskLevels).length : "0"
          subtitle={t("injury.riskTypes")}
        />
      </div>

      {/* 风险球员列表 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("injury.highRiskPlayers")} />
        {injuryRisks.filter(r => r.riskLevel === "High").map(player => (
          <div
            key=player.playerName
            className="border rounded p-3 mb-2"
            style={{ borderColor: "red" }}
          >
            <div className="font-medium">{player.playerName}</div>
            <div className="text-red-600 text-sm">{t("injury.riskLevelHigh")}</div>
            <div className="text-xs text-red-500 mt-1">{t("injury.riskFactors", { factors: player.riskFactors.join(", ") })}</div>
            <div className="text-right text-red-500 mt-1">{t("injury.predictedDaysOut", { days: player.predictedDaysOut })}</div>
          </div>
        ))}
      </Panel>

      {/* 中风险球员 */}
      <Panel className="p-4">
        <SectionTitle title={t("injury.mediumRiskPlayers")} />
        {injuryRisks.filter(r => r.riskLevel === "Medium").map(player => (
          <div
            key=player.playerName
            className="border rounded p-3 mb-2"
            style={{ borderColor: "orange" }}
          >
            <div className="font-medium">{player.playerName}</div>
            <div className="text-orange-600 text-sm">{t("injury.riskLevelMedium")}</div>
            <div className="text-xs text-orange-500 mt-1">{t("injury.riskFactors", { factors: player.riskFactors.join(", ") })}</div>
            <div className="text-right text-orange-500 mt-1">{t("injury.predictedDaysOut", { days: player.predictedDaysOut })}</div>
          </div>
        ))
      </Panel>

      {/* 低风险球员 */}
      <Panel className="p-4">
        <SectionTitle title={t("injury.lowRiskPlayers")} />
        {injuryRisks.filter(r => r.riskLevel === "Low").map(player => (
          <div
            key=player.playerName
            className="border rounded p-3 mb-2"
            style={{ borderColor: "green" }}
          >
            <div className="font-medium">{player.playerName}</div>
            <div className="text-green-600 text-sm">{t("injury.riskLevelLow")}</div>
            <div className="text-xs text-green-500 mt-1">{t("injury.riskFactors", { factors: player.riskFactors.join(", ") })}</div>
            <div className="text-right text-green-500 mt-1">{t("injury.predictedDaysOut", { days: player.predictedDaysOut })}</div>
          </div>
        ))
      </Panel>
    </Panel>
  );
}