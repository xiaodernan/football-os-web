import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferPredictionEngine() {
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
      contractYear: p.contractYear || 0,
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"prediction" | "market">("prediction");

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  const p = playerData.find(pl => pl.id === selectedPlayer);

  // 预测模型参数
  const model = useMemo(() => ({
    ageFactor: p.age < 21 ? 1.3 : p.age > 30 ? 0.7 : 1.0,
    potentialFactor: p.potential / (p.overall > 0 ? p.overall : 1),
    formFactor: 1 - Math.random() * 0.1,
    clubNeedFactor: Math.random() * 0.2 + 0.9,
  }), [p.age, p.potential, p.overall]);

  // 预测价值
  const predictedValue = useMemo(() => {
    if (!p) return 0;
    const base = p.marketValue * model.ageFactor * model.potentialFactor * model.formFactor;
    return Math.max(p.marketValue * 0.5, Math.min(p.marketValue * 3, Math.round(base)));
  }, [p.marketValue, model]);

  // 置信区间
  const confidenceInterval = useMemo(() => {
    if (!p) return { lower: 0, upper: 0 };
    const range = predictedValue * 0.2;
    return { lower: Math.max(p.marketValue * 0.5, predictedValue - range), upper: predictedValue + range };
  }, [predictedValue, p.marketValue]);

  // 预测时间范围
  const predictionHorizon = useMemo(() => {
    if (!p) return "6-12个月";
    if (p.age < 22) return "12-24个月";
    if (p.age < 27) return "6-12个月";
    return "3-6个月";
  }, [p.age]);

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferPredictionEngine.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferPredictionEngine.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferPredictionEngine.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "prediction" ? "primary" : "outline"}
          size="sm"
          onClick={() => setSelectedView("prediction")}
        >
          {t("transferPredictionEngine.prediction")}
        </Button>
        <Button
          variant={setSelectedView === "market" ? "primary" : "outline"}
          size="sm"
          onClick={() => setSelectedView("market")}
        >
          {t("transferPredictionEngine.marketAnalysis")}
        </Button>
      </div>

      {/* 预测结果 */}
      {setSelectedView === "prediction" && p && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferPredictionEngine.predictedValue")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("currency.euro")} 当前身价</div>
              <div className="text-3xl text-primary">{t("currency.euro")} {p.marketValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferPredictionEngine.predicted")}</div>
              <div className="text-3xl text-success">{t("currency.euro")} {predictedValue.toLocaleString()}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {t("transferPredictionEngine.horizon", { horizon: predictionHorizon })}</p>
          <p>{t("transferPredictionEngine.confidence", { lower: t("currency.euro")} {confidenceInterval.lower.toLocaleString()}, upper: t("currency.euro")} {confidenceInterval.upper.toLocaleString() })}</p>
        </Panel>
      )}

      {/* 市场分析 */}
      {setSelectedView === "market" && p && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferPredictionEngine.marketAnalysis")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferPredictionEngine.ageFactor")}</div>
              <div>{model.ageFactor > 1 ? `+${((model.ageFactor - 1) * 100).toFixed(0)}%` : `${(model.ageFactor * 100).toFixed(0)}%`}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferPredictionEngine.potentialFactor")}</div>
              <div>{model.potentialFactor > 1 ? `+${((model.potentialFactor - 1) * 100).toFixed(0)}%` : `${(model.potentialFactor * 100).toFixed(0)}%`}</div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("transferPredictionEngine.formFactor")}</div>
            <div>{(model.formFactor * 100).toFixed(0)}% 状态系数</div>
          </div>
        </Panel>
      )}

      {/* 球员详情 */}
      {selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("transferPredictionEngine.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("transferPredictionEngine.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("transferPredictionEngine.age")}</div>
              <div>{player.age}岁</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferPredictionEngine.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferPredictionEngine.potential")}</div>
            <div className="text-3xl text-success">{player.potential}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferPredictionEngine.position")}</div>
            <div>{player.position}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("transferPredictionEngine.marketValue")}</div>
            <div>{t("currency.euro")} {player.marketValue.toLocaleString()}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferPredictionEngine.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("transferPredictionEngine.totalPlayers", { count: players.length })} 名球员</p>
        <p>{t("transferPredictionEngine.avgMarketValue", { avg: (players.reduce((sum, p) => sum + p.marketValue, 0) / players.length).toFixed(0) })} 平均身价</p>
        <p>{t("transferPredictionEngine.mostValuable", { player: players.sort((a, b) => b.marketValue - a.marketValue)[0]?.name || '' })}</p>
      </Panel>
    </Panel>
  );
}