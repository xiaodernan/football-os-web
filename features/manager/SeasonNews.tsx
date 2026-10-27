import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonNews() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟赛季新闻数据
  const news = useMemo(() => ([
    { id: "1", title: "本赛季最佳球员揭晓", content: "经验丰富的前锋凭借 28 球领跑射手榜", date: `${currentYear}-05-15`, category: "award" },
    { id: "2", title: "转会市场活跃", content: "夏季转会窗口将于 6 月开启，多名核心球员可能离队", date: `${currentYear}-05-10`, category: "transfer" },
    { id: "3", title: "伤病更新", content: "主力中场将缺席剩余 3 场比赛，恢复训练中", date: `${currentYear}-05-08`, category: "injury" },
    { id: "4", title: "青训毕业生首发", content: "U19 学院球员本轮联赛首发，表现获主教练好评", date: `${currentYear}-05-05`, category: "academy" },
    { id: "5", title: "战术调整", content: "主帅宣布采用 4-3-3 阵型，旨在提升中场控制力", date: `${currentYear}-05-02`, category: "tactical" },
  ] as const));

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    news.forEach(n => {
      map[n.category] = (map[n.category] || 0) + 1;
    });
    return map;
  }, [news]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.seasonNewsTitle")} />

      {/* 新闻概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.totalNews")}
          value=news.length.toString()
          subtitle={t("manager.newsCount)}
        />
        <StatTile
          title={t("manager.categories")}
          value=Object.keys(categories).length.toString()
          subtitle={t("manager.categoryCount)}
        />
      </div>

      {/* 分类筛选 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.filterByCategory")} />
        <div className="grid grid-cols-3 gap-2">
          {["all", "award", "transfer", "injury", "academy", "tactical"].map(cat => (
            <Button
              key={cat}
              variant={cat === "all" ? "primary" : "outline"}
              size="sm"
            >
              {t(`category.${cat}`)} {t(`categoryCount.${cat}`, { count: categories[cat] || 0 })}
            </Button>
          ))}
        </div>
      </Panel>

      {/* 最新新闻列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.latestNews")} />
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {news.map(n => (
            <div
              key={n.id}
              className={`border rounded p-3 flex items-start ${
                n.category === "award" ? "bg-blue-50" :
                n.category === "transfer" ? "bg-green-50" :
                n.category === "injury" ? "bg-red-50" :
                n.category === "academy" ? "bg-orange-50" :
                n.category === "tactical" ? "bg-purple-50" : "bg-gray-50"
              }`}
            >
              <div className="flex-1">
                <div className="font-medium truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground">{t(`category.${n.category}`)}</div>
              </div>
              <div className="ml-3 text-xs text-muted-foreground">
                {t("manager.on", { date: n.date.split("-")[1] + "月" + n.date.split("-")[2] + "日" })}
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.alert(t("manager.viewAllNews"))}
        >
          {t("manager.viewAll")}
        </Button>
      </Panel>
    </Panel>
  );
}