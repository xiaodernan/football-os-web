import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyFacilities() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
    }));
  }, [clubs]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"facilities" "ratings">("facilities");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectFacility = (facility: string) => {
    setSelectedFacility(facility);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademyFacilities.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyFacilities.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyFacilities.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : t("clubYouthAcademyFacilities.selectClub")}</div>
        <div>{t("clubYouthAcademyFacilities.selectAClub")}</div>
      </div>

      {/* 设施选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectFacility("trainingGround")}
        >
          {t("clubYouthAcademyFacilities.trainingGround")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectFacility("medicalCenter")}
        >
          {t("clubYouthAcademyFacilities.medicalCenter")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSelectFacility("youthCenter")}
        >
          {t("clubYouthAcademyFacilities.youthCenter")}
        </Button>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "facilities" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("facilities")}
        >
          {t("clubYouthAcademyFacilities.facilities")}
        </Button>
        <Button
          variant={setSelectedView === "ratings" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("ratings")}
        >
          {t("clubYouthAcademyFacilities.ratings")}
        </Button>
      </div>

      {/* 设施详情 */}
      {selectedClub && selectedFacility && (
        <Panel className="p-4">
          <SectionTitle title={t("clubYouthAcademyFacilities.facilityDetails")} />
          <p>{t("clubYouthAcademyFacilities.{facility}", { facility: selectedFacility })} of {clubs.find(c => c.id === selectedClub)?.name}</p>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyFacilities.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyFacilities.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyFacilities.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}