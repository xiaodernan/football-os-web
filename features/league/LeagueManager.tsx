import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { League, LeagueCreationForm, LeagueStandings } from "@/domain/league";
import { Panel, SectionTitle, EmptyState, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LeagueManager() {
  const { t } = useI18n();
  const myClubs = useMemo(() => footballProvider.clubs(), []);
  const myTeams = useMemo(() => footballProvider.teams(), []);

  // 演示用：如果没有现有联赛则创建一个
  const [leagues, setLeagues] = React.useState<League[]>([]);
  const [newLeague, setNewLeague] = React.useState<LeagueCreationForm>({
    leagueName: "",
    preferredPointsSystem: "standard",
    customWin: 3,
    customDraw: 1,
    customLoss: 0,
    customGoal: 1,
    customCleanSheet: 1,
    numTeams: 8,
    memberInvites: []
  });

  // 初始化演示联赛（如果本地没有）
  const initLeagues = useMemo(() => {
    const existing = readLeaguesFromStorage();
    if (existing.length === 0) {
      const demoLeague: League = {
        id: "league-demo-1",
        name: t("league.demoLeagueName"),
        creatorId: "current-user",
        memberIds: ["current-user", "member-2", "member-3"],
        teams: ["team-a", "team-b", "team-c", "team-d", "team-e", "team-f", "team-g", "team-h"],
        pointsSystem: "custom",
        pointsConfig: {
          win: 3,
          draw: 1,
          loss: 0,
          goalsPer: 1,
          cleanSheet: 1
        },
        seasonStart: new Date().getFullYear() + "-01-01",
        seasonEnd: null,
        isActive: true
      };
      setLeagues([demoLeague]);
      writeLeaguesToStorage([demoLeague]);
    } else {
      setLeagues(existing);
    }
  }, []);

  // 读取本地存储的联赛
  function readLeaguesFromStorage(): League[] {
    const { value, present } = readJson<League[] | null>(browserStore(), "leagues-v1", null);
    return present && value ? value : [];
  }

  // 写入本地存储
  function writeLeaguesToStorage(leagues: League[]): void {
    writeJson(browserStore(), "leagues-v1", leagues);
  }

  // 计算联赛积分
  function calculatePoints(result: "win" | "draw" | "loss", goalsDiff: number, hasCleanSheet: boolean): number {
    if (newLeague.preferredPointsSystem === "custom") {
      let points = 0;
      if (result === "win") points += newLeague.customWin;
      if (result === "draw") points += newLeague.customDraw;
      if (result === "loss") points += newLeague.customLoss;
      points += Math.floor(Math.abs(goalsDiff) / newLeague.customGoal) * newLeague.customGoal;
      if (hasCleanSheet) points += newLeague.customCleanSheet;
      return points;
    }
    // Standard system
    if (result === "win") return 3;
    if (result === "draw") return 1;
    return 0;
  }

  // 生成联赛积分榜
  const standings = useMemo(() => {
    if (leagues.length === 0) return [];
    
    const league = leagues[0];
    // 演示用：生成基础积分榜
    const teams = league.teams.map((tid, i) => ({
      teamId: tid,
      teamName: `球队 ${i + 1}`,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: ""
    }));
    
    // 按积分降序排序
    return teams.sort((a, b) => b.points - a.points).map((t, idx) => ({
      ...t,
      rank: idx + 1
    }));
  }, [leagues]);

  // 创建新联赛
  const handleCreateLeague = () => {
    const league: League = {
      id: `league-${Date.now()}`,
      name: newLeague.leagueName || t("league.demoLeagueName"),
      creatorId: "current-user",
      memberIds: newLeague.memberInvites.length > 0 ? newLeague.memberInvites : ["current-user", "member-2"],
      teams: generateTeams(newLeague.numTeams),
      pointsSystem: newLeague.preferredPointsSystem,
      pointsConfig: newLeague.preferredPointsSystem === "custom"
        ? {
            win: newLeague.customWin,
            draw: newLeague.customDraw,
            loss: newLeague.customLoss,
            goalsPer: newLeague.customGoal,
            cleanSheet: newLeague.customCleanSheet
          }
        : {
            win: 3,
            draw: 1,
            loss: 0,
            goalsPer: 1,
            cleanSheet: 1
          },
      seasonStart: new Date().getFullYear() + "-01-01",
      seasonEnd: null,
      isActive: true
    };

    setLeagues(prev => [...prev, league]);
    writeLeaguesToStorage([...prev, league]);
    setNewLeague({
      leagueName: "",
      preferredPointsSystem: "standard",
      customWin: 3,
      customDraw: 1,
      customLoss: 0,
      customGoal: 1,
      customCleanSheet: 1,
      numTeams: 8,
      memberInvites: []
    });
  };

  // 生成球队ID
  function generateTeams(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `team-${String(i + 1).padStart(2, '0')}`);
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <SectionTitle title={t("league.leagueManagerTitle")} />
        
        {/* 现有联赛列表 */}
        {leagues.length > 0 && (
          <div>
            <h3 className="text-semibold mb-3">{t("league.myLeagues")}</h3>
            <div className="space-y-3">
              {leagues.map(league => (
                <Panel key={league.id} className="p-4 mb-2" style={{ borderColor: league.isActive ? 'border-primary' : 'border-muted' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{league.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {league.memberIds.length} {t("league.members")} · 
                        {league.isActive ? t("league.activeSeason") : t("league.inactiveSeason")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-large">{standings.find(s => s.teamId)?.points ?? 0}</div>
                      <div className="text-xs text-muted-foreground">pts</div>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => window.location.hash = `#league-${league.id}`}
                  >
                    {t("league.viewDetails")}
                  </Button>
                </Panel>
              ))}
            </div>
          </div>
        )}

        {/* 创建新联赛 */}
        <Panel className="p-5" style={{ border: '1px dashed var(--muted)' }}>
          <h3 className="text-semibold mb-4">{t("league.createNewLeague")}</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1">{t("league.leagueName")}</label>
              <input
                value={newLeague.leagueName}
                onChange={(e) => setNewLeague({ ...newLeague, leagueName: e.target.value })}
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder={t("league.leagueNamePlaceholder")}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1">{t("league.pointsSystem")}</label>
              <select
                value={newLeague.preferredPointsSystem}
                onChange={(e) => setNewLeague({ ...newLeague, preferredPointsSystem: e.target.value as "standard" | "custom" })}
                className="w-full rounded border px-2 py-1 text-sm"
              >
                <option value="standard">{t("league.standardPoints")}</option>
                <option value="custom">{t("league.customPoints")}</option>
              </select>
            </div>
          </div>

          {newLeague.preferredPointsSystem === "custom" && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("league.winPoints")}</label>
                <input
                  value={newLeague.customWin}
                  type="number"
                  onChange={(e) => setNewLeague({ ...newLeague, customWin: parseInt(e.target.value) || 3 })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("league.drawPoints")}</label>
                <input
                  value={newLeague.customDraw}
                  type="number"
                  onChange={(e) => setNewLeague({ ...newLeague, customDraw: parseInt(e.target.value) || 1 })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("league.lossPoints")}</label>
                <input
                  value={newLeague.customLoss}
                  type="number"
                  onChange={(e) => setNewLeague({ ...newLeague, customLoss: parseInt(e.target.value) || 0 })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("league.goalPoints")}</label>
                <input
                  value={newLeague.customGoal}
                  type="number"
                  onChange={(e) => setNewLeague({ ...newLeague, customGoal: parseInt(e.target.value) || 1 })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1">{t("league.cleanSheetPoints")}</label>
                <input
                  value={newLeague.customCleanSheet}
                  type="number"
                  onChange={(e) => setNewLeague({ ...newLeague, customCleanSheet: parseInt(e.target.value) || 1 })}
                  className="w-full rounded border px-2 py-1 text-sm"
                  min={0}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1">{t("league.numTeams")}</label>
              <input
                value={newLeague.numTeams}
                type="number"
                onChange={(e) => setNewLeague({ ...newLeague, numTeams: parseInt(e.target.value) || 8 })}
                className="w-full rounded border px-2 py-1 text-sm"
                min={2}
                max={20}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1">{t("league.memberInvites")}</label>
              <input
                value={newLeague.memberInvites.join(",") || ""}
                onChange={(e) => setNewLeague({ ...newLeague, memberInvites: e.target.value.split(",").filter(Boolean) })}
                className="w-full rounded border px-2 py-1 text-sm"
                placeholder="member-1,member-2"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateLeague}
            className="w-full mt-4"
          >
            {t("league.createLeague")}
          </Button>
        </Panel>
      </Panel>

      {/* 联赛积分榜 */}
      {leagues.length > 0 && (
        <Panel className="p-6">
          <SectionTitle title={t("league.leagueStandings")} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-lg">
              <thead>
                <tr>
                  <th className="text-left p-3 border-b">{t("league.rank")}</th>
                  <th className="text-left p-3 border-b">{t("league.team")}</th>
                  <th className="text-center p-3 border-b">{t("league.played")}</th>
                  <th className="text-center p-3 border-b">{t("league.won")}</th>
                  <th className="text-center p-3 border-b">{t("league.drawn")}</th>
                  <th className="text-center p-3 border-b">{t("league.lost")}</th>
                  <th className="text-right p-3 border-b">{t("league.points")}</th>
                  <th className="text-left p-3 border-b">{t("league.goalDiff")}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map(s => (
                  <tr key={s.teamId} className="border-b hover:bg-primary/5 transition-colors">
                    <td className="text-center p-3 font-medium">{s.rank}</td>
                    <td className="text-left p-3">{s.teamName}</td>
                    <td className="text-center p-3">{s.played}</td>
                    <td className="text-center p-3">{s.won}</td>
                    <td className="text-center p-3">{s.drawn}</td>
                    <td className="text-center p-3">{s.lost}</td>
                    <td className="text-right p-3 font-medium">{s.points}</td>
                    <td className="text-left p-3">{s.goalsFor - s.goalsAgainst > 0 ? '+' : ''}{s.goalsFor - s.goalsAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}