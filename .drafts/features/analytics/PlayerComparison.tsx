import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerComparison() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId].slice(0, 2); // 最多选2名球员
      }
    });
  };

  if (selectedPlayers.length < 2) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerComparison.title")} />
        <p className="text-muted-foreground mb-4">
          {t("playerComparison.selectTwoPlayers")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {players.map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("playerComparison.selectTwoPlayers")}
        </p>
      </Panel>
    );
  }

  const p1 = playerData.find(pl => pl.id === selectedPlayers[0])!;
  const p2 = playerData.find(pl => pl.id === selectedPlayers[1])!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerComparison.title")} />

      {/* 选中的球员 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{p1.name}</div>
          <div className="text-2xl text-primary">{p1.overall}★</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-info">{p2.name}</div>
          <div className="text-2xl text-info">{p2.overall}★</div>
        </div>
      </div>

      {/* 数据对比 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playerComparison.attributes")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("playerComparison.overall")}
            value={p1.overall}
            subtitle={t("playerComparison.vs", { name: p2.name })},
            status={p1.overall >= p2.overall ? "success" : "warning"}
          />
          <StatTile
            title={t("playerComparison.potential")}
            value={p1.potential}
            subtitle={t("playerComparison.vs", { name: p2.name })},
            status={p1.potential >= p2.potential ? "success" : "warning"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("playerComparison.age")}
            value={p1.age}
            subtitle={t("playerComparison.vs", { name: p2.name })},
          />
          <StatTile
            title={t("playerComparison.position")}
            value={p1.position}
            subtitle={t("playerComparison.vs", { name: p2.name })},
          />
        </div>
      </Panel>

      {/* 详细属性对比表 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerComparison.detailedComparison")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerComparison.sideBySide")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("playerComparison.attribute")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("playerComparison.{name}", { name: p1.name })}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("playerComparison.{name}", { name: p2.name })}</th>
                <th className="text-left p-3 border border-gray-200">{t("playerComparison.difference")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">当前实力</td>
                <td className="p-3 text-center text-primary">{p1.overall}</td>
                <td className="p-3 text-center text-info">{p2.overall}</td>
                <td className="p-3 text-center">{p1.overall - p2.overall >= 0 ? `+${p1.overall - p2.overall}` : p1.overall - p2.overall}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">潜在上限</td>
                <td className="p-3 text-center text-primary">{p1.potential}</td>
                <td className="p-3 text-center text-info">{p2.potential}</td>
                <td className="p-3 text-center">{p1.potential - p2.potential >= 0 ? `+${p1.potential - p2.potential}` : p1.potential - p2.potential}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">年龄</td>
                <td className="p-3 text-center">{p1.age}</td>
                <td className="p-3 text-center">{p2.age}</td>
                <td className="p-3 text-center">{p1.age - p2.age >= 0 ? `老${p1.age - p2.age}岁` : `年轻${p2.age - p1.age}岁`}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-medium text-primary">位置</td>
                <td className="p-3 text-center">{p1.position}</td>
                <td className="p-3 text-center">{p2.position}</td>
                <td className="p-3 text-center">{p1.position === p2.position ? '相同' : '不同'}</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-primary">足球属性</td>
                <td className="p-3 text-center">{t("playerComparison.technical")}</td>
                <td className="p-3 text-center">{t("playerComparison.technical")}</td>
                <td className="p-3 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 适用性分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerComparison.suitability")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerComparison.eachBetter")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("playerComparison.{name}更适合", { name: p1.overall > p2.overall ? p1.name : p2.name })} - 当前实力更强</li>
          <li>{t("playerComparison.{name}更适合", { name: p1.potential > p2.potential ? p1.name : p2.name })} - 潜力更高</li>
          <li>{t("playerComparison.{name}更年轻", { name: p1.age < p2.age ? p1.name : p2.name })} - 年龄更小</li>
        </ul>
        <p className="text-xs text-primary mt-2">
          {t("playerComparison.betterChoice", { choice: p1.overall > p2.overall && p1.potential > p2.potential ? p1.name : p2.name })}</p>
      </Panel>
    </Panel>
  );
}