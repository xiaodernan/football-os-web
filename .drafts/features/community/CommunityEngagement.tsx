import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommunityEngagement() {
  const { t } = useI18n();

  // 模拟社区参与度数据
  const engagement = useMemo(() => ({
    totalPosts: 1248,
    totalComments: 5234,
    totalLikes: 8920,
    activeUsersToday: 342,
    activeUsersWeekly: 1890,
    sharingRate: 67,
  }), []);

  const participationRates = useMemo(() => ({
    postRate: 45,
    commentRate: 78,
    likeRate: 89,
    shareRate: engagement.sharingRate,
  }), [engagement]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("community.engagementTitle")} />

      {/* 参与度概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("community.totalPosts")}
          value=engagement.totalPosts.toLocaleString()
          subtitle={t("community.posts)}
        />
        <StatTile
          title={t("community.totalComments")}
          value=engagement.totalComments.toLocaleString()
          subtitle={t("community.comments)}
        />
        <StatTile
          title={t("community.totalLikes")}
          value=engagement.totalLikes.toLocaleString()
          subtitle={t("community.likes)}
        />
        <StatTile
          title={t("community.activeUsersToday")}
          value=engagement.activeUsersToday.toLocaleString()
          subtitle={t("community.activeToday)}
        />
      </div>

      {/* 参与率分布 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("community.participationRates")} />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(participationRates).map(([type, rate]) => (
            <div
              key={type}
              className="border rounded p-3 text-center"
            >
              <div className="font-medium">{t(`community.${type}`)}</div>
              <div className="text-3xl font-bold ${type === "shareRate" ? "text-primary" : type === "likeRate" ? "text-success" : "text-info"}">
                {rate}%
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 行动号召 */}
      <Panel className="p-4">
        <SectionTitle title={t("community.getInvolved")} />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" size="lg" onClick={() => window.alert(t("community.startDiscussion"))}>
            {t("community.startNewDiscussion")}
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.alert(t("community.shareYourView"))}>
            {t("community.shareYourView")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("community.everyoneWelcome")}
        </p>
      </Panel>
    </Panel>
  );
}