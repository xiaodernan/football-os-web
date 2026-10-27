import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NewsArchiveAdvanced() {
  const { t } = useI18n();

  // 模拟进阶新闻归档数据
  const archiveYears = useMemo(() => [2022, 2023, 2024, 2025], []);
  const archiveNews = useMemo(() => {
    const news = [];
    const topics = ["transfer", "matchReport", "injury", "academy"];
    let id = 0;
    for (let year = 2022; year <= 2025; year++) {
      for (let i = 0; i < 5; i++) {
        news.push({
          id: `adv-${id++}`,
          title: `进阶新闻 ${year} ${i}`,
          summary: `这是${year}年的进阶新闻摘要 ${i}`,
          date: `${year}-0${i % 3 + 1}-15`,
          category: topics[i % topics.length],
          importance: i % 4 === 0 ? "high" : i % 2 === 0 ? "medium" : "low",
        });
      }
    }
    return news;
  }, []);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    archiveNews.forEach(news => {
      categoryCounts[news.category] = (categoryCounts[categoryCounts] || 0) + 1;
    });
    return map;
  }, [archiveNews]);

  const importanceCounts = useMemo(() => {
    const map: Record<string, number> = {};
    archiveNews.forEach(news => {
      importanceCounts[news.importance] = (importanceCounts[news.importance] || 0) + 1;
    });
    return map;
  }, [archiveNews]);

  const [selectedYear, setSelectedYear] = useMemo(() => archiveYears[0], []);
  const yearNews = useMemo(() => archiveNews.filter(news => news.date.startsWith(selectedYear)), [selectedYear, archiveNews]);
  const [selectedImportance, setSelectedImportance] = useState("all");

  const filteredNews = selectedImportance === "all"
    ? yearNews
    : yearNews.filter(news => news.importance === selectedImportance);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("news.advancedArchiveTitle")} />
      
      {/* 年份和重要性筛选 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* 年份筛选 */}
        <div>
          <SectionTitle title={t("news.yearFilter")} />
          {archiveYears.map(year => (
            <Button
              key={year}
              variant={selectedYear === year ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedYear(year)}
            >
              {t(`year.${year}`)}
            </Button>
          ))}
        </div>
        
        {/* 重要性筛选 */}
        <div>
          <SectionTitle title={t("news.importanceFilter")} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedImportance("all")}
          >
            {t("news.allImportance")}
          </Button>
          {importanceCounts && Object.keys(importanceCounts).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedImportance("high")}
            >
              {t(`importance.high`, { count: importanceCounts.high })} {t("news.news")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedImportance("medium")}
          >
            {t(`importance.medium`, { count: importanceCounts.medium })} {t("news.news")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedImportance("low")}
          >
            {t(`importance.low`, { count: importanceCounts.low })} {t("news.news")}
          </Button>
        </div>
      </div>

      {/* 重要性统计 */}
      {importanceCounts && Object.keys(importanceCounts).length > 0 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("news.importanceStats")} />
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(importanceCounts).map(([importance, count]) => (
              <div key={importance} className="border rounded p-2">
                <div className="font-medium">{t(`importance.${importance}`)}</div>
                <div className="text-xs text-muted-foreground">{count} {t("news.news")}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 新闻列表 */}
      {filteredNews.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("news.advancedNews")} />
          <div className="space-y-3">
            {filteredNews.map(news => (
              <div
                key={news.id}
                className="border rounded p-3 flex items-start {news.importance === 'high' ? 'bg-red-50' : news.importance === 'medium' ? 'bg-yellow-50' : 'bg-green-50'}"
              >
                <div className="flex-1">
                  <div className="font-medium truncate">{news.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{news.summary}</div>
                </div>
                <div className="ml-3 text-right text-xs">
                  <div>{t(`date.${news.date.split('-')[1]}月${news.date.split('-')[2]}日}`)}</div>
                  <div>{t(`importance.${news.importance}`)}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 无新闻提示 */}
      {filteredNews.length === 0 && (
        <EmptyState
          title={t("news.noArchiveTitle")}
          icon="📁"
          hint={t("news.noArchiveHint")}
        />
      )}
    </Panel>
  );
}