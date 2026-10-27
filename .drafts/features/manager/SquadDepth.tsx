import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SquadDepth() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);

  const formationOptions = useMemo(() => ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-2-3-1"], []);

  // 获取首发阵容（Overall最高的11名）
  const startingXI = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.overall - a.overall);
    return sorted.slice(0, 11);
  }, [players]);

  // 获取替补阵容（Overall最低的8名）
  const substitutes = useMemo(() => {
    const sorted = [...players].sort((a, b) => a.overall - b.overall);
    return sorted.slice(0, 8);
  }, [players]);

  const avgStartingXI = useMemo(() => {
    if (startingXI.length === 0) return 0;
    return startingXI.reduce((sum, p) => sum + p.overall, 0) / startingXI.length;
  }, []);

  const avgSubstitutes = useMemo(() => {
    if (substitutes.length === 0) return 0;
    return substitutes.reduce((sum, p) => sum + p.overall, 0) / substitutes.length;
  }, []);

  const formationDiff = useMemo(() => {
    if (avgStartingXI > avgSubstitutes) {
      return `${t("manager.betterDepth", { diff: (avgStartingXI - avgSubstitutes).toFixed(1) })}`;
    } else {
      return `${t("manager.shallowerDepth", { diff: (avgSubstitutes - avgStartingXI).toFixed(1) })}`;
    }
  }, [avgStartingXI, avgSubstitutes]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.squadDepthTitle")} />
      
      {/* 阵型选择 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {formationOptions.map(fmt => (
          <Button
            key={fmt}
            variant={selectedFormation === fmt ? "primary" : "outline"}
            size="sm"
            onClick={() => setSelectedFormation(fmt)}
          >
            {t(fmt)}
          </Button>
        ))}
      </div>

      {/* 阵容深度概览 */}
      {selectedFormation && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("manager.squadDepth", { formation: selectedFormation })} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("manager.avgStartingXI")}
              value={`${avgStartingXI.toFixed(1)}★`}
              subtitle={t("manager.avgRating")}
            />
            <StatTile
              title={t("manager.avgSubstitutes")}
              value={`${avgSubstitutes.toFixed(1)}★`}
              subtitle={t("manager.avgRating")}
            />
          </div>
          <StatTile
            title={t("manager.depthAnalysis")}
            value={avgStartingXI > avgSubstitutes ? t("manager.betterDepth") : t("manager.shallowerDepth")}
            subtitle={t("manager.depthAnalysisSub")}
            variant={avgStartingXI > avgSubstitutes ? "primary" : "destructive"}
          />
        </Panel>
      )}

      {/* 首发阵容 */}
      {selectedFormation && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("manager.startingXI", { formation: selectedFormation })} />
          <div className="grid grid-cols-4 gap-3">
            {startingXI.map((p, i) => (
              <div
                key={p.id}
                className="border rounded p-2 text-center"
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-primary">{p.overall}★</div>
                <div className="text-xs text-muted-foreground">{p.position}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 替补阵容 */}
      {!selectedFormation && (
        <Panel className="p-4">
          <SectionTitle title={t("manager.substitutes")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("manager.selectFormation")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {substitutes.slice(0, 5).map(p => (
              <div
                key={p.id}
                className="border rounded p-1 hover:bg-primary/5 cursor-pointer"
              >
                <div className="w-full h-16 rounded-md overflow-hidden bg-gray-200">
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm">
                    {p.name[0]}
                  </div>
                </div>
                <div className="text-center text-xs font-medium mt-1">
                  {p.name}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {p.overall}★
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </Panel>
  );
}