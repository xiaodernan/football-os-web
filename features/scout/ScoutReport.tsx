import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function ScoutReport() {
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
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("scoutReport.title") } />
        <p className="text-muted-foreground mb-4">
          {t("scoutReport.selectPlayer")}
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

  // Scout report data
  const report = useMemo(() => ({
    playerOverview: {
      name: p.name,
      age: p.age,
      position: p.position,
      currentOverall: p.overall,
      potential: p.potential,
    },
    technicalAbilities: {
      passing: Math.floor(Math.random() * 30) + 70,
      shooting: Math.floor(Math.random() * 30) + 70,
      dribbling: Math.floor(Math.random() * 30) + 70,
      defending: Math.floor(Math.random() * 30) + 70,
      heading: Math.floor(Math.random() * 20) + 80,
    },
    tacticalAbilities: {
      positioning: Math.floor(Math.random() * 30) + 70,
      vision: Math.floor(Math.random() * 30) + 70,
      workRate: Math.floor(Math.random() * 30) + 70,
      decisionMaking: Math.floor(Math.random() * 30) + 70,
    },
    physicalAttributes: {
      speed: Math.floor(Math.random() * 30) + 70,
      strength: Math.floor(Math.random() * 30) + 70,
      stamina: Math.floor(Math.random() * 30) + 70,
      acceleration: Math.floor(Math.random() * 30) + 70,
    },
    matchPerformance: {
      last5Matches: [
        { opponent: "队伍A", rating: 7.5, goals: 1, assists: 0 },
        { opponent: "队伍B", rating: 8.2, goals: 0, assists: 1 },
        { opponent: "队伍C", rating: 6.8, goals: 2, assists: 0 },
        { opponent: "队伍D", rating: 7.9, goals: 1, assists: 1 },
        { opponent: "队伍E", rating: 8.5, goals: 0, assists: 2 },
      ],
      strengths: [
        "精准的长传",
        "良好的定位",
        "强壮的身体对抗",
        "快速的加速",
      ],
      weaknesses: [
        "需要提高射门精度",
        "在高压情况下的决策",
      ],
      playingStyle: t(`style.${Math.floor(Math.random() * 4 + 1)}`),
    },
  }), [p.overall, p.potential, p.age, p.position, p.name]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("scoutReport.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("scoutReport.playerOverview") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("scoutReport.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutReport.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutReport.position")}</div>
              <div className="text-info">{p.position}</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutReport.overall")}</div>
              <div className="text-3xl font-bold text-primary">{p.overall}★</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("scoutReport.potential") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("scoutReport.currentOverall")}</div>
              <div className="text-2xl text-primary">{p.overall}★</div>
            </div>
            <div>
              <div className="font-medium">{t("scoutReport.potential")}</div>
              <div className="text-2xl font-bold text-green-600">{p.potential}★</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {t("scoutReport.growthPotential", { growth: p.potential - p.overall })}
          </p>
        </Panel>
      </div>

      {/* 技术能力 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("scoutReport.technical") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("scoutReport.passing")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.technicalAbilities.passing + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.technicalAbilities.passing}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.shooting")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.technicalAbilities.shooting + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.technicalAbilities.shooting}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("scoutReport.dribbling")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.technicalAbilities.dribbling + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.technicalAbilities.dribbling}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.defending")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.technicalAbilities.defending + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.technicalAbilities.defending}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("scoutReport.heading")}</div>
          <div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: report.technicalAbilities.heading + "%" }}
              >
                <span className="text-primary text-xs ml-2">{report.technicalAbilities.heading}</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 战术与体能 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("scoutReport.tacticalPhysical") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("scoutReport.positioning")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.tacticalAbilities.positioning + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.tacticalAbilities.positioning}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.vision")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.tacticalAbilities.vision + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.tacticalAbilities.vision}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("scoutReport.workRate")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.tacticalAbilities.workRate + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.tacticalAbilities.workRate}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.decisionMaking")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.tacticalAbilities.decisionMaking + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.tacticalAbilities.decisionMaking}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 体能属性 */}
      <Panel className="p-4">
        <SectionTitle title={t("scoutReport.physical") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("scoutReport.speed")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.physicalAttributes.speed + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.physicalAttributes.speed}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.strength")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.physicalAttributes.strength + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.physicalAttributes.strength}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("scoutReport.stamina")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.physicalAttributes.stamina + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.physicalAttributes.stamina}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="font-medium">{t("scoutReport.acceleration")}</div>
            <div>
              <div className="h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: report.physicalAttributes.acceleration + "%" }}
                >
                  <span className="text-primary text-xs ml-2">{report.physicalAttributes.acceleration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* 优缺点与风格 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("scoutReport.strengthsWeaknesses") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionTitle title={t("scoutReport.strengths") } />
            <ul className="list-disc list-inside space-y-2 text-primary">
              {report.matchPerformance.strengths.map(strength => (
                <li key={strength}>{strength}</li>
              ))}
            </ul>
          </div>
          <div>
            <SectionTitle title={t("scoutReport.weaknesses") } />
            <ul className="list-disc list-inside space-y-2 text-warning">
              {report.matchPerformance.weaknesses.map(weakness => (
                <li key={weakness}>{weakness}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("scoutReport.playingStyle")}</div>
          <div className="text-info">{report.matchPerformance.playingStyle}</div>
        </div>
      </Panel>
    </Panel>
  );
}