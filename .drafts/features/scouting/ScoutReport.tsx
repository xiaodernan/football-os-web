import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ScoutReport() {
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
      value: p.marketValue,
      wage: p.wage,
      position: p.position
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scouting.scoutReportTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("scouting.selectPlayerToCompare")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {t("scouting.", { 0: p.name })[0]}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const p = playerData.find(p => p.id === selectedPlayer)!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scouting.scoutReportTitle")} />
      
      {/* 球员概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("scouting.overall")}
          value={p.overall.toLocaleString()}
          subtitle={t("scouting.rating")}
        />
        <StatTile
          title={t("scouting.potential")}
          value={p.potential.toLocaleString()}
          subtitle={t("scouting.ceiling")}
          variant="primary"
        />
        <StatTile
          title={t("scouting.age")}
          value={`${p.age} ${t("scouting.yearsOld")}`}
          subtitle={t("scouting.age")}
        />
        <StatTile
          title={t("scouting.marketValue")}
          value={`${t("currency.euro")} ${p.value.toLocaleString()}`}
          subtitle={t("scouting.value")}
        />
        <StatTile
          title={t("scouting.wage")}
          value={`${t("currency.euro")} ${p.wage.toLocaleString()}/w`}
          subtitle={t("scouting.wage")}
        />
        <StatTile
          title={t("scouting.position")}
          value={p.position}
          subtitle={t("scouting.position")}
        />
      </div>

      {/* 属性详情 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("scouting.attributes")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("scouting.overallBreakdown")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {/* 属性卡片将在这里渲染 */}
          <div />
          <div />
          <div />
        </div>
      </Panel>

      {/* 球探比较 */}
      <Panel className="p-4">
        <SectionTitle title={t("scouting.comparison")} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedPlayer(null)}
        >
          {t("scouting.selectAnother")}
        </Button>
      </Panel>
    </Panel>
  );
}