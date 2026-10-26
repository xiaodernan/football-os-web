import { useMemo } from "react";
import { Panel, SectionTitle, StatTile } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EnhancedCharts() {
  const { t } = useI18n();

  return (
    <Panel className="p-6">
      <SectionTitle title={t("charts.enhancedTitle")} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("charts.lineChart")}
          value="线性趋势图"
          subtitle={t("charts.showTrends")}
        />
        <StatTile
          title={t("charts.barChart")}
          value="柱形对比图"
          subtitle={t("charts.compareData")}
        />
        <StatTile
          title={t("charts.pieChart")}
          value="饼图分布"
          subtitle={t("charts.showDistribution")}
        />
        <StatTile
          title={t("charts.areaChart")}
          value="区域图累计"
          subtitle={t("charts.showAccumulation")}
        />
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("charts.customization")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("charts.interactiveTips")}
        </p>
        <Button variant="outline" size="sm">
          {t("charts.moreOptions")}
        </Button>
      </Panel>
    </Panel>
  );
}