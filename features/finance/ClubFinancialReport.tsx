import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubFinancialReport() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
      points: c.points || 0,
      marketValue: c.marketValue || 0,
      wageBill: c.wageBill || 0,
    }));
  }, [clubs]);

  const sortedClubs = useMemo(
    () => [...clubData].sort((a, b) => b.marketValue - a.marketValue),
    [clubData]
  );

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" "details">("overview");

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubFinancialReport.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubFinancialReport.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubFinancialReport.title")} />

      {/* 标签切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedTab === "overview" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("overview")}
        >
          {t("clubFinancialReport.overview")}
        </Button>
        <Button
          variant={setSelectedTab === "details" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("details")}
        >
          {t("clubFinancialReport.details")}
        </Button>
      </div>

      {/* 俱乐部概览 */}
      {setSelectedTab === "overview" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubFinancialReport.overview")} />
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              title={t("clubFinancialReport.totalClubs")}
              value={clubs.length}
              subtitle={t("clubFinancialReport.league")}
            />
            <StatTile
              title={t("clubFinancialReport.totalMarketValue")}
              value={t("currency.euro", {
                amount: clubData.reduce((sum, c) => sum + c.marketValue, 0),
              })}}
            />
            <StatTile
              title={t("clubFinancialReport.totalWageBill")}
              value={t("currency.euro", {
                amount: clubData.reduce((sum, c) => sum + c.wageBill, 0),
              })}}
            />
          </div>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {setSelectedTab === "details" && selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("clubFinancialReport.clubDetails")} />
          const club = clubData.find(c => c.id === selectedClub)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("clubFinancialReport.name")}</div>
              <div className="text-2xl text-primary">{club.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("clubFinancialReport.position")}</div>
              <div>{club.position}位</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubFinancialReport.marketValue")}</div>
            <div>{t("currency.euro", { amount: club.marketValue })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubFinancialReport.wageBill")}</div>
            <div>{t("currency.euro", { amount: club.wageBill })}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubFinancialReport.points")}</div>
            <div className="text-3xl text-primary">{club.points}分</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("clubFinancialReport.goalDifference")}</div>
            <div>
              {club.goalsFor - club.goalsAgainst >= 0 ? `+${club.goalsFor - club.goalsAgainst}` : club.goalsFor - club.goalsAgainst}
            </div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubFinancialReport.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubFinancialReport.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubFinancialReport.totalPlayers", { count: footballProvider.players().length })} 名球员</p>
        <p>
          {t("clubFinancialReport.avgMarketValue", {
            avg: (clubData.reduce((sum, c) => sum + c.marketValue, 0) / clubData.length).toFixed(0),
          })} 平均市值</p>
        <p>
          {t("clubFinancialReport.avgWageBill", {
            avg: (clubData.reduce((sum, c) => sum + c.wageBill, 0) / clubData.length).toFixed(0),
          })} 平均薪资帽</p>
        </p>
      </Panel>
    </Panel>
  );
}