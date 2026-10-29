import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TacticalAnalysis() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      formation: t(`formation.${Math.floor(Math.random() * 8 + 1)}`),
      possession: Math.round(40 + Math.random() * 30),
      passingAccuracy: Math.round(65 + Math.random() * 25),
      pressingIntensity: Math.round(30 + Math.random() * 40),
      shotsPerGame: Math.round(8 + Math.random() * 15),
      goalsPerGame: Math.round(0.5 + Math.random() * 2.5),
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("tacticalAnalysis.title") } />
        <p className="text-muted-foreground mb-4">
          {t("tacticalAnalysis.selectClub")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectClub(c.id)}
            >
              {c.name}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const c = clubData.find(club => club.id === selectedClub)!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("tacticalAnalysis.title") } />

      {/* 球队画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("tacticalAnalysis.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("tacticalAnalysis.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("tacticalAnalysis.formation")}</div>
              <div className="text-info">{c.formation}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("tacticalAnalysis.tacticalMetrics") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("tacticalAnalysis.possession")}</div>
              <div className="text-2xl text-primary">{c.possession}%</div>
            </div>
            <div>
              <div className="font-medium">{t("tacticalAnalysis.passingAccuracy")}</div>
              <div className="text-primary">{c.passingAccuracy}%</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <div className="font-medium">{t("tacticalAnalysis.pressing")}</div>
              <div className="text-warning">{c.pressingIntensity}</div>
            </div>
            <div>
              <div className="font-medium">{t("tacticalAnalysis.shotsPerGame")}</div>
              <div className="text-info">{c.shotsPerGame}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 战术风格 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("tacticalAnalysis.tacticalStyle") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("tacticalAnalysis.offensiveStyle")}</div>
            <div className="text-primary">
              {t(`style.${Math.floor(Math.random() * 5 + 1)}`)}
            </div>
          </div>
          <div>
            <div className="font-medium text-sm text-muted-foreground">{t("tacticalAnalysis.defensiveStyle")}</div>
            <div className="text-info">
              {t(`style.${Math.floor(Math.random() * 5 + 6)}`)}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {t("tacticalAnalysis.philosophy")}
        </p>
      </Panel>

      {/* 关键指标对比 */}
      <Panel className="p-4">
        <SectionTitle title={t("tacticalAnalysis.keyMetrics") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("tacticalAnalysis.possessionRank")}</div>
            <div className="text-primary">Top 4</div>
          </div>
          <div>
            <div className="font-medium">{t("tacticalAnalysis.pressingRank")}</div>
            <div className="text-warning">Top 8</div>
          </div>
          <div>
            <div className="font-medium">{t("tacticalAnalysis.creationRank")}</div>
            <div className="text-success">Top 6</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}