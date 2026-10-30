import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function YouthAcademy() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"graduates" | "byPosition">("graduates");

  const youthPlayers = useMemo(() => {
    return players.filter(p => p.age && p.age < 21);
  }, [players]);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return youthPlayers.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
    }));
  }, [youthPlayers]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const sortedByPotential = [...playerData].sort((a, b) => b.potential - a.potential);
  const sortedByPosition = [...playerData].sort((a, b) => {
    const posOrder = ["门将", "后卫", "中场", "前锋"];
    return (posOrder.indexOf(a.position) || 9) - (posOrder.indexOf(b.position) || 9);
  });

  if (!youthPlayers.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("youthAcademy.title")} />
        <p className="text-muted-foreground mb-4">
          {t("youthAcademy.noYouthPlayers")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("youthAcademy.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "graduates" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("graduates")}
        >
          {t("youthAcademy.graduates")}
        </Button>
        <Button
          variant={setSelectedView === "byPosition" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("byPosition")}
        >
          {t("youthAcademy.byPosition")}
        </Button>
      </div>

      {/* 潜力梯队 */}
      {setSelectedView === "graduates" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("youthAcademy.potentialGraduates")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("youthAcademy.youthCount", { count: youthPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByPotential.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("youthAcademy.rank", { rank: sortedByPotential.indexOf(p) + 1 })}:
                {t("youthAcademy.{name}", { name: p.name })} - {t("youthAcademy.potential", { potential: p.potential })}★ {t("youthAcademy.current", { current: p.overall })}</li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 按位置分布 */}
      {setSelectedView === "byPosition" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("youthAcademy.positionDistribution")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("youthAcademy.totalYouth", { count: youthPlayers.length })}</p>
          <div className="grid grid-cols-2 gap-3">
            ["门将", "后卫", "中场", "前锋"].map(pos => {
              const count = youthPlayers.filter(p => p.position === pos).length;
              return (
                <div key={pos} className="border rounded p-3 text-center">
                  <div className="font-medium text-primary">{pos}</div>
                  <div>{count}人</div>
                </div>
              );
            })
          </div>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("youthAcademy.playerDetail")} />
          const p = playerData.find(pl => pl.id === selectedPlayer)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("youthAcademy.name")}</div>
              <div className="text-2xl text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("youthAcademy.age")}</div>
              <div>{p.age}岁</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("youthAcademy.overall")}</div>
            <div className="text-3xl text-primary">{p.overall}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("youthAcademy.potential")}</div>
            <div className="text-3xl text-success">{p.potential}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("youthAcademy.position")}</div>
            <div>{p.position}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("youthAcademy.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("youthAcademy.totalYouth", { count: youthPlayers.length })} 名青年球员</p>
        <p>{t("youthAcademy.avgPotential", { avg: (youthPlayers.reduce((sum, p) => sum + p.potential, 0) / youthPlayers.length).toFixed(1) })} 平均潜能</p>
        <p>{t("youthAcademy.avgOverall", { avg: (youthPlayers.reduce((sum, p) => sum + p.overall, 0) / youthPlayers.length).toFixed(1) })} 平均当前实力</p>
      </Panel>
    </Panel>
  );
}