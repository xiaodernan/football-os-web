import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function FanVote() {
  const { t } = useI18n();
  const currentYear = new Date().getFullYear();

  // 模拟投票数据
  const votes = useMemo(() => ([
    { id: "1", match: "主队胜", votes: 67, percentage: 45 },
    { id: "2", match: "客队胜", votes: 52, percentage: 35 },
    { id: "3", match: "平局", votes: 28, percentage: 20 },
  ] as const));

  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  const handleSelectVote = (voteId: string) => {
    setSelectedVote(voteId);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("fanVote.title") } />

      {/* 投票概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("fanVote.totalVotes")}
          value={votes.reduce((sum, v) => sum + v.votes, 0).toLocaleString()}
          subtitle={t("fanVote.voters")}
        />
        <StatTile
          title={t("fanVote.highestSupport")}
          value={Math.max(...votes.map(v => v.percentage))}%
          subtitle={t("fanVote.supportRate")}
        />
      </div>

      {/* 投票选项 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("fanVote.votingOptions") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("fanVote.predictMatchResult")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {votes.map(vote => (
            <Button
              key={vote.id}
              variant={selectedVote === vote.id ? "primary" : "outline"}
              size="sm"
              onClick={() => handleSelectVote(vote.id)}
            >
              {vote.match} {t("fanVote", { votes: vote.votes, percentage: vote.percentage })}
            </Button>
          ))
        </div>
      </Panel>

      {/* 结果展示 */}
      {selectedVote && (
        <Panel className="p-4 mb-6 bg-blue-50">
          <SectionTitle title={t("fanVote.votingResult") } />
          <p className="text-blue-600 mb-3">
            {t("fanVote.youSelected", { option: selectedVote })}
          </p>
          <p className="text-primary">{t("fanVote.resultPercentage", { percentage: votes.find(v => v.id === selectedVote)?.percentage })}</p>
        </Panel>
      )}

      {/* 过往投票统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("fanVote.votingHistory") } />
        <p className="text-sm text-muted-foreground mb-3">
          {t("fanVote.totalVotingSessions")}
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>{t("fanVote.session1")}</li>
          <li>{t("fanVote.session2")}</li>
          <li>{t("fanVote.session3")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}