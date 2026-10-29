import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerPerformance() {
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
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerPerformance.title") } />
        <p className="text-muted-foreground mb-4">
          {t("playerPerformance.selectPlayer")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
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

  // 模拟表现数据 (基于虚拟赛季事件)
  const performance = useMemo(() => ({
    matchesPlayed: 35,
    goals: 12,
    assists: 8,
    shots: 45,
    shotsOnTarget: 22,
    passes: 2100,
    keyPasses: 35,
    tackles: 45,
    interceptions: 28,
    fouls: 12,
    offsides: 5,
  }), []);

  const efficiency = useMemo(() => ({
    shotEfficiency: Math.round((performance.shotsOnTarget / performance.shots) * 100),
    passCompletion: Math.round(85 + Math.random() * 10),
    contributionRate: Math.round((performance.goals + performance.assists) / performance.matchesPlayed * 100),
  }), [performance]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerPerformance.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("playerPerformance.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerPerformance.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerPerformance.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("playerPerformance.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("playerPerformance.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("playerPerformance.seasonStats") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerPerformance.matches")}</div>
              <div className="text-2xl font-bold text-primary">{performance.matchesPlayed}场</div>
            </div>
            <div>
              <div className="font-medium">{t("playerPerformance.goals")}</div>
              <div className="text-2xl font-bold text-success">{performance.goals}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerPerformance.assists")}</div>
              <div className="text-2xl font-bold text-success">{performance.assists}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="font-medium">{t("playerPerformance.shots")}</div>
              <div className="text-primary">{performance.shots}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerPerformance.keyPasses")}</div>
              <div className="text-info">{performance.keyPasses}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 效率分析 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playerPerformance.efficiencyAnalysis") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("playerPerformance.shotEfficiency")}</div>
            <div className={efficiency.shotEfficiency >= 50 ? "text-success" : "text-warning"}>
              {efficiency.shotEfficiency}% (射正{/射门)
            </div>
          </div>
          <div>
            <div className="font-medium">{t("playerPerformance.passCompletion")}</div>
            <div className="text-primary">{efficiency.passCompletion}%</div>
          </div>
          <div>
            <div className="font-medium">{t("playerPerformance.contribution")}</div>
            <div className={efficiency.contributionRate >= 50 ? "text-success" : "text-warning"}>
              {efficiency.contributionRate}% (每场贡献)
            </div>
          </div>
        </div>
      </Panel>

      {/* 位置统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerPerformance.positionStats") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("playerPerformance.tackles")}</div>
            <div className="text-2xl font-bold">{performance.tackles}</div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("playerPerformance.interceptions")}</div>
            <div className="text-2xl font-bold text-info">{performance.interceptions}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium text-sm text-muted-foreground">{t("playerPerformance.fouls")}</div>
          <div className="text-danger">{performance.fouls}</div>
        </div>
      </Panel>

      {/* 与球队对比 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("playerPerformance.teamComparison") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerPerformance.compareLeagueAvg")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">进球</div>
            <div className={performance.goals > 10 ? "text-success" : "text-warning"}>
              {performance.goals}
            </div>
          </div>
          <div>
            <div className="font-medium">助攻</div>
            <div className={performance.assists > 5 ? "text-success" : "text-warning"}>
              {performance.assists}
            </div>
          </div>
          <div>
            <div className="font-medium">评分</div>
            <div className="text-primary">{p.overall}★</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}