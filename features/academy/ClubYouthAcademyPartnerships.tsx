import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubYouthAcademyPartnerships() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedClub1, setSelectedClub1] = useState<string | null>(null);
  const [selectedClub2, setSelectedClub2] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"partnerships" "details">("partnerships");

  const handleSelectClub1 = (clubId: string) => {
    setSelectedClub1(clubId);
  };

  const handleSelectClub2 = (clubId: string) => {
    setSelectedClub2(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubYouthAcademyPartnerships.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubYouthAcademyPartnerships.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubYouthAcademyPartnerships.title")} />

      {/* 俱乐部选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <SectionTitle title={t("clubYouthAcademyPartnerships.homeClub")} />
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant={setSelectedClub1 === c.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectClub1(c.id)}
              >
                {c.name}
              </Button>
            ))
          </div>
        </div>
        <div>
          <SectionTitle title={t("clubYouthAcademyPartnerships.awayClub")} />
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant={setSelectedClub2 === c.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectClub2(c.id)}
              >
                {c.name}
              </Button>
            ))
          </div>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "partnerships" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("partnerships")}
        >
          {t("clubYouthAcademyPartnerships.partnerships")}
        </Button>
        <Button
          variant={setSelectedView === "details" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("details")}
        >
          {t("clubYouthAcademyPartnerships.details")}
        </Button>
      </div>

      {/* 合作伙伴 */}
      {setSelectedView === "partnerships" && selectedClub1 && selectedClub2 && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubYouthAcademyPartnerships.partnership")} />
          <p>{t("clubYouthAcademyPartnerships.between", { club1: clubs.find(c => c.id === selectedClub1)?.name }, { club2: clubs.find(c => c.id === selectedClub2)?.name })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            <li>青训营交流赛</li>
            <li>球员借用协议</li>
            <li>联合青训营活动</li>
          </ol>
        </Panel>
      )}

      {/* 详细信息 */}
      {setSelectedView === "details" && selectedClub1 && selectedClub2 && (
        <Panel className="p-4">
          <SectionTitle title={t("clubYouthAcademyPartnerships.details")} />
          <p>俱乐部 {clubs.find(c => c.id === selectedClub1)?.name} 与 {clubs.find(c => c.id === selectedClub2)?.name} 的青训营合作情况</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">合作历史</div>
              <div>2年</div>
            </div>
            <div>
              <div className="font-medium">交流球员</div>
              <div>5名</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubYouthAcademyPartnerships.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubYouthAcademyPartnerships.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubYouthAcademyPartnerships.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}