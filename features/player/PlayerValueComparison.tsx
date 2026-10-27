import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerValueComparison() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

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

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId].slice(0, 4); // 最多选4名进行比较
      }
    });
  };

  if (selectedPlayers.length < 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("player.valueComparisonTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("player.selectAtLeastTwoPlayers")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
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
          {t("player.maxFourPlayers")}
        </p>
      </Panel>
    );
  }

  const selectedPlayerData = useMemo(() => {
    return playerData.filter(p => selectedPlayers.includes(p.id));
  }, [selectedPlayers, playerData]);

  // 比较数据
  const comparison = useMemo(() => {
    const result = selectedPlayerData.map(p => ({
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      marketValue: p.marketValue,
    }));

    // 排序：按潜能倒序
    return result.sort((a, b) => b.potential - a.potential);
  }, [selectedPlayers, playerData]);

  // 性价比计算
  const valueEfficiency = useMemo(() => {
    return comparison.map(p => ({
      ...p,
      efficiency: p.age < 25 ? p.marketValue / (p.potential - p.overal + 1) : p.marketValue / p.overall,
    }));
  }, [comparison]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("player.valueComparisonTitle")} />

      {/* 选中球员 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {selectedPlayers.map(id => {
          const p = playerData.find(pl => pl.id === id);
          return (
            <div
              key={id}
              className={`border rounded p-2 text-center ${
                selectedPlayers.length > 0 ? "bg-primary-100" : "bg-gray-50"
              }`}
            >
              <div className="text-2xl font-bold text-primary">{p?.name?.[0] || ""}</div>
              <div className="text-xs text-muted-foreground">{p?.name || ""}</div>
            </div>
          );
        })}
      </div>

      {/* 比较表格 */}
      <Panel className="p-4">
        <SectionTitle title={t("player.comparisonTable")} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("player.name")}</th>
                <th className="text-left p-3 border border-gray-200">{t("player.overall")}</th>
                <th className="text-left p-3 border border-gray-200">{t("player.potential")}</th>
                <th className="text-left p-3 border border-gray-200">{t("player.age")}</th>
                <th className="text-left p-3 border border-gray-200">{t("player.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("player.marketValue")}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((p, index) => (
                <tr key={p.id} className="border-b">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.overall}★</td>
                  <td className="p-3">{p.potential}★</td>
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
      </Panel>

      {/* 性价比分析 */}
      {selectedPlayers.length > 0 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("player.valueEfficiency")} />
          <div className="grid grid-cols-2 gap-3">
            {valueEfficiency.map((p, index) => (
              <div
                key={p.id}
                className={`border rounded p-3 text-center ${
                  index === 0 ? "bg-primary-100 text-primary" : "bg-gray-50"
                }`}
              >
                <div className="font-small">{p.name.split("")[0]}</div>
                <div className="text-xs text-primary">€{p.efficiency.toLocaleString()}/M</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Panel>
  );
}