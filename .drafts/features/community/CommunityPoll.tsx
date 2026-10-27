import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommunityPoll() {
  const { t } = useI18n();

  // 模拟投票调查数据
  const poll = useMemo(() => ({
    question: "本赛季最有价值球员是谁？",
    options: [
      { id: "1", text: "前锋 A", votes: 45, percentage: 32 },
      { id: "2", text: "中场 B", votes: 38, percentage: 27 },
      { id: "3", text: "后卫 C", votes: 30, percentage: 21 },
      { id: "4", text: "门将 D", votes: 15, percentage: 11 },
      { id: "5", text: "全员均等", votes: 12, percentage: 9 },
    ],
    totalVotes: 140,
    expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  }), []);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("community.pollTitle")} />

      {/* 投票问题 */}
      <Panel className="p-4 mb-6">
        <div className="text-2xl font-bold mb-3">{poll.question}</div>
        <p className="text-muted-foreground mb-4">
          {t("community.pollCastYourVote")}
        </p>
      </Panel>

      {/* 投票选项 */}
      <Panel className="p-4">
        <SectionTitle title={t("community.votingOptions")} />
        {poll.options.map(option => (
          <div
            key={option.id}
            className={`border rounded p-3 flex items-start ${
              option.id === selectedOption ? "bg-primary-100 text-primary" : "bg-gray-50"
            }`}
            onClick={() => setSelectedOption(option.id)}
          >
            <div className="flex-1">
              <div className="font-medium truncate">{option.text}</div>
              <div className="text-sm text-muted-foreground">{t("community.votes", { votes: option.votes })}</div>
            </div>
            <div className="ml-3 w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  option.id === selectedOption ? "bg-primary" : "bg-gray-300"
                } transition-colors`}
                style={{ width: `${option.percentage}%` }}
              ></div>
            </div>
            <div className="ml-3 text-right text-xs text-gray-500">
              {option.percentage}%
            </div>
          </div>
        ))}
      </Panel>

      {/* 结果统计 */}
      {selectedOption && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("community.results")} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("community.winner")}</div>
              <div className="text-2xl font-bold text-primary">
                {poll.options.find(o => o.id === selectedOption)?.text || ""}
              </div>
            </div>
            <div>
              <div className="font-medium">{t("community.participation")}</div>
              <div className="text-2xl font-bold">
                {poll.totalVotes} {t("community.voters")}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedOption(null)}
          >
            {t("community.voteAgain")}
          </Button>
        </Panel>
      )}
    </Panel>
  );
}