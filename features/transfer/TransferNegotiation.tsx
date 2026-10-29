import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferNegotiation() {
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
      currentClub: p.currentClub || t("general.realMadrid"),
      marketValue: p.marketValue,
    }));
  }, [players]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!selectedPlayer) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferNegotiation.title") } />
        <p className="text-muted-foreground mb-4">
          {t("transferNegotiation.selectPlayer")}
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

  // 谈判状态
  const negotiationStatus = useMemo(() => ({
    isNegotiating: true,
    offerPhase: "initial",
    daysSinceOffer: Math.floor(Math.random() * 10),
    counterOffers: Math.floor(Math.random() * 3),
  }), []);

  // 提议和要求
  const offer = useMemo(() => ({
    clubOffer: Math.round(p.marketValue * 0.7),
    playerWage: Math.round(p.marketValue * 0.002),
    contractLength: Math.floor(Math.random() * 4) + 3, // 3-6年
    releaseClause: Math.round(p.marketValue * 1.5),
  }), [p.marketValue]);

  const demands = useMemo(() => ({
    playerWageExpectation: Math.round(p.marketValue * 0.003),
    contractLengthExpectation: Math.floor(Math.random() * 2) + 3,
    releaseClauseExpectation: Math.round(p.marketValue * 1.2),
    imageRights: Math.random() > 0.5,
  }), [p.marketValue]);

  // 谈判结果
  const result = useMemo(() => ({
    dealCompleted: Math.random() > 0.4,
    finalFee: Math.round(p.marketValue * (0.7 + Math.random() * 0.3)),
    playerTerms: {
      wage: Math.round(p.marketValue * 0.0025),
      contract: Math.floor(Math.random() * 3) + 3,
    },
    status: Math.random() > 0.5 ? "agreed" : "rejected",
  }), [p.marketValue]);

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferNegotiation.title") } />

      {/* 球员画像 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Panel className="p-4">
          <SectionTitle title={t("transferNegotiation.playerInfo") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferNegotiation.name")}</div>
              <div className="text-2xl font-bold text-primary">{p.name}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferNegotiation.club")}</div>
              <div className="text-info">{p.currentClub}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferNegotiation.age")}</div>
              <div className="text-muted-foreground">{p.age}岁</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("transferNegotiation.marketValue") } />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium">{t("transferNegotiation.currentValue")}</div>
              <div className="text-primary">{t("currency.euro")} {p.marketValue.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-medium">{t("transferNegotiation.offer")}</div>
              <div className={offer.clubOffer > p.marketValue * 0.6 ? "text-success" : "text-warning"}>
                {t("currency.euro")} {offer.clubOffer.toLocaleString()}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* 谈判概览 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferNegotiation.negotiationStatus") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("transferNegotiation.status")}</div>
            <div>{t(`negotiationStatus.${negotiationStatus.isNegotiating ? "active" : "completed"}`)}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferNegotiation.phase")}</div>
            <div>{t(`phase.${negotiationStatus.offerPhase}`)}</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t("transferNegotiation.daysSinceOffer", { days: negotiationStatus.daysSinceOffer })}
        </p>
      </Panel>

      {/* 提议与要求 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferNegotiation.offerDetails") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("transferNegotiation.clubOffer")}</div>
            <div>{t("currency.euro")} {offer.clubOffer.toLocaleString()}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferNegotiation.playerWage")}</div>
            <div>{t("currency.euro")} {offer.playerWage.toLocaleString()}/w</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <div className="font-medium">{t("transferNegotiation.contractLength")}</div>
            <div>{offer.contractLength}{/}{t("transferNegotiation.years")}</div>
          </div>
          <div>
            <div className="font-medium">{t("transferNegotiation.releaseClause")}</div>
            <div>{t("currency.euro")} {offer.releaseClause.toLocaleString()}</div>
          </div>
        </div>
      </Panel>

      {/* 球员要求 */}
      <Panel className="p-4">
        <SectionTitle title={t("transferNegotiation.playerDemands") } />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="font-medium">{t("transferNegotiation.playerWageExpectation")}</div>
            <div>{t("currency.euro")} {demands.playerWageExpectation.toLocaleString()}/w</div>
          </div>
          <div>
            <div className="font-medium">{t("transferNegotiation.contractLengthExpectation")}</div>
            <div>{demands.contractLengthExpectation}{/}{t("transferNegotiation.years")}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium">{t("transferNegotiation.imageRights")}</div>
          <div>{t(demands.imageRights ? "yes" : "no")}</div>
        </div>
      </Panel>

      {/* 谈判结果 */}
      {negotiationStatus.isNegotiating && (
        <Panel className="p-4 mb-6 bg-blue-50">
          <SectionTitle title={t("transferNegotiation.progress") } />
          <p>{t("transferNegotiation.inProgress")}</p>
          <div className="progress-bar bg-blue-100 h-2 rounded">
            <div className="progress-bar-fill bg-blue-600 h-2 rounded" style={{ width: Math.min(100, (negotiationStatus.daysSinceOffer + 1) * 10) }}></div>
          </div>
          <p className="text-xs text-blue-600 mt-1">{t("transferNegotiation.daysElapsed", { days: negotiationStatus.daysSinceOffer })}</p>
        </Panel>
      )}

      {!negotiationStatus.isNegotiating && result.dealCompleted && (
        <Panel className="p-4 mb-6 bg-green-50">
          <SectionTitle title={t("transferNegotiation.dealCompleted") } />
          <p>{t("transferNegotiation.dealSuccess", { fee: t("currency.euro")} {result.finalFee.toLocaleString()} })</p}
          <p>{t("transferNegotiation.playerTerms", { wage: t("currency.euro")} {result.playerTerms.wage.toLocaleString()}/w, contract: result.playerTerms.contract}{/}{t("transferNegotiation.years")})}</p>
        </Panel>
      )}

      {!negotiationStatus.isNegotiating && !result.dealCompleted && (
        <Panel className="p-4 mb-6 bg-red-50">
          <SectionTitle title={t("transferNegotiation.dealFailed") } />
          <p>{t("transferNegotiation.dealRejected")}</p>
          <p>{t("transferNegotiation.nextSteps")}</p>
        </Panel>
      )}
    </Panel>
  );
}