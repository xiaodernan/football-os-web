import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademy() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"graduates" "byPosition">("graduates");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
    }));
  }, [clubs]);

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

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademy.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademy.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademy.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademy.selectClub")}</div>
        <div>{t("clubYouthAcademy.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "graduates" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("graduates")}
        >
          {t("clubYouthAcademy.graduates")}
        </Button>
        <Button
          variant={setSelectedView === "byPosition" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byPosition")}
        >
          {t("clubYouthAcademy.byPosition")}
        </Button>
      </div>

      {/* 毕业生 */}
      {setSelectedView === "graduates" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademy.graduates")} />
          <p className="text-sm text-primary">俱乐部青训营毕业生</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .filter(p => p.age && p.age < 21)
              .sort((a, b) => b.potential - a.potential)
              .slice(0, 10)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubYouthAcademy.rank", { rank: playerData.indexOf(p) + 1 })}:
                  {t("clubYouthAcademy.{name}", { name: p.name })} - {t("clubYouthAcademy.potential", { potential: p.potential })}★ - {t("clubYouthAcademy.age", { age: p.age })}岁</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 按位置 */}
      {setSelectedView === "byPosition" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademy.positionDistribution")} />
          <p className="text-sm text-primary">青训营球员分布</p>
          <div className="grid grid-cols-4 gap-3">
            ["门将", "后卫", "中场", "前锋"].map(pos => {
              const posPlayers = playerData.filter(p => p.position === pos && (p.age && p.age < 21));
              return (
                <div key={pos} className="border rounded p-3 text-center">
                  <div className="font-medium text-primary">{pos}</div>
                  <div>{posPlayers.length}人</div>
                </div>
              );
            })
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademy.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademy.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademy.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("clubYouthAcademy.avgPotential", {
            avg: (playerData.reduce((sum, p) => sum + p.potential, 0) / playerData.length).toFixed(1),
          })} 平均潜能评分</p>
      </Panel>
    </Panel>
  );
}