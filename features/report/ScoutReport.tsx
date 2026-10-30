import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ScoutReport() {
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
      marketValue: p.marketValue || 0,
      goals: p.goals || 0,
      assists: p.assists || 0,
      rating: p.rating || 0,
      injuryStatus: p.injuryStatus || "fit",
    }));
  }, [players]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"overview" "detailed">("overview");

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scoutReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("scoutReport.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scoutReport.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "overview" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("overview")}
        >
          {t("scoutReport.overview")}
        </Button>
        <Button
          variant={setSelectedView === "detailed" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("detailed")}
        >
          {t("scoutReport.detailed")}
        </Button>
      </div>

      {/* 球员概览 */}
      {setSelectedView === "overview" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("scoutReport.playerOverview")} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="font-medium text-primary">总球员数</div>
              <div>{players.length}</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均总体评分</div>
              <div>{(playerData.reduce((sum, p) => sum + p.overall, 0) / playerData.length).toFixed(1)}★</div>
            </div>
            <div>
              <div className="font-medium text-primary">平均市值</div>
              <div>{t("currency.euro", { amount: (playerData.reduce((sum, p) => sum + p.marketValue, 0) / playerData.length).toFixed(0) })}</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 详细 scout 报告 */}
      {setSelectedView === "detailed" && selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("scoutReport.scoutReport")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("scoutReport.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("scoutReport.position")}</div>
              <div>{player.position}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.potential")}</div>
            <div className="text-3xl text-success">{player.potential}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.age")}</div>
            <div>{player.age}岁</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.marketValue")}</div>
            <div>{t("currency.euro", { amount: player.marketValue })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.rating")}</div>
            <div>{player.rating}/10</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.injuryStatus")}</div>
            <span className="badge bg-${player.injuryStatus === "injured" ? "danger" : "success"}">
              {t("scoutReport.{status}", { status: player.injuryStatus })}
            </span>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.goals")}</div>
            <div>{player.goals}球</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.assists")}</div>
            <div>{player.assists}助</div>
          </div>
        </Panel>
      )}

      {/* 选中的球员 */}
      {selectedPlayer && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("scoutReport.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("scoutReport.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("scoutReport.club")}</div>
              {/* Club would need to be looked up */}
              <div>--</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.potential")}</div>
            <div className="text-3xl text-success">{player.potential}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.position")}</div>
            <div>{player.position}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.age")}</div>
            <div>{player.age}岁</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.marketValue")}</div>
            <div>{t("currency.euro", { amount: player.marketValue })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("scoutReport.note")}</div>
            <p className="text-muted-foreground">
              {t("scoutReport.scoutNote", {
                name: player.name,
                overall: player.overall,
                potential: player.potential,
                age: player.age,
              })}</p>
            <p>
              {t("scoutReport.playingStyle", {
                style: player.position === "前锋" ? "突破型前锋" : player.position === "中场" ? "控球型中场" : "防守型后卫",
              })}</p>
          </Panel>
        )
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("scoutReport.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("scoutReport.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("scoutReport.topPotential", {
            potential: playerData.sort((a, b) => b.potential - a.potential)[0]?.potential,
          })} 最高潜能评分</p>
        <p>
          {t("scoutReport.healthiestSquad", {
            count: playerData.filter(p => p.injuryStatus === "fit").length,
          })} 无伤球员</p>
        <p>
          {t("scoutReport.averageAge", {
            avg: (playerData.reduce((sum, p) => sum + p.age, 0) / playerData.length).toFixed(1),
          })} 平均年龄</p>
      </Panel>
    </Panel>
  );
}