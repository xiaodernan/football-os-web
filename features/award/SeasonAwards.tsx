import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonAwards() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  // 模拟赛季数据计算
  const playerStats = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      goals: Math.floor(Math.random() * 30),
      assists: Math.floor(Math.random() * 20),
      matchesPlayed: Math.floor(Math.random() * 38) + 1,
      cleanSheets: Math.floor(Math.random() * 20),
      minutesPlayed: Math.floor(Math.random() * 3500) + 500,
    }));
  }, [players]);

  // 按位置分类
  const goalkeepers = useMemo(() => playerStats.filter(p => p.name.includes("GK") || p.overall < 60), [playerStats]);
  const defenders = useMemo(() => playerStats.filter(p => !p.name.includes("GK") && p.overall >= 60), [playerStats]);
  const midfielders = useMemo(() => playerStats.filter(p => !p.name.includes("GK") && p.overall >= 60 && Math.random() > 0.3), [playerStats]);
  const forwards = useMemo(() => playerStats.filter(p => !p.name.includes("GK") && p.overall >= 60 && Math.random() > 0.5), [playerStats]);

  // 奖项提名
  const awards = useMemo(() => ({
    bestPlayer: {
      nominees: [...playerStats]
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map(p => ({ ...p, stat: "overall" })),
      title: "最佳球员",
    },
    topScorer: {
      nominees: [...playerStats]
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3)
        .map(p => ({ ...p, stat: "goals" })),
      title: "最佳射手",
    },
    bestGoalkeeper: {
      nominees: [...goalkeepers]
        .sort((a, b) => b.cleanSheets - a.cleanSheets)
        .slice(0, 3)
        .map(p => ({ ...p, stat: "cleanSheets" })),
      title: "最佳门将",
    },
    bestAssistProvider: {
      nominees: [...playerStats]
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 3)
        .map(p => ({ ...p, stat: "assists" })),
      title: "最佳助攻",
    },
    breakthroughPlayer: {
      nominees: [...playerStats]
        .filter(p => p.age < 23)
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map(p => ({ ...p, stat: "potential" })),
      title: "最佳新人",
    },
  }), [playerStats, goalkeepers]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("seasonAwards.title") } />

      {/* 赛季概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("seasonAwards.totalPlayers")}
          value={players.length.toLocaleString()}
          subtitle={t("seasonAwards.total")}
        />
        <StatTile
          title={t("seasonAwards.totalMatches")}
          value={Math.floor((players.reduce((sum, p) => sum + p.age, 0) / players.length) || 0)}
          subtitle={t("seasonAverageMatches")}
        />
      </div>

      {/* 最佳球员 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonAwards.bestPlayer") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("seasonAwards.nominees", { count: awards.bestPlayer.nominees.length }) }
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("seasonAwards.player")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonAwards.overall")}</th>
                <th className="text-left p-3 border border-gray-200">{t("seasonAwards.stat")}</th>
              </tr>
            </thead>
            <tbody>
              {awards.bestPlayer.nominees.map((p, index) => (
                <tr key={p.id} className="border-b">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3">{p.overall}★</td>
                  <td className="p-3">{p.stat === "overall" ? "综合评分" : p.stat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 其他奖项 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("seasonAwards.otherAwards") } />
        <div className="grid grid-cols-2 gap-3">
          {[awards.topScorer, awards.bestGoalkeeper, awards.bestAssistProvider, awards.breakthroughPlayer].map(award => (
            <div key={award.title} className="border rounded p-3">
              <div className="font-medium text-primary">{t(`award.${award.title}`)}</div>
              <p className="text-xs text-muted-foreground mb-2">
                {t(`award.${award.title.toLowerCase().replace(/\s+/g, "-")}Desc`)}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-muted-foreground">
                  <thead>
                    <tr>
                      <th>{t("seasonAwards.player")}</th>
                      <th>{t("seasonAwards.stat")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {award.nominees.map((p, index) => (
                      <tr key={p.id} className="border-b">
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3">{p.stat === "goals" ? p.goals : p.stat === "cleanSheets" ? p.cleanSheets : p.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}