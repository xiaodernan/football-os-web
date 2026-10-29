import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerDevelopmentPath() {
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
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("developmentPath.title") } />
        <p className="text-muted-foreground mb-4">
          {t("developmentPath.selectPlayer")}
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
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 开发轨迹数据
  const developmentPath = useMemo(() => ({
    overallProgress: useMemo(() => {
      const points = [];
      for (let age = 16; age <= 35; age++) {
        const base = 50 + (age - 22) * 2;
        const potentialFactor = p.age <= age ? p.potential / 100 : 1;
        points.push(Math.min(99, base * potentialFactor));
      }
      return points;
    }, [p.potential, p.age]),
    potentialGap: p.potential - p.overall,
    yearsToPeak: Math.max(1, Math.round((p.potential - p.overall) / 5)),
    completionRate: Math.round((p.overall / p.potential) * 100),
  }), [p.potential, p.overall, p.age]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("developmentPath.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("developmentPath.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("developmentPath.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("developmentPath.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("developmentPath.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("developmentPath.developmentStats") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("developmentPath.potential")}</div>
              <div className="text-2xl font-bold text-green-600">{p.potential}★</div>
            </div>
            <div>
              <div className="font-medium">{t("developmentPath.growthPotential")}</div>
              <div>{t("developmentPath.growth", { growth: developmentPath.potentialGap })}</div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("developmentPath.completionRate")}</div>
            <div>{developmentPath.completionRate}%</div>
          </div>
          <div>
            <div className="font-medium">{t("developmentPath.yearsToPeak")}</div>
            <div>{developmentPath.yearsToPeak}年</div>
          </div>
        </Panel>
      </div>

      {/* 发展曲线 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("developmentPath.developmentCurve") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("developmentPath.overallProgressThroughAge")}
        </p>
        <div className="h-64 rounded bg-gray-100">
          {/* 发展曲线占位 */}
          <div className="h-full bg-gradient-to-t from-primary/20 to-transparent">
            <p className="text-center text-muted-foreground py-16">
              {t("developmentPath.curvePlaceholder")}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("developmentPath.ageRange", { min: 16, max: 35 })}岁
        </p>
      </Panel>

      {/* 关键里程碑 */}
      <Panel className="p-4">
        <SectionTitle title={t("developmentPath.keyMilestones") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("developmentPath.peakYear")}</div>
            <div>{new Date().getFullYear() + developmentPath.yearsToPeak}</div>
          </div>
          <div>
            <div className="font-medium">{t("developmentPath.completion")}</div>
            <div>{developmentPath.completionRate}%</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("developmentPath.potentialGap")}</div>
          <div>{developmentPath.potentialGap > 0 ? `+${developmentPath.potentialGap}` : developmentPath.potentialGap}</div>
        </div>
      </Panel>

      {/* 建议 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("developmentPath.developmentSuggestions") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("developmentPath.focusAreas")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("developmentPath.technicalDevelopment")}</li>
          <li>{t("developmentPath.physicalDevelopment")}</li>
          <li>{t("developmentPath.tacticalDevelopment")}</li>
          <li>{t("developmentPath.mentalDevelopment")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}