import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { byKickoff } from "@/domain/analytics";
import {
  createReporter, foldReport, parseReporterReport, reporterBuild, reporterCommit,
  reporterPrecommit, reporterPreflight, reporterRefused, sealFixture, verifyReporterText,
  type ReporterFixture, type ReporterTraceEntry, type ReporterViolation,
} from "@/domain/matchReporter";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import { Panel, SectionTitle, DemoBadge } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// M1236 · The Match Reporter — door 18, the one that writes the game. The desk takes ONE
// finished fixture from the seeded world and the model writes its report the way a journalist
// who watched it would — but every numeral must come from the fixture's own envelope, and a
// refusal walks to the fold's own deterministic report built from the very same events.
export function MatchReporter() {
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<readonly ReporterTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly ReporterViolation[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [written, setWritten] = useState(false);

  // The desk's fixture: the most recent finished fixture the engine recorded events for —
  // deterministic, no RNG, so the same visit always opens the same game.
  const fixture = useMemo<ReporterFixture | null>(() => {
    const matches = footballProvider.matches()
      .filter((m) => m.status === "FINISHED" && (m.events?.length ?? 0) > 0)
      .sort((a, b) => byKickoff(b, a));
    const m = matches[0];
    if (!m) return null;
    return sealFixture(m, getClub(m.homeClubId)?.name ?? m.homeClubId, getClub(m.awayClubId)?.name ?? m.awayClubId);
  }, []);

  // The fold's report is DATA; the words are the dictionary's — the domain writes no prose.
  const fold = useMemo(() => (fixture ? foldReport(fixture) : null), [fixture]);
  const foldText = fold && fixture
    ? [
        t("rep.foldScore", { home: fixture.homeName, away: fixture.awayName, hg: fold.homeGoals, ag: fold.awayGoals }),
        fold.goals.length
          ? t("rep.foldGoals", { list: fold.goals.map((g) => `${g.player} ${g.minute}'`).join(", ") })
          : t("rep.foldNoGoals"),
        t("rep.foldTallies", { shots: fold.shots, saves: fold.saves }),
      ].join(" ")
    : "";

  const ask = async () => {
    if (busy || !fixture) return;
    let desk = reporterBuild(reporterPreflight(createReporter(fixture, locale)));
    setTrace(desk.trace);
    setViolations(null);
    setAnswer("");
    setWritten(false);
    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      const refused = reporterRefused(desk, foldText);
      setTrace(refused.trace);
      setAnswer(foldText);
      return;
    }
    setBusy(true);
    const system = withWorldBook(JSON.stringify({
      fixture: {
        id: fixture.id,
        home: fixture.homeName,
        away: fixture.awayName,
        score: `${fixture.homeGoals}-${fixture.awayGoals}`,
        events: fixture.events,
        stats: fixture.stats,
      },
      commandment:
        "You are the match reporter of Football OS. Write the report of THIS fixture and nothing else. " +
        "Your FIRST line must be exactly: REPORT:<id> with the id from THE FIXTURE above. " +
        "Then 3-6 tight sentences of match report in the visitor's language: the score, who scored and when, and what the engine's numbers say. " +
        "Every numeral you write MUST appear in THE FIXTURE above (the score, an event minute, a stat) or in the world book. " +
        "Never invent a scorer, a minute, a stat or a future tense. Report the game that was played, not the one that will be.",
    }));
    const result = await callLlmStream(t("rep.prompt"), [], (d) => setAnswer((p) => p + d), { system });
    setBusy(false);
    if (!result.ok) {
      const refused = reporterRefused(desk, foldText);
      setTrace(refused.trace);
      setAnswer(foldText);
      return;
    }
    const parsed = parseReporterReport(result.text, fixture);
    const lawBreaks = verifyReporterText(result.text, fixture);
    if (parsed.ok && lawBreaks.length === 0) {
      const committed = reporterCommit(reporterPrecommit(desk, "pass"), result.text);
      setTrace(committed.trace);
      setAnswer(result.text);
      setWritten(true);
      return;
    }
    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = reporterRefused(reporterPrecommit(desk, "refused"), foldText);
    setTrace(refused.trace);
    setAnswer(foldText);
  };

  if (!fixture) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{t("rep.title")}</h1>
              <DemoBadge />
            </div>
            <p className="text-xs text-muted-foreground">{t("rep.subtitle")}</p>
          </div>
        </div>
        <Panel className="p-4"><p className="text-sm text-muted-foreground">{t("rep.noFixture")}</p></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("rep.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("rep.subtitle")}</p>
        </div>
      </div>

      <Panel className="p-4">
        <SectionTitle
          title={t("rep.fixtureTitle", { home: fixture.homeName, away: fixture.awayName })}
          hint={t("rep.fixtureHint", { n: fixture.events.length })}
        />
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono text-2xl font-bold text-primary">
            {fixture.homeGoals}–{fixture.awayGoals}
          </span>
          <span className="text-sm text-muted-foreground">{fixture.homeName} v {fixture.awayName}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={ask} disabled={busy}>{busy ? t("rep.writing") : t("rep.ask")}</Button>
          {!LLM_CONFIG.hasKey && <span className="text-xs text-muted-foreground">{t("rep.noKey")}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {fixture.events.filter((e) => e.type === "GOAL").map((e, i) => (
            <span key={i} className="rounded-md border px-2 py-1 text-xs">
              ⚽ {e.player} {e.minute}'
            </span>
          ))}
        </div>
      </Panel>

      {(answer || trace) && (
        <Panel className="p-4">
          <SectionTitle
            title={violations ? t("rep.refusedTitle") : written ? t("rep.reportTitle") : t("rep.foldTitle")}
            hint={violations ? t("rep.refusedHint") : written ? t("rep.reportHint") : t("rep.foldScreenHint")}
          />
          {violations && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {violations.map((v) => (
                <Badge key={v} variant="outline" className="border-warning text-warning">{t(`rep.v.${v}`)}</Badge>
              ))}
            </div>
          )}
          {answer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
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
        <SectionTitle title={t("rep.foldTitle")} hint={t("rep.foldHint")} />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{foldText}</p>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("rep.foldMethod")}</p>
      </Panel>
    </div>
  );
}
