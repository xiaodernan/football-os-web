import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function UserLeague() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"standings" "matches">("standings");

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeague(leagueId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("userLeague.title")} />
        <p className="text-muted-foreground mb-4">
          {t("userLeague.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("userLeague.title")} />

      {/* 联赛选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedLeague || t("userLeague.selectLeague")}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("userLeague.selectALigue")}</div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "standings" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("standings")}
        >
          {t("userLeague.standings")}
        </Button>
        <Button
          variant={setSelectedView === "matches" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("matches")}
        >
          {t("userLeague.matches")}
        </Button>
      </div>

      {/* 联赛积分榜 */}
      {setSelectedView === "standings" && selectedLeague && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("userLeague.standings")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {/* League data would be rendered here */}
            <li className="font-medium text-primary mb-1">-- 数据加载中 --</li>
          </ol>
        </Panel>
      )}

      {/* 联赛赛程 */}
      {setSelectedView === "matches" && selectedLeague && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("userLeague.matches")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {/* Match data would be rendered here */}
            <li className="font-medium text-primary mb-1">-- 数据加载中 --</li>
          </ol>
        </Panel>
      )}

      {/* 创建新联赛 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("userLeague.createLeague")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("userLeague.createNewLeague")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">联赛名称</div>
            <input type="text" className="border rounded px-3 py-2 w-full" />
          </div>
          <div>
            <div className="font-medium">参赛球队数</div>
            <select className="border rounded px-3 py-2 w-full">
              <option value="8">8支球队</option>
              <option value="16">16支球队</option>
              <option value="20">20支球队</option>
            </select>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => {}}>
          {t("userLeague.create")}
        </Button>
      </Panel>

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("userLeague.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("userLeague.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("userLeague.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}