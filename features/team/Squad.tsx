import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function Squad() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [formation, setFormation] = useState<"4-4-2" | "4-3-3" | "3-5-2">("4-4-2");

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      won: c.wins || 0,
      drawn: c.draws || 0,
      lost: c.losses || 0,
      points: c.points || 0,
      goalsFor: c.goalsFor || 0,
      goalsAgainst: c.goalsAgainst || 0,
    }));
  }, [clubs]);

  const startingXI = useMemo(() => {
    return players
      .filter(p => p.overall >= 75 && !p.injuryStatus)
      .sort((a, b) => b.overall - a.overall)
      .slice(11);
  }, [players]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("squad.title")} />
        <p className="text-muted-foreground mb-4">
          {t("squad.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("squad.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">
            {selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : "全联盟"}
          </div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("squad.selectClub")}</div>
        </div>
      </div>

      {/* 战术阵型 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squad.formation")} />
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormation("4-4-2")}
          >
            4-4-2
          </Button>
          <Button
            variant={formation === "4-3-3" ? "primary" : "outline"}\n            size="sm"\n            onClick={() => setFormation("4-3-3")}
          >
            4-3-3
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFormation("3-5-2")}
          >
            3-5-2
          </Button>
        </div>
      </Panel>

      {/* 首发阵容 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squad.startingXI")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("squad.formation", { formation })} - {t("squad.tactics")}</p>
        <ol className="list-decimal list-inside space-y-1 text-sm text-primary">
          {startingXI.map((p, i) => (
            <li key={p.id} className="font-medium text-primary mb-1">
              {t("squad.position", { position: i + 1 })}:
              {t("squad.{name}", { name: p.name })} -
              {t("squad.overall", { overall: p.overall })}★ -
              {t("squad.positionText", { position: p.position })}
            </li>
          ))}
        </ol>
      </Panel>

      {/* 替补名单 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("squad.substitutes")} />
        const reserves = useMemo(() => {
          return players
            .filter(p => p.overall >= 70 && p.overall < 75)
            .sort((a, b) => b.overall - a.overall);
        }, [players]);

        <ol className="list-decimal list-inside space-y-1 text-sm text-secondary">
          {reserves.slice(0, 5).map(p => (
            <li key={p.id} className="font-medium text-secondary mb-1">
              {t("squad.position", { position: reserves.indexOf(p) + 6 })}:
              {t("squad.{name}", { name: p.name })} -
              {t("squad.overall", { overall: p.overall })}★
            </li>
          ))}
        </ol>
      </Panel>

      {/* 选中的俱乐部详情 */}
      {selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("squad.clubDetail")} />
          const club = clubs.find(c => c.id === selectedClub)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("squad.name")}</div>
              <div className="text-2xl text-primary">{club.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("squad.position")}</div>
              <div>{club.position}位</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("squad.points")}</div>
            <div className="text-3xl text-primary">{club.points}分</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("squad.goalDifference")}</div>
            <div>
              {club.goalsFor - club.goalsAgainst >= 0 ? `+${club.goalsFor - club.goalsAgainst}` : club.goalsFor - club.goalsAgainst}
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("squad.formation")}</div>
            <div>{formation}</div>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("squad.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("squad.totalClubs", { total: clubs.length })} 家俱乐部
        </p>
        <p>{t("squad.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("squad.avgOverall", {
            avg: (players.reduce((sum, p) => sum + p.overall, 0) / players.length).toFixed(1),
          })} 平均总体评分
        </p>
        <p>
          {t("squad.formationDistribution", {
            formation: formation,
          })} 常用阵型
        </p>
      </Panel>
    </Panel>
  );
}