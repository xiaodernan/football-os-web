import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerValueRanking() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  // 排序：按市值降序
  const rankedPlayers = useMemo(() => {
    return [...players]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 20)
      .map((p, index) => ({
        rank: index + 1,
        name: p.name,
        overall: p.overall,
        potential: p.potential,
        age: p.age,
        position: p.position,
        marketValue: p.marketValue,
        wage: p.wage,
      }));
  }, [players]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerValueRanking.title") } />

      {/* 统计概览 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile
          title={t("playerValueRanking.totalPlayers")}
          value={players.length.toLocaleString()}
          subtitle={t("totalSquadSize")}
        />
        <StatTile
          title={t("playerValueRanking.top20TotalValue")}
          value={rankedPlayers.reduce((sum, p) => sum + p.marketValue, 0).toLocaleString()}
          subtitle={t("combinedMarketValue")}
        />
        <StatTile
          title={t("playerValueRanking.averageValue")}
          value=(rankedPlayers.reduce((sum, p) => sum + p.marketValue, 0) / rankedPlayers.length).toLocaleString()
          subtitle={t("averageMarketValue")}
        />
      </div>

      {/* 排名表格 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playerValueRanking.rankingTable") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerValueRanking.top20Players")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("playerValueRanking.rank")}</th>
                <th className="text-left p-3 border border-gray-200">{t("playerValueRanking.player")}</th>
                <th className="text-left p-3 border border-gray-200">{t("playerValueRanking.overall")}</th>
                <th className="text-left p-3 border border-gray-200">{t("playerValueRanking.age")}</th>
                <th className="text-left p-3 border border-gray-200">{t("playerValueRanking.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("playerValueRanking.marketValue")}</th>
              </tr>
            </thead>
            <tbody>
              {rankedPlayers.map(p => (
                <tr key={p.name} className="border-b">
                  <td className="p-3 font-medium text-primary">{p.rank}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.overall}★</td>
                  <td className="p-3">{p.age}岁</td>
                  <td className="p-3">{p.position}</td>
                  <td className="p-3">
                    {t("currency.euro")} {p.marketValue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("playerValueRanking.sortedByMarketValueDesc")}
        </p>
      </Panel>

      {/* 价值分布图 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerValueRanking.valueDistribution") } />
        <div className="grid grid-cols-2 gap-3">
          {/* 价值区间统计 */}
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("playerValueRanking.under50M")}</div>
            <div className="text-2xl font-bold ${rankedPlayers.filter(p => p.marketValue < 50000000).length >= 10 ? "text-green-600" : "text-warning"}">
              {rankedPlayers.filter(p => p.marketValue < 50000000).length}
            </div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("playerValueRanking.50mTo100M")}</div>
            <div className="text-2xl font-bold ${rankedPlayers.filter(p => p.marketValue >= 50000000 && p.marketValue < 100000000).length >= 5 ? "text-green-600" : "text-warning"}">
              {rankedPlayers.filter(p => p.marketValue >= 50000000 && p.marketValue < 100000000).length}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium text-sm text-muted-foreground">{t("playerValueRanking.over100M")}</div>
          <div className="text-2xl font-bold ${rankedPlayers.filter(p => p.marketValue >= 100000000).length >= 3 ? "text-green-600" : "text-warning"}">
            {rankedPlayers.filter(p => p.marketValue >= 100000000).length}
          </div>
        </div>
      </Panel>
    </Panel>
  );
}