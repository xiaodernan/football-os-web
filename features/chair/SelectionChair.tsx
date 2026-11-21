import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import {
  chairBuild, chairCommit, chairPrecommit, chairPreflight, chairRefused, createChair,
  parseChairXi, verifyChairText, foldXi, worldSquad,
  type ChairSelection, type ChairTraceEntry, type ChairViolation, type ChairSquad,
} from "@/domain/selectionChair";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import { Panel, SectionTitle, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// M1233 · The Selection Chair — the sixteenth imprisoned door, and the first one that DECIDES.
// The model names a starting XI from the club's own squad; the door re-proves every choice
// against the roster before a human may see it, and a refusal speaks with the fold's own
// deterministic XI, openly, beside whatever the model said.
const GROUPS = ["GK", "DEF", "MID", "ATT"] as const;
type Group = (typeof GROUPS)[number];
const GROUP_KEY: Record<Group, string> = { GK: "chair.gk", DEF: "chair.def", MID: "chair.mid", ATT: "chair.att" };

export function SelectionChair() {
  const { t, locale } = useI18n();

  // The chair's pool is the world's strongest — the same cut the world book's LEDGER is read
  // with, so the door and the digest can never drift. A club roster is too thin in this world
  // to select from: one club in seventy-three can field eleven.
  const squad = useMemo<ChairSquad>(
    () => ({ clubId: "world", players: worldSquad(footballProvider.players()) }),
    [],
  );

  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<readonly ChairTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly ChairViolation[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [selection, setSelection] = useState<ChairSelection | null>(null);

  const fold = useMemo(() => foldXi(squad), [squad]);

  const ask = async () => {
    if (busy) return;
    let desk = chairBuild(chairPreflight(createChair(squad, locale)));
    setTrace(desk.trace);
    setViolations(null);
    setAnswer("");
    setSelection(null);
    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      // No key, or a squad too thin to select from: the fold speaks, honestly labelled.
      const refused = chairRefused(desk, t("chair.via.local"));
      setTrace(refused.trace);
      setSelection(refused.selection);
      setAnswer(t("chair.via.local"));
      if (desk.status !== "build") toast.warning(t("chair.thinSquad"));
      return;
    }
    setBusy(true);
    const system = withWorldBook(JSON.stringify({
      squad: squad.players.map((p) => ({ id: p.id, name: p.name, group: p.positionGroup, overall: p.overall, age: p.age })),
      commandment:
        "You are the selection chair for this club. Name a starting XI from THE SQUAD above and nothing else. " +
        "Your FIRST line must be exactly: XI:<id>,<id>,… with eleven squad ids, exactly one GK, no repeats, best-first. " +
        "Then explain the shape in a few tight sentences in the visitor's language. You may only use figures the squad carries. " +
        "Never name a player outside the squad; never predict the future.",
    }));
    const result = await callLlmStream(t("chair.prompt"), [], (d) => setAnswer((p) => p + d), { system });
    setBusy(false);
    if (!result.ok) {
      const refused = chairRefused(desk, t("chair.via.local"));
      setTrace(refused.trace);
      setSelection(refused.selection);
      setAnswer(t("chair.via.local"));
      return;
    }
    const parsed = parseChairXi(result.text, squad);
    const lawBreaks = verifyChairText(result.text, squad);
    if (parsed.selection && lawBreaks.length === 0) {
      const committed = chairCommit(chairPrecommit(desk, "pass"), result.text, parsed.selection);
      setTrace(committed.trace);
      setSelection(committed.selection);
      setAnswer(result.text);
      return;
    }
    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = chairRefused(chairPrecommit(desk, "refused"), result.text);
    setTrace(refused.trace);
    setSelection(refused.selection);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("chair.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("chair.subtitle")}</p>
        </div>
      </div>

      <Panel className="p-4">
        <SectionTitle
          title={t("chair.squadTitle")}
          hint={t("chair.squadHint", { n: squad.players.length })}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={ask} disabled={busy}>{busy ? t("chair.asking") : t("chair.ask")}</Button>
          {!LLM_CONFIG.hasKey && <span className="text-xs text-muted-foreground">{t("chair.noKey")}</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {GROUPS.map((g) => (
            <div key={g} className={cn("rounded-lg px-2.5 py-2", CHIP_CLASS.muted)}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t(GROUP_KEY[g])}</div>
              <div className="font-mono text-primary">{squad.players.filter((p) => p.positionGroup === g).length}</div>
            </div>
          ))}
        </div>
      </Panel>

      {(selection || trace) && (
        <Panel className="p-4">
          <SectionTitle title={violations ? t("chair.refusedTitle") : t("chair.xiTitle")} hint={violations ? t("chair.refusedHint") : t("chair.xiHint")} />
          {violations && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {violations.map((v) => (
                <Badge key={v} variant="outline" className="border-warning text-warning">{t(`chair.v.${v}`)}</Badge>
              ))}
            </div>
          )}
          {selection && (
            <div className="mt-3 space-y-2">
              {GROUPS.map((g) => (
                <div key={g}>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t(GROUP_KEY[g])}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selection.byPosition[g].map((id) => {
                      const p = squad.players.find((q) => q.id === id);
                      if (!p) return null;
                      return (
                        <span key={id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                          <span className="font-medium">{p.name}</span>
                          <span className="font-mono text-primary">{p.overall}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
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
          <SectionTitle title={t("chair.foldTitle")} hint={t("chair.foldHint")} />
          <div className="mt-2 space-y-2">
            {GROUPS.map((g) => (
              <div key={g} className="flex items-baseline gap-2 text-xs">
                <span className="w-8 shrink-0 text-muted-foreground">{t(GROUP_KEY[g])}</span>
                <span className="font-mono">{fold.byPosition[g].map((id) => squad.players.find((q) => q.id === id)?.name ?? id).join(" · ")}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{t("chair.foldMethod")}</p>
        </Panel>
      )}
    </div>
  );
}
