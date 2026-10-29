import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function PlayerGoalHistory() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      age: p.age,
      position: p.position,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("playerGoalHistory.title") } />
        <p className="text-muted-foreground mb-4">
          {t("playerGoalHistory.selectPlayer")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {playerData.slice(0, 6).map(p => (
            <Button
              key={p.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectPlayer(p.id)}
            >
              {p.name}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const p = playerData.find(pl => pl.id === selectedPlayer)!;

  // 模拟进球历史
  const goalHistory = useMemo(() => {
    const history = [];
    const totalGoals = Math.floor(Math.random() * 50) + 1;
    for (let i = 0; i < totalGoals; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 365 * 5));
      history.push({
        date: date.toLocaleDateString(),
        competition: t(`competition.${Math.floor(Math.random() * 10 + 1)}`),
        opponent: t(`team.${Math.floor(Math.random() * 20 + 1)}`),
        goalType: t(`goal.type.${Math.floor(Math.random() * 5 + 1)}`),
        minute: Math.floor(Math.random() * 90) + 1,
      });
    }
    // 按日期倒序排列
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return history;
  }, []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("playerGoalHistory.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("playerGoalHistory.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("playerGoalHistory.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("playerGoalHistory.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("playerGoalHistory.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("playerGoalHistory.totalGoals") } />
          <p className="text-3xl font-bold text-primary">{history.length}</p>
          <p className="text-sm text-muted-foreground">{t("playerGoalHistory.totalGoalsInCareer")}</p>
        </Panel>
      </div>

      {/* 进球里程碑 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("playerGoalHistory.milestones") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerGoalHistory.milestoneCount", { count: history.length })}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {history.slice(0, 10).map((goal, i) => (
            <li key={i}>
              {t("playerGoalHistory.date", { date: goal.date })} - {t("playerGoalHistory.opponent", { opponent: goal.opponent })} - {t("playerGoalHistory.minute", { minute: goal.minute })}' - {t("playerGoalHistory.goalType", { type: goal.goalType })}</li>
          ))}
        </ul>
      </Panel>

      {/* 进球类型分布 */}
      <Panel className="p-4">
        <SectionTitle title={t("playerGoalHistory.goalTypeDistribution") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("playerGoalHistory.goalTypes")}</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
          {["点球", "头球", "远射", "近射", "反击"].map(type => {
            const count = history.filter(g => t(`goal.type.${goal.goalType.includes(type) ? goal.goalType.split("-")[1] : type }).includes(type)).length;
            return <li key={type}>{t(`goal.type.${type}`)}: {count}</li>;
          })}
        </ul>
      </Panel>
    </Panel>
  );
}