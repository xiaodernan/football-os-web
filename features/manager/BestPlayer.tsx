import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function BestPlayer() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  // 根据潜能和综合评分选出最佳球员
  const bestPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      // 综合评分：潜能权重60% + 综合评分权重40%
      const scoreA = a.potential * 0.6 + a.overall * 0.4;
      const scoreB = b.potential * 0.6 + b.overall * 0.4;
      return scoreB - scoreA;
    }).slice(0, 5); // 选出前5名
  }, [players]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.bestPlayerTitle")} />

      {/* 最佳球员概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("manager.topPlayers")} />
          <ol className="list-decimal list-inside space-y-2">
            {bestPlayers.map((p, index) => (
              <li key={p.id} className="p-2 border rounded">
                <div className="font-medium">{t(`player.rank${index + 1}`)}: {p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {t("player.overall")}: {p.overall}★, {t("player.potential")}: {p.potential}★
                </div>
              </div>
            ))}
          </ol>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("manager.playerMetrics")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("player.overall")}</div>
              <div className="text-3xl font-bold text-primary">平均 {Math.round(bestPlayers.reduce((sum, p) => sum + p.overall, 0) / bestPlayers.length)}★</div>
            </div>
            <div>
              <div className="font-medium">{t("player.potential")}</div>
              <div className="text-3xl font-bold text-green-600">平均 {Math.round(bestPlayers.reduce((sum, p) => sum + p.potential, 0) / bestPlayers.length)}★</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 最佳球员详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.bestPlayerDetails")} />
        {bestPlayers.map((p, index) => (
          <div
            key={p.id}
            className={`border rounded p-3 mb-3 ${
              index === 0 ? "bg-primary-100 text-primary" : "bg-gray-50"
            }`}
          >
            <div className="font-medium">{t(`player.rank${index + 1}`)}: {p.name}</div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <div className="font-medium">{t("player.overall")}</div>
                <div className="text-2xl text-primary">{p.overall}★</div>
              </div>
              <div>
                <div className="font-medium">{t("player.potential")}</div>
                <div className="text-2xl text-green-600">{p.potential}★</div>
              </div>
            </div>
            <div>
              <div className="font-medium">{t("player.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("player.position")}</div>
              <div className="text-muted-foreground">{p.position}</div>
            </div>
          </div>
        ))}
      </Panel>
    </Panel>
  );
}