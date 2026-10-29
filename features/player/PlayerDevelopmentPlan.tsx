import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerDevelopmentPlan() {
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
        <SectionTitle title={t("playerDevelopment.title") } />
        <p className="text-muted-foreground mb-4">
          {t("playerDevelopment.selectPlayer")}
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

  // 模拟发展规划数据
  const development = useMemo(() => ({
    currentOverall: p.overall,
    targetOverall: Math.min(p.overall + 15, p.potential),
    monthsToTarget: Math.max(12, (p.potential - p.overall) * 6),
    positionCoach: t(`position.${p.position}`),
    developmentAreas: [
      { area: "技术能力", progress: Math.floor(Math.random() * 30) + 70 },
      { area: "体能素质", progress: Math.floor(Math.random() * 30) + 70 },
      { area: "战术理解", progress: Math.floor(Math.random() * 30) + 70 },
      { area: "心理素质", progress: Math.floor(Math.random() * 30) + 70 },
    ],
  }), [p.overall, p.potential, p.position]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerDevelopment.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("playerDevelopment.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerDevelopment.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerDevelopment.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("playerDevelopment.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("playerDevelopment.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("playerDevelopment.developmentPlan") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerDevelopment.currentOverall")}</div>
              <div className="text-2xl text-primary">{development.currentOverall}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerDevelopment.targetOverall")}</div>
              <div className={development.targetOverall > development.currentOverall ? "text-success" : "text-warning"}>
                {development.targetOverall}
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("playerDevelopment.timeline")}</div>
            <div className="text-muted-foreground">
              {development.monthsToTarget}个月达成目标
            </div>
          </div>
        </Panel>
      </div>

      {/* 发展领域 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playerDevelopment.developmentAreas") } />
        <div className="grid grid-cols-2 gap-3">
          {development.developmentAreas.map((area, index) => (
            <div key={index} className="border rounded p-3">
              <div className="font-medium">{area.area}</div>
              <div className="text-sm text-primary">{area.progress}%</div>
              <div className="mt-2">
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: area.progress + "%" }}
                  >
                    <span className="text-xs text-primary ml-2">{area.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 发展建议 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerDevelopment.developmentSuggestions") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerDevelopment.focusAreas")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("playerDevelopment.technicalFocus")}</li>
          <li>{t("playerDevelopment.physicalFocus")}</li>
          <li>{t("playerDevelopment.tacticalFocus")}</li>
          <li>{t("playerDevelopment.mentalFocus")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}