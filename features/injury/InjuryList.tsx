import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryList() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"current" | "longTerm">("current");

  const injuredPlayers = useMemo(() => {
    return players.filter(p => p.injuryStatus && p.injuryStatus === "injured");
  }, [players]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return injuredPlayers.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      injuryStatus: p.injuryStatus,
      daysUntilReturn: p.daysUntilReturn || 0,
    }));
  }, [injuredPlayers]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedByDays = [...playerData].sort((a, b) => a.daysUntilReturn - b.daysUntilReturn);
  const sortedByName = [...playerData].sort((a, b) => a.name.localeCompare(b.name));

  if (!injuredPlayers.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injuryList.title")} />
        <p className="text-muted-foreground mb-4">
          {t("injuryList.noInjuries")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryList.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "current" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("current")}
        >
          {t("injuryList.currentInjuries")}
        </Button>
        <Button
          variant={setSelectedView === "longTerm" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("longTerm")}
        >
          {t("injuryList.longTermInjuries")}
        </Button>
      </div>

      {/* 当前伤病 */}
      {setSelectedView === "current" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("injuryList.currentInjuries")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("injuryList.totalInjured", { count: injuredPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-danger">
            {sortedByDays.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-danger mb-1">
                {t("injuryList.player", { name: p.name })}:
                {t("injuryStatus.{status}", { status: p.injuryStatus })} -
                {t("injuryList.days", { days: p.daysUntilReturn })}天返回
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 长期伤病 */}
      {setSelectedView === "longTerm" && (
        <Panel className="p-4">
          <SectionTitle title={t("injuryList.longTermInjuries")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("injuryList.totalLongTerm", { count: injuredPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-danger">
            {sortedByDays.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-danger mb-1">
                {t("injuryList.player", { name: p.name })}:
                {t("injuryStatus.{status}", { status: p.injuryStatus })} -
                {t("injuryList.days", { days: p.daysUntilReturn })}天返回
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedPlayer && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("injuryList.playerDetail")} />
          const p = playerData.find(pl => pl.id === selectedPlayer)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("injuryList.name")}</div>
              <div className="text-2xl text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("injuryList.position")}</div>
              <div>{p.position}</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("injuryList.overall")}</div>
            <div className="text-3xl text-primary">{p.overall}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("injuryList.injuryStatus")}</div>
            <div>{t("injuryStatus.{status}", { status: p.injuryStatus })}</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("injuryList.daysUntilReturn")}</div>
            <div>{p.daysUntilReturn}天</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("injuryList.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("injuryList.totalInjured", { count: injuredPlayers.length })} 名受伤球员</p>
        <p>{t("injuryList.avgDays", { avg: (injuredPlayers.reduce((sum, p) => sum + p.daysUntilReturn, 0) / injuredPlayers.length).toFixed(1) })} 天平均恢复时间</p>
        <p>{t("injuryList.mostDays", { days: sortedByDays[sortedByDays.length - 1]?.daysUntilReturn })}</p>
      </Panel>
    </Panel>
  );
}