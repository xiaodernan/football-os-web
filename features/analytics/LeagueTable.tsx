import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function LeagueTable() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedTab, setSelectedTab] = useState<"all" | "home" | "away">("all");

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
    }));
  }, [clubs]);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("leagueTable.title")} />
        <p className="text-muted-foreground mb-4">
          {t("leagueTable.noData")}
        </p>
      </Panel>
    );
  }

  const sortedClubs = [...clubData].sort((a, b) => {
    const pDiff = (b.points || 0) - (a.points || 0);
    return pDiff !== 0 ? pDiff : ((b.goalsFor || 0) - (a.goalsFor || 0));
  });

  const formGuide = sortedClubs.map(c => {
    const total = c.won + c.drawn + c.lost;
    const rate = total > 0 ? Math.round(((c.won * 3 + c.drawn) / (total * 3)) * 100) : 0;
    return { ...c, formRate: rate };
  });

  return (
    <Panel className="p-6">
      <SectionTitle title={t("leagueTable.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Button
          variant={setSelectedTab === "all" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("all")}
        >
          {t("leagueTable.all")}
        </Button>
        <Button
          variant={setSelectedTab === "home" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("home")}
        >
          {t("leagueTable.home")}
        </Button>
        <Button
          variant={setSelectedTab === "away" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("away")}
        >
          {t("leagueTable.away")}
        </Button>
      </div>

      {/* 积分榜 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("leagueTable.leagueTable")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("leagueTable.season", { season: new Date().getFullYear })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.position")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.team")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.played")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.won")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.draw")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.lost")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.gd")}</th>
                <th className="text-left p-3 border border-gray-200 text-center">{t("leagueTable.points")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedClubs.map(c => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 text-center font-medium text-primary">
                    {c.position}
                  </td>
                  <td className="p-3 font-medium">
                    {selectedClub === c.id ? (
                      <div>{t("leagueTable.{name}", { name: c.name })}</div>
                    ) : (
                      <div onClick={() => handleSelectClub(c.id)} className="cursor-pointer hover:text-primary">{c.name}</div>
                    )}
                  </td>
                  <td className="p-3 text-center">{c.played}</td>
                  <td className="p-3 text-center">{c.won}</td>
                  <td className="p-3 text-center">{c.drawn}</td>
                  <td className="p-3 text-center">{c.lost}</td>
                  <td className="p-3 text-center">
                    {c.goalsFor - c.goalsAgainst >= 0 ? `+${c.goalsFor - c.goalsAgainst}` : c.goalsFor - c.goalsAgainst}
                  </td>
                  <td className="p-3 text-center font-bold text-primary">{c.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 状态指南 */}
      {setSelectedTab !== "all" && (
        <Panel className="p-4">
          <SectionTitle title={t("leagueTable.formGuide")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("leagueTable.formGuideDesc")}</p>
          <div className="grid grid-cols-3 gap-2">
            {[["主", "primary"], ["平", "warning"], ["客", "danger"]].map(([label, color]) => (
              <div key={label} className={`p-2 rounded text-sm ${color}-200 ${color}-600 text-${color}-800 text-center}`>
                {label}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("leagueTable.clubDetail")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("leagueTable.{name}", { name: selectedClub })}</p>
          <p className="text-primary text-2xl">{sortedClubs.find(c => c.id === selectedClub)?.points || 0}分</p>
          <p>{t("leagueTable.position", { position: sortedClubs.find(c => c.id === selectedClub)?.position || 0 })}</p>
          <p>{t("leagueTable.form", { rate: formGuide.find(c => c.id === selectedClub)?.formRate })}</p>
        </Panel>
      )}

      {/* 操作说明 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("leagueTable.operations")} />
        <p className="text-sm text-muted-foreground">
          {t("leagueTable.clickRow")}</p>
      </Panel>
    </Panel>
  );
}