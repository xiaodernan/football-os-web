import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import {
  brokerBuild, brokerCommit, brokerPrecommit, brokerPreflight, brokerRefused, createBroker,
  foldRuling, parseBrokerRuling, verifyBrokerText,
  type BrokerDeal, type BrokerDossier, type BrokerRuling, type BrokerTraceEntry, type BrokerViolation,
} from "@/domain/broker";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import { Panel, SectionTitle, DemoBadge, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, fmtMoney } from "@/lib/utils";

// M1238 · The Transfer Broker — door 19, the one that prices a man. A fee is on the table for
// one of the world's players and the model must rule ACCEPT, REJECT or COUNTER — the money
// answered in the model's own figures, every one proved against the dossier. The fold's ruling
// is real arithmetic on the same thresholds, so a refusal walks to a number, not a shrug.
const FEE_MULTIPLES = [0.5, 0.8, 1, 1.3, 1.5, 2];

const eur = (n: number): string => fmtMoney(n);

export function TransferBroker() {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<readonly BrokerTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly BrokerViolation[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [ruling, setRuling] = useState<BrokerRuling | null>(null);
  const [multiple, setMultiple] = useState(1.3);

  // The desk's player: the world's most valuable — deterministic, so the same visit opens the
  // same deal. The dossier is the roster's own facts.
  // The desk's player: the world's most valuable — deterministic, so the same visit opens the
  // same deal. The dossier is the roster's own facts.
  const dossier = useMemo<BrokerDossier>(() => {
    const players = footballProvider.players();
    const p = [...players].sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))[0];
    return {
      playerName: p.name,
      clubName: getClub(p.clubId)?.name ?? p.clubId,
      overall: p.overall,
      age: p.age,
      value: p.value,
    };
  }, []);

  const deal: BrokerDeal = { dossier, fee: Math.round((dossier.value * multiple) / 1e6) * 1e6 };
  const fold = useMemo(() => foldRuling(deal), [deal.dossier.value, deal.fee]);

  const ask = async () => {
    if (busy) return;
    let desk = brokerBuild(brokerPreflight(createBroker(deal, locale)));
    setTrace(desk.trace);
    setViolations(null);
    setAnswer("");
    setRuling(null);
    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      const refused = brokerRefused(desk, t("brk.via.local"));
      setTrace(refused.trace);
      setRuling(refused.ruling);
      setAnswer(t("brk.via.local"));
      return;
    }
    setBusy(true);
    const system = withWorldBook(JSON.stringify({
      deal: {
        player: dossier.playerName,
        club: dossier.clubName,
        overall: dossier.overall,
        age: dossier.age,
        value: dossier.value,
        feeOnTheTable: deal.fee,
      },
      commandment:
        "You are the transfer broker of Football OS. Rule on THIS deal and nothing else. " +
        "Your FIRST line must be exactly: RULING:accept, RULING:reject or RULING:counter. " +
        "If you rule counter, your SECOND line must be exactly: FEE:<eur> with your counter-fee. " +
        "Then two or three tight sentences in the visitor's language explaining the ruling. " +
        "You may only use figures from THE DEAL above (the value, the overall, the age, the fee) or the world book. " +
        "Never invent a fee, a value or a future tense.",
    }));
    const result = await callLlmStream(t("brk.prompt"), [], (d) => setAnswer((p) => p + d), { system });
    setBusy(false);
    if (!result.ok) {
      const refused = brokerRefused(desk, t("brk.via.local"));
      setTrace(refused.trace);
      setRuling(refused.ruling);
      setAnswer(t("brk.via.local"));
      return;
    }
    const parsed = parseBrokerRuling(result.text, deal);
    const lawBreaks = verifyBrokerText(result.text, deal);
    if (parsed.ruling && lawBreaks.length === 0) {
      const committed = brokerCommit(brokerPrecommit(desk, "pass"), result.text, parsed.ruling);
      setTrace(committed.trace);
      setRuling(committed.ruling);
      setAnswer(result.text);
      return;
    }
    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = brokerRefused(brokerPrecommit(desk, "refused"), result.text);
    setTrace(refused.trace);
    setRuling(refused.ruling);
  };

  const rulingTone = (code: string) =>
    code === "accept" ? "border-success text-success" : code === "reject" ? "border-destructive text-destructive" : "border-warning text-warning";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("brk.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("brk.subtitle")}</p>
        </div>
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("brk.dealTitle", { player: dossier.playerName })} hint={t("brk.dealHint")} />
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <StatTile label={t("brk.tileValue")} value={eur(dossier.value)} sub={t("brk.clubN", { club: dossier.clubName })} />
          <StatTile label={t("brk.tilePlayer")} value={dossier.playerName} sub={t("brk.ageOvrN", { age: dossier.age, overall: dossier.overall })} />
          <StatTile label={t("brk.tileFee")} value={eur(deal.fee)} sub={t("brk.multipleN", { n: multiple.toFixed(1) })} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("brk.feeLabel")}</span>
          {FEE_MULTIPLES.map((mx) => (
            <button
              key={mx}
              onClick={() => setMultiple(mx)}
              className={cn("rounded-md border px-2.5 py-1 text-xs", multiple === mx ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}
            >
              {mx}x
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={ask} disabled={busy}>{busy ? t("brk.ruling") + "…" : t("brk.ask")}</Button>
          {!LLM_CONFIG.hasKey && <span className="text-xs text-muted-foreground">{t("brk.noKey")}</span>}
        </div>
      </Panel>

      {(ruling || trace) && (
        <Panel className="p-4">
          <SectionTitle
            title={violations ? t("brk.refusedTitle") : t("brk.rulingTitle")}
            hint={violations ? t("brk.refusedHint") : t("brk.rulingHint")}
          />
          {violations && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {violations.map((v) => (
                <Badge key={v} variant="outline" className="border-warning text-warning">{t(`brk.v.${v}`)}</Badge>
              ))}
            </div>
          )}
          {ruling && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={rulingTone(ruling.code)}>{t(`brk.code.${ruling.code}`)}</Badge>
              {ruling.fee !== null && <span className="font-mono text-primary">{eur(ruling.fee)}</span>}
            </div>
          )}
          {answer && <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{answer}</p>}
          {trace && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {trace.map((e, i) => (
                <span key={i} className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {e.stage}:{e.verdict}
                </span>
              ))}
            </div>
          )}
        </Panel>
      )}

      <Panel className="p-4">
        <SectionTitle title={t("brk.foldTitle")} hint={t("brk.foldHint")} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={rulingTone(fold.code)}>{t(`brk.code.${fold.code}`)}</Badge>
          {fold.fee !== null && <span className="font-mono text-primary">{eur(fold.fee)}</span>}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("brk.foldMethod")}</p>
      </Panel>
    </div>
  );
}
