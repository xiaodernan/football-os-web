import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { getSeasonStats, SeasonStats } from "@/features/world/seasonStats";
import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeasonAwards() {
  const { t } = useI18n();
  const stats = useMemo(() => getSeasonStats(), []);
  const competitions = footballProvider.competitions();

  // 计算最佳球员
  const topScorer = stats.topScorer 
    ? { name: stats.topScorer.name, goals: stats.topScorer.goals }
    : null;

  // 计算最佳阵容 (simple: top players by overall from all competitions)
  const allPlayers = footballProvider.players();
  const sortedPlayers = [...allPlayers].sort((a, b) => b.overall - a.overall);
  const bestXI = sortedPlayers.slice(0, 11).map(p => p.id);

  if (!stats.goals && !stats.appearances && !stats.yellowCards) {
    return <EmptyState title={t("world.awards.emptyTitle")} icon="⭐" hint={t("world.awards.emptyHint")} />;
  }

  return (
    <div className="space-y-5">
      <Panel className="p-4">
        <SectionTitle title={t("world.awardsTitle")} />
        
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* 最佳球员 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.bestPlayer")}</div>
            <div className="mt-2">
              {topScorer 
                ? <div className="font-medium">{topScorer.name}</div>
                : <span className="text-gray-500">{t("world.noData")}</span>}
              </div>
              <div className="text-sm text-primary">{topScorer?.goals ?? 0} {t("world.goals")}</div>
            </div>

          {/* 最佳射手 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.topScorer")}</div>
            <div className="mt-2">
              {topScorer 
                ? <div className="font-medium">{topScorer.name}</div>
                : <span className="text-gray-500">{t("world.noData")}</span>}
              </div>
              <div className="text-sm text-primary">{topScorer?.goals ?? 0} {t("world.goals")}</div>
            </div>

          {/* 总进球 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.totalGoals")}</div>
            <div className="mt-2 font-medium text-primary">{stats.goals} {t("world.goals")}</div>
          </div>

          {/* 总助攻 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.totalAssists")}</div>
            <div className="mt-2 font-medium text-primary">{stats.assists} {t("world.assists")}</div>
          </div>

          {/* 出场次数 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.appearances")}</div>
            <div className="mt-2 font-medium text-primary">{stats.appearances} {t("world.matches")}</div>
          </div>

          {/* 黄牌 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.yellowCards")}</div>
            <div className="mt-2 font-medium text-yellow-500">{stats.yellowCards} {t("world.cards")}</div>
          </div>

          {/* 红牌 */}
          <div>
            <div className="text-xs text-muted-foreground">{t("world.redCards")}</div>
            <div className="mt-2 font-medium text-red-500">{stats.redCards} {t("world.cards")}</div>
          </div>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("world.bestXITitle")} />
        <p className="text-sm text-muted-foreground">{t("world.bestXIExplanation")}</p>
        <div className="grid grid-cols-3 gap-2">
          {bestXI.map((pid, i) => {
            const player = footballProvider.players().find(p => p.id === pid);
            if (!player) return null;
            return (
              <div key={pid} className="border rounded-md p-2 text-center">
                <div className="text-xs font-medium">{player.name}</div>
                <div className="text-xs text-muted-foreground">{player.overall}⭐</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("world.awardsDownloadTitle")} />
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            const data = {
              seasonStats: stats,
              bestXI,
              generatedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `season-awards-${new Date().getFullYear()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          {t("world.awardsDownload")}
        </Button>
      </Panel>
    </div>
  );
}