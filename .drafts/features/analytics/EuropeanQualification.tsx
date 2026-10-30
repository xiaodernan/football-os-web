import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function EuropeanQualification() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);

  const [selectedView, setSelectedView] = useState<"uefa" | "conference">("uefa");

  const clubData = useMemo(() => {
    return clubs.map(c => ({
      id: c.id,
      name: c.name,
      position: c.position || 0,
      points: c.points || 0,
      played: c.matchesPlayed || 38,
      uefaQualified: c.uefaQualified || false,
      conferenceQualified: c.conferenceQualified || false,
    }));
  }, [clubs]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  const uefaTeams = clubData.filter(c => c.uefaQualified || c.position <= 4);
  const conferenceTeams = clubData.filter(c => c.conferenceQualified || (c.position >= 5 && c.position <= 8));

  if (!clubData.some(c => c.uefaQualified || c.conferenceQualified)) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("europeanQualification.title")} />
        <p className="text-muted-foreground mb-4">
          {t("europeanQualification.noQualified")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {clubs.map(c => (
            <Button
              key={c.id}
              variant="outline"
              size="sm"
              onClick={() => {/* navigate to club detail */}
              }
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("europeanQualification.title")} />

      {/* 视图切换 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button
          variant={setSelectedView === "uefa" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("uefa")}
        >
          {t("europeanQualification.uefa")}
        </Button>
        <Button
          variant={setSelectedView === "conference" ? "primary" : "outline"}
          size="sm"
          onClick={() => handleSelectView("conference")}
        >
          {t("europeanQualification.conference")}
        </Button>
      </div>

      {/* UEFA Champions League */}
      {setSelectedView === "uefa" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("europeanQualification.uefaChampionsLeague")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("europeanQualification.championsLeagueDesc")}</p>
          <ul className="list-disc list-inside space-y-2 text-sm text-primary">
            {[1, 2, 3, 4].map(pos => (
              <li key={pos}>
                {t(`europeanQualification.position${pos}`, { position: pos })}:
                {t(`europeanQualification.autoQualify`)}</li>
            ))}
          </ul>
          {uefaTeams.slice(0, 4).map(c => (
            <li key={c.id} className="font-medium text-primary">
              {c.position}位 - {c.name} ({c.points}分)
            </li>
          ))}
        </Panel>
      )}

      {/* UEFA Europa League */}
      {setSelectedView === "conference" && (
        <Panel className="p-4 mb-6">
          <SectionTitle title={t("europeanQualification.uefaEuropaLeague")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("europeanQualification.eloLeagueDesc")}</p>
          <ul className="list-disc list-inside space-y-2 text-sm text-warning">
            {[5, 6, 7, 8].map(pos => (
              <li key={pos}>
                {t(`europeanQualification.position${pos}`, { position: pos })}:
                {t(`europeanQualification.autoQualify`)}</li>
            ))}
          </ul>
          {conferenceTeams.slice(0, 4).map(c => (
            <li key={c.id} className="font-medium text-warning">
              {c.position}位 - {c.name} ({c.points}分)
            </li>
          ))}
        </Panel>
      )}

      {/* Conference League */}
      <Panel className="p-4">
        <SectionTitle title={t("europeanQualification.conferenceLeague")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("europeanQualification.conferenceLeagueDesc")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-info">
          {[9, 10, 11, 12].map(pos => (
            <li key={pos}>
              {t(`europeanQualification.position${pos}`, { position: pos })}:
              {t(`europeanQualification.autoQualify`)}</li>
          ))}
        </ul>
      </Panel>

      {/* 降级区 */}
      <Panel className="p-4">
        <SectionTitle title={t("europeanQualification.relegation")} />
        <p className="text-sm text-danger mb-3">
          {t("europeanQualification.relegationDesc")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-danger">
          {[19, 20].map(pos => (
            <li key={pos}>
              {t(`europeanQualification.position${pos}`, { position: pos })}:
              {t(`europeanQualification.relegation`)}</li>
          ))}
        </ul>
      </Panel>

      {/* 积分榜概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("europeanQualification.overview")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("europeanQualification.totalTeams", { count: clubData.length })}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr>
                <th className="text-left p-3 border border-gray-200">{t("europeanQualification.position")}</th>
                <th className="text-left p-3 border border-gray-200">{t("europeanQualification.team")}</th>
                <th className="text-left p-3 border border-gray-200">{t("europeanQualification.points")}</th>
                <th className="text-left p-3 border border-gray-200">{t("europeanQualification.uefa")}</th>
                <th className="text-left p-3 border border-gray-200">{t("europeanQualification.conference")}</th>
              </tr>
            </thead>
            <tbody>
              {clubData.sort((a, b) => (b.points || 0) - (a.points || 0)).map(c => (
                <tr key={c.id} className="border-b">
                  <td className="p-3 font-medium text-primary">{c.position}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.points}</td>
                  <td className="p-3">{t(c.uefaQualified ? "yes" : "no")}</td>
                  <td className="p-3">{t(c.conferenceQualified ? "yes" : "no")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Panel>
  );
}