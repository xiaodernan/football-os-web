import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TacticalBoard() {
  const { t } = useI18n();

  // 模拟战术数据
  const tactics = useMemo(() => ({
    formation: "4-3-3",
    possession: 52,
    pressure: "High",
    offsideLine: "Advanced",
    lineOfEngagement: "Midfield",
  }), []);

  const [selectedTactic, setSelectedTactic] = useState<string | null>(null);

  const formations = useMemo(() => ([
    { id: "1", name: "4-3-3", description: "进攻型阵型，侧重宽度和突破" },
    { id: "2", name: "4-2-3-1", description: "平衡型阵型，攻防转换快" },
    { id: "3", name: "3-5-2", description: "控球型阵型，中场控制力强" },
    { id: "4", name: "4-4-2", description: "传统型阵型，防守稳固" },
    { id: "5", name: "4-5-1", description: "防守型阵型，侧重反击" },
  ] as const));

  return (
    <Panel className="p-6">
      <SectionTitle title={t("tacticalBoard.title") } />

      {/* 阵型选择 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("tacticalBoard.formationSelection") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("tacticalBoard.selectFormation")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {formations.map(form => (
            <Button
              key={form.id}
              variant={selectedTactic === form.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedTactic(form.id)}
            >
              {form.name}
            </Button>
          ))}
        </div>
      </Panel>

      {/* 战术概览 */}
      {selectedTactic && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("tacticalBoard.tacticalOverview") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("tacticalBoard.formation")}</div>
              <div className="text-2xl text-primary">{t(`formation.${formations.find(f => f.id === selectedTactic)?.name}`)}</div>
            </div>
            <div>
              <div className="font-medium">{t("tacticalBoard.possession")}</div>
              <div className="text-primary">{tactics.possession}%</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("tacticalBoard.pressure")}</div>
              <div className={tactics.pressure === "High" ? "text-danger" : tactics.pressure === "Medium" ? "text-warning" : "text-success"}>
                {tactics.pressure}
              </div>
            </div>
            <div>
              <div className="font-medium">{t("tacticalBoard.offsideLine")}</div>
              <div className={tactics.offsideLine === "Advanced" ? "text-danger" : "text-warning"}>
                {tactics.offsideLine}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* 战术图 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("tacticalBoard.tacticalVisual") } />
        <p className="text-sm text-muted-foreground">
          {t("tacticalBoard.formationDescription", { formation: t(`formation.${formations.find(f => f.id === selectedTactic)?.name}`) })}
        </p>
        {/* 这里可以放置战术图的可视化 */}
        <div className="border rounded p-8 bg-gray-100 min-h-64">
          <p className="text-center text-muted-foreground py-16">
            {t("tacticalBoard.tacticalDiagramPlaceholder")}
          </p>
        </div>
      </Panel>

      {/* 战术指令 */}
      <Panel className="p-4">
        <SectionTitle title={t("tacticalBoard.tacticalInstructions") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("tacticalBoard.instructions")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("tacticalBoard.attackInstructions")}</li>
          <li>{t("tacticalBoard.defenseInstructions")}</li>
          <li>{t("tacticalBoard.midfieldInstructions")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}