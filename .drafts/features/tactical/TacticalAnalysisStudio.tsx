import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TacticalAnalysisStudio() {
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
        <SectionTitle title={t("tactical.analysisTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("tactical.selectPlayerForAnalysis")}
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

  // 战术分析数据
  const formation = useMemo(() => t(`formation.${p.preferredFormation}`) || "4-3-3", [p]);
  const tacticalRating = useMemo(() => Math.round((p.overall + p.potential) / 2 * 0.6), [p.overall, p.potential]);
  const keyStrengths = useMemo(() => {
    const strengths: string[] = [];
    if (p.overall >= 85) strengths.push(t("tactical.technical"));
    if (p.potential >= 90) strengths.push(t("tactical.highPotential"));
    if (p.age < 25) strengths.push(t("tactical.young"));
    return strengths;
  }, [p.overall, p.potential, p.age]);

  const weakAreas = useMemo(() => {
    const areas: string[] = [];
    if (p.overall < 70) areas.push(t("tactical.needsImprovement"));
    if (p.age > 30) areas.push(t("tactical.ageRelated"));
    return areas;
  }, [p.overall, p.age]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("tactical.analysisTitle")} />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("tactical.playerInfo")} />
          <div className="space-y-3">
            <div className="flex justify-between">
              <div>{t("tactical.overall")}</div>
              <div className="text-2xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div className="flex justify-between">
              <div>{t("tactical.potential")}</div>
              <div className="text-2xl font-bold text-green-600">{p.potential}★</div>
            </div>
            <div className="flex justify-between">
              <div>{t("tactical.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div className="flex justify-between">
              <div>{t("tactical.position")}</div>
              <div className="text-muted-foreground">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("tactical.tacticalOverview")} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile title={t("tactical.formation")} value={formation} />
            <StatTile title={t("tactical.tacticalRating")} value={`${tacticalRating}★`} variant="primary" />
          </div>
          <div className="mt-3 p-3 bg-primary/10 rounded">
            <div className="font-medium">{t("tactical.keyStrengths")}</div>
            <p className="text-sm text-primary mt-1">{keyStrengths.length > 0 ? keyStrengths.join(", ") : t("tactical.averagePerformance")}</p>
          </div>
          {weakAreas.length > 0 && (
            <div className="mt-3 p-3 bg-destructive/10 rounded">
              <div className="font-medium text-destructive">{t("tactical.improvementAreas")}</div>
              <p className="text-sm text-destructive mt-1">{weakAreas.join(", ")}</p>
            </div>
          )}
        </Panel>
      </div>

      {/* 建议 */}
      {weakAreas.length > 0 && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("tactical.improvementSuggestions")} />
          <p className="text-sm text-destructive">
            {t("tactical.focusOn", { areas: weakAreas.join("、") })}
          </p>
          <Button variant="outline" size="sm">
            {t("tactical.viewRecommendations")}
          </Button>
        </Panel>
      )}

      {/* 选择另一个球员 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("tactical.selectAnother")} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedPlayer(null)}
        >
          {t("tactical.analyzeAnotherPlayer")}
        </Button>
      </Panel>
    </Panel>
  );
}