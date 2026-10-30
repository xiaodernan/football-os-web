import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyReport() {
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

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"overview" "graduates">("overview");

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
    }));
  }, [clubs]);

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademyReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyReport.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyReport.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademyReport.selectClub")}</div>
        <div>{t("clubYouthAcademyReport.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "overview" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("overview")}
        >
          {t("clubYouthAcademyReport.overview")}
        </Button>
        <Button
          variant={setSelectedView === "graduates" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("graduates")}
        >
          {t("clubYouthAcademyReport.graduates")}
        </Button>
      </div>

      {/* 综合概览 */}
      {setSelectedView === "overview" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyReport.overview")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">球员总数</div>
              <div>{playerData.length}</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均年龄</div>
              <div>{(playerData.reduce((sum, p) => sum + p.age, 0) / playerData.length).toFixed(1)}岁</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均潜能</div>
              <div>{(playerData.reduce((sum, p) => sum + p.potential, 0) / playerData.length).toFixed(1)}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 毕业生 */}
      {setSelectedView === "graduates" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyReport.graduates")} />
          <p className="text-sm text-primary">21岁以下球员</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .filter(p => p.age && p.age < 21)
              .sort((a, b) => b.potential - a.potential)
              .slice(0, 10)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubYouthAcademyReport.rank", { rank: playerData.indexOf(p) + 1 })}:
                  {t("clubYouthAcademyReport.{name}", { name: p.name })} - {t("clubYouthAcademyReport.age", { age: p.age })}岁 - {t("clubYouthAcademyReport.potential", { potential: p.potential })}★</li>
              ))
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyReport.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyReport.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyReport.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}