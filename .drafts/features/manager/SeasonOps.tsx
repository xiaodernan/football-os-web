import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonOps() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);

  // 模拟赛季运营数据
  const opsData = useMemo(() => ({
    season: new Date().getFullYear(),
    activeEvents: 12,
    completedEvents: 8,
    remainingEvents: 4,
    totalRewards: 2500000,
    distributedRewards: 1800000,
    activeMembers: 150,
    totalMembers: 200,
  }, []));

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.seasonOpsTitle")} />
      
      {/* 赛季运营概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.season")}
          value={newsData.season.toString()}
          subtitle={t("manager.currentSeason")}
        />
        <StatTile
          title={t("manager.activeEvents")}
          value={opsData.activeEvents.toString()}
          subtitle={t("manager.activeThisSeason")}
        />
        <StatTile
          title={t("manager.completedEvents")}
          value={opsData.completedEvents.toString()}
          subtitle={t("manager.completed")}
        />
        <StatTile
          title={t("manager.remainingEvents")}
          value={opsData.remainingEvents.toString()}
          subtitle={t("manager.remaining")}
        />
      </div>

      {/* 奖励数据 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.rewards")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.totalRewards")}
            value={`${t("currency.euro")} ${opsData.totalRewards.toLocaleString()}`}
            subtitle={t("manager.totalRewardPool")}
          />
          <StatTile
            title={t("manager.distributedRewards")}
            value={`${t("currency.euro")} ${opsData.distributedRewards.toLocaleString()}`}
            subtitle={t("manager.alreadyDistributed")}
          />
        </div>
      </Panel>

      {/* 成员统计 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.memberStats")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.activeMembers")}
            value={opsData.activeMembers.toString()}
            subtitle={t("manager.active")}
          />
          <StatTile
            title={t("manager.totalMembers")}
            value={opsData.totalMembers.toString()}
            subtitle={t("manager.total")}
        </div>
      </Panel>
    </Panel>
  );
}