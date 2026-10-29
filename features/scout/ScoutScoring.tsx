import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ScoutScoring() {
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
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scoutScoring.title") } />
        <p className="text-muted-foreground mb-4">
          {t("scoutScoring.selectPlayer")}
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
          ))
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
    overall: Math.floor((Math.random() * 30 + 70 + Math.random() * 30 + 70 + Math.random() * 30 + 70 + Math.random() * 30 + 70) / 4),
  }), []);

  const percentiles = useMemo(() => ({
    technical: Math.floor(Math.random() * 20) + 60,
    tactical: Math.floor(Math.random() * 20) + 60,
    physical: Math.floor(Math.random() * 20) + 60,
    mental: Math.floor(Math.random() * 20) + 60,
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scoutScoring.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("scoutScoring.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("scoutScoring.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutScoring.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutScoring.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("scoutScoring.scores") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("scoutScoring.technical")}</div>
              <div className="text-primary">{scores.technical}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutScoring.tactical")}</div>
              <div className="text-info">{scores.tactical}</div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutScoring.physical")}</div>
              <div className="text-warning">{scores.physical}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutScoring.mental")}</div>
              <div className="text-success">{scores.mental}</div>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("scoutScoring.percentiles", { technical: percentiles.technical, tactical: percentiles.tactical, physical: percentiles.physical, mental: percentiles.mental })}
        </p>
      </Panel>
    </Panel>
  );
}