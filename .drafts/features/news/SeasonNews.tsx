import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SeasonNews() {
  const { t } = useI18n();

  // 模拟赛季新闻数据
  const newsItems = useMemo(() => [
    {
      id: "news-1",
      title: t("news.title1"),
      summary: t("news.summary1"),
      date: "2024-03-15",
      source: t("news.source1"),
      category: t("news.transfer"),
    },
    {
      id: "news-2",
      title: t("news.title2"),
      summary: t("news.summary2"),
      date: "2024-03-10",
      source: t("news.source2"),
      category: t("news.matchReport"),
    },
    {
      id: "news-3",
      title: t("news.title3"),
      summary: t("news.summary3"),
      date: "2024-03-05",
      source: t("news.source3"),
      category: t("news.injury"),
    },
  ], []);

  const categories = useMemo(() => {
    const map: Record<string, string> = {};
    newsItems.forEach(item => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [newsItems]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("news.seasonNewsTitle")} />
      
      {/* 新闻统计概览 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile
          title={t("news.totalNews")}
          value={newsItems.length.toLocaleString()}
          subtitle={t("news.totalArticles")}
        />
        {categories && Object.entries(categories).length > 0 && (
          <StatTile
            title={t("news.categories")}
            value={Object.keys(categories).length.toString()}
            subtitle={t("news.categoryTypes")}
          />
        )}
      </div>

      {/* 新闻列表 */}
      {newsItems.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("news.latestNews")} />
          <div className="space-y-3">
            {newsItems.map(news => (
              <div
                key={news.id}
                className="border rounded p-3 flex items-start {news.category === 'transfer' ? 'bg-blue-50' : news.category === 'matchReport' ? 'bg-green-50' : 'bg-red-50'}"
              >
                <div className="flex-1">
                  <div className="font-medium truncate">{news.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{news.summary}</div>
                </div>
                <div className="ml-3 text-right text-xs">
                  <div>{t(`news.${news.date.split('-')[1]}月${news.date.split('-')[2]}日`)}</div>
                  <div>{t(`news.${news.category}`)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 无新闻提示 */}
      {newsItems.length === 0 && (
        <EmptyState
          title={t("news.noNewsTitle")}
          icon="📰"
          hint={t("news.noNewsHint")}
        />
      )}
    </Panel>
  );
}