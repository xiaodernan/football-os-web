import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferMarketAnalysis() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      points: c.points || 0,
      marketValue: c.marketValue || 0,
    }));
  }, [clubs]);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      marketValue: p.marketValue || 0,
    }));
  }, [players]);

  const sortedPlayers = useMemo(
    () => [...playerData].sort((a, b) => b.marketValue - a.marketValue),
    [playerData]
  );

  const [selectedView, setSelectedView] = useState<"topPlayers" "marketTrends" "clubSpending">("topPlayers");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const totalMarketValue = useMemo(
    () => playerData.reduce((sum, p) => sum + p.marketValue, 0),
    [playerData]
  );

  const totalTransferSpending = useMemo(() => {
    // Simulated transfer spending data
    return Math.floor(Math.random() * 200000000) + 50000000;
  }, [playerData.length]);

  const averagePlayerValue = useMemo(
    () => totalMarketValue / players.length,
    [totalMarketValue, players.length]
  );

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferMarketAnalysis.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferMarketAnalysis.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferMarketAnalysis.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedView === "topPlayers" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("topPlayers")}
        >
          {t("transferMarketAnalysis.topPlayers")}
        </Button>
        <Button
          variant={setSelectedView === "marketTrends" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("marketTrends")}
        >
          {t("transferMarketAnalysis.marketTrends")}
        </Button>
        <Button
          variant={setSelectedView === "clubSpending" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("clubSpending")}
        >
          {t("transferMarketAnalysis.clubSpending")}
        </Button>
      </div>

      {/* 顶级球员 */}
      {setSelectedView === "topPlayers" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferMarketAnalysis.topPlayers")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferMarketAnalysis.totalPlayers", { count: players.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedPlayers.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("transferMarketAnalysis.rank", { rank: sortedPlayers.indexOf(p) + 1 })}:
                {t("transferMarketAnalysis.{name}", { name: p.name })} - {t("currency.euro", { amount: p.marketValue })}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 市场趋势 */}
      {setSelectedView === "marketTrends" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferMarketAnalysis.marketTrends")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">联盟总市值</div>
              <div>{t("currency.euro", { amount: totalMarketValue })}</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均球员价值</div>
              <div>{t("currency.euro", { amount: averagePlayerValue })}</div>
            </div>
            <div>
              <div className="font-medium text-primary">赛季转会支出</div>
              <div>{t("currency.euro", { amount: totalTransferSpending })}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 俱乐部支出 */}
      {setSelectedView === "clubSpending" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("transferMarketAnalysis.clubSpending")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {clubData.map(c => (
              <li key={c.id} className="font-medium text-primary mb-1">
                {t("transferMarketAnalysis.{name}", { name: c.name })}:
                {t("currency.euro", { amount: c.marketValue })} 市值 -
                {t("currency.euro", { amount: c.wageBill })} 薪资帽</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferMarketAnalysis.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("transferMarketAnalysis.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("transferMarketAnalysis.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("transferMarketAnalysis.marketConcentration", {
            top10: sortedPlayers.slice(0, 10).reduce(
              (sum, p) => sum + p.marketValue,
              0
            ),
          })} 前10名球员市值占比</p>
        </p>
        <p>
          {t("transferMarketAnalysis.transferActivity", {
            count: Math.floor(Math.random() * 50) + 20,
          })} 本赛季转会次数</p>
        </p>
      </Panel>
    </Panel>
  );
}