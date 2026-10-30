import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyFutureStars() {
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
  const [selectedView, setSelectedView] = useState<"futureStars" "stats">("futureStars");

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
        <SectionTitle title={t("clubYouthAcademyFutureStars.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyFutureStars.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyFutureStars.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademyFutureStars.selectClub")}</div>
        <div>{t("clubYouthAcademyFutureStars.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "futureStars" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("futureStars")}
        >
          {t("clubYouthAcademyFutureStars.futureStars")}
        </Button>
        <Button
          variant={setSelectedView === "stats" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("stats")}
        >
          {t("clubYouthAcademyFutureStars.stats")}
        </Button>
      </div>

      {/* 未来之星 */}
      {setSelectedView === "futureStars" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyFutureStars.futureStars")} />
          <p className="text-sm text-primary">潜力股</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {playerData
              .filter(p => p.clubId === selectedClub)
              .sort((a, b) => b.potential - a.potential)
              .slice(0, 5)
              .map(p => (
                <li key={p.id} className="font-medium text-primary mb-1">
                  {t("clubYouthAcademyFutureStars.{name}", { name: p.name })} - {t("clubYouthAcademyFutureStars.potential", { potential: p.potential })}★ - {t("clubYouthAcademyFutureStars.age", { age: p.age })}岁</li>
                ))
          </ol>
        </Panel>
      )}

      {/* 统计数据 */}
      {setSelectedView === "stats" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyFutureStars.stats")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">球员总数</div>
              <div>{playerData.filter(p => p.clubId === selectedClub).length}</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均潜能</div>
              <div>{(playerData.filter(p => p.clubId === selectedClub).reduce((sum, p) => sum + p.potential, 0) / playerData.filter(p => p.clubId === selectedClub).length || 0).toFixed(1)}</div>
            </div>
            <div>
              <div className="font-medium text-primary">最佳球员</div>
              <div>{playerData.filter(p => p.clubId === selectedClub).sort((a, b) => b.potential - a.potential)[0]?.name || "-"}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyFutureStars.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyFutureStars.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyFutureStars.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}