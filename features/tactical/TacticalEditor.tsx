import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TacticalEditor() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      played: c.matchesPlayed || 38,
      formation: t(`formation.${Math.floor(Math.random() * 8 + 1)}`),
    }));
  }, [clubs]);

  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);

  const formations = useMemo(() => [
    "4-4-2",
    "4-3-3",
    "3-5-2",
    "4-2-3-1",
    "3-4-3",
    "5-3-2",
    "4-5-1",
    "4-1-2-1-2",
  ] as const);

  const [selectedTactic, setSelectedTactic] = useState<string | null>(null);

  const tactics = useMemo(() => [
    "控球型",
    "反击型",
    "高位逼抢",
    "边路进攻",
    "中场控制",
    "防守反击",
    "定位球专注",
    "快节奏",
  ] as const);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectFormation = (formation: string) => {
    setSelectedFormation(formation);
  };

  const handleSelectTactic = (tactic: string) => {
    setSelectedTactic(tactic);
  };

  if (!clubData.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("tacticalEditor.title")} />
        <p className="text-muted-foreground mb-4">
          {t("tacticalEditor.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("tacticalEditor.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">{selectedClub ? clubs.find(c => c.id === selectedClub)?.name || '' : '全联盟'}</div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("tacticalEditor.selectClub")}</div>
        </div>
      </div>

      {/* 战术配置 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("tacticalEditor.formationConfig")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("tacticalEditor.selectFormation")}</p>
        <div className="grid grid-cols-2 gap-3">
          {formations.map(formation => (
            <Button
              key={formation}
              variant={selectedFormation === formation ? "primary" : "outline"}
              size="sm"
              onClick={() => handleSelectFormation(formation)}
            >
              {formation}
            </Button>
          ))
        </div>
      </Panel>

      {/* 战术体系 */}
      {selectedFormation && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("tacticalEditor.tacticSystem")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("tacticalEditor.selectTactic")}</p>
        </Panel>
      )}

      {/* 详细战术设置 */}
      {selectedFormation && selectedTactic && (
        <Panel className="p-4">
          <SectionTitle title={t("tacticalEditor.tacticDetails")} />
          <p>{t("tacticalEditor.formation", { formation: selectedFormation })}</p>
          <p>{t("tacticalEditor.system", { tactic: selectedTactic })}</p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>{t("tacticalEditor.attackFocus")}</li>
            <li>{t("tacticalEditor.defenseFocus")}</li>
            <li>{t("tacticalEditor.midfieldFocus")}</li>
          </ul>
        </Panel>
      )}

      {/* 联盟阵型统计 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("tacticalEditor.leagueFormation")} />
        <p className="text-sm text-muted-foreground">
          {t("tacticalEditor.leagueFormationStats", { total: clubs.length })}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("tacticalEditor.mostCommon", { formation: formations[0] })}</li>
          <li>{t("tacticalEditor.secondMost", { formation: formations[1] })}</li>
          <li>{t("tacticalEditor.thirdMost", { formation: formations[2] })}</li>
        </ul>
      </Panel>

      {/* 保存/加载 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("tacticalEditor.saveLoad")} />
        <p className="text-sm text-muted-foreground">
          {t("tacticalEditor.tacticalTemplates")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>{t("tacticalEditor.defaultTemplate")}</li>
          <li>{t("tacticalEditor.customTemplate")}</li>
          <li>{t("tacticalEditor.importTemplate")}</li>
          <li>{t("tacticalEditor.exportTemplate")}</li>
        </ul>
      </Panel>
    </Panel>
  );
}