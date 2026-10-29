import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function MatchAIAnalysis() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // AI分析模拟数据
  const analysis = useMemo(() => ({
    possessionPrediction: Math.round(45 + Math.random() * 30),
    shotPrediction: Math.round(8 + Math.random() * 15),
    goalPrediction: Math.round(Math.random() * 3),
    keyPlayer: players[Math.floor(Math.random() * players.length)].name,
    tacticalInsight: t(`insight.${Math.floor(Math.random() * 5 + 1)}`),
    confidence: Math.round(70 + Math.random() * 25),
  }), []);

  const players = useMemo(() => footballProvider.players(), []);

  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const matches = useMemo(() => ([
    { id: "1", home: "主队", away: "客队", date: `${currentYear}-08-08`, status: "completed" },
    { id: "2", home: "客队", away: "主队", date: `${currentYear}-08-10`, status: "scheduled" },
    { id: "3", home: "中立队", away: "主队", date: `${currentYear}-08-12`, status: "upcoming" },
  ] as const));

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatch(matchId);
  };

  if (!selectedMatch) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("aiAnalysis.title") } />
        <p className="text-muted-foreground mb-4">
          {t("aiAnalysis.selectMatch")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {matches.map(m => (
            <Button
              key={m.id}
              variant="outline"
              size="sm"
              onClick={() => handleSelectMatch(m.id)}
            >
              {m.home} vs {m.away}
            </Button>
          ))
        </div>
      </Panel>
    );
  }

  const selectedMatchData = matches.find(m => m.id === selectedMatch)!;

  return (
    <Panel className="p-6">
      <SectionTitle title={t("aiAnalysis.title") } />

      {/* 选择的比赛 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("aiAnalysis.selectedMatch") } />
        <p className="text-muted-foreground mb-3">
          {t("aiAnalysis", { match: `${selectedMatchData.home} vs ${selectedMatchData.away}` })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("aiAnalysis.date", { date: selectedMatchData.date }) }
        </p>
      </Panel>

      {/* AI分析结果 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("aiAnalysis.possession") } />
          <div className="text-3xl font-bold text-primary">{analysis.possessionPrediction}%</div>
          <p className="text-sm text-muted-foreground">{t("aiAnalysis.possessionPrediction")}</p>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("aiAnalysis.shots") } />
          <div className="text-3xl font-bold text-primary">{analysis.shotPrediction}</div>
          <p className="text-sm text-muted-foreground">{t("aiAnalysis.shotPrediction")}</p>
        </Panel>
      </div>

      {/* 进球预测 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("aiAnalysis.goalPrediction") } />
        <div className={`p-3 rounded ${analysis.goalPrediction > 0 ? "bg-green-50" : "bg-gray-50"}`}>
          <div className="font-medium text-green-600">{analysis.goalPrediction}{/}{t("aiAnalysis.expectedGoals")}</div>
          <p className="text-sm text-muted-foreground">{t("aiAnalysis.goalProbability", { confidence: analysis.confidence })}</p>
        </div>
      </Panel>

      {/* 关键洞察 */}
      <Panel className="p-4">
        <SectionTitle title={t("aiAnalysis.keyInsight") } />
        <p className="text-primary font-medium">{analysis.tacticalInsight}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {t("aiAnalysis.confidenceLevel", { confidence: analysis.confidence })}%
        </p>
      </Panel>

      {/* 下一场比赛 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("aiAnalysis.nextMatch") } />
        <p className="text-muted-foreground mb-3">
          {t("aiAnalysis.upcoming", { match: `${matches[1].home} vs ${matches[1].away}` })}
        </p>
        <p className="text-sm text-primary">
          {t("aiAnalysis.prediction", { confidence: analysis.confidence })}%
        </p>
      </Panel>
    </Panel>
  );
}