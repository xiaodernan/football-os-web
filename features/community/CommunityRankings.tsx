import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function CommunityRankings() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedRanking, setSelectedRanking] = useState<string | null>(null);

  const rankings = useMemo(() => ({
    byOverall: [...players]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        overall: p.overall,
        team: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
      })),
    byMarketValue: [...players]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        value: t("currency.euro") + " " + p.marketValue.toLocaleString(),
        team: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
      })),
    byAge: [...players]
      .sort((a, b) => a.age - b.age)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        age: p.age,
        team: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
      })),
  }), [players]);

  const handleSelectRanking = (rankingType: string) => {
    setSelectedRanking(rankingType);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("communityRankings.title") } />

      {/* 排名类型选择 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Button
          variant={selectedRanking === "byOverall" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectRanking("byOverall")}
        >
          {t("communityRankings.byOverall")}
        </Button>
        <Button
          variant={selectedRanking === "byMarketValue" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectRanking("byMarketValue")}
        >
          {t("communityRankings.byMarketValue")}
        </Button>
        <Button
          variant={selectedRanking === "byAge" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectRanking("byAge")}
        >
          {t("communityRankings.byAge")}
        </Button>
      </div>

      {/* 排名展示 */}
      {selectedRanking && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("communityRankings.ranking", { type: selectedRanking })} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted-foreground">
              <thead>
                <tr>
                  <th className="text-left p-3 border border-gray-200">{t("communityRankings.rank")}</th>
                  <th className="text-left p-3 border border-gray-200">{t("communityRankings.player")}</th>
                  <th className="text-left p-3 border border-gray-200">{t("communityRankings.detail")}</th>
                </tr>
              </thead>
              <tbody>
                {rankings[selectedRanking].map(item => (
                  <tr key={item.name} className="border-b">
                    <td className="p-3 font-medium text-primary">{item.rank}</td>
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3">{item.overall ? t("communityRankings.overall", { value: item.overall }) : item.value || item.age}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* 统计概览 */}
      <Panel className="p-4">
        <SectionTitle title={t("communityRankings.statistics") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("communityRankings.totalPlayers")}</div>
            <div>{players.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("communityRankings.top10ByOverall")}</div>
            <div>{rankings.byOverall.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("communityRankings.top10ByValue")}</div>
            <div>{rankings.byMarketValue.length}</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}