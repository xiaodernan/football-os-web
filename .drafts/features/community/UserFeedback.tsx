import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UserFeedback() {
  const { t } = useI18n();

  // 模拟用户反馈数据
  const feedback = useMemo(() => ([
    { id: "1", user: "JohnDoe", rating: 5, title: "界面很棒", content: "操作流畅，界面美观", date: "2024-05-20", status: "resolved" },
    { id: "2", user: "Maria Garcia", rating: 4, title: "功能强大", content: "各项功能齐全，值得购买", date: "2024-05-18", status: "resolved" },
    { id: "3", user: "CoachMike", rating: 3, title: "一般般", content: "还可以，但有提升空间", date: "2024-05-15", status: "in-progress" },
    { id: "4", user: "Sarah Chen", rating: 2, title: "存在 bug", content: "转会页面卡顿", date: "2024-05-12", status: "open" },
    { id: "5", user: "Alex Smith", rating: 1, title: "糟糕体验", content: "无法登录，请修复", date: "2024-05-10", status: "open" },
  ] as const));

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    feedback.forEach(f => {
      map[f.status] = (map[f.status] || 0) + 1;
    });
    return map;
  }, [feedback]);

  const ratingCounts = useMemo(() => {
    const map: Record<number, number> = {};
    feedback.forEach(f => {
      ratingCounts[f.rating] = (ratingCounts[f.rating] || 0) + 1;
    });
    return ratingCounts;
  }, [feedback]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("community.feedbackTitle")} />

      {/* 反馈概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("totalFeedback")}
          value={feedback.length.toString()}
          subtitle={t("feedbackCount")}
        />
        <div>
          <SectionTitle title={t("statusDistribution")} />
          <div className="grid grid-cols-3 gap-2">
            {["open", "in-progress", "resolved"].map(status => (
              <div key={status} className="border rounded p-2 text-center">
                <div className="font-medium">{t(`status.${status}`)}</div>
                <div className={`text-2xl font-bold ${status === "open" ? "text-red-600" : status === "in-progress" ? "text-yellow-600" : "text-green-600"}`}>
                  {statusCounts[status] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 评分分布 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("ratingDistribution")} />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(rating => (
            <div key={rating} className="border rounded p-2 text-center">
              <div className={`text-2xl font-bold ${rating <= 2 ? "text-red-600" : rating <= 4 ? "text-warning" : "text-green-600"}`}>
                {rating}★
              </div>
              <div className="text-sm text-muted-foreground">{ratingCounts[rating] || 0}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 未解决的反馈 */}
      {statusCounts.open > 0 && (
        <Panel className="p-4 mb-6" style={{ borderColor: "red" }}>
          <SectionTitle title={t("unresolvedFeedback")} />
          <p className="text-red-600 mb-3">
            {t("openCount", { count: statusCounts.open })}
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {feedback.filter(f => f.status === "open").map(f => (
              <div key={f.id} className="border rounded p-3 flex items-start bg-red-50">
                <div className="flex-1">
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-red-500 mt-1">{f.content}</div>
                </div>
                <div className="ml-3 text-red-500 text-sm">
                  {t("submitted", { date: f.date.split("-")[1] + "/" + f.date.split("-")[2] })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 已解决的反馈 */}
      {statusCounts.resolved > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("resolvedFeedback")} />
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {feedback.filter(f => f.status === "resolved").map(f => (
              <div key={f.id} className="border rounded p-3 flex items-start bg-green-50">
                <div className="flex-1">
                  <div className="font-medium">{f.title}</div>
                  <div className="text-xs text-green-600 mt-1">{t("resolved")}</div>
                </div>
                <div className="ml-3 text-green-500 text-sm">
                  {t("submitted", { date: f.date.split("-")[1] + "/" + f.date.split("-")[2] })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Panel>
  );
}