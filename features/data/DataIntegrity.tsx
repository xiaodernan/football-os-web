import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function DataIntegrity() {
  const { t } = useI18n();
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedTab, setSelectedTab] = useState<"players" | "clubs">("players");

  // 验证玩家数据
  const playerValidation = useMemo(() => {
    const issues = [];
    let total = players.length;
    let valid = 0;

    players.forEach((p, index) => {
      const hasName = p.name && p.name.trim().length > 0;
      const hasOverall = p.overall >= 0 && p.overall <= 100;
      const hasPotential = p.potential >= 0;
      const hasAge = p.age >= 15 && p.age <= 45;
      const hasValue = p.marketValue >= 0;

      if (hasName && hasOverall && hasPotential && hasAge && hasValue) {
        valid++;
      } else {
        issues.push({
          id: index,
          name: p.name || "Unknown",
          issues: [
            !hasName ? "缺少姓名" : "",
            !hasOverall ? "无效总体评分" : "",
            !hasAge ? "无效年龄" : "",
            !hasValue ? "无效市场价值" : "",
          ].filter(Boolean),
        });
      }
    });

    return {
      total,
      valid,
      issues,
      validityRate: Math.round((valid / total) * 100),
    };
  }, [players]);

  // 验证俱乐部数据
  const clubValidation = useMemo(() => {
    const clubs = useMemo(() => footballProvider.clubs(), []);
    const issues = [];
    let total = clubs.length;
    let valid = 0;

    clubs.forEach((c, index) => {
      const hasName = c.name && c.name.trim().length > 0;
      const hasRevenue = c.revenue && c.revenue >= 0;
      const hasWageBill = c.wageBill && c.wageBill >= 0;

      if (hasName && hasRevenue && hasWageBill) {
        valid++;
      } else {
        issues.push({
          id: index,
          name: c.name || "Unknown",
          issues: [
            !hasName ? "缺少俱乐部名称" : "",
            !hasRevenue ? "无效营收" : "",
            !hasWageBill ? "无效薪资账单" : "",
          ].filter(Boolean),
        });
      }
    });

    return {
      total,
      valid,
      issues,
      validityRate: Math.round((valid / total) * 100),
    };
  }, [clubs]);

  const handleSelectTab = (tab: string) => {
    setSelectedTab(tab);
  };

  return (
    <Panel className="p-6">
      <SectionTitle title={t("dataIntegrity.title") } />

      {/* 标签切换 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          variant={setSelectedTab === "players" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("players")}
        >
          {t("dataIntegrity.players")}
        </Button>
        <Button
          variant={setSelectedTab === "clubs" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectTab("clubs")}
        >
          {t("dataIntegrity.clubs")}
        </Button>
      </div>

      {/* 玩家数据验证 */}
      {setSelectedTab === "players" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("dataIntegrity.playerDataValidation") } />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("dataIntegrity.totalPlayers")}
              value={playerValidation.total.toLocaleString()}
              subtitle={t("dataIntegrity.validityRate", { rate: playerValidation.validityRate })}
            />
            <StatTile
              title={t("dataIntegrity.issuesFound")}
              value={playerValidation.issues.length}
              status={playerValidation.issues.length > 0 ? "warning" : "success"}
            />
          </div>
          {playerValidation.issues.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-danger mb-2">{t("dataIntegrity.sampleIssues", { count: playerValidation.issues.length })}</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-danger">
                {playerValidation.issues.slice(0, 3).map(issue => (
                  <li key={issue.id}>{issue.name}: {issue.issues.join(", ")}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}

      {/* 俱乐部数据验证 */}
      {setSelectedTab === "clubs" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("dataIntegrity.clubDataValidation") } />
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              title={t("dataIntegrity.totalClubs")}
              value={clubValidation.total.toLocaleString()}
              subtitle={t("dataIntegrity.validityRate", { rate: clubValidation.validityRate })}
            />
            <StatTile
              title={t("dataIntegrity.issuesFound")}
              value={clubValidation.issues.length}
              status={clubValidation.issues.length > 0 ? "warning" : "success"}
            />
          </div>
          {clubValidation.issues.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-danger mb-2">{t("dataIntegrity.sampleIssues", { count: clubValidation.issues.length })}</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-danger">
                {clubValidation.issues.slice(0, 3).map(issue => (
                  <li key={issue.id}>{issue.name}: {issue.issues.join(", ")}</li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      )}
    </Panel>
  );
}