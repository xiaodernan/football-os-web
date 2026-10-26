import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerValueRanking() {
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
      marketValue: p.marketValue,
    }));
  }, [players]);

  // 按市值排序
  const rankedPlayers = useMemo(() => {
    return [...playerData].sort((a, b) => b.marketValue - a.marketValue);
  }, [playerData]);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
  };

  if (!selectedPlayerId) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.rankingTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectPlayerToViewRanking")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {rankedPlayers.slice(0, 10).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {t("player.", { 0: p.name })[0]}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayerId)!;
  const rank = rankedPlayers.findIndex(pl => pl.id === p.id) + 1;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.rankingTitle")} />
      
      {/* 排名概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("player.rank")}
          value=rank.toString()
          subtitle={t("player.position")}
        />
        <StatTile
          title={t("player.marketValue")}
          value=`${t("currency.euro")} ${p.marketValue.toLocaleString()}`
          subtitle={t("player.marketValue")}
        />
        <StatTile
          title={t("player.overall")}
          value=p.overall.toString()
          subtitle={t("player.overallRating")}
        />
        <StatTile
          title={t("player.age")}
          value=`${p.age}`
          subtitle={t("player.yearsOld")}
        />
      </div>

      {/* 排名详情 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("player.rankDetails")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("player.rankInSeason", { rank: rank, total: rankedPlayers.length })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("player.marketValueGrowthDesc", { value: p.marketValue })}
        </p>
      </Panel>

      {/* 选换球员 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.selectAnotherPlayer")} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedPlayerId(null)}
        >
          {t("player.selectAnotherPlayer")}
        </Button>
      </Panel>
    </Panel>
  );
}