import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferValuation() {
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
        <SectionTitle title={t("transferValuation.title") } />
        <p className="text-muted-foreground mb-4">
          {t("transferValuation.selectPlayer")}
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

  // 估值计算模型
  const valuation = useMemo(() => ({
    baseValue: p.marketValue,
    ageFactor: p.age < 21 ? 1.3 : p.age > 30 ? 0.7 : 1.0,
    potentialFactor: p.potential > p.overall ? p.potential / p.overall : 1.0,
    positionFactor: p.position === "前锋" ? 1.1 : p.position === "门将" ? 0.9 : 1.0,
    contractFactor: p.contractExpiry ? (new Date(p.contractExpiry).getFullYear() - new Date().getFullYear()) / 5 : 1.0,
  }), [p.age, p.potential, p.overall, p.position, p.marketValue, p.contractExpiry]);

  const predictedValue = Math.round(valuation.baseValue * valuation.ageFactor * valuation.potentialFactor * valuation.positionFactor * valuation.contractFactor);

  const valueRange = useMemo(() => ({
    minimum: Math.round(predictedValue * 0.8),
    maximum: Math.round(predictedValue * 1.2),
    mostLikely: predictedValue,
  }), [predictedValue]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferValuation.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("transferValuation.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferValuation.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferValuation.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("transferValuation.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("transferValuation.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("transferValuation.valuationModel") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferValuation.baseValue")}</div>
              <div className="text-primary">{t("currency.euro")} {valuation.baseValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferValuation.ageAdjustment")}</div>
              <div className={valuation.ageFactor > 1 ? "text-success" : valuation.ageFactor < 1 ? "text-danger" : "text-primary"}>
                {valuation.ageFactor.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="font-medium">{t("transferValuation.potentialUpside")}</div>
              <div className={valuation.potentialFactor > 1 ? "text-success" : "text-primary"}>
                {valuation.potentialFactor.toFixed(2)}x
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="font-medium">{t("transferValuation.positionFactor")}</div>
              <div className={valuation.positionFactor > 1 ? "text-success" : "text-primary"}>
                {valuation.positionFactor.toFixed(2)}x
              </div>
            </div>
            <div>
              <div className="font-medium">{t("transferValuation.contractFactor")}</div>
              <div className={valuation.contractFactor > 1 ? "text-success" : valuation.contractFactor < 1 ? "text-danger" : "text-primary"}>
                {valuation.contractFactor.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 预测估值 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferValuation.predictedValue") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("transferValuation.mostLikely")}</div>
            <div className="text-3xl font-bold text-primary">{t("currency.euro")} {valueRange.mostLikely.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferValuation.minimum")}</div>
            <div className={valueRange.minimum < valuation.baseValue ? "text-success" : "text-warning"}>
              {t("currency.euro")} {valueRange.minimum.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-medium">{t("transferValuation.maximum")}</div>
            <div className={valueRange.maximum > valuation.baseValue ? "text-success" : "text-warning"}>
              {t("currency.euro")} {valueRange.maximum.toLocaleString()}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("transferValuation.factorsConsidered", { age: p.age, position: p.position }) }
        </p>
      </Panel>

      {/* 市场分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("transferValuation.marketAnalysis") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("transferValuation.compareAverage")}</div>
            <div className="text-primary">{t("currency.euro")} {Math.round(10000000).toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("transferValuationleagueAverage")}</div>
            <div className="text-info">{t("currency.euro")} {Math.round(8000000).toLocaleString()}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("transferValuation.playerRank", { rank: Math.floor(Math.random() * 500) + 1 })}
        </p>
      </Panel>
    </Panel>
  );
}