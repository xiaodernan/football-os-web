import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyDataCompendium() {
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
  const [selectedView, setSelectedView] = useState<"compendium" "summary">("compendium");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademyDataCompendium.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyDataCompendium.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyDataCompendium.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademyDataCompendium.selectClub")}</div>
        <div>{t("clubYouthAcademyDataCompendium.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "compendium" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("compendium")}
        >
          {t("clubYouthAcademyDataCompendium.compendium")}
        </Button>
        <Button
          variant={setSelectedView === "summary" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("summary")}
        >
          {t("clubYouthAcademyDataCompendium.summary")}
        </Button>
      </div>

      {/* compendium数据 */}
      {setSelectedView === "compendium" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyDataCompendium.compendium")} />
          <p>
            {t("clubYouthAcademyDataCompendium.data compendium", {
              club: clubs.find(c => c.id === selectedClub)?.name,
            })}
          </p>
        </Panel>
      )}

      {/* 摘要 */}
      {setSelectedView === "summary" && selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("clubYouthAcademyDataCompendium.summary")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">球员总数</div>
              <div>{playerData.length}</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均年龄</div>
              <div>
                {(playerData.reduce((sum, p) => sum + p.age, 0) / playerData.length).toFixed(1)}岁
              </div>
            </div>
            <div>
              <div className="font-medium text-primary">平均潜能</div>
              <div>
                {(playerData.reduce((sum, p) => sum + p.potential, 0) / playerData.length).toFixed(1)}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 }}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyDataCompendium.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyDataCompendium.totalClubs", { total: clubs.length })} 家俱乐部
        </p>
        <p>{t("clubYouthAcademyDataCompendium.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}