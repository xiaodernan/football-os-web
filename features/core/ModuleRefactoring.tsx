import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModuleRefactoring() {
  const { t } = useI18n();

  // 模拟模块重构数据
  const modules = useMemo(() => ({
    totalModules: 34,
    refactoredModules: 28,
    refactoringRate: 82,
    remainingModules: 6,
    lastRefactor: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1周前
    benefits: [
      { name: "性能提升", reduction: "23%" },
      { name: "代码体积", reduction: "15%" },
      { name: "构建速度", improvement: "31%" },
      { name: "类型安全", status: "completed" },
    ],
  }), []);

  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("core.moduleRefactoringTitle")} />

      {/* 重构概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("totalModules")}
          value=modules.totalModules.toString()
          subtitle={t("core.modules)}
        />
        <StatTile
          title={t("refactoredModules")}
          value=modules.refactoredModules.toString()
          subtitle={t("core.refactored)}
        />
        <StatTile
          title={t("refactoringRate")}
          value=`${modules.refactoringRate}%`
          subtitle={t("core.completed)}
          variant={modules.refactoringRate > 80 ? "primary" : "warning"}
        />
        <StatTile
          title={t("remainingModules")}
          value=modules.remainingModules.toString()
          subtitle={t("core.remaining)}
        />
      </div>

      {/* 重构效益 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("refactoringBenefits")} />
        <div className="grid grid-cols-2 gap-3">
          {modules.benefits.map(benefit => (
            <div key={benefit.name} className={`border rounded p-3 ${
              benefit.status === "completed" ? "bg-green-50" : "bg-gray-50"
            }`}
            >
              <div className="font-medium">{t(`benefit.${benefit.name}`)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {benefit.reduction || benefit.improvement || ""}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 进度条 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("refactoringProgress")} />
        <div className="bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-primary rounded-full h-3 rounded-full"
            style={{ width: modules.refactoringRate + "%" }}
          >
            <span className="text-primary text-sm font-medium ml-2">
              {modules.refactoringRate}%
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {t("core.refactoringCompletion", { completed: modules.refactoredModules, total: modules.totalModules }) }
        </p>
      </Panel>

      {/* 最近重构 */}
      <Panel className="p-4">
        <SectionTitle title={t("recentRefactors")} />
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {["模块导入优化", "组件拆分", "Hooks提取", "类型定义重组"].map((item, index) => (
            <div key={index} className={`border rounded p-2 flex items-start ${
              index % 2 === 0 ? "bg-blue-50" : "bg-green-50"
            }`}
            >
              <div className="flex-1">
                <div className="font-medium">{item}</div>
                <div className="text-xs text-muted-foreground">
                  {t("core.ago", { days: index + 1 })} 完成
                </div>
              </div>
              <div className="ml-3 text-primary text-sm">
                ✓
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 行动 */}
      <Panel className="p-4">
        <SectionTitle title={t("nextSteps")} />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" size="sm">
            {t("startNewRefactor")}
          </Button>
          <Button variant="outline" size="sm">
            {t("viewFullReport")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("core.nextRefactorScheduled", { date: modules.lastRefactor.toLocaleDateString() }) }
        </p>
      </Panel>
    </Panel>
  );
}