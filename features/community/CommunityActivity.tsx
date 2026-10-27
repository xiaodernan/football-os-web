import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommunityActivity() {
  const { t } = useI18n();

  // 模拟社区活动数据
  const activities = useMemo(() => ([
    { id: "1", user: "JohnDoe", action: "post", content: "新战术分享", timestamp: Date.now() - 30 * 60 * 1000, likes: 15 },
    { id: "2", user: "Maria Garcia", action: "comment", content: "精彩分析！", timestamp: Date.now() - 60 * 60 * 1000, likes: 8 },
    { id: "3", user: "CoachMike", action: "post", content: "训练计划更新", timestamp: Date.now() - 90 * 60 * 1000, likes: 22 },
    { id: "4", user: "Sarah Chen", action: "like", content: "", timestamp: Date.now() - 2 * 60 * 60 * 1000, likes: 0 },
    { id: "5", user: "Alex Smith", action: "share", content: "球员数据", timestamp: Date.now() - 120 * 60 * 1000, likes: 30 },
  ] as const));

  const today = useMemo(() => new Date(), []);
  const yesterday = useMemo(() => new Date(today.getTime() - 24 * 60 * 60 * 1000), []);
  const last7Days = useMemo(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), []);

  const todayCount = useMemo(() => activities.filter(a => new Date(a.timestamp).toDateString() === today.toDateString()).length, [activities, today]);
  const yesterdayCount = useMemo(() => activities.filter(a => new Date(a.timestamp).toDateString() === yesterday.toDateString()).length, [activities, yesterday]);
  const weekCount = useMemo(() => activities.filter(a => new Date(a.timestamp) >= last7Days).length, [activities]);

  const actionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activities.forEach(a => {
      map[a.action] = (map[a.action] || 0) + 1;
    });
    return map;
  }, [activities]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("community.activityTitle")} />

      {/* 今日/昨日/周活动概览 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-primary">{todayCount}</div>
          <div className="text-muted-foreground mb-2">{t("community.today")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-success">{yesterdayCount}</div>
          <div className="text-muted-foreground mb-2">{t("community.yesterday")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-info">{weekCount}</div>
          <div className="text-muted-foreground mb-2">{t("community.thisWeek")}</div>
        </Panel>
      </div>

      {/* 操作类型分布 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("community.actionDistribution")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(actionCounts).map(([action, count]) => (
            <div
              key={action}
              className="border rounded p-3 flex items-start"
            >
              <div className="flex-1">
                <div className="font-medium">{t(`community.${action}`)}</div>
                <div className="text-sm text-muted-foreground">{t(`community.${action}Desc`)}</div>
              </div>
              <div className="ml-3 text-primary">
                {count}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 最新活动 */}
      <Panel className="p-4">
        <SectionTitle title={t("community.latestActivities")} />
        <div className="space-y-3 max-h-40 overflow-y-auto">
          {activities.slice(0, 5).map(activity => (
            <div
              key={activity.id}
              className="border rounded p-3 flex items-start {activity.action === 'post' ? 'bg-blue-50' : activity.action === 'comment' ? 'bg-green-50' : activity.action === 'like' ? 'bg-yellow-50' : 'bg-purple-50'}"
            >
              <div className="flex-1">
                <div className="font-medium truncate">{activity.user}</div>
                <div className="text-xs text-muted-foreground">{t(`community.${activity.action}`, { count: activity.likes })}</div>
              </div>
              <div className="ml-3 text-xs text-muted-foreground">
                {t("community.justNow", { 
                  minutes: Math.floor((Date.now() - activity.timestamp) / 60000) 
                })} 
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.alert(t("community.viewAllActivities"))}
        >
          {t("community.viewAll")}
        </Button>
      </Panel>
    </Panel>
  );
}