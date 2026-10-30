import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryRecovery() {
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
      rating: p.rating || 0,
      injuryStatus: p.injuryStatus || "fit",
      daysUntilReturn: p.daysUntilReturn || 0,
    }));
  }, [players]);

  const [selectedView, setSelectedView] = useState<"current" "recovery">("current");

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const injuredPlayers = useMemo(() => {
    return playerData.filter(p => p.injuryStatus === "injured");
  }, [playerData]);

  const recoveringPlayers = useMemo(() => {
    return playerData.filter(p => p.injuryStatus === "recovering");
  }, [playerData]);

  const fitPlayers = useMemo(() => {
    return playerData.filter(p => p.injuryStatus === "fit");
  }, [playerData]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  const handleSelectView2 = (view: string) => {
    setSelectedView(view);
  };

  if (!players.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injuryRecovery.title")} />
        <p className="text-muted-foreground mb-4">
          {t("injuryRecovery.noPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryRecovery.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "current" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView2("current")}
        >
          {t("injuryRecovery.currentInjuries")}
        </Button>
        <Button
          variant={setSelectedView === "recovery" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView2("recovery")}
        >
          {t("injuryRecovery.recoveryStatus")}
        </Button>
      </div>

      {/* 当前伤病 */}
      {setSelectedView === "current" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("injuryRecovery.currentInjuries")} />
          <p className="text-sm text-danger mb-3">
            {t("injuryRecovery.totalInjured", { count: injuredPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-danger">
            {injuredPlayers.map(p => (
              <li key={p.id} className="font-medium text-danger mb-1">
                {t("injuryRecovery.{name}", { name: p.name })} - {t("injuryStatus.{status}", { status: p.injuryStatus })} - {t("injuryRecovery.days", { days: p.daysUntilReturn })}天</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 恢复中 */}
      {setSelectedView === "recovery" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("injuryRecovery.recoveringPlayers")} />
          <p className="text-sm text-warning mb-3">
            {t("injuryRecovery.playersRecovering", { count: recoveringPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-warning">
            {recoveringPlayers.map(p => (
              <li key={p.id} className="font-medium text-warning mb-1">
                {t("injuryRecovery.{name}", { name: p.name })} - {t("injuryRecovery.days", { days: p.daysUntilReturn })}天后恢复</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 选中的球员 */}
      {selectedPlayer && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("injuryRecovery.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("injuryRecovery.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("injuryRecovery.position")}</div>
              <div>{player.position}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryRecovery.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryRecovery.age")}</div>
            <div>{player.age}岁</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryRecovery.currentStatus")}</div>
            <span className="badge bg-${player.injuryStatus === "injured" ? "danger" : "success"}">
              {t("injuryStatus.{status}", { status: player.injuryStatus })}
            </span>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("injuryRecovery.daysUntilReturn")}</div>
            <div>{player.daysUntilReturn}天</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("injuryRecovery.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("injuryRecovery.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("injuryRecovery.healthySquad", {
            count: fitPlayers.length,
          })} 健康球员</p>
        <p>
          {t("injuryRecovery.injuryRate", {
            rate: ((players.length - fitPlayers.length) / players.length * 100).toFixed(1),
          })} 受伤率</p>
      </Panel>
    </Panel>
  );
}