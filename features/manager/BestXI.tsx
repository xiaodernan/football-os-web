import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function BestXI() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      position: p.position,
    }));
  }, [players]);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId].slice(0, 11); // 最多选11名首发
      }
    });
  };

  if (selectedPlayers.length < 11) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("manager.bestXiTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("manager.selectStartingXI")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleTogglePlayer(p.id)}
            >
              {p.name}
            </Button>
          ))
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("manager.selectElevenPlayers")}
        </p>
      </Panel>
    );
  }

  const selectedPlayerData = useMemo(() => {
    return playerData.filter(p => selectedPlayers.includes(p.id));
  }, [selectedPlayers, playerData]);

  // 根据位置和整体评分选择最佳阵容
  const formation = useMemo(() => {
    // 简单的 4-3-3 阵型
    return "4-3-3";
  }, []);

  const positions = useMemo(() => ({
    goalkeeper: selectedPlayerData.filter(p => p.position === "GK" || p.overall >= 85),
    defenders: selectedPlayerData.filter(p => p.position === "DF"),
    midfielders: selectedPlayerData.filter(p => p.position === "MF"),
    forwards: selectedPlayerData.filter(p => p.position === "FW"),
  }), [selectedPlayerData]);

  // 每个位置选出最高 overall 的球员
  const bestGoalkeeper = positions.goalkeeper.length > 0 ? 
    positions.goalkeeper.sort((a, b) => b.overall - a.overall)[0] : null;
  const bestDefenders = positions.defenders.sort((a, b) => b.overall - a.overall).slice(0, 4);
  const bestMidfielders = positions.midfielders.sort((a, b) => b.overall - a.overall).slice(0, 3);
  const bestForwards = positions.forwards.sort((a, b) => b.overall - a.overall).slice(0, 4);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.bestXiTitle")} />

      {/* 阵容概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("manager.selectedPlayers")} />
          <div className="grid grid-cols-3 gap-2">
            {selectedPlayers.map(id => {
              const p = playerData.find(pl => pl.id === id);
              return (
                <div key={id} className="border rounded p-2 text-center">
                  <div className="text-2xl font-bold text-primary">{p?.name?.[0] || ""}</div>
                  <div className="text-xs text-muted-foreground">{p?.name || ""}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("manager.formation")} />
          <div className="text-3xl font-bold formation-color">{formation}</div>
          <div className="text-sm text-muted-foreground mt-2">{t("manager.formationDescription")}</div>
        </Panel>
      </div>

      {/* 最佳阵容 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.bestStartingXI")} />
        
        {/* 门将 */}
        {bestGoalkeeper && (
          <div className="border rounded p-3 mb-3">
            <div className="font-medium text-primary">GK</div>
            <div className="text-2xl font-bold text-primary">{bestGoalkeeper.name}</div>
            <div className="text-primary">{bestGoalkeeper.overall}★</div>
          </div>
        )}

        {/* 后卫 */}
        {bestDefenders.map((d, i) => (
          <div key={i} className="border rounded p-2 mb-2">
            <div className="font-medium text-primary">DF</div>
            <div className="text-primary">{d.name}</div>
            <div className="text-primary">{d.overall}★</div>
          </div>
        ))}

        {/* 中场 */}
        {bestMidfielders.map((m, i) => (
          <div key={i} className="border rounded p-2 mb-2">
            <div className="font-medium text-primary">MF</div>
            <div className="text-primary">{m.name}</div>
            <div className="text-primary">{m.overall}★</div>
          </div>
        ))}

        {/* 前锋 */}
        {bestForwards.map((f, i) => (
          <div key={i} className="border rounded p-2 mb-2">
            <div className="font-medium text-primary">FW</div>
            <div className="text-primary">{f.name}</div>
            <div className="text-primary">{f.overall}★</div>
          </div>
        ))}
      </Panel>

      {/* 替补 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.substitutes")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("manager.remainingPlayers", { count: 11 - selectedPlayers.length })}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedPlayers([])}
        >
          {t("manager.resetSelection")}
        </Button>
      </Panel>
    </Panel>
  );
}