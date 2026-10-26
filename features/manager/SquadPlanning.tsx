import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SquadPlanning() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);
  const [formation, setFormation] = useState<string | null>(null);

  const formationOptions = useMemo(() => ["4-4-2", "4-3-3", "3-5-2", "5-3-2", "4-2-3-1"], []);

  // 获取首发阵容（Overall最高的11名）
  const startingXI = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.overall - a.overall);
    return sorted.slice(0, 11);
  }, [players]);

  // 获取替补阵容
  const substitutes = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.overall - a.overall);
    return sorted.slice(11);
  }, [players]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.squadPlanningTitle")} />
      
      {/* 阵型选择 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {formationOptions.map(fmt => (
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

      {/* 首发阵容 */}
      {formation && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("manager.startingXI", { formation })} />
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
      {!formation && (
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
                    {{p.name}[0]}
                  </div>
                </div>
                <div className="text-center text-xs font-medium mt-1">
                  {{p.name}}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {{p.overall}}★
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 战术说明 */}
      {!formation && (
        <Panel className="p-4">
          <SectionTitle title={t("manager.tacticalSetup")} />
          <p className="text-sm text-muted-foreground">
            {t("manager.chooseFormation")}
          </p>
        </Panel>
      )}
    </Panel>
  );
}