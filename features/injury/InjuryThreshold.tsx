import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryThreshold() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      age: p.age,
      position: p.position,
      matchesPlayed: Math.floor(Math.random() * 38) + 1,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injuryThreshold.title") } />
        <p className="text-muted-foreground mb-4">
          {t("injuryThreshold.selectPlayer")}
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

  // 预警阈值配置
  const thresholds = useMemo(() => ({
    ageThreshold: 30, // 年龄超过30开始风险增加
    matchesThreshold: 25, // 超过25场比赛开始累积风险
    loadThreshold: 70, // 负荷超过70%开始风险
    ageFactor: Math.round((p.age - 22) * 2 + 50), // 年龄风险因子
    loadFactor: Math.round((p.matchesPlayed / 38) * 100), // 负荷因子
  }), [p.age, p.matchesPlayed]);

  const riskAssessment = useMemo(() => ({
    isHighRisk: thresholds.ageFactor > thresholds.ageThreshold || thresholds.loadFactor > thresholds.loadThreshold,
    riskLevel: thresholds.ageFactor > thresholds.ageThreshold && thresholds.loadFactor > thresholds.loadThreshold ? "极高" : thresholds.ageFactor > thresholds.ageThreshold || thresholds.loadFactor > thresholds.loadThreshold ? "高" : "低",
    warningSigns: [
      thresholds.ageFactor > thresholds.ageThreshold ? "老化风险" : "",
      thresholds.loadFactor > thresholds.loadThreshold ? "高负荷风险" : "",
    ].filter(Boolean),
  }), [thresholds]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryThreshold.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("injuryThreshold.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryThreshold.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryThreshold.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryThreshold.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("injuryThreshold.riskThresholds") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryThreshold.ageThreshold")}</div>
              <div>{thresholds.ageThreshold}岁</div>
              <div>{t("injuryThreshold.ageFactor", { factor: thresholds.ageFactor })}</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryThreshold.matchesThreshold")}</div>
              <div>{thresholds.matchesThreshold}场</div>
              <div>{t("injuryThreshold.loadFactor", { factor: thresholds.loadFactor })}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 风险评估 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("injuryThreshold.riskAssessment") } />
        <div className={`p-3 rounded ${riskAssessment.riskLevel === "极高" ? "bg-red-50" : riskAssessment.riskLevel === "高" ? "bg-orange-50" : "bg-green-50"}`}>
          <div className="font-medium text-{riskLevel === "极高" ? "text-red-600" : riskLevel === "高" ? "text-orange-600" : "text-green-600"}">
            {t(`injuryThreshold.riskLevel.${riskAssessment.riskLevel}`)}
          </div>
          <p>{t("injuryThreshold.riskStatus", { ageFactor: thresholds.ageFactor, loadFactor: thresholds.loadFactor })}</p>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("injuryThreshold.warningSigns", { signs: riskAssessment.warningSigns.join(", ") })}</p>
        </p>
      </Panel>

      {/* 预警建议 */}
      <Panel className="p-4">
        <SectionTitle title={t("injuryThreshold.thresholdSuggestions") } />
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          {riskAssessment.warningSigns.length > 0 && (
            <li>{t("injuryThreshold.considerRest", { player: p.name })}</li>
          )}
          {thresholds.ageFactor > thresholds.ageThreshold && (
            <li>{t("injuryThreshold.monitorLoad", { player: p.name })}</li>
          )}
          {thresholds.loadFactor > thresholds.loadThreshold && (
            <li>{t("injuryThreshold.reduceTraining", { player: p.name })}</li>
          )}
          <li>{t("injuryThreshold.regularMonitoring")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}