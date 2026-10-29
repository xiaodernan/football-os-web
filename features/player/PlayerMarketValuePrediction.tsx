import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerMarketValuePrediction() {
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
      marketValue: p.marketValue,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("marketValuePrediction.title") } />
        <p className="text-muted-foreground mb-4">
          {t("marketValuePrediction.selectPlayer")}
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

  // 预测模型参数
  const model = useMemo(() => ({
    ageFactor: p.age < 21 ? 1.3 : p.age > 30 ? 0.7 : 1.0,
    potentialFactor: p.potential > p.overall ? p.potential / p.overall : 1.0,
    performanceFactor: (p.overall + p.potential) / 2 / 100,
    consistencyFactor: 1 - Math.random() * 0.1, // 0.9 to 1.0
  }), [p.age, p.potential, p.overall]);

  // 预测价值
  const predictedValue = useMemo(() => {
    const base = p.marketValue * model.ageFactor * model.potentialFactor * model.performanceFactor * model.consistencyFactor;
    return Math.max(p.marketValue * 0.5, Math.min(p.marketValue * 3, Math.round(base)));
  }, [p.marketValue, model]);

  // 置信区间
  const confidenceInterval = useMemo(() => {
    const range = predictedValue * 0.2;
    return {
      lower: Math.max(p.marketValue * 0.5, predictedValue - range),
      upper: predictedValue + range,
    };
  }, [predictedValue]);

  // 预测时间范围
  const predictionHorizon = useMemo(() => {
    if (p.age < 22) return "12-24个月";
    if (p.age < 27) return "6-12个月";
    return "3-6个月";
  }, [p.age]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("marketValuePrediction.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("marketValuePrediction.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("marketValuePrediction.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("marketValuePrediction.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("marketValuePrediction.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("marketValuePrediction.currentValue") } />
          <div className="text-3xl font-bold text-primary">{t("currency.euro")} {p.marketValue.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground">{t("marketValuePrediction.current")}</div>
        </Panel>
      </div>

      {/* 预测结果 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("marketValuePrediction.predictedValue") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("marketValuePrediction.predicted")}</div>
            <div>{t("currency.euro")} {predictedValue.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">{t("marketValuePrediction.confidenceInterval")}</div>
            <div>{t("currency.euro")} {confidenceInterval.lower.toLocaleString()} - {t("currency.euro")} {confidenceInterval.upper.toLocaleString()}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("marketValuePrediction.horizon", { horizon: predictionHorizon })}</p>
      </Panel>

      {/* 预测因素 */}
      <Panel className="p-4">
        <SectionTitle title={t("marketValuePrediction.factors") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("marketValuePrediction.ageFactor")}</div>
            <div>{model.ageFactor > 1 ? `+${(model.ageFactor - 1 * 100).toFixed(0)}%` : `${(model.ageFactor * 100).toFixed(0)}%`}</div>
          </div>
          <div>
            <div className="font-medium">{t("marketValuePrediction.potentialFactor")}</div>
            <div>{model.potentialFactor > 1 ? `+${(model.potentialFactor - 1 * 100).toFixed(0)}%` : `${(model.potentialFactor * 100).toFixed(0)}%`}</div>
          </div>
        </div>
        <div>
          <div className="font-medium">{t("marketValuePrediction.consistencyFactor")}</div>
          <div>{(model.consistencyFactor * 100).toFixed(0)}% 稳定性</div>
        </div>
      </Panel>

      {/* 价值对比 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("marketValuePrediction.valueComparison") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("marketValuePrediction.compareWithBaseline", { baseline: t("currency.euro")} {p.marketValue.toLocaleString() })}</p>
        <p>{t("marketValuePrediction.predictedChange", { change: ((predictedValue - p.marketValue) / p.marketValue * 100).toFixed(1) }% )}</p>
      </Panel>
    </Panel>
  );
}