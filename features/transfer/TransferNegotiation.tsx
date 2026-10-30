import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { footballProvider } from "@/data/footballService";

export function TransferNegotiation() {
  const { t } = useI18n();
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const players = useMemo(() => footballProvider.players(), []);

  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [offerStatus, setOfferStatus] = useState<"pending" | "accepted" | "rejected">("pending");

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
      marketValue: c.marketValue || 0,
    }));
  }, [clubs]);

  const playerData = useMemo(() => {
    return players.map(p => ({
      id: p.id,
      name: p.name,
      overall: p.overall,
      potential: p.potential,
      age: p.age,
      position: p.position,
      marketValue: p.marketValue || 0,
      contractYear: p.contractYear || 0,
    }));
  }, [players]);

  const handleSelectClub = (clubId: string) => {
    setSelectedClub(clubId);
  };

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  if (!clubs.length) {
    return (
      <Panel className="p-6">
        <SectionTitle title={t("transferNegotiation.title")} />
        <p className="text-muted-foreground mb-4">
          {t("transferNegotiation.noClubs")}
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <SectionTitle title={t("transferNegotiation.title")} />

      {/* 选中的俱乐部 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border rounded p-3 text-center">
          <div className="font-medium text-primary">
            {selectedClub ? clubs.find(c => c.id === selectedClub)?.name || "" : "全联盟"}
          </div>
        </div>
        <div className="border rounded p-3 text-center">
          <div>{t("transferNegotiation.selectClub")}</div>
        </div>
      </div>

      {/* 转会谈议 */}
      <Panel className="p-4 mb-6">
        <SectionTitle title={t("transferNegotiation.negotiations")} />
        <p className="text-sm text-muted-foreground mb-3">
          {t("transferNegotiation.activeNegotiations", { count: 3 })}
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-primary">
          <li>
            {t("transferNegotiation.{name}", { name: players[0]?.name }}) →
            {t("transferNegotiation.{name}", { name: clubs[0]?.name }}) -
            {t("transferNegotiation.fee", { fee: 20000000 })} -
            {t("transferNegotiation.status", { status: "进行中" })}
          </li>
          <li>
            {t("transferNegotiation.{name}", { name: players[1]?.name }}) →
            {t("transferNegotiation.{name}", { name: clubs[1]?.name }}) -
            {t("transferNegotiation.fee", { fee: 15000000 })} -
            {t("transferNegotiation.status", { status: "暂停" })}
          </li>
          <li>
            {t("transferNegotiation.{name}", { name: players[2]?.name }}) →
            {t("transferNegotiation.{name}", { name: clubs[2]?.name }}) -
            {t("transferNegotiation.fee", { fee: 25000000 })} -
            {t("transferNegotiation.status", { status: "已结束" })}
          </li>
        </ul>
      </Panel>

      {/* 选中的球员详情 */}
      {selectedPlayer && selectedClub && (
        <Panel className="p-4">
          <SectionTitle title={t("transferNegotiation.playerDetail")} />
          const player = playerData.find(pl => pl.id === selectedPlayer)!;
          const club = clubs.find(c => c.id === selectedClub)!;

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-medium text-primary">{t("transferNegotiation.name")}</div>
              <div className="text-2xl text-primary">{player.name}</div>
            </div>
            <div>
              <div className="font-medium text-primary">{t("transferNegotiation.club")}</div>
              <div className="text-2xl text-primary">{club.name}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferNegotiation.age")}</div>
            <div>{player.age}岁</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferNegotiation.position")}</div>
            <div>{player.position}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferNegotiation.marketValue")}</div>
            <div>{t("currency.euro")} {player.marketValue.toLocaleString()}</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferNegotiation.overall")}</div>
            <div className="text-3xl text-primary">{player.overall}★</div>
          </div>

          <div className="mt-3">
            <div className="font-medium">{t("transferNegotiation.potential")}</div>
            <div className="text-3xl text-success">{player.potential}★</div>
          </div>

          {/* 报价表单 */}
          <div className="mt-4">
            <SectionTitle title={t("transferNegotiation.makeOffer")} />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <div className="font-medium">{t("transferNegotiation.offerFee")}</div>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  min="1"
                  placeholder={t("currency.euro", { amount: 0 })}
                />
              </div>
              <div>
                <div className="font-medium">{t("transferNegotiation.duration")}</div>
                <select
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="1year">{t("transferNegotiation.oneYear")}</option>
                  <option value="2year">{t("transferNegotiation.twoYear")}</option>
                  <option value="3year">{t("transferNegotiation.threeYear")}</option>
                </select>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => setOfferStatus("pending")}
            >
              {t("transferNegotiation.submitOffer")}
            </Button>
          </div>
        </Panel>
      )}

      {/* 谈议状态 */}
      {selectedClub && (
        <Panel className="p-4 mt-6">
          <SectionTitle title={t("transferNegotiation.offerStatus")} />
          <p className="text-sm text-muted-foreground mb-3">
            {t("transferNegotiation.currentOffer", {
              club: clubs.find(c => c.id === selectedClub)?.name || "",
            })}</p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOfferStatus("pending")}
            >
              {t("transferNegotiation.pending")}
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={() => setOfferStatus("accepted")}
            >
              {t("transferNegotiation.accepted")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setOfferStatus("rejected")}
            >
              {t("transferNegotiation.rejected")}
            </Button>
          </div>
        </Panel>
      )}

      {/* 联盟概览 */}
      <Panel className="p-4 mt-6">
        <SectionTitle title={t("transferNegotiation.leagueOverview")} />
        <p className="text-sm text-muted-foreground">
          {t("transferNegotiation.totalClubs", { total: clubs.length })} 家俱乐部
        </p>
        <p>{t("transferNegotiation.totalPlayers", { count: players.length })} 名球员</p>
        <p>
          {t("transferNegotiation.avgMarketValue", {
            avg: (players.reduce((sum, p) => sum + (p.marketValue || 0), 0) /
              players.length).toFixed(0),
          })} 平均身价
        </p>
      </Panel>
    </Panel>
  );
}