import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeasonNewsLive() {
  const { t } = useI18n();

  // 实时新闻数据模拟
  const liveNews = useMemo(() => [
    {
      id: "live-1",
      title: t("live.title1"),
      content: t("live.content1"),
      date: new Date().toISOString().split("T")[0],
      type: "breaking",
      urgent: true,
    },
    {
      id: "live-2",
      title: t("live.title2"),
      content: t("live.content2"),
      date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // yesterday
      type: "update",
      urgent: false,
    },
    {
      id: "live-3",
      title: t("live.title3"),
      content: t("live.content3"),
      date: new Date(Date.now() - 172800000).toISOString().split("T")[0], // 2 days ago
      type: "analysis",
      urgent: false,
    },
  ], []);

  const urgentCount = useMemo(() => liveNews.filter(n => n.urgent).length, []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("live.newsTitle")} />
      
      {/* 紧急新闻 */}
      {urgentCount > 0 && (
        <Panel className="p-4 mb-6" style={{ borderColor: "red" }}>
          <SectionTitle title={t("live.breakingNews")} />
          <p className="text-red-600 font-medium mb-2">
            {t("live.urgentCount", { count: urgentCount })}
          </p>
          <div className="space-y-2">
            {liveNews.filter(n => n.urgent).map(news => (
              <div
                key={news.id}
                className="border-l-4 border-red-500 p-3 rounded"
              >
                <div className="font-medium">{news.title}</div>
                <div className="text-xs text-red-500 mt-1">{news.content}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 普通新闻 */}
      <Panel className="p-4">
        <SectionTitle title={t("live.latestUpdates")} />
        <div className="space-y-3">
          {liveNews.map(news => (
            <div
              key={news.id}
              className="border rounded p-3 flex items-start {news.urgent ? 'bg-red-50' : 'bg-gray-50'}"
            >
              <div className="flex-1">
                <div className="font-medium">{news.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{news.content}</div>
              </div>
              <div className="ml-3 text-right text-xs">
                <div>{news.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}