import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TacticalStudio() {
  const { t } = useI18n();
  const formations = useMemo(() => ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-2-3-1"], []);
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("tactical.studioTitle")} />
        
        {/* 阵型选择 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {formations.map(fmt => (
            <Button
              key={fmt}
              variant={selectedFormation === fmt ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFormation(fmt)}
            >
              {t(fmt)}
            </Button>
          ))}
        </div>

        {/* 战术画布占位 */}
        {selectedFormation && (
          <Panel className="p-4">
            <SectionTitle title={t("tactical.formationSelected", { formation: selectedFormation })} />
            <p className="text-muted-foreground mt-2">
              {t("tactical.dragPlayers", { formation: selectedFormation })}。点击下方阵型可开始编辑。
            </p>
          </Panel>
        )}

        {/* 常用战术快捷键 */}
        {!selectedFormation && (
          <Panel className="p-4">
            <SectionTitle title={t("tactical.quickFormations")} />
            <p className="text-muted-foreground mb-3">
              {t("tactical.clickToSelect")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {formations.slice(0, 5).map(fmt => (
                <Button
                  key={fmt}
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedFormation(fmt)}
                >
                  {fmt}
                </Button>
              ))}
            </div>
          </Panel>
        )}
      </Panel>
    </div>
  );
}