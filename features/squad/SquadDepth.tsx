import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SquadDepth() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const positions = useMemo(() => [
    "门将",
    "后卫",
    "中场",
    "前锋",
  ] as const);

  const positionPlayers = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
    }));
  }, [players]);

  const handleSelectPosition = (position: string) => {
    setSelectedPosition(position);
  };

  if (!selectedPosition) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("squadDepth.title") } />
        <p className="text-muted-foreground mb-4">
          {t("squadDepth.selectPosition")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {positions.map(pos => (
            <Button
              key={pos}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPosition(pos)}
            >
              {pos}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const positionPlayerData = useMemo(() => {
    return positionPlayers.filter(p => p.position === selectedPosition);
  }, [selectedPosition, positionPlayers]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("squadDepth.title") } />

      {/* 位置选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {positions.map(pos => (
          <Button
            key={pos}
            variant={selectedPosition === pos ? "primary" : "outline"}
            size="sm"
            onClick={() => handleSelectPosition(pos)}
          >
            {pos}
          </Button>
        ))
      </div>

      {/* 阵容深度 */}
      {selectedPosition && positionPlayerData.length > 0 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("squadDepth.squadDepth") } />
          <p className="text-sm text-muted-foreground mb-3">
            {t("squadDepth.playersAtPosition", { count: positionPlayerData.length })}</p>
          <div className="grid grid-cols-2 gap-3">
            {positionPlayerData.map(p => (
              <div key={p.id} className="border rounded p-2 text-center">
                <div className="font-medium text-primary">{p.overall}★</div>
                <div className="text-xs text-muted-foreground">{p.name}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 阵容统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("squadDepth.squadStats") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("squadDepth.totalPlayers")}</div>
            <div>{players.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("squadDepth.positions")}</div>
            <div>{positions.length}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("squadDepth.averageOverall", { average: (players.reduce((sum, p) => sum + p.overall, 0) / players.length).toFixed(1) })}</p>
        </div>
      </Panel>
    </Panel>
  );
}