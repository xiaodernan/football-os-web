import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { buildLoad } from "@/domain/load";
import { SUPPORTED_MINUTES } from "@/domain/training";
import {
  createDesk, deskBuild, deskCommit, deskPrecommit, deskPreflight, deskRefused,
  parseDeskRx, verifyDeskText, foldRx,
  type DeskAttribute, type DeskDossier, type DeskPrescription, type DeskTraceEntry, type DeskViolation,
} from "@/domain/trainingDesk";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import { Panel, SectionTitle, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "@/lib/router";
import { toast } from "sonner";

// M1235 · The Training Desk — the seventeenth imprisoned door, and the second that decides.
// The model reads ONE player's dossier and prescribes the week: which attributes, how many
// minutes. Every choice is re-proved against the dossier, and adopting a lawful prescription
// feeds the SAME plan pipeline the coach screen uses — the model's analysis lands as a real
// training plan, not a paragraph. A refusal speaks with the fold's own prescription, openly.
export function TrainingDesk() {
  const { t, locale } = useI18n();
  const { state, requestPlan } = useOs();
  const { navigate } = useRouter();
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<readonly DeskTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly DeskViolation[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [prescription, setPrescription] = useState<DeskPrescription | null>(null);
  const [adopted, setAdopted] = useState(false);

  // The dossier is the player's own facts — the attribute vector the career already carries,
  // the load the fold reads, nothing invented.
  const dossier = useMemo<DeskDossier>(() => {
    const attrs = (Object.entries(state.profile?.attributes ?? {}) as Array<[string, number]>)
      .map(([key, value]) => ({ key, value }));
    const load = buildLoad({ nowMs: Date.now(), sessions: state.sessions });
    // The load fold's five zones onto the desk's four: an under-loaded player gets the long
    // week ("low"), a cautioned one the medium ("high"), a spiked one the short sharp session,
    // and a player with no history at all the standard week — never a guess dressed as a zone.
    const ZONE_OF = { none: "optimal", under: "low", optimal: "optimal", caution: "high", high: "spike" } as const;
    const zone = ZONE_OF[load.zone];
    return {
      playerName: state.profile?.displayName ?? "the visitor",
      group: state.profile?.positionGroup ?? "CM",
      age: 24,
      loadZone: zone,
      attributes: attrs,
    };
  }, [state.profile, state.sessions]);

  const fold = useMemo(() => foldRx(dossier), [dossier]);
  const hasDossier = dossier.attributes.length > 0;

  const ask = async () => {
    if (busy || !hasDossier) return;
    let desk = deskBuild(deskPreflight(createDesk(dossier, locale)));
    setTrace(desk.trace);
    setViolations(null);
    setAnswer("");
    setPrescription(null);
    setAdopted(false);
    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      const refused = deskRefused(desk, t("desk.via.local"));
      setTrace(refused.trace);
      setPrescription(refused.prescription);
      setAnswer(t("desk.via.local"));
      return;
    }
    setBusy(true);
    const system = withWorldBook(JSON.stringify({
      dossier: {
        player: dossier.playerName, group: dossier.group, loadZone: dossier.loadZone,
        attributes: dossier.attributes,
      },
      commandment:
        "You are the training desk for this ONE player. Prescribe their week from THE DOSSIER above and nothing else. " +
        "Your FIRST line must be exactly: RX:<attrKey>,<attrKey>,<attrKey> — at most three attribute keys FROM THE DOSSIER, weakest first. " +
        "Your SECOND line must be exactly: MIN:<n> with n one of " + SUPPORTED_MINUTES.join(", ") + ", chosen for the load zone. " +
        "Then two or three tight sentences in the visitor's language explaining the choice. You may only use figures the dossier carries. " +
        "Never name an attribute outside the dossier; never predict the future.",
    }));
    const result = await callLlmStream(t("desk.prompt"), [], (d) => setAnswer((p) => p + d), { system });
    setBusy(false);
    if (!result.ok) {
      const refused = deskRefused(desk, t("desk.via.local"));
      setTrace(refused.trace);
      setPrescription(refused.prescription);
      setAnswer(t("desk.via.local"));
      return;
    }
    const parsed = parseDeskRx(result.text, dossier);
    const lawBreaks = verifyDeskText(result.text, dossier);
    if (parsed.prescription && lawBreaks.length === 0) {
      const committed = deskCommit(deskPrecommit(desk, "pass"), result.text, parsed.prescription);
      setTrace(committed.trace);
      setPrescription(committed.prescription);
      setAnswer(result.text);
      return;
    }
    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = deskRefused(deskPrecommit(desk, "refused"), result.text);
    setTrace(refused.trace);
    setPrescription(refused.prescription);
  };

  // The adoption: a lawful prescription feeds the SAME plan pipeline the coach screen uses, so
  // the model's analysis lands as a real training plan.
  const adopt = async () => {
    if (!prescription || adopted) return;
    await requestPlan(
      { key: "desk.adoptPrompt", vars: { focus: prescription.focusKeys.join(","), min: String(prescription.minutes) } },
      prescription.minutes,
      [...prescription.focusKeys],
    );
    setAdopted(true);
    toast.success(t("desk.adopted", { n: prescription.focusKeys.length, min: prescription.minutes }));
    navigate("/player/training");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("desk.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("desk.subtitle")}</p>
        </div>
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("desk.dossierTitle", { name: dossier.playerName })} hint={t("desk.dossierHint")} />
        {!hasDossier ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("desk.noDossier")}</p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={ask} disabled={busy}>{busy ? t("desk.thinking") : t("desk.ask")}</Button>
              {!LLM_CONFIG.hasKey && <span className="text-xs text-muted-foreground">{t("desk.noKey")}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[...dossier.attributes]
                .sort((a, b) => a.value - b.value)
                .slice(0, 6)
                .map((a: DeskAttribute) => (
                  <span key={a.key} className="rounded-md border px-2 py-1 text-xs">
                    {t(`attr.name.${a.key}`)} <span className="font-mono text-primary">{a.value}</span>
                  </span>
                ))}
            </div>
          </>
        )}
      </Panel>

      {(prescription || trace) && (
        <Panel className="p-4">
          <SectionTitle
            title={violations ? t("desk.refusedTitle") : t("desk.rxTitle")}
            hint={violations ? t("desk.refusedHint") : t("desk.rxHint")}
          />
          {violations && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {violations.map((v) => (
                <Badge key={v} variant="outline" className={CHIP_CLASS.badgeWarningStrong}>{t(`desk.v.${v}`)}</Badge>
              ))}
            </div>
          )}
          {prescription && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("desk.focusLabel")}</span>
                {prescription.focusKeys.map((k) => (
                  <span key={k} className="rounded-md border px-2 py-1 text-xs font-medium">{t(`attr.name.${k}`)}</span>
                ))}
                <span className="ml-auto font-mono text-primary">{t("desk.minutesN", { n: prescription.minutes })}</span>
              </div>
              <Button size="sm" onClick={adopt} disabled={adopted}>
                {adopted ? t("desk.adoptedDone") : t("desk.adopt")}
              </Button>
              {adopted && <span className="ml-2 text-xs text-success">{t("desk.adoptedToast")}</span>}
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

      {fold && (
        <Panel className="p-4">
          <SectionTitle title={t("desk.foldTitle")} hint={t("desk.foldHint")} />
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {fold.focusKeys.map((k) => (
              <span key={k} className="rounded-md border px-2 py-1 text-xs">{t(`attr.name.${k}`)}</span>
            ))}
            <span className="ml-auto font-mono text-primary">{t("desk.minutesN", { n: fold.minutes })}</span>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{t("desk.foldMethod")}</p>
        </Panel>
      )}
    </div>
  );
}
