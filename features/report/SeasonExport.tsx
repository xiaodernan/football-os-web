import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonExport() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedView, setSelectedView] = useState<"players" | "clubs">("players");

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      goals: p.goals || 0,
      assists: p.assists || 0,
      matchesPlayed: p.matchesPlayed || 0,
    }));
  }, [players]);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      points: c.points || 0,
      played: c.matchesPlayed || 38,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
    }));
  }, [clubs]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("seasonExport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("seasonExport.noData")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonExport.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "players" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("players")}
        >
          {t("seasonExport.players")}
        </Button>
        <Button
          variant={setSelectedView === "clubs" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("clubs")}
        >
          {t("seasonExport.clubs")}
        </Button>
      </div>

      {/* 玩家数据导出 */}
      {setSelectedView === "players" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonExport.playerData")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonExport.totalPlayers", { count: players.length })}</p>
          <p className="text-xs text-primary">
            {t("seasonExport.format", { format: "JSON" })}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              // Trigger export
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
                JSON.stringify(playerData, null, 2)
              );
              const downloadAnchorNode = document.createElement("a");
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", `football-os-season-players-${new Date().toISOString().split("T")[0]}.json`);
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
          >
            {t("seasonExport.export")}
          </Button>
        </Panel>
      )}

      {/* 俱乐部数据导出 */}
      {setSelectedView === "clubs" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("seasonExport.clubData")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("seasonExport.totalClubs", { count: clubData.length })}</p>
          <p className="text-xs text-primary">
            {t("seasonExport.format", { format: "JSON" })}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              // Trigger export
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
                JSON.stringify(clubData, null, 2)
              );
              const downloadAnchorNode = document.createElement("a");
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", `football-os-season-clubs-${new Date().toISOString().split("T")[0]}.json`);
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
          >
            {t("seasonExport.export")}
          </Button>
        </Panel>
      )}

      {/* 数据统计概览 */}
      <Panel className="p-4">
        <SectionTitle title={t("seasonExport.overview")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("seasonExport.totalPlayers")}</div>
            <div>{players.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("seasonExport.totalClubs")}</div>
            <div>{clubs.length}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("seasonExport.exportDesc")}</p>
        <p className="text-xs text-primary">
          {t("seasonExport.jsonFormat")}</p>
      </Panel>
    </Panel>
  );
}