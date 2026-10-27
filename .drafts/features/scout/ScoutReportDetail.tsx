import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ScoutReportDetail() {
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
      nationality: p.nationality,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scout.scoutReportTitle")} />
        <p className="text-muted-foreground mb-4">
          {t("scout.selectPlayerForScoutReport")}
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

  // 球探详细数据
  const scoutData = useMemo(() => ({
    overall: p.overall,
    potential: p.potential,
    age: p.age,
    position: p.position,
    nationality: p.nationality,
    preferredFoot: t(`foot.${p.preferredFoot}`) || "Both",
    value: `${t("currency.euro")} ${p.marketValue.toLocaleString()}`,
    wage: `${t("currency.euro")} ${Math.floor(p.marketValue * 0.001).toLocaleString()}/w`,
    internationalAppearances: Math.floor(Math.random() * 80),
    goalsForCountry: Math.floor(Math.random() * 20),
    assists: Math.floor(Math.random() * 15),
    cards: Math.floor(Math.random() * 10),
  }), [p]);

  // 球探评级
  const overallRating = useMemo(() => {
    if (p.overall >= 90) return "世界级";
    if (p.overall >= 80) return "顶级";
    if (p.overall >= 70) return "优秀";
    if (p.overall >= 60) return "良好";
    return "有潜力";
  }, [p.overall]);

  const potentialRating = useMemo(() => {
    if (p.potential >= 90) return "超级潜力";
    if (p.potential >= 80) return "高潜力";
    if (p.potential >= 70) return "潜力股";
    return "一般";
  }, [p.potential]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scout.scoutReportTitle")} />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("scout.playerOverview")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("scout.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("scout.potential")}</div>
              <div className="text-3xl font-bold text-green-600">{p.potential}★</div>
            </div>
            <div>
              <div className="font-medium">{t("scout.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("scout.position")}</div>
              <div className="text-muted-foreground">{p.position}</div>
            </div>
          </div>
          <div className="mt-3 p-3 bg-primary/10 rounded">
            <div className="font-medium">{t("scout.nationality")}</div>
            <div className="text-muted-foreground">{t(`nationality.${p.nationality}`) || p.nationality}</div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("scout.scoutEvaluation")} />
          <div className="grid grid-cols-2 gap-3">
            <StatTile title={t("scout.overallRating")} value={overallRating} />
            <StatTile title={t("scout.potentialRating")} value={potentialRating} />
          </div>
          <div className="mt-3 p-3 bg-warning/10 rounded">
            <div className="font-medium">{t("scout.preferredFoot")}</div>
            <div className="text-warning">{scoutData.preferredFoot}</div>
          </div>
          <div className="mt-3 p-3 bg-info/10 rounded">
            <div className="font-medium">{t("scout.marketValue")}</div>
            <div className="text-info">{scoutData.value}</div>
          </div>
        </Panel>
      </div>

      {/* 球探数据详情 */}
      <Panel className="p-4">
        <SectionTitle title={t("scout.detailedStats")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("scout.internationalApps")}</div>
            <div className="text-muted-foreground">{scoutData.internationalAppearances}</div>
          </div>
          <div>
            <div className="font-medium">{t("scout.goalsNational")}</div>
            <div className="text-muted-foreground">{scoutData.goalsForCountry}</div>
          </div>
          <div>
            <div className="font-medium">{t("scout.assists")}</div>
            <div className="text-muted-foreground">{scoutData.assists}</div>
          </div>
          <div>
            <div className="font-medium">{t("scout.cardsReceived")}</div>
            <div className="text-muted-foreground">{scoutData.cards}</div>
          </div>
        </div>
      </Panel>

      {/* 建议 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("scout.scoutSuggestions")} />
        <p className="text-sm text-muted-foreground">
          {t("scout.focusOnDevelopment", { age: p.age, potential: p.potential })}
        </p>
        <Button variant="outline" size="sm">
          {t("scout.viewRecommendations")}
        </Button>
      </Panel>
    </Panel>
  );
}