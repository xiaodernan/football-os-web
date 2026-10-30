import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyAlumni() {
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
      currentClub: p.currentClub || null,
    }));
  }, [players]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"alumni" "stats">("alumni");

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
        <SectionTitle title={t("clubYouthAcademyAlumni.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyAlumni.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyAlumni.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademyAlumni.selectClub")}</div>
        <div>{t("clubYouthAcademyAlumni.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "alumni" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("alumni")}
        >
          {t("clubYouthAcademyAlumni.alumni")}
        </Button>
        <Button
          variant={setSelectedView === "stats" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("stats")}
        >
          {t("clubYouthAcademyAlumni.stats")}
        </Button>
      </div>

      {/* 毕业生 */}
      {setSelectedView === "alumni" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyAlumni.alumni")} />
          <p className="text-sm text-primary">已离队球员</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .filter(p => p.age && p.age >= 21 && p.clubId === selectedClub)
              .sort((a, b) => b.overall - a.overall)
              .slice(0, 10)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubYouthAcademyAlumni.rank", { rank: playerData.indexOf(p) + 1 })}:
                  {t("clubYouthAcademyAlumni.{name}", { name: p.name })} - {t("clubYouthAcademyAlumni.currentClub", { club: clubs.find(c => c.id === p.currentClub)?.name })} - {t("clubYouthAcademyAlumni.overall", { overall: p.overall })}★</li>
              ))
          </ol>
        </Panel>
      )}

      {/* 统计数据 */}
      {setSelectedView === "stats" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyAlumni.stats")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text alumni">离队球员总数</div>
              <div>{playerData.filter(p => p.age && p.age >= 21 && p.clubId === selectedClub).length}</div>
            </div>
            <div>
              <div className="font-medium text alumni">平均离队年龄</div>
              <div>{(playerData.filter(p => p.age && p.age >= 21 && p.clubId === selectedClub).reduce((sum, p) => sum + p.age, 0) / playerData.filter(p => p.age && p.age >= 21 && p.clubId === selectedClub).length || 0).toFixed(1)}岁</div>
            </div>
            <div>
              <div className="font-medium text alumni">平均离队Overall</div>
              <div>{(playerData.filter(p => p.age && p.age >= 21 && p.clubId === selectedClub).reduce((sum, p) => sum + p.overall, 0) / playerData.filter(p => p.age && p.age >= 21 && p.clubId === selectedClub).length || 0).toFixed(1)}★</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyAlumni.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyAlumni.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyAlumni.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}