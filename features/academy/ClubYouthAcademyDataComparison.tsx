import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyDataComparison() {
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

  const [selectedClub1, setSelectedClub1] = useState<string | null>(null);
  const [selectedClub2, setSelectedClub2] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"comparison" "details">("comparison");

  const handleSelectClub1 = (clubId: string) => {
    setSelectedClub1(clubId);
  };

  const handleSelectClub2 = (clubId: string) => {
    setSelectedClub2(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademyDataComparison.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyDataComparison.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyDataComparison.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <SectionTitle title={t("clubYouthAcademyDataComparison.homeClub")} />
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant={setSelectedClub1 === c.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectClub1(c.id)}
              >
                {c.name}
              </Button>
            ))
          </div>
        </div>
        <div>
          <SectionTitle title={t("clubYouthAcademyDataComparison.awayClub")} />
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant={setSelectedClub2 === c.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectClub2(c.id)}
              >
                {c.name}
              </Button>
            ))
          </div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "comparison" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("comparison")}
        >
          {t("clubYouthAcademyDataComparison.comparison")}
        </Button>
        <Button
          variant={setSelectedView === "details" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("details")}
        >
          {t("clubYouthAcademyDataComparison.details")}
        </Button>
      </div>

      {/* 对比数据 */}
      {setSelectedView === "comparison" && selectedClub1 && selectedClub2 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyDataComparison.comparison")} />
          <p>{t("clubYouthAcademyDataComparison.between", { club1: clubs.find(c => c.id === selectedClub1)?.name }, { club2: clubs.find(c => c.id === selectedClub2)?.name })}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">球员数量</div>
              <div>{t("clubYouthAcademyDataComparison.players1", { count: playerData.filter(p => p.clubId === selectedClub1).length })} vs {t("clubYouthAcademyDataComparison.players2", { count: playerData.filter(p => p.clubId === selectedClub2).length })}</div>
            </div>
            <div>
              <div className="font-medium">平均年龄</div>
              <div>{t("clubYouthAcademyDataComparison.avgAge1", { avg: (playerData.filter(p => p.clubId === selectedClub1).reduce((sum, p) => sum + p.age, 0) / playerData.filter(p => p.clubId === selectedClub1).length || 0).toFixed(1) })} vs {t("clubYouthAcademyDataComparison.avgAge2", { avg: (playerData.filter(p => p.clubId === selectedClub2).reduce((sum, p) => sum + p.age, 0) / playerData.filter(p => p.clubId === selectedClub2).length || 0).toFixed(1) })}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">平均潜能</div>
              <div>{t("clubYouthAcademyDataComparison.avgPotential1", { avg: (playerData.filter(p => p.clubId === selectedClub1).reduce((sum, p) => sum + p.potential, 0) / playerData.filter(p => p.clubId === selectedClub1).length || 0).toFixed(1) })} vs {t("clubYouthAcademyDataComparison.avgPotential2", { avg: (playerData.filter(p => p.clubId === selectedClub2).reduce((sum, p) => sum + p.potential, 0) / playerData.filter(p => p.clubId === selectedClub2).length || 0).toFixed(1) })}</div>
            </div>
            <div>
              <div className="font-medium">最佳球员</div>
              <div>{t("clubYouthAcademyDataComparison.bestPlayer1", { player: playerData.filter(p => p.clubId === selectedClub1).sort((a, b) => b.overall - a.overall)[0]?.name || "-" })} vs {t("clubYouthAcademyDataComparison.bestPlayer2", { player: playerData.filter(p => p.clubId === selectedClub2).sort((a, b) => b.overall - a.overall)[0]?.name || "-" })}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 详细信息 */}
      {setSelectedView === "details" && selectedClub1 && selectedClub2 && (
        <Panel className="p-4">
          <SectionTitle title={t("clubYouthAcademyDataComparison.details")} />
          <p>俱乐部 {clubs.find(c => c.id === selectedClub1)?.name} 与 {clubs.find(c => c.id === selectedClub2)?.name} 的数据对比</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">球员总数</div>
              <div>{t("clubYouthAcademyDataComparison.players1", { count: playerData.filter(p => p.clubId === selectedClub1).length })} vs {t("clubYouthAcademyDataComparison.players2", { count: playerData.filter(p => p.clubId === selectedClub2).length })}</div>
            </div>
            <div>
              <div className="font-medium">平均潜能</div>
              <div>{t("clubYouthAcademyDataComparison.avgPotential1", { avg: (playerData.filter(p => p.clubId === selectedClub1).reduce((sum, p) => sum + p.potential, 0) / playerData.filter(p => p.clubId === selectedClub1).length || 0).toFixed(1) })} vs {t("clubYouthAcademyDataComparison.avgPotential2", { avg: (playerData.filter(p => p.clubId === selectedClub2).reduce((sum, p) => sum + p.potential, 0) / playerData.filter(p => p.clubId === selectedClub2).length || 0).toFixed(1) })}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyDataComparison.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyDataComparison.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyDataComparison.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}