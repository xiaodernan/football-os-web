import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TeamHonors() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      leagueTitles: Math.floor(Math.random() * 20) + 1,
      cupTitles: Math.floor(Math.random() * 10) + 1,
      superCupTitles: Math.floor(Math.random() * 5) + 1,
      europeanTitles: Math.floor(Math.random() * 5) + 1,
      totalTrophies: Math.floor(Math.random() * 50) + 10,
    }));
  }, [clubs]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!selectedClub) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("teamHonors.title") } />
        <p className="text-muted-foreground mb-4">
          {t("teamHonors.selectClub")}
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
      <SectionTitle title={t("teamHonors.title") } />

      {/* 俱乐部画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("teamHonors.clubInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamHonors.name")}</div>
              <div className="text-2xl font-bold text-primary">{c.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamHonors.leagueTitles")}</div>
              <div className="text-primary">{c.leagueTitles}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("teamHonors.trophies") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("teamHonors.cupTitles")}</div>
              <div>{c.cupTitles}</div>
            </div>
            <div>
              <div className="font-medium">{t("teamHonors.superCupTitles")}</div>
              <div>{c.superCupTitles}</div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("teamHonors.europeanTitles")}</div>
            <div>{c.europeanTitles}</div>
          </div>
        </div>
      </div>

      {/* 总荣誉 */}
      <Panel className="p-4">
        <SectionTitle title={t("teamHonors.totalTrophies") } />
        <p className="text-primary text-3xl">{c.totalTrophies}</p>
        <p className="text-sm text-muted-foreground">{t("teamHonors.totalTrophiesDesc")}</p>
      </Panel>
    </Panel>
  );
}