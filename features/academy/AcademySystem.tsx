import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function AcademySystem() {
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
      academyGraduated: p.academyGraduated || false,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("academySystem.title") } />
        <p className="text-muted-foreground mb-4">
          {t("academySystem.selectPlayer")}
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

  // 模拟青训数据
  const academyStats = useMemo(() => ({
    totalGraduates: 15,
    currentBatch: 8,
    graduatesInFirstTeam: 5,
    averagePotentialGain: 12,
  }), []);

  const progression = useMemo(() => ({
    currentOverall: p.overall,
    targetPotential: p.potential,
    monthsAtAcademy: Math.floor(Math.random() * 36) + 6,
    developmentRate: Math.round((p.potential - p.overall) / Math.max(1, monthsAtAcademy / 12) * 10) / 10,
  }), [p.overall, p.potential, monthsAtAcademy]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academySystem.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("academySystem.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("academySystem.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("academySystem.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("academySystem.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("academySystem.academyStatus")}</div>
              <div className={p.academyGraduated ? "text-success" : "text-warning"}>
                {p.academyGraduated ? t("academySystem.graduated") : t("academySystem.inAcademy")}
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("academySystem.academyStats") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("academySystem.totalGraduates")}</div>
              <div className="text-2xl text-success">{academyStats.totalGraduates}</div>
            </div>
            <div>
              <div className="font-medium">{t("academySystem.currentBatch")}</div>
              <div className="text-primary">{academyStats.currentBatch}名学员</div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("academySystem.graduatesInFirstTeam")}</div>
            <div className="text-warning">{academyStats.graduatesInFirstTeam}名</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("academySystem.avgPotentialGain")}</div>
            <div className="text-primary">{academyStats.averagePotentialGain}评分</div>
          </div>
          <div>
            <div className="font-medium">{t("academySystem.monthsAtAcademy")}</div>
            <div className="text-muted-foreground">{progression.monthsAtAcademy}月</div>
          </div>
        </div>
      </div>
    </Panel>
  );
}