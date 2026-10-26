import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MediaLibrary() {
  const { t } = useI18n();

  // 模拟媒体库数据
  const mediaItems = useMemo(() => [
    { id: "media-1", type: "video", title: t("media.highlights"), uploadDate: "2024-03-15", views: 1254 },
    { id: "media-2", type: "image", title: t("media.gallery1"), uploadDate: "2024-03-10", views: 892 },
    { id: "media-3", type: "video", title: t("media.interview"), uploadDate: "2024-03-05", views: 2341 },
    { id: "media-4", type: "image", title: t("media.tactical"), uploadDate: "2024-02-28", views: 678 },
  ], []);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    mediaItems.forEach(item => {
      map[item.type] = (map[item.type] || 0) + 1;
    });
    return map;
  }, [mediaItems]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("media.mediaLibraryTitle")} />
      
      {/* 媒体统计概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("media.totalMedia")}
          value=mediaItems.length.toLocaleString()
          subtitle={t("media.totalItems")}
        />
        <StatTile
          title={t("media.totalViews")}
          value=(mediaItems.reduce((sum, item) => sum + item.views, 0)).toLocaleString()
          subtitle={t("media.totalViews")}
        />
      </div>

      {/* 媒体类型分布 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("media.mediaTypes")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(typeCounts).map(([type, count]) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
            >
              {t(`media.${type}`)} {count}
            </Button>
          ))}
        </div>
      </Panel>

      {/* 媒体项列表 */}
      <Panel className="p-4">
        <SectionTitle title={t("media.mediaItems")} />
        <div className="grid grid-cols-3 gap-3">
          {mediaItems.map(media => (
            <div
              key=media.id
              className="border rounded p-2 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <div className="w-full h-24 rounded-md overflow-hidden bg-gray-200">
                {media.type === "video" ? (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm">
                    ▶️
                  </div>
                ) : (
                  <div className="w-full h-full bg-green-500 flex items-center justify-center text-white text-sm">
                    📷
                  </div>
                )}
              </div>
              <div className="text-center text-xs mt-1">
                {media.title}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {media.views} {t("media.views")}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}