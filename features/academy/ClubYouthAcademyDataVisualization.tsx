import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyDataVisualization() {
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

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
    }));
  }, [clubs]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"visualization" "summary">("visualization");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademyDataVisualization.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyDataVisualization.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyDataVisualization.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "visualization" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("visualization")}
        >
          {t("clubYouthAcademyDataVisualization.visualization")}
        </Button>
        <Button
          variant={setSelectedView === "summary" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("summary")}
        >
          {t("clubYouthAcademyDataVisualization.summary")}
        </Button>
      </div>

      {/* 数据可视化 */}
      {setSelectedView === "visualization" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyDataVisualization.visualization")} />
          <p>{t("clubYouthAcademyDataVisualization.visualizingData", { club: clubs.find(c => c.id === selectedClub)?.name })}</p>
        </Panel>
      )}

      {/* 摘要 */}
      {setSelectedView === "summary" && selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("clubYouthAcademyDataDashboard.summary")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">球员数量</div>
              <div>{playerData.filter(p => p.clubId === selectedClub).length}</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均年龄</div>
              <div>{(playerData.filter(p => p.clubId === selectedClub).reduce((sum, p) => sum + p.age, 0) / playerData.filter(p => p.clubId === selectedClub).length || 0).toFixed(1)}岁</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均潜能</div>
              <div>{(playerData.filter(p => p.clubId === selectedClub).reduce((sum, p) => sum + p.potential, 0) / playerData.filter(p => p.clubId === selectedClub).length || 0).toFixed(1)}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyDataVisualization.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyDataVisualization.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyDataVisualization.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}