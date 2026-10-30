import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyGraduates() {
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
      clubId: p.clubId || null,
    }));
  }, [players]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"graduates" "destinations">("graduates");

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
        <SectionTitle title={t("clubYouthAcademyGraduates.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyGraduates.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyGraduates.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademyGraduates.selectClub")}</div>
        <div>{t("clubYouthAcademyGraduates.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "graduates" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("graduates")}
        >
          {t("clubYouthAcademyGraduates.graduates")}
        </Button>
        <Button
          variant={setSelectedView === "destinations" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("destinations")}
        >
          {t("clubYouthAcademyGraduates.destinations")}
        </Button>
      </div>

      {/* 毕业生 */}
      {setSelectedView === "graduates" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyGraduates.graduates")} />
          <p className="text-sm text-primary">21岁以下球员</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .filter(p => p.age && p.age < 21 && p.clubId === selectedClub)
              .sort((a, b) => b.potential - a.potential)
              .slice(0, 10)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubYouthAcademyGraduates.rank", { rank: playerData.indexOf(p) + 1 })}:
                  {t("clubYouthAcademyGraduates.{name}", { name: p.name })} - {t("clubYouthAcademyGraduates.age", { age: p.age })}岁 - {t("clubYouthAcademyGraduates.potential", { potential: p.potential })}★ - {t("clubYouthAcademyGraduates.club", { club: clubs.find(c => c.id === p.clubId)?.name })}</li>
              ))
          </ol>
        </Panel>
      )}

      {/* 毕业生去向 */}
      {setSelectedView === "destinations" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyGraduates.destinations")} />
          <p className="text-sm text-primary">毕业生当前俱乐部</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .filter(p => p.age && p.age < 21 && p.clubId === selectedClub)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubYouthAcademyGraduates.{name}", { name: p.name })} - {t("clubYouthAcademyGraduates.currentClub", { club: clubs.find(c => c.id === p.clubId)?.name })}</li>
              ))
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyGraduates.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyGraduates.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyGraduates.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}