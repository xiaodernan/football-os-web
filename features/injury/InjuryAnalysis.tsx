import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function InjuryAnalysis() {
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
        <SectionTitle title={t("injuryAnalysis.title") } />
        <p className="text-muted-foreground mb-4">
          {t("injuryAnalysis.selectPlayer")}
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

  // 模拟伤病数据
  const injuryStatus = useMemo(() => ({
    isInjured: Math.random() > 0.7,
    injuryType: Math.random() > 0.5 ? "肌肉拉伤" : "脚踝扭伤",
    daysUntilRecovery: Math.floor(Math.random() * 30) + 1,
    daysSinceInjury: Math.floor(Math.random() * 20),
    isPlaying: Math.random() > 0.3,
  }), []);

  const recoveryProgress = useMemo(() => {
    const totalDays = injuryStatus.daysUntilRecovery;
    const currentDays = injuryStatus.daysSinceInjury;
    const progress = Math.min(100, Math.round((currentDays / totalDays) * 100));
    return { progress, remaining: totalDays - currentDays };
  }, [injuryStatus.daysUntilRecovery, injuryStatus.daysSinceInjury]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("injuryAnalysis.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("injuryAnalysis.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryAnalysis.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryAnalysis.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryAnalysis.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("injuryAnalysis.injuryStatus") } />
          {injuryStatus.isInjured && (
            <div className="border rounded p-3 bg-red-50">
              <div className="font-medium text-red-600">{t("injuryAnalysis.injured")}</div>
              <div className="text-sm text-red-600">{injuryStatus.injuryType}</div>
              <div className="text-sm text-red-600 mt-1">预计恢复: {injuryStatus.daysUntilRecovery}天</div>
              <div className="mt-2">
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{ width: recoveryProgress.progress + "%" }}
                  >
                    <span className="text-green-600 text-xs ml-2">{recoveryProgress.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!injuryStatus.isInjured && (
            <div className="border rounded p-3 bg-green-50">
              <div className="font-medium text-green-600">{t("injuryAnalysis.healthy")}</div>
            </div>
          )}
        </Panel>
      </div>

      {/* 康复进度 */}
      {injuryStatus.isInjured && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("injuryAnalysis.recoveryProgress") } />
          <p className="text-muted-foreground mb-3">
            {t("injuryAnalysis.recovery", { progress: recoveryProgress.progress })} {t("injuryAnalysis.of")} {recoveryProgress.daysUntilRecovery}天
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("injuryAnalysis.daysPassed")}</div>
              <div className="text-primary">{injuryStatus.daysSinceInjury}天</div>
            </div>
            <div>
              <div className="font-medium">{t("injuryAnalysis.daysRemaining")}</div>
              <div className="text-warning">{recoveryProgress.remaining}天</div>
            </div>
          </div>
        </Panel>
      )}

      {/* 伤病历史 */}
      <Panel className="p-4">
        <SectionTitle title={t("injuryAnalysis.injuryHistory") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("injuryAnalysis.totalInjuries")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("injuryAnalysis.minorInjury", { count: Math.floor(Math.random() * 5) + 1 })}</li>
          <li>{t("injuryAnalysis.muscleInjury", { count: Math.floor(Math.random() * 3) + 1 })}</li>
          <li>{t("injuryAnalysis.jointInjury", { count: Math.floor(Math.random() * 2) })}</li>
        </ul>
      </Panel>
    </Panel>
  );
}