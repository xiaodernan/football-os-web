import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ClubFriendlies() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

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

  const [selectedHome, setSelectedHome] = useState<string | null>(null);
  const [selectedAway, setSelectedAway] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"schedule" "results">("schedule");

  const handleSelectHome = (clubId: string) => {
    setSelectedHome(clubId);
  };

  const handleSelectAway = (clubId: string) => {
    setSelectedAway(clubId);
  };

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("clubFriendlies.title")} />
        <p className="text-muted-foreground mb-4">
          {t("clubFriendlies.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("clubFriendlies.title")} />

      {/* 对手选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <SectionTitle title={t("clubFriendlies.homeTeam")} />
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant={setSelectedHome === c.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectHome(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle title={t("clubFriendlies.awayTeam")} />
          <div className="grid grid-cols-2 gap-3">
            {clubs.map(c => (
              <Button
                key={c.id}
                variant={setSelectedAway === c.id ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSelectAway(c.id)}
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
          variant={setSelectedView === "schedule" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("schedule")}
        >
          {t("clubFriendlies.schedule")}
        </Button>
        <Button
          variant={setSelectedView === "results" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("results")}
        >
          {t("clubFriendlies.results")}
        </Button>
      </div>

      {/* 友谊赛安排 */}
      {setSelectedView === "schedule" && selectedHome && selectedAway && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("clubFriendlies.matchSchedule")} />
          <p className="text-sm text-primary">安排了 {t("clubFriendlies.friendlyMatch")} between {t("clubFriendlies.{home}", { home: clubs.find(c => c.id === selectedHome)?.name })} and {t("clubFriendlies.{away}", { away: clubs.find(c => c.id === selectedAway)?.name })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            <li>日期: {t("clubFriendlies.tomorrow")}</li>
            <li>地点: 中立场地</li>
            <li>裁判: {t("clubFriendlies.referee")}</li>
          </ol>
        </Panel>
      )}

      {/* 友谊赛结果 */}
      {setSelectedView === "results" && selectedHome && selectedAway && (
        <Panel className="p-4">
          <SectionTitle title={t("clubFriendlies.matchResult")} />
          <p className="text-primary">友谊赛结果：</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("clubFriendlies.{home}", { home: clubs.find(c => c.id === selectedHome)?.name })}</div>
              <div>{t("clubFriendlies.{goals}", { goals: 2 })}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("clubFriendlies.{away}", { away: clubs.find(c => c.id === selectedAway)?.name })}</div>
              <div>{t("clubFriendlies.{goals}", { goals: 1 })}</div>
            </div>
          </div>
          <p className="text-success">{t("clubFriendlies.homeWin")}</p>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("clubFriendlies.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("clubFriendlies.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("clubFriendlies.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}