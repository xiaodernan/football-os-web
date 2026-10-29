import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchHighlights() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟集锦数据
  const highlights = useMemo(() => ([
    { id: "1", minute: 5, team: "主队", player: "前锋A", description: "精彩开门红", type: "goal", videoUrl: "#" },
    { id: "2", minute: 12, team: "客队", player: "前锋B", description: "绝佳机会偏出", type: "shot", videoUrl: "#" },
    { id: "3", minute: 23, team: "主队", player: "中场C", description: "精准长传撕开防线", type: "pass", videoUrl: "#" },
    { id: "4", minute: 35, team: "主队门将", player: "门将1", description: "扑出必进球", type: "save", videoUrl: "#" },
    { id: "5", minute: 45+2, team: "客队", player: "前锋D", description: "头球破门扳平比分", type: "goal", videoUrl: "#" },
    { id: "6", minute: 52, team: "主队", player: "前锋E", description: "快速反击得分", type: "goal", videoUrl: "#" },
    { id: "7", minute: 67, team: "客队", player: "前锋F", description: "远射破门", type: "goal", videoUrl: "#" },
    { id: "8", minute: 75, team: "客队", player: "后卫G", description: "红牌送点", type: "red", videoUrl: "#" },
    { id: "9", minute: 82, team: "主队", player: "前锋H", description: "锁定胜局", type: "goal", videoUrl: "#" },
    { id: "10", minute: 90+3, team: "客队", player: "前锋I", description: "绝杀进球", type: "goal", videoUrl: "#" },
  ] as const));

  const [filteredHighlights] = useMemo(() => ({
    goals: highlights.filter(h => h.type === "goal"),
    saves: highlights.filter(h => h.type === "save"),
    keyMoments: highlights.filter(h => h.type !== "goal" && h.type !== "save"),
  }), [highlights]);

  const goalCount = filteredHighlights.goals.length;
  const saveCount = filteredHighlights.saves.length;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("highlights.title") } />

      {/* 集锦统计 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile
          title={t("highlights.totalGoals")}
          value={goalCount.toLocaleString()}
          subtitle={t("highlights.totalGoalsScored")}
          variant={goalCount > 0 ? "primary" : "default"}
        />
        <StatTile
          title={t("highlights.totalSaves")}
          value={saveCount.toLocaleString()}
          subtitle={t("highlights.totalSavesMade")}
        />
        <StatTile
          title={t("highlights.totalHighlights")}
          value={highlights.length}
          subtitle={t("highlights.totalMoments")}
        />
      </div>

      {/* 进球集锦 */}
      {goalCount > 0 && (
        <Panel className="p-4 mb-6 bg-yellow-50">
          <SectionTitle title={t("highlights.goalHighlights") } />
          <p className="text-yellow-600 mb-3">
            {t("highlights.{count}Goals", { count: goalCount })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {filteredHighlights.goals.map((highlight, index) => (
              <div key={highlight.id} className="border rounded p-3 hover:bg-yellow-100 transition">
                <div className="font-medium text-primary">{highlight.minute}'</div>
                <div className="text-primary">{highlight.player}</div>
                <div className="text-sm text-muted-foreground">{highlight.description}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 扑救集锦 */}
      {saveCount > 0 && (
        <Panel className="p-4 mb-6 bg-blue-50">
          <SectionTitle title={t("highlights.saveHighlights") } />
          <p className="text-blue-600 mb-3">
            {t("highlights.{count}Saves", { count: saveCount })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {filteredHighlights.saves.map((highlight, index) => (
              <div key={highlight.id} className="border rounded p-3 hover:bg-blue-100 transition">
                <div className="font-medium text-primary">{highlight.minute}'</div>
                <div className="text-primary">{highlight.player}</div>
                <div className="text-sm text-muted-foreground">{highlight.description}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 关键瞬间 */}
      {filteredHighlights.keyMoments.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("highlights.keyMoments") } />
          <p className="text-muted-foreground mb-3">
            {t("highlights.{count}KeyMoments", { count: filteredHighlights.keyMoments.length })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {filteredHighlights.keyMoments.map((highlight, index) => (
              <div key={highlight.id} className="border rounded p-3 hover:bg-gray-50 transition">
                <div className="font-medium text-primary">{highlight.minute}'</div>
                <div className="text-primary">{highlight.player}</div>
                <div className="text-sm text-muted-foreground">{highlight.description}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Panel>
  );
}