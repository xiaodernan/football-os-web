import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function YouthAcademyTalentPipeline() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      gamesPlayed: p.gamesPlayed || 0,
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"talentPipeline" "standings">("talentPipeline");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedByPotential = useMemo(
    () => [...playerData].sort((a, b) => b.potential - a.potential),
    [playerData]
  );

  const sortedByAge = useMemo(
    () => [...playerData].sort((a, b) => a.age - b.age),
    [playerData]
  );

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("youthAcademyTalentPipeline.title")} />
        <p className="text-muted-foreground mb-4">
          {t("youthAcademyTalentPipeline.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("youthAcademyTalentPipeline.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "talentPipeline" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("talentPipeline")}
        >
          {t("youthAcademyTalentPipeline.talentPipeline")}
        </Button>
        <Button
          variant={setSelectedView === "standings" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("standings")}
        >
          {t("youthAcademyTalentPipeline.standings")}
        </Button>
      </div>

      {/* 人才梯队 */}
      {setSelectedView === "talentPipeline" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("youthAcademyTalentPipeline.talentPipeline")} />
          <p className="text-sm text-primary">按潜能排序</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByPotential.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("youthAcademyTalentPipeline.rank", { rank: sortedByPotential.indexOf(p) + 1 })}:
                {t("youthAcademyTalentPipeline.{name}", { name: p.name })} - {t("youthAcademyTalentPipeline.potential", { potential: p.potential })}★ - {t("youthAcademyTalentPipeline.age", { age: p.age })}岁</li>
              ))
          </ol>
        </Panel>
      )}

      {/* 年龄结构 */}
      {setSelectedView === "standings" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("youthAcademyTalentPipeline.ageStructure")} />
          <p className="text-sm text-primary">年龄结构</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {["U19", "U21", "U23", "U25"].map(ageGroup => {
              const count = playerData.filter(p => p.age && p.age <= parseInt(ageGroup.replace("U", ""))).length;
              return (
                <li key={ageGroup}>
                  {t("youthAcademyTalentPipeline.{ageGroup}", { ageGroup })}: {count}名球员</li>
                </li>
              );
            })
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("youthAcademyTalentPipeline.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("youthAcademyTalentPipeline.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("youthAcademyTalentPipeline.averagePotential", {
            avg: (playerData.reduce((sum, p) => sum + p.potential, 0) / playerData.length).toFixed(1),
          })} 平均潜能</p>
        <p>
          {t("youthAcademyTalentPipeline.youngestPlayer", {
            youngest: sortedByAge[0]?.name,
          })} 最年轻球员</p>
      </Panel>
    </Panel>
  );
}