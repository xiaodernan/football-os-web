import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TacticalEditor() {
  const { t } = useI18n();
  const formations = useMemo(() => ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-2-3-1"], []);
  const [formation, setFormation] = useState<string | null>(null);
  const [mentality, setMentality] = useState<string>("attacking");
  const [customInstructions, setCustomInstructions] = useState<string>("");

  const formationsData = {
    "4-4-2": { width: "100%", depth: "balanced" },
    "4-3-3": { width: "110%", depth: "attacking" },
    "3-5-2": { width: "95%", depth: "control" },
    "5-3-2": { width: "90%", depth: "defensive" },
    "4-2-3-1": { width: "105%", depth: "mixed" }
  };

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("tactical.editorTitle")} />
        
        {/* 阵型选择 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {formations.map(fmt => (
            <Button
              key={fmt}
              variant={formation === fmt ? "primary" : "outline"}
              size="sm"
              onClick={() => setFormation(fmt)}
            >
              {t(fmt)}
            </Button>
          ))}
        </div>

        {/* 战术参数 */}
        {formation && (
          <Panel className="p-4">
            <SectionTitle title={t("tactical.formation", { formation })} />
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("tactical.mentality")}</label>
                <select
                  value={mentality}
                  onChange={(e) => setMentality(e.target.value)}
                  className="w-full rounded border px-2 py-1 text-sm"
                >
                  <option value="attacking">{t("tactical.attacking")}</option>
                  <option value="balanced">{t("tactical.balanced")}</option>
                  <option value="defensive">{t("tactical.defensive")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("tactical.instructions")}</label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  className="w-full rounded border px-2 py-1 text-sm"
                  placeholder={t("tactical.tacticalNotes")}
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => window.alert(t("tactical.editorSaved", { formation, mentality, instructions: customInstructions.substring(0, 30) + (customInstructions.length > 30 ? "..." : "") }))}
            >
              {t("tactical.save")}
            </Button>
          </Panel>
        )}

        {/* 无选择提示 */}
        {!formation && (
          <EmptyState
            title={t("tactical.selectFormation")}
            icon="⚽"
            hint={t("tactical.selectFormationHint")}
          />
        )}
      </Panel>
    </div>
  );
}