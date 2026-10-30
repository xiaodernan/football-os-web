import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ScoutReport() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      goals: p.goals || 0,
      assists: p.assists || 0,
      matchesPlayed: p.matchesPlayed || 0,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scoutReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("scoutReport.selectPlayer")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 评分卡数据
  const scores = useMemo(() => ({
    technical: Math.floor(Math.random() * 30) + 70,
    tactical: Math.floor(Math.random() * 30) + 70,
    physical: Math.floor(Math.random() * 30) + 70,
    mental: Math.floor(Math.random() * 30) + 70,
  }), []);

  const percentiles = useMemo(() => ({
    technical: Math.floor(Math.random() * 20) + 60,
    tactical: Math.floor(Math.random() * 20) + 60,
    physical: Math.floor(Math.random() * 20) + 60,
    mental: Math.floor(Math.random() * 20) + 60,
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scoutReport.title")} />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("scoutReport.playerInfo")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("scoutReport.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutReport.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutReport.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("scoutReport.overall")} />
          <div className="text-3xl font-bold text-primary">{p.overall}★</div>
          <p className="text-sm text-muted-foreground">{t("scoutReport.potential", { potential: p.potential })}</p>
        </Panel>
      </div>

      {/* 评分卡 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("scoutReport.scores")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("scoutReport.technical")}</div>
            <div className="text-primary">{scores.technical}</div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.tactical")}</div>
            <div className="text-info">{scores.tactical}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("scoutReport.physical")}</div>
            <div className="text-warning">{scores.physical}</div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.mental")}</div>
            <div className="text-success">{scores.mental}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("scoutReport.percentiles", {
            technical: percentiles.technical,
            tactical: percentiles.tactical,
            physical: percentiles.physical,
            mental: percentiles.mental,
          })}</p>
        <p className="text-xs text-primary">
          {t("scoutReport.overallRating", { rating: p.overall })}</p>
      </Panel>

      {/* 统计数据 */}
      <Panel className="p-4">
        <SectionTitle title={t("scoutReport.statistics")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("scoutReport.appearances")}
            value={p.matchesPlayed}
            subtitle={t("scoutReport.games")}
          />
          <StatTile
            title={t("scoutReport.goals")}
            value={p.goals}
            subtitle={t("scoutReport.scoring")}
          />
          <StatTile
            title={t("scoutReport.assists")}
            value={p.assists}
            subtitle={t("scoutReport.setup")}
          />
        </div>
      </Panel>

      {/* 比较与潜力 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("scoutReport.comparison")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("scoutReport.potentialGap", { gap: p.potential - p.overall })}</p>
        <p>{t("scoutReport.growthAreas")}</p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("scoutReport.technicalDevelopment")}</li>
          <li>{t("scoutReport.tacticalDevelopment")}</li>
          <li>{t("scoutReport.physicalDevelopment")}</li>
          <li>{t("scoutReport.mentalDevelopment")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}