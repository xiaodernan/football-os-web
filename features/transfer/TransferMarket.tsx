import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferMarket() {
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
      wage: p.wage,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferMarket.title") } />
        <p className="text-muted-foreground mb-4">
          {t("transferMarket.selectPlayer")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 8).map(p => (
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

  // 市场价值分析
  const marketAnalysis = useMemo(() => ({
    currentValue: p.marketValue,
    potentialValue: p.potential > p.overall ? Math.floor(p.marketValue * (p.potential / p.overall)) : p.marketValue,
    ageFactor: p.age < 25 ? "上升期" : p.age > 30 ? " declining" : "黄金期",
    valueTrend: p.age < 25 ? "上升" : p.age > 30 ? "下降" : "稳定",
  }), [p]);

  // 兼容性球队
  const compatibleClubs = useMemo(() => ([
    { id: "1", name: "曼城", league: "英超", budget: 200000000 },
    { id: "2", name: "皇家马德里", league: "西甲", budget: 150000000 },
    { id: "3", name: "巴塞罗那", league: "西甲", budget: 120000000 },
    { id: "4", name: "曼联", league: "英超", budget: 130000000 },
    { id: "5", name: "巴黎圣日耳曼", league: "法甲", budget: 180000000 },
  ] as const));

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferMarket.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("transferMarket.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferMarket.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferMarket.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("transferMarket.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("transferMarket.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("transferMarket.marketAnalysis") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferMarket.currentValue")}</div>
              <div className="text-2xl text-primary">{t("currency.euro")} {p.marketValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferMarket.potentialValue")}</div>
              <div className={marketAnalysis.potentialValue > p.marketValue ? "text-green-600" : "text-primary"}>
                {t("currency.euro")} {marketAnalysis.potentialValue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-medium">{t("transferMarket.ageFactor")}</div>
              <div className="text-sm font-medium ${marketAnalysis.ageFactor.includes("上升") ? "text-green-600" : marketAnalysis.ageFactor.includes("下降") ? "text-red-600" : "text-warning"}">
                {marketAnalysis.ageFactor}
              </div>
            </div>
            <div>
              <div className="font-medium">{t("transferMarket.valueTrend")}</div>
              <div className={marketAnalysis.valueTrend === "上升" ? "text-green-600" : marketAnalysis.valueTrend === "下降" ? "text-red-600" : "text-warning"}>
                {marketAnalysis.valueTrend}
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-100 rounded">
            <div className="font-medium">{t("transferMarket.wage")}</div>
            <div className="text-sm text-primary">{t("currency.euro")} {p.wage.toLocaleString()}/w</div>
          </div>
        </Panel>
      </div>

      {/* 意向球队 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferMarket.interestedClubs") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("transferMarket.compatibleClubs", { count: compatibleClubs.length }) }
        </p>
        <div className="grid grid-cols-2 gap-3">
          {compatibleClubs.map(club => (
            <Button
              key={club.id}
              variant={
                club.budget >= p.marketValue ? "primary" : club.budget >= p.marketValue * 0.5 ? "outline" : "ghost"
              }
              size="sm"
            >
              {club.name}
            </Button>
          ))}
        </div>
      </Panel>

      {/* 市场趋势概览 */}
      <Panel className="p-4">
        <SectionTitle title={t("transferMarket.marketTrend") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("transferMarket.under21")}</div>
            <div className="text-2xl font-bold text-green-600">{players.filter(p => p.age < 21).length}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferMarket.primeAge")}</div>
            <div className="text-2xl font-bold text-primary">{players.filter(p => p.age >= 22 && p.age <= 29).length}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferMarket.over32")}</div>
            <div className="text-2xl font-bold text-red-600">{players.filter(p => p.age > 32).length}</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}