import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamPlayingStyle() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      formation: t(`formation.${Math.floor(Math.random() * 8 + 1)}`),
      primaryStyle: t(`style.${Math.floor(Math.random() * 5 + 1)}`),
      secondaryStyle: t(`style.${Math.floor(Math.random() * 5 + 6)}`),
      possession: Math.round(40 + Math.random() * 30),
      pressing: Math.round(30 + Math.random() * 40),
      counterAttack: Math.round(20 + Math.random() * 30),
      wingPlay: Math.round(20 + Math.random() * 30),
    });
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playingStyle.title") } />
        <p className="text-muted-foreground mb-4">
          {t("playingStyle.selectClub")}
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
      <SectionTitle title={t("playingStyle.title") } />

      {/* 俱乐部画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("playingStyle.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playingStyle.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("playingStyle.formation")}</div>
              <div className="text-info">{c.formation}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("playingStyle.styles") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium primary">{t("playingStyle.primaryStyle")}</div>
              <div className="text-primary">{c.primaryStyle}</div>
            </div>
            <div>
              <div className="font-medium">{t("playingStyle.secondaryStyle")}</div>
              <div className="text-info">{c.secondaryStyle}</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 战术指标 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playingStyle.tacticalMetrics") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("playingStyle.possession")}</div>
            <div className="text-primary">{c.possession}%</div>
          </div>
          <div>
            <div className="font-medium">{t("playingStyle.pressing")}</div>
            <div className="text-warning">{c.pressing}</div>
          </div>
          <div>
            <div className="font-medium">{t("playingStyle.counterAttack")}</div>
            <div className="text-success">{c.counterAttack}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("playingStyle.wingPlay")}</div>
            <div className="text-info">{c.wingPlay}</div>
          </div>
          {/* 省略其余指标 for brevity */}
        </div>
      </Panel>

      {/* 风格分析 */}
      <Panel className="p-4">
        <SectionTitle title={t("playingStyle.styleAnalysis") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playingStyle.analysis", { style: c.primaryStyle })}
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t("playingStyle.attackFocus")}</li>
          <li>{t("playingStyle.defenseFocus")}</li>
          <li>{t("playingStyle.midfieldControl")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}