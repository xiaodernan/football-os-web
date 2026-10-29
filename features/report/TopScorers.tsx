import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TopScorers() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedView, setSelectedView] = useState<"goals" | "assists">("goals");

  const scorers = useMemo(() => ({
    goals: [...players]
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        goals: p.goals || 0,
        team: t(`team.${Math.floor(Math.random() * 20 + 1)}`,
      })),
    assists: [...players]
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 10)
      .map((p, i) => ({
        rank: i + 1,
        name: p.name,
        assists: p.assists || 0,
        team: t(`team.${Math.floor(Math.random() * 20 + 1)}`,
      })),
  }), [players]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("topScorers.title") } />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "goals" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("goals")}
        >
          {t("topScorers.goals")}
        </Button>
        <Button
          variant={setSelectedView === "assists" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("assists")}
        >
          {t("topScorers.assists")}
        </Button>
      </div>

      {/* 排名展示 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("topScorers.ranking", { type: selectedView })} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("topScorers.rank")}</th>
                <th className="text-left p-3 border border-gray-200">{t("topScorers.player")}</th>
                <th className="text-left p-3 border border-gray-200">{selectedView === "goals" ? t("topScorers.goals") : t("topScorers.assists")}</th>
              </tr>
            </thead>
            <tbody>
              {selectedView === "goals" ? scorers.goals : scorers.assists.map(s => (
                <tr key={s.name} className="border-b">
                  <td className="p-3 font-medium text-primary">{s.rank}</td>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">{selectedView === "goals" ? s.goals : s.assists}</td>
                </tr>
              ))
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 统计概览 */}
      <Panel className="p-4">
        <SectionTitle title={t("topScorers.statistics") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("topScorers.totalPlayers")}</div>
            <div>{players.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("topScorers.top10Goals")}</div>
            <div>{scorers.goals.length}</div>
          </div>
          <div>
            <div className="font-medium">{t("topScorers.top10Assists")}</div>
            <div>{scorers.assists.length}</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}