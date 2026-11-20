// M1224 · The Long-Context Chronicler — door 15, the two-step imprisoned chapter.
// One call reads the COMPLETE tape as the shared world-book prefix and seals one fixture with a
// strict CHAPTER:<id> first line. The draft then passes two verifiers in order — structure, then
// the shared numeral law — before the traced graph commits. Every refusal, abstention and offline
// arm answers with a fold chapter built from the very same verbatim tape line.
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { LLM_CONFIG, callLlmStream, withWorldBook } from "@/data/llm";
import { matchStatusLabel } from "@/domain/rowText";
import { DEEP_DIGEST } from "@/data/deepDigest";
import {
  chapterAbstained, chapterBuild, chapterCommit, chapterDirectiveInvalid, chapterModelChose,
  chapterNumeralsPassed, chapterNumeralsRefused, chapterPreflight, chapterRefused,
  chapterStructurePassed, chapterStructureRefused, chronicleEnvelope, createChapter,
  foldChapter, fixturesFromTape, parseChapterDirective, pickTapeFixtures, stripChapterDirective,
  verifyChapterNumerals, verifyChapterStructure,
  type ChapterBadge, type ChapterFixture, type ChapterState, type ChapterStructureViolation,
  type ChapterTraceEntry,
} from "@/domain/chronicler";

const CHAPTER_LAW = "Write only numerals printed in the chosen fixture's tape line. Never invent a score, a date, a club, a cause or a future promise.";

export function LongChronicler() {
  const { t, locale } = useI18n();
  const offered = useMemo(() => pickTapeFixtures(fixturesFromTape(DEEP_DIGEST), 3), []);
  const [answer, setAnswer] = useState("");
  const [trace, setTrace] = useState<readonly ChapterTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly string[] | null>(null);
  const [structureViolations, setStructureViolations] = useState<readonly ChapterStructureViolation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [badge, setBadge] = useState<ChapterBadge | null>(null);
  const [picked, setPicked] = useState<ChapterFixture | null>(null);
  const [deskState, setDeskState] = useState<ChapterState | null>(null);

  const foldFor = (f: ChapterFixture | undefined): string => f
    ? foldChapter(f, {
      SETTING: t("chronicler.fold.setting", {
        date: f.date, competition: f.competition, matchday: f.matchday, home: f.home, away: f.away,
      }),
      TURN: t("chronicler.fold.turn", {
        home: f.home, homeGoals: f.homeGoals, awayGoals: f.awayGoals, away: f.away,
        status: matchStatusLabel(f.status, t),
      }),
      ECHO: t("chronicler.fold.echo", { line: f.line }),
    })
    : "";

  const enter = (desk: ChapterState, text: string, next: ChapterBadge) => {
    setDeskState(desk);
    setTrace(desk.trace);
    setAnswer(text);
    setBadge(next);
    setBusy(false);
  };

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setAnswer("");
    setViolations(null);
    setStructureViolations(null);
    setBadge(null);
    setPicked(null);
    setDeskState(null);

    const desk0 = chapterBuild(chapterPreflight(createChapter(locale), offered));
    const fallback = foldFor(offered[0]);
    if (!LLM_CONFIG.hasKey) { enter(chapterRefused(desk0, fallback), fallback, "offline"); return; }

    // The complete tape rides the SHARED prefix; only this small fixture list is the dynamic
    // suffix, so the 24h lane stays warm for every other door in the world.
    const system = withWorldBook([
      "You are the Long-Context Chronicler of Football OS. The complete tape of every seeded fixture is in front of you.",
      "FIRST LINE: exactly CHAPTER:<id> using one of the fixture ids listed below. Or write ABSTAIN alone if none can carry a truthful chapter.",
      "AFTER THAT: exactly three sections in this order, each on its own line: SETTING:, TURN:, ECHO:. One or two tight sentences each, in the visitor's language.",
      CHAPTER_LAW,
      "",
      "OFFERED FIXTURES FROM THE COMPLETE TAPE:",
      JSON.stringify(offered.map((f) => ({ id: f.id, line: f.line })), null, 2),
    ].join("\n"));

    const result = await callLlmStream(t("chronicler.ask"), [], () => {}, { system });
    if (!result.ok) { enter(chapterRefused(desk0, fallback), fallback, "folded"); return; }

    const directive = parseChapterDirective(result.text, offered);
    if (!directive) { enter(chapterDirectiveInvalid(desk0, fallback), fallback, "invalid"); return; }
    if (directive.route === "abstain" || directive.fixtureId === null) {
      enter(chapterAbstained(desk0, fallback), fallback, "abstained");
      return;
    }

    const chosen = offered.find((f) => f.id === directive.fixtureId);
    if (!chosen) { enter(chapterDirectiveInvalid(desk0, fallback), fallback, "invalid"); return; }
    setPicked(chosen);
    const drafted = chapterModelChose(desk0, chosen.id);
    const prose = stripChapterDirective(result.text);
    const fold = foldFor(chosen);

    // Step one — structure. A draft that is not three ordered, non-empty sections never reaches
    // the numeral verifier; it is refused and the fold tells the chapter from the tape line.
    const structural = verifyChapterStructure(prose);
    if (structural.length > 0) {
      setStructureViolations(structural);
      enter(chapterStructureRefused(drafted, fold), fold, "folded");
      return;
    }
    const structured = chapterStructurePassed(drafted);

    // Step two — the shared evidence-number law over this fixture's sealed envelope.
    const envelope = chronicleEnvelope(chosen, CHAPTER_LAW);
    const found = verifyChapterNumerals(prose, envelope);
    if (found.length > 0) {
      setViolations(found);
      enter(chapterNumeralsRefused(structured, fold), fold, "folded");
      return;
    }
    enter(chapterCommit(chapterNumeralsPassed(structured), prose), prose, "verified");
  };

  const badgeLabel = badge === "verified" ? t("chronicler.badge.verified")
    : badge === "folded" ? t("chronicler.badge.folded")
    : badge === "invalid" ? t("chronicler.badge.invalid")
    : badge === "abstained" ? t("chronicler.badge.abstained")
    : t("chronicler.badge.noModel");

  const structureText = structureViolations
    ? structureViolations.map((v) => t(`chronicler.violation.${v}`)).join(" | ")
    : null;
  const numeralText = violations ? violations.join(" | ") : null;

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("chronicler.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("chronicler.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("chronicler.subtitle")}</p>
          <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
      </header>

      <Panel className="p-5">
        <p className="mb-3 text-[10px] text-muted-foreground">{t("chronicler.hint")}</p>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="fo-lift rounded-lg border px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
        >
          {t("chronicler.ask")}
        </button>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicler.method")}</p>
      </Panel>

      <Panel className="p-5">
        <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicler.offered")}</p>
        <ul className="space-y-1">
          {offered.map((f) => (
            <li key={f.id} className="rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[10px] leading-relaxed">
              <span className="mr-2 text-primary">{f.id}</span>{f.line}
            </li>
          ))}
        </ul>
      </Panel>

      {answer && (
        <Panel className="p-5">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicler.tape")}</p>
          <p aria-live="polite" className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
          {badge && (
            <span className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest", badge === "verified" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning)}>
              {badgeLabel}
            </span>
          )}
          {picked && (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {t("chronicler.picked")} · {picked.id} · {picked.line}
            </p>
          )}
          {(badge === "folded" || badge === "offline" || badge === "abstained" || badge === "invalid") && (
            <p className="mt-2 text-[10px] text-muted-foreground">{t("chronicler.withoutModel")}</p>
          )}
          {structureText && (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">{t("chronicler.structure")}: {structureText}</p>
          )}
          {numeralText && (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">{t("chronicler.numerals")}: {numeralText}</p>
          )}
          {trace && (
            <div className="mt-4 border-t border-border/60 pt-3">
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("library.door.trace.label")}</p>
              <div className="flex flex-wrap gap-1">
                {trace.map((entry, index) => (
                  <span
                    key={`${entry.stage}-${index}`}
                    title={t(`library.door.note.${entry.note}`)}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                      entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                    )}
                  >
                    {t(`manual.librarian.stage.${entry.stage}`)}
                  </span>
                ))}
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {t("chronicler.stategraph")} · {deskState?.status ?? t("chronicler.stage.idle")}
                {deskState && (
                  <>
                    {" · "}{t("manual.librarian.stage.structure")}:{deskState.structureOk ? 1 : 0}
                    {" · "}{t("manual.librarian.stage.numerals")}:{deskState.numeralsOk ? 1 : 0}
                    {" · "}{t("chronicler.badge.verified")}:{deskState.committed ? 1 : 0}
                  </>
                )}
              </p>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
