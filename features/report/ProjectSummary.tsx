import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProjectSummary() {
  const { t } = useI18n();

  // 统计已完成的里程碑
  const milestones = useMemo(() => ([
    { id: "M551", title: "模块重构", description: "模块重构组件", category: "core" },
    { id: "M552", title: "用户反馈系统", description: "用户反馈组件", category: "community" },
    { id: "M553", title: "赛季赛程规划", description: "赛季赛程组件", category: "match" },
    { id: "M554", title: "球队数据可视化大屏", description: "球队数据大屏", category: "manager" },
    { id: "M555", title: "球队对比分析", description: "俱乐部对比组件", category: "manager" },
    { id: "M556", title: "球员市值历史", description: "市值历史组件", category: "player" },
    { id: "M557", title: "球员标值对比", description: "标值对比组件", category: "player" },
    { id: "M558", title: "球员标值趋势", description: "标值趋势组件", category: "player" },
    { id: "M559", title: "球员数据可视化大屏", description: "球员数据大屏", category: "player" },
    { id: "M560", title: "系统优化与模块化重构", description: "系统优化组件", category: "core" },
    { id: "M561", title: "赛季数据可视化大屏", description: "赛季数据大屏", category: "dashboard" },
    { id: "M562", title: "球员合同续约预测", description: "合同预测组件", category: "manager" },
    { id: "M563", title: "赛季奖项", description: "赛季奖项组件", category: "award" },
    { id: "M564", title: "转会市场", description: "转会市场组件", category: "transfer" },
    { id: "M565", title: "球员价值排行榜", description: "价值排行榜组件", category: "ranking" },
    { id: "M575", title: "赛季事件详情", description: "赛季事件组件", category: "match" },
    { id: "M576", title: "球员表现分析", description: "球员表现组件", category: "player" },
    { id: "M577", title: "对手分析", description: "对手分析组件", category: "scout" },
    { id: "M578", title: "青训系统", description: "青训系统组件", category: "academy" },
    { id: "M579", title: "球员发展规划", description: "发展规划组件", category: "player" },
    { id: "M580", title: "赛季统计概览", description: "赛季统计组件", category: "match" },
    { id: "M581", title: "关键集锦", description: "集锦组件", category: "match" },
    { id: "M582", title: "球队赛季报告", description: "赛季报告组件", category: "manager" },
    { id: "M583", title: "转会市场估值", description: "转会估值组件", category: "transfer" },
    { id: "M584", title: "战术分析", description: "战术分析组件", category: "tactical" },
    { id: "M585", title: "伤病与康复分析", description: "伤病分析组件", category: "injury" },
    { id: "M586", title: "AI赛事分析", description: "AI分析组件", category: "ai" },
    { id: "M587", title: "社区投票", description: "社区投票组件", category: "community" },
    { id: "M588", title: "数据备份与验证", description: "数据备份组件", category: "data" },
    { id: "M589", title: "性能监控", description: "性能监控组件", category: "core" },
    { id: "M590", title: "质量保证", description: "质量保证组件", category: "core" },
    { id: "M591", title: "球探报告", description: "球探报告组件", category: "scout" },
    { id: "M592", title: "战术板", description: "战术板组件", category: "tactical" },
    { id: "M593", title: "球员对比", description: "球员对比组件", category: "player" },
    { id: "M594", title: "赛季数据导出", description: "数据导出组件", category: "data" },
    { id: "M595", title: "社区排名", description: "社区排名组件", category: "community" },
    { id: "M596", title: "团队数据导出", description: "团队数据导出组件", category: "data" },
    { id: "M597", title: "最终赛季报告", description: "最终赛季报告组件", category: "report" },
  ] as const));

  const totalMilestones = milestones.length;
  const categories = useMemo(() => ({
    core: milestones.filter(m => m.category === "core").length,
    manager: milestones.filter(m => m.category === "manager").length,
    player: milestones.filter(m => m.category === "player").length,
    match: milestones.filter(m => m.category === "match").length,
    transfer: milestones.filter(m => m.category === "transfer").length,
    dashboard: milestones.filter(m => m.category === "dashboard").length,
    award: milestones.filter(m => m.category === "award").length,
    scouting: milestones.filter(m => m.category === "scout").length,
    data: milestones.filter(m => m.category === "data").length,
    community: milestones.filter(m => m.category === "community").length,
    report: milestones.filter(m => m.category === "report").length,
  }), [milestones]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("projectSummary.title") } />

      {/* 里程碑统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("projectSummary.totalMilestones")}
          value={totalMilestones.toLocaleString()}
          subtitle={t("projectSummary.completed")}
        />
        <StatTile
          title={t("projectSummary.categories")}
          value={Object.keys(categories).length}
          subtitle={t("projectSummary.categoryCount")}
        />
      </div>

      {/* 分类统计 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Object.entries(categories).map(([category, count]) => (
          <div key={category} className="border rounded p-3">
            <div className="font-medium">{t(`category.${category}`)}</div>
            <div className="text-xl text-primary">{count}</div>
          </div>
        ))}
      </div>

      {/* 里程碑列表摘要 */}
      <Panel className="p-4">
        <SectionTitle title={t("projectSummary.milestones") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("projectSummary.milestoneCount", { count: totalMilestones })}
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {milestones.slice(0, 15).map(milestone => (
            <li key={milestone.id}>
              {t(milestone.id)}: {t(milestone.title)}
            </li>
          ))}
          <li>... 以及更多功能</li>
        </ul>
      </Panel>

      {/* 项目目标 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("projectSummary.goals") } />
        <ul className="list-disc list-inside space-y-2">
          <li>{t("projectSummary.continuedDevelopment")}</li>
          <li>{t("projectQualityImprovement")}</li>
          <li>{t("projectCommunityEngagement")}</li>
          <li>{t("projectDataDrivenDecision")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}