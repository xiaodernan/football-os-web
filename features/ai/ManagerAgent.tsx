import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { getSeasonStats, SeasonStats } from "@/features/world/seasonStats";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ManagerAgent() {
  const { t } = useI18n();
  const stats = useMemo(() => getSeasonStats(), []);
  const competitions = footballProvider.competitions();
  const players = footballProvider.players();
  const teams = footballProvider.teams();

  // 分析球队需求和球员状态，生成转会建议
  const transferSuggestions = useMemo(() => {
    const suggestions: Array<{
      playerId: string;
      playerName: string;
      fromClub: string;
      toClub: string;
      action: "buy"" | "sell";
      fee: number;
      reasoning: string;
    }> = [];

    // 逻辑：根据球队当前统计和阵容空缺生成建议
    // 1. 如果进球不足，推荐进攻球员
    if (stats.goals < 40) {
      const attackers = players.filter(p => p.overall >= 75 && p.age <= 28);
      attackers.slice(0, 3).forEach(p => {
        suggestions.push({
          playerId: p.id,
          playerName: p.name,
          fromClub: "currentClub",
          toClub: "needsAttack",
          action: "buy",
          fee: Math.round(p.marketValue * 1.2),
          reasoning: `${t("world.goalsShortfall")} → ${t("world.recommendedBuy", { player: p.name })}`
        });
      });
    }

    // 2. 如果失球过多，推荐防守球员外借或出售
    if (stats.yellowCards > 8 || stats.redCards > 2) {
      const defenders = players.filter(p => p.overall >= 78 && p.position === "DF");
      defenders.slice(0, 2).forEach(p => {
        suggestions.push({
          playerId: p.id,
          playerName: p.name,
          fromClub: "currentClub",
          toClub: "relegationZone",
          action: "sell",
          fee: Math.round(p.marketValue * 0.8),
          reasoning: `${t("world.tooManyCards")} → ${t("world.recommendedSell", { player: p.name })}`
        });
      });
    }

    return suggestions;
  }, [stats, players]);

  // 生成战术调整建议
  const tacticalAdvice = useMemo(() => {
    const advice: Array<{
      type: "formation" | "mentality";
      description: string;
      priority: "low" | "medium" | "high";
    }> = [];

    // 根据比赛情况推荐阵型
    if (stats.appearances > 0 && stats.goals / stats.appearances < 0.3) {
      advice.push({
        type: "formation",
        description: t("world.recommendCounter"),
        priority: "high"
      });
    }

    return advice;
  }, [stats]);

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("world.managerAgentTitle")} />
        
        {/* 转会建议 */}
        {transferSuggestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-semibold mb-3">{t("world.transferSuggestions")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {transferSuggestions.map(s => (
                <div
                  key={s.playerId}
                  className="border rounded p-3 {s.action === 'buy' ? 'bg-blue-50' : 'bg-red-50'}"
                >
                  <div className="font-medium">{s.playerName}</div>
                  <div className="text-xs text-muted-foreground">{t(s.action === 'buy' ? "world.buySuggested" : "world.sellSuggested", { player: s.playerName, club: s.toClub })}</div>
                  <div className="mt-1 text-sm font-medium">{t("world.fee")}: {s.fee.toLocaleString()}€</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.reasoning}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.alert(t("world.suggestionImplemented", { player: s.playerName }))}
                    className="mt-2 w-full"
                  >
                    {t("world.implement")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 战术建议 */}
        {tacticalAdvice.length > 0 && (
          <Panel className="p-4 mt-6">
            <SectionTitle title={t("world.tacticalAdvice")} />
            <div className="space-y-3">
              {tacticalAdvice.map((advice, i) => (
                <Panel key={i} className="p-3">
                  <div className={`flex items-start ${advice.priority === 'high' ? 'text-red-600' : 'text-orange-600'}`}>
                    <div className="w-1 h-1 rounded-full mr-2">{advice.priority === 'high' ? '●' : '○'}</div>
                    <div>{advice.description}</div>
                  </div>
                </Panel>
              ))}
            </div>
          </Panel>
        )}

        {/* 行动按钮 */}
        <div className="mt-6 pt-6 border-t">
          <Button variant="primary" disabled={transferSuggestions.length === 0}>
            {t("world.autoExecuteSuggestions")}
          </Button>
          <Button variant="outline" onClick={() => window.confirm(t("world.suggestionsNeedReview"))}>
            {t("world.reviewBeforeExecute")}
          </Button>
        </div>
      </Panel>
    </div>
  );
}