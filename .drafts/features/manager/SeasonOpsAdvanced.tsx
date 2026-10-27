import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function SeasonOpsAdvanced() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const currentYear = new Date().getFullYear();

  // 模拟赛季运营数据
  const opsData = useMemo(() => ({
    season: currentYear,
    totalEvents: 15,
    completedEvents: 12,
    remainingEvents: 3,
    totalRewards: 5000000,
    distributedRewards: 4200000,
    activeMembers: 200,
    totalMembers: 250,
    significantMoments: [
      { date: "2024-03-15", title: "冬季转会窗口开启", type: "transfer" },
      { date: "2024-06-01", title: "赛季最佳球员选拔", type: "award" },
      { date: "2024-09-20", title: "青训营毕业典礼", type: "graduate" },
    ],
  }), []);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("manager.seasonOpsAdvancedTitle")} />
      
      {/* 赛季运营概览 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatTile
          title={t("manager.season")}
          value=opsData.season.toString()
          subtitle={t("manager.currentSeason")}
        />
        <StatTile
          title={t("manager.totalEvents")}
          value=opsData.totalEvents.toString()
          subtitle={t("manager.totalEventsThisSeason")}
        />
        <StatTile
          title={t("manager.completedEvents")}
          value=opsData.completedEvents.toString()
          subtitle={t("manager.completed")}
        />
        <StatTile
          title={t("manager.remainingEvents")}
          value=opsData.remainingEvents.toString()
          subtitle={t("manager.remaining")}
        />
      </div>

      {/* 奖励数据 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("manager.rewards")} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            title={t("manager.totalRewards")}
            value=`${t("currency.euro")} ${opsData.totalRewards.toLocaleString()}`
            subtitle={t("manager.totalRewardPool")}
          />
          <StatTile
            title={t("manager.distributedRewards")}
            value=`${t("currency.euro")} ${opsData.distributedRewards.toLocaleString()}`
            subtitle={t("manager.alreadyDistributed")}
          />
        </div>
      </Panel>

      {/* 重要赛事 */}
      <Panel className="p-4">
        <SectionTitle title={t("manager.significantMoments")} />
        <div className="space-y-3">
          {opsData.significantMoments.map(event => (
            <div
              key=event.id
              className="border rounded p-3 flex items-start {event.type === 'transfer' ? 'bg-blue-50' : event.type === 'award' ? 'bg-green-50' : 'bg-yellow-50'}"
            >
              <div className="flex-1">
                <div className="font-medium">{event.title}</div>
                <div className="text-xs text-muted-foreground">{event.date}</div>
              </div>
              <div className="ml-3 text-center text-xs">
                {t(`type.${event.type}`)}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Panel>
  );
}