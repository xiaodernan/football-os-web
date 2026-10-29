import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryImpact() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      matchesPlayed: Math.floor(Math.random() * 38) + 1,
      goals: Math.floor(Math.random() * 20),
      assists: Math.floor(Math.random() * 15),
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("injuryImpact.title") } />
        <p className="text-muted-foreground mb-4">
          {t("injuryImpact.selectPlayer")}
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

  // 伤病影响数据
  const impact = useMemo(() => ({
    matchesMissed: Math.floor(Math.random() * 20) + 5,
    teamWithoutPlayer: {
      wins: Math.floor(Math.random() * 10),
      draws: Math.floor(Math.random() * 5),
      losses: Math.floor(Math.random() * 10),
    },
    performanceChange: {
      attack: Math.round((Math.random() - 0.5) * 20), // -10% to +10%
      defense: Math.round((Math.random() - 0.5) * 20),
    },
    recoveryTime: Math.floor(Math.random() * 30) + 10,
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryImpact.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("injuryImpact.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryImpact.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryImpact.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryImpact.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("injuryImpact.injuryImpact") } />
          <p className="text-sm text-muted-foreground mb-3">
            {t("injuryImpact.playerMissed", { matches: impact.matchesMissed })}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryImpact.teamRecord")}</div>
              <div>{impact.teamWithoutPlayer.wins}胜 {impact.teamWithoutPlayer.draws}平 {impact.teamWithoutPlayer.losses}负</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryImpact.attackImpact")}</div>
              <div>{impact.performanceChange.attack > 0 ? `+${impact.performanceChange.attack}%` : `${impact.performanceChange.attack}%`}攻击</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryImpact.defenseImpact")}</div>
              <div>{impact.performanceChange.defense > 0 ? `+${impact.performanceChange.defense}%` : `${impact.performanceChange.defense}%`}防守</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 恢复信息 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("injuryImpact.recovery") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("injuryImpact.recoveryTime", { days: impact.recoveryTime })}</p>
        <div className="progress-bar bg-gray-200 h-2 rounded">
          <div className="progress-bar-fill bg-green-500 h-2 rounded" style={{ width: "70%" }}>
            <span>70% 恢复中</span>
          </div>
        </div>
      </Panel>

      {/* 对比数据 */}
      <Panel className="p-4">
        <SectionTitle title={t("injuryImpact.comparison") } />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="font-medium">{t("injuryImpact.matchesPlayed")}</div>
            <div>{p.matchesPlayed}</div>
          </div>
          <div>
            <div className="font-medium">{t("injuryImpact.goals")}</div>
            <div>{p.goals}</div>
          </div>
          <div>
            <div className="font-medium">{t("injuryImpact.assists")}</div>
            <div>{p.assists}</div>
          </div>
        </div>
      </Panel>
    </Panel>
  );
}