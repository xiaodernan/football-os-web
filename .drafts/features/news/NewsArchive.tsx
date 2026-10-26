import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewsArchive() {
  const { t } = useI18n();

  // 模拟新闻归档数据
  const archiveYears = useMemo(() => [2022, 2023, 2024], []);
  const archiveNews = useMemo(() => {
    const news = [];
    const topics = ["transfer", "matchReport", "injury", "academy"];
    for (let year = 2022; year <= 2024; year++) {
      for (let i = 0; i < 8; i++) {
        news.push({
          id: `${year}-${i}`,
          title: `新闻标题 ${year} ${i}`,
          summary: `这是${year}年的新闻摘要 ${i}`,
          date: `${year}-0${i % 3 + 1}-15`,
          category: topics[i % topics.length],
        });
      }
    }
    return news;
  }, []);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    archiveNews.forEach(news => {
      categoryCounts[news.category] = (categoryCounts[news.category] || 0) + 1;
    });
    return map;
  }, [archiveNews]);

  const selectedYear = useMemo(() => archiveYears[0], [archiveYears]);

  const yearNews = useMemo(() => {
    return archiveNews.filter(news => news.date.startsWith(selectedYear));
  }, [selectedYear, archiveNews]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("news.archiveTitle")} />
      
      {/* 年份筛选 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {archiveYears.map(year => (
          <Button
            key={year}
            variant={selectedYear === year ? "primary" : "outline"}
            size="sm"
            onClick={() => {/* year筛选 */}}
          >
            {t(`year.${year}`)}
          </Button>
        ))}
      </div>

      {/* 类别统计 */}
      {categoryCounts && Object.keys(categoryCounts).length > 0 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("news.categories")} />
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
              >
                {t(`category.${category}`)} {count}
              </Button>
            ))}
          </div>
        </Panel>
      )}

      {/* 新闻列表 */}
      {yearNews.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("news.archivedNews")} />
          <div className="space-y-3">
            {yearNews.map(news => (
              <div
                key=news.id
                className="border rounded p-3 flex items-start {news.category === 'transfer' ? 'bg-blue-50' : news.category === 'matchReport' ? 'bg-green-50' : 'bg-red-50'}"
              >
                <div className="flex-1">
                  <div className="font-medium truncate">{news.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{news.summary}</div>
                </div>
                <div className="ml-3 text-right text-xs">
                  <div>{t(`date.${news.date}`)}</div>
                  <div>{t(`category.${news.category}`)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 无归档新闻提示 */}
      {yearNews.length === 0 && (
        <EmptyState
          title={t("news.noArchiveTitle")}
          icon="📁"
          hint={t("news.noArchiveHint")}
        />
      )}
    </Panel>
  );
}