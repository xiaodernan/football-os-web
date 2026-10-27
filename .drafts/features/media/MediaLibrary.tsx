import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MediaLibrary() {
  const { t } = useI18n();

  // 模拟媒体库数据
  const mediaItems = useMemo(() => ([
    { id: "1", title: "赛季精华集锦", type: "video", duration: "5:32", views: 12540, uploaded: "2024-05-15", status: "published" },
    { id: "2", title: "最佳进球候选", type: "video", duration: "3:18", views: 8920, uploaded: "2024-05-10", status: "published" },
    { id: "3", title: "赛后新闻发布会", type: "video", duration: "12:45", views: 6800, uploaded: "2024-05-08", status: "published" },
    { id: "4", title: "教练赛后访谈", type: "video", duration: "8:22", views: 4500, uploaded: "2024-05-05", status: "published" },
    { id: "5", title: "战术分析：4-3-3体系", type: "video", duration: "6:40", views: 3200, uploaded: "2024-05-02", status: "published" },
    { id: "6", title: "球员训练花絮", type: "video", duration: "4:15", views: 2800, uploaded: "2024-04-30", status: "published" },
    { id: "7", title: "赛季数据可视化", type: "image", duration: "N/A", views: 5600, uploaded: "2024-05-12", status: "published" },
    { id: "8", title: "转会市场分析报告", type: "document", duration: "N/A", views: 1200, uploaded: "2024-05-01", status: "published" },
  ] as const));

  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    mediaItems.forEach(item => {
      map[item.status] = (map[item.status] || 0) + 1;
    });
    return map;
  }, [mediaItems]);

  const handleSelectMedia = (mediaId: string) => {
    setSelectedMedia(mediaId);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("media.mediaLibraryTitle")} />

      {/* 概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("media.totalItems")}
          value={mediaItems.length.toString()}
          subtitle={t("media.mediaCount")}
        />
        <StatTile
          title={t("media.published")}
          value={statusCounts.published?.toString() || "0"}
          subtitle={t("media.publishedStatus")}
        />
      </div>

      {/* 分类筛选 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("media.filterByType")} />
        <div className="grid grid-cols-3 gap-2">
          {["all", "video", "image", "document"].map(type => (
            <Button
              key={type}
              variant={type === "all" ? "primary" : "outline"}
              size="sm"
            >
              {t(`type.${type}`)} {t(`count.${type}`, { count: mediaItems.filter(m => m.type === type).length })}
            </Button>
          ))}
        </div>
      </Panel>

      {/* 媒体项列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("media.mediaItems")} />
        <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
          {mediaItems.map(item => (
            <div
              key={item.id}
              className={`border rounded p-2 flex flex-col hover:bg-gray-50 transition cursor-pointer ${
                item.status === "published" ? "bg-white" : "bg-gray-50"
              }`}
            >
              <div className="h-24 rounded-md overflow-hidden bg-gray-200">
                {item.type === "video" ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm">视频</div>
                ) : item.type === "image" ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm">图片</div>
                ) : (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm">文档</div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div className="font-truncate line-clamp-1">{item.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {t(`type.${item.type}`)} · {t(`uploaded.${item.uploaded.split("-")[1]}`)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.alert(t("media.viewAllMedia"))}
        >
          {t("media.viewAll")}
        </Button>
      </Panel>
    </Panel>
  );
}