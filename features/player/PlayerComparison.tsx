import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerComparison() {
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
        return [...prev, playerId].slice(0, 2); // 最多选2名进行对比
      }
    });
  };

  if (selectedPlayers.length < 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerComparison.title") } />
        <p className="text-muted-foreground mb-4">
          {t("playerComparison.selectTwoPlayers")}
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
          {t("playerComparison.maxTwoPlayers")}
        </p>
      </Panel>
    );
  }

  if (selectedPlayers.length !== 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerComparison.title") } />
        <p className="text-danger mb-4">
          {t("playerComparison.selectExactlyTwo")}
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
      </Panel>
    );
  }

  const p1 = playerData.find(pl => pl.id === selectedPlayers[0])!;
  const p2 = playerData.find(pl => pl.id === selectedPlayers[1])!;

  // 比较数据
  const comparison = useMemo(() => ({
    overallDiff: p1.overall - p2.overall,
    potentialDiff: p1.potential - p2.potential,
    ageDiff: p1.age - p2.age,
    valueDiff: p1.marketValue - p2.marketValue,
  }), [p1, p2]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerComparison.title") } />

      {/* 选中的球员 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 bg-primary-100">
          <div className="font-medium text-primary">{p1.name}</div>
          <div className="text-2xl font-bold text-primary">{p1.overall}★</div>
        </div>
        <div className="border rounded p-3 bg-secondary-100">
          <div className="font-medium text-secondary">{p2.name}</div>
          <div className="text-2xl font-bold text-secondary">{p2.overall}★</div>
        </div>
      </div>

      {/* 对比指标 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playerComparison.comparisonMetrics") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("playerComparison.overall")}</div>
            <div>
              {t("playerComparison.player1", { value: p1.overall })} vs {t("playerComparison.player2", { value: p2.overall })}
            </div>
            <div>{t("playerComparison.diff", { diff: comparison.overallDiff > 0 ? "+" : "", value: Math.abs(comparison.overallDiff) })}</div>
          </div>
          <div>
            <div className="font-medium">{t("playerComparison.potential")}</div>
            <div>
              {t("playerComparison.player1", { value: p1.potential })} vs {t("playerComparison.player2", { value: p2.potential })}
            </div>
            <div>{t("playerComparison.diff", { diff: comparison.potentialDiff > 0 ? "+" : "", value: Math.abs(comparison.potentialDiff) })}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("playerComparison.age")}</div>
            <div>{t("playerComparison.player1", { value: p1.age })}岁 vs {t("playerComparison.player2", { value: p2.age })}岁</div>
            <div>{t("playerComparison.diff", { diff: comparison.ageDiff > 0 ? "+" : "", value: Math.abs(comparison.ageDiff) })}岁</div>
          </div>
          <div>
            <div className="font-medium">{t("playerComparison.marketValue")}</div>
            <div>{t("currency.euro")} {t("playerComparison.player1", { value: p1.marketValue })} vs {t("playerComparison.player2", { value: p2.marketValue })}</div>
            <div>{t("playerComparison.diff", { diff: comparison.valueDiff > 0 ? "+" : "", value: Math.abs(comparison.valueDiff) })}</div>
          </div>
        </div>
      </Panel>

      {/* 位置与角色 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerComparison.positions") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("playerComparison.position1")}</div>
            <div className="text-info">{p1.position}</div>
          </div>
          <div>
            <div className="font-medium">{t("playerComparison.position2")}</div>
            <div className="text-info">{p2.position}</div>
          </div>
        </div>
      </Panel>

      {/* 建议 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("playerComparison.recommendations") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerComparison.compareFor")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("playerComparison.strengths1")}</li>
          <li>{t("playerComparison.strengths2")}</li>
          <li>{t("playerComparison.chooseBasedOn")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}