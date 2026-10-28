import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerDataScreen() {
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
        <SectionTitle title={t("player.dataScreenTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerForScreen")}
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

  // 数据可视化指标
  const metrics = useMemo(() => ({
    overall: p.overall,
    potential: p.potential,
    age: p.age,
    marketValue: p.marketValue,
    wageEstimate: Math.floor(p.marketValue * 0.001),
  }), [p]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.dataScreenTitle")} />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("player.playerMetrics")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.potential")}</div>
              <div className="text-3xl font-bold text-green-600">{p.potential}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("player.marketValue")}</div>
              <div className="text-info">{t("currency.euro")} ${p.marketValue.toLocaleString()}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("player.valueAnalysis")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.wageEstimate")}</div>
              <div className="text-primary">${metrics.wageEstimate.toLocaleString()}/w</div>
            </div>
            <div>
              <div className="font-medium">{t("player.potentialGap")}</div>
              <div className={metrics.potential > metrics.overall ? "text-green-600" : "text-red-600"}
                font-medium>
                {metrics.potential > metrics.overall ? `+${metrics.potential - metrics.overall}` : `${metrics.potential - metrics.overall}`}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 数据概览 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.dataOverview")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("player.overall")}</div>
            <div className="text-2xl font-bold text-primary">{p.overall}★</div>
          </div>
          <div>
            <div className="font-medium">{t("player.potential")}</div>
            <div className="text-2xl font-bold text-green-600">{p.potential}★</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("player.age")}</div>
            <div className="text-muted-foreground">{p.age}岁</div>
          </div>
          <div>
            <div className="font-medium">{t("player.position")}</div>
            <div className="text-muted-foreground">{p.position}</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}