import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FriendliesTournament() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedHome, setSelectedHome] = useState<string | null>(null);
  const [selectedAway, setSelectedAway] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<"matches" "standings">("matches");

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
        <SectionTitle title={t("friendliesTournament.title")} />
        <p className="text-muted-foreground mb-4">
          {t("friendliesTournament.noClubs")}
        </p>
      </Panel>
    );
  }

  const friendlyMatches = useMemo(() => [
    { id: 1, home: clubs[0]?.name || "", away: clubs[1]?.name || "", date: "2024-07-15", homeGoals: 2, awayGoals: 1, status: "finished" },
    { id: 2, home: clubs[1]?.name || "", away: clubs[2]?.name || "", date: "2024-07-18", homeGoals: 1, awayGoals: 1, status: "finished" },
    { id: 3, home: clubs[2]?.name || "", away: clubs[0]?.name || "", date: "2024-07-22", homeGoals: 0, awayGoals: 2, status: "finished" },
  ], [clubs]);

  const standings = useMemo(() => {
    const form = {};
    friendlyMatches.forEach(m => {
      const home = clubs.find(c => c.name === m.home);
      const away = clubs.find(c => c.name === m.away);
      if (!home || !away) return;
      
      if (!form[home.id]) form[home.id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
      if (!form[away.id]) form[away.id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };

      form[home.id].played++; form[home.id].gf += m.homeGoals; form[home.id].ga += m.awayGoals;
      form[away.id].played++; form[away.id].gf += m.awayGoals; form[away.id].ga += m.homeGoals;

      if (m.homeGoals > m.awayGoals) { form[home.id].won++; form[away.id].lost++; }
      else if (m.homeGoals < m.awayGoals) { form[home.id].lost++; form[away.id].won++; }
      else { form[home.id].drawn++; form[away.id].drawn++; }
    });
    return form;
  }, [clubs, friendlyMatches]);

  const handleSelectHome = (clubId: string) => {
    setSelectedHome(clubId);
  };

  const handleSelectAway = (clubId: string) => {
    setSelectedAway(clubId);
  };

  const handleSelectView2 = (view: string) => {
    setSelectedView(view);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("friendliesTournament.title")} />
        <p className="text-muted-foreground mb-4">
          {t("friendliesTournament.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("friendliesTournament.title")} />

      {/* 对手选择 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <SectionTitle title={t("friendliesTournament.homeTeam")} />
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
            ))
          </div>
        </div>
        <div>
          <SectionTitle title={t("friendliesTournament.awayTeam")} />
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
          variant={setSelectedView === "matches" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView2("matches")}
        >
          {t("friendliesTournament.matches")}
        </Button>
        <Button
          variant={setSelectedView === "standings" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView2("standings")}
        >
          {t("friendliesTournament.standings")}
        </Button>
      </div>

      {/* 友谊赛赛程 */}
      {setSelectedView === "matches" && selectedHome && selectedAway && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("friendliesTournament.matchSchedule")} />
          <p className="text-primary">友谊赛：{t("friendliesTournament.{home}", { home: clubs.find(c => c.id === selectedHome)?.name })} vs {t("friendliesTournament.{away}", { away: clubs.find(c => c.id === selectedAway)?.name })}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {friendlyMatches.map(m => (
              <li key={m.id} className="font-medium text-primary mb-1">
                {t("friendliesTournament.{date}", { date: m.date })} - {m.homeGoals}-{m.awayGoals} {t("friendliesTournament.{status}", { status: m.status })}</li>
              ))}
          </ol>
        </Panel>
      )}

      {/* 积分榜 */}
      {setSelectedView === "standings" && (
        <Panel className="p-4">
          <SectionTitle title={t("friendliesTournament.standings")} />
          <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
            {Object.entries(standings).sort((a, b) => b[1].won - a[1].won).map(([clubId, s]) => {
              const club = clubs.find(c => c.id === clubId);
              if (!club) return null;
              const gd = s.gf - s.ga;
              return (
                <li key={clubId} className="font-medium text-primary mb-1">
                  {t("friendliesTournament.{name}", { name: club.name })} - {s.played}场 {s.won}胜 {s.drawn}平 {s.lost}负 - {gd}球差</li>
              );
            })}
          </ol>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("friendliesTournament.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("friendliesTournament.totalClubs", { total: clubs.length })} 家俱乐部</p>
        <p>{t("friendliesTournament.totalPlayers", { count: players.length })} 名球员</p>
      </Panel>
    </Panel>
  );
}