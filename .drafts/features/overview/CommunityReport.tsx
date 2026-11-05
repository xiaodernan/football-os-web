import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn, ABSENT } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function CommunityReport() {
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
      gamesPlayed: 0,
    }));
  }, [players]);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
    }));
  }, [clubs]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<string>("communityReport");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("communityReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("communityReport.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("communityReport.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("communityReport.selectClub")}</div>
        <div>{t("communityReport.selectAClub")}</div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={selectedView === "communityReport" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelectView("communityReport")}
        >
          {t("communityReport.communityReport")}
        </Button>
        <Button
          variant={selectedView === "summary" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelectView("summary")}
        >
          {t("communityReport.summary")}
        </Button>
      </div>

      {/* communityReport数据 */}
      {selectedView === "communityReport" && selectedClub && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("communityReport.communityReport")} />
          <p>
            {t("communityReport.data communityReport", {
              club: clubs.find(c => c.id === selectedClub)?.name ?? ABSENT,
            })}
          </p>
        </Panel>
      )}

      {/* 摘要 */}
      {selectedView === "summary" && selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("communityReport.summary")} />
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

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("communityReport.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("communityReport.totalClubs", { total: clubs.length })} 家俱乐部
        </p>
        <p>{t("communityReport.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}