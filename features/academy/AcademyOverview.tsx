import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function AcademyOverview() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"potential" | "age">("potential");

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

  if (!youthPlayers.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("academyOverview.title")} />
        <p className="text-muted-foreground mb-4">
          {t("academyOverview.noYouth")}
        </p>
      </Panel>
    );
  }

  const sortedByPotential = [...playerData].sort((a, b) => b.potential - a.potential);
  const sortedByAge = [...playerData].sort((a, b) => a.age - b.age);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("academyOverview.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "potential" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("potential")}
        >
          {t("academyOverview.byPotential")}
        </Button>
        <Button
          variant={setSelectedView === "age" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("age")}
        >
          {t("academyOverview.byAge")}
        </Button>
      </div>

      {/* 潜力榜 */}
      {setSelectedView === "potential" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("academyOverview.potentialRanking")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("academyOverview.youthPlayers", { count: youthPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByPotential.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("academyOverview.rank", { rank: sortedByPotential.indexOf(p) + 1 })}:
                {t("academyOverview.{name}", { name: p.name })} - {t("academyOverview.potential", { potential: p.potential })}★
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 年龄榜 */}
      {setSelectedView === "age" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("academyOverview.ageRanking")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("academyOverview.youthPlayers", { count: youthPlayers.length })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {sortedByAge.slice(0, 10).map(p => (
              <li key={p.id} className="font-medium text-primary mb-1">
                {t("academyOverview.rank", { rank: sortedByAge.indexOf(p) + 1 })}:
                {t("academyOverview.{name}", { name: p.name })} - {t("academyOverview.age", { age: p.age })}岁
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedPlayer && (
        <Panel className="p-4">
          <SectionTitle title={t("academyOverview.playerDetail")} />
          const p = playerData.find(pl => pl.id === selectedPlayer)!;
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("academyOverview.name")}</div>
              <div className="text-2xl text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("academyOverview.age")}</div>
              <div>{p.age}岁</div>
            </div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("academyOverview.overall")}</div>
            <div className="text-3xl text-primary">{p.overall}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("academyOverview.potential")}</div>
            <div className="text-3xl text-success">{p.potential}★</div>
          </div>
          
          <div className="mt-3">
            <div className="font-medium">{t("academyOverview.position")}</div>
            <div>{p.position}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("academyOverview.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("academyOverview.totalYouth", { count: youthPlayers.length })} 名青年球员</p>
        <p>{t("academyOverview.avgPotential", { avg: (youthPlayers.reduce((sum, p) => sum + p.potential, 0) / youthPlayers.length).toFixed(1) })} 平均潜能</p>
        <p>{t("academyOverview.avgOverall", { avg: (youthPlayers.reduce((sum, p) => sum + p.overall, 0) / youthPlayers.length).toFixed(1) })} 平均当前实力</p>
      </Panel>
    </Panel>
  );
}