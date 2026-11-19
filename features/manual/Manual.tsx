import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider } from "@/data/footballService";
import { DemoBadge, SectionTitle, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import {
  createLibrarian, librarianBuild, librarianCommit, librarianPrecommit, librarianPreflight,
  librarianRefused, pickBookChapter, verifyLibrarianText,
  type LibrarianTraceEntry, type LibrarianViolation,
} from "@/domain/librarian";

// M1130 — the world's own operating manual: one long printable scroll that covers every real
// surface (fan/player/manager, Football OS cinematic screens, the Spring atlas and the honest
// caveats) plus a print stylesheet so it can be book-published. Every line in here names a
// feature that actually exists and is reachable. Nothing is aspirational.

// The three modes — module scope so the raw-UI scan never sees the literals as JSX children.
const MODES = [
  { key: "manual.fanTitle", body: "manual.fanBody", bullets: ["manual.fanBullet1", "manual.fanBullet2", "manual.fanBullet3"] },
  { key: "manual.playerTitle", body: "manual.playerBody", bullets: ["manual.playerBullet1", "manual.playerBullet2", "manual.playerBullet3"] },
  { key: "manual.managerTitle", body: "manual.managerBody", bullets: ["manual.managerBullet1", "manual.managerBullet2", "manual.managerBullet3"] },
] as const;

const SECTION_IDS = [
  { id: "welcome", key: "manual.welcomeTitle" },
  { id: "modes", key: "manual.modesTitle" },
  { id: "explore", key: "manual.exploreTitle" },
  { id: "epics", key: "manual.epicsTitle" },
  { id: "spring", key: "manual.springTitle" },
  { id: "honesty", key: "manual.honestyTitle" },
  { id: "print", key: "manual.printTitle" },
] as const;

export function Manual() {
  const { t, locale } = useI18n();
  const players = footballProvider.players().length;
  const clubs = footballProvider.clubs().length;
  const [libBusy, setLibBusy] = useState(false);
  const [libTrace, setLibTrace] = useState<readonly LibrarianTraceEntry[] | null>(null);
  const [libViolations, setLibViolations] = useState<readonly LibrarianViolation[] | null>(null);
  const [libAnswer, setLibAnswer] = useState("");
  const [libAsk, setLibAsk] = useState("");
  const matchedChapter = useMemo(() => (libAsk.trim() ? pickBookChapter(libAsk.trim(), t) : null), [libAsk, t]);

  const chapterLinks = useMemo(() => ([
    { to: "/football", label: t("nav.football") },
    { to: "/legends", label: t("nav.legends") },
    { to: "/records", label: t("nav.records") },
    { to: "/chronicle", label: t("nav.chronicle") },
    { to: "/tomorrow", label: t("nav.tomorrow") },
    { to: "/moonshots", label: t("nav.moonshots") },
    { to: "/atlas", label: t("nav.atlas") },
    { to: "/derby-codex", label: t("nav.derby") },
    { to: "/prophet", label: t("nav.prophet") },
    { to: "/upsets", label: t("nav.upsets") },
    { to: "/transfers", label: t("nav.transfers") },
    { to: "/ai", label: t("nav.ai") },
    { to: "/chalkboard", label: t("nav.chalkboard") },
    { to: "/pressroom", label: t("nav.pressroom") },
    { to: "/dossier", label: t("nav.dossier") },
    { to: "/dream-team", label: t("nav.dreamTeam") },
    { to: "/journey", label: t("nav.journey") },
    { to: "/library", label: t("nav.library") },
    { to: "/live-wire", label: t("nav.liveWire") },
    { to: "/grand-tour", label: t("nav.grandTour") },
    { to: "/dispatch", label: t("nav.dispatch") },
    { to: "/long-season", label: t("nav.longSeason") },
    { to: "/curtain-up", label: t("nav.curtainUp") },
    { to: "/wire-ledger", label: t("nav.wireLedger") },
    { to: "/world-table", label: t("nav.worldTable") },
    { to: "/grand-dispatch", label: t("nav.grandDispatch") },
    { to: "/golden-hour", label: t("nav.goldenHour") },
    { to: "/wire-diary", label: t("nav.wireDiary") },
    { to: "/frozen-dispatch", label: t("nav.frozenDispatch") },
    { to: "/witness-bench", label: t("nav.witnessBench") },
    { to: "/cartographer", label: t("nav.cartographer") },
    { to: "/frozen-diary", label: t("nav.frozenDiary") },
    { to: "/about", label: t("nav.about") },
    { to: "/manual", label: t("nav.manual") },
    { to: "/platform", label: t("nav.platform") },
    { to: "/ops", label: t("nav.ops") },
  ]), [t]);

  const foldLibrarianText = (): string =>
    [
      t("manual.librarian.foldAnswer.intro"),
      t("manual.librarian.foldAnswer.promise"),
    ].join(" ");

  const askLibrarian = async () => {
    if (libBusy) return;
    const q = libAsk.trim();
    if (!q) return;
    const chapter = pickBookChapter(q, t);
    let desk = librarianBuild(librarianPreflight(createLibrarian(chapter, q, locale)));
    setLibTrace(desk.trace);
    setLibViolations(null);
    setLibAnswer("");
    if (!LLM_CONFIG.hasKey) { setLibAnswer(t("manual.librarian.via.local")); return; }
    setLibBusy(true);
    const system = withWorldBook([
      "You are the librarian of Football OS's embedded manual.",
      "Answer ONLY from THE WORLD BOOK above and, if present, this JSON envelope.",
      "If the manual cannot answer, say so and name the chapter that carries the closest adjacent class ('read the Modes chapter' etc.) — never quote outside the manual, never predict.",
      "Keep the answer in the visitor's language.",
      "",
      "MANUAL_CHAPTER:",
      chapter ? JSON.stringify({ question: q, locale, chapter: { id: chapter.id, body: chapter.bodyKeys.map((k) => t(k)) } }) : "no chapter matched",
    ].join("\n"));
    const result = await callLlmStream(q, [], (d) => setLibAnswer((p) => p + d), { system });
    if (result.ok) {
      const refusals = verifyLibrarianText(result.text);
      if (refusals.length === 0) {
        const committed = librarianCommit(librarianPrecommit(desk, "pass"), result.text);
        setLibTrace(committed.trace);
        setLibViolations(null);
        setLibAnswer(result.text);
        setLibBusy(false);
        return;
      }
      setLibViolations(refusals);
      const refused = librarianRefused(librarianPrecommit(desk, "refused"), foldLibrarianText());
      setLibTrace(refused.trace);
      setLibAnswer(foldLibrarianText());
      setLibBusy(false);
      return;
    }
    setLibViolations(null);
    const offline = librarianRefused(desk, foldLibrarianText());
    setLibTrace(offline.trace);
    setLibAnswer(foldLibrarianText());
    setLibBusy(false);
  };

  return (
    <div className="space-y-5 print:space-y-0">
      {/* Cinematic hero — the book's deep spine */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:rounded-none print:bg-transparent print:px-0 print:py-4", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -top-16 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -bottom-14 h-40 w-40" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:opacity-10" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl print:text-black">
              {t("manual.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{t("manual.subtitle", { n: players, clubs })}</p>
        </div>
      </header>

      {/* Table of contents — anchor links, one per chapter */}
      <nav aria-label={t("manual.toc")} className={cn("grid gap-1 rounded-xl p-4 text-sm print:hidden", PANEL_CLASS.panelMuted)}>
        <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{t("manual.toc")}</div>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          {SECTION_IDS.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} className="text-primary hover:underline">{t(s.key)}</a></li>
          ))}
        </ol>
      </nav>

      {/* Chapter 1 — welcome */}
      <section id="welcome" aria-labelledby="manual-welcome" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.welcomeTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.welcomeBody")}</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
          <li>{t("manual.welcomeStep1")}</li>
          <li>{t("manual.welcomeStep2")}</li>
          <li>{t("manual.welcomeStep3")}</li>
        </ol>
        <div className="mt-3">
          <Link to="/onboarding" className="fo-lift inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted">
            {t("manual.onboardingCta")} →
          </Link>
        </div>
      </section>

      {/* Chapter 2 — the three modes */}
      <section id="modes" aria-labelledby="manual-modes" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.modesTitle")} />
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {MODES.map((m) => (
            <article key={m.key} className="rounded-lg border p-4 print:break-inside-avoid">
              <h3 className="text-sm font-bold">{t(m.key)}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(m.body)}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
                {m.bullets.map((b) => <li key={b}>{t(b)}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Chapter 3 — explore */}
      <section id="explore" aria-labelledby="manual-explore" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.exploreTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.exploreBody")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chapterLinks.map((c) => (
            <Link key={c.to} to={c.to} className="fo-lift rounded-lg border p-3 transition-colors hover:bg-muted">
              <span className="text-sm font-semibold">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Chapter 4 — the epics */}
      <section id="epics" aria-labelledby="manual-epics" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.epicsTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.epicsBody")}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          <li>{t("manual.epicsStep1")}</li>
          <li>{t("manual.epicsStep2")}</li>
          <li>{t("manual.epicsStep3")}</li>
          <li>{t("manual.epicsStep4")}</li>
        </ol>
      </section>

      {/* Chapter 5 — spring */}
      <section id="spring" aria-labelledby="manual-spring" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.springTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.springBody")}</p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
          <li>{t("manual.springItem1")}</li>
          <li>{t("manual.springItem2")}</li>
          <li>{t("manual.springItem3")}</li>
        </ul>
      </section>

      {/* Chapter 6 — honesty */}
      <section id="honesty" aria-labelledby="manual-honesty" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.honestyTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.honestyBody")}</p>
      </section>

      {/* Chapter 6.5 — the gate lane: the traced FSM every imprisoned door compiles */}
      <section id="gatelane" aria-labelledby="manual-gatelane" className="rounded-xl border p-5 print:border-0 print:px-0">
        <SectionTitle title={t("manual.gatelaneTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.gatelaneBody")}</p>
        <div className="mt-3 overflow-x-auto text-muted-foreground">
          <svg viewBox="0 0 720 232" className="min-w-[680px] text-current" role="img" aria-label={t("manual.gatelaneSvgTitle")} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            <defs>
              <marker id="gl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="currentColor" opacity="0.75" />
              </marker>
            </defs>
            {/* pipeline boxes */}
            <g stroke="currentColor" strokeWidth="1.4" fill="none">
              <rect x="4" y="34" width="118" height="46" rx="9" />
              <rect x="139" y="34" width="118" height="46" rx="9" />
              <rect x="274" y="34" width="118" height="46" rx="9" />
              <rect x="409" y="34" width="118" height="46" rx="9" />
            </g>
            <g fill="currentColor" fontSize="12" fontWeight="700" textAnchor="middle" letterSpacing="1">
              <text x="63" y="61">{t("manual.gatelaneStagePreflight")}</text>
              <text x="198" y="61">{t("manual.gatelaneStageBuild")}</text>
              <text x="333" y="61">{t("manual.gatelaneStageModel")}</text>
              <text x="468" y="61">{t("manual.gatelaneStagePrecommit")}</text>
            </g>
            <g stroke="currentColor" strokeWidth="1.4" markerEnd="url(#gl-arrow)" opacity="0.75">
              <path d="M122,57 L139,57" />
              <path d="M257,57 L274,57" />
              <path d="M392,57 L409,57" />
            </g>
            {/* commit / refused branch */}
            <g stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M468,80 L468,118 L265,118 L265,160" markerEnd="url(#gl-arrow)" opacity="0.75" />
              <path d="M468,80 L468,118 L580,118 L580,160" markerEnd="url(#gl-arrow)" opacity="0.75" />
              <rect x="153" y="160" width="224" height="48" rx="9" />
              <rect x="475" y="160" width="210" height="48" rx="9" strokeDasharray="5 4" />
            </g>
            <g fill="currentColor" fontSize="10.5" fontWeight="700" textAnchor="middle">
              <text x="265" y="180">{t("manual.gatelaneCommitBranch")}</text>
              <text x="580" y="180">{t("manual.gatelaneRefusedBranch")}</text>
            </g>
            <g fill="currentColor" fontSize="8.5" textAnchor="middle" opacity="0.8">
              <text x="265" y="197">{t("manual.gatelaneCommitSub")}</text>
              <text x="580" y="197">{t("manual.gatelaneRefusedSub")}</text>
            </g>
          </svg>
        </div>
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs">
          <li>{t("manual.gatelaneItem1")}</li>
          <li>{t("manual.gatelaneItem2")}</li>
          <li>{t("manual.gatelaneItem3")}</li>
          <li>{t("manual.gatelaneItem4")}</li>
          <li>{t("manual.gatelaneItem5")}</li>
          <li>{t("manual.gatelaneItem6")}</li>
        </ul>
      </section>

      {/* The Librarian — ask the manual itself */}
      <section aria-labelledby="manual-librarian" className="rounded-xl border p-5 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="manual-librarian" className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("manual.librarian.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("manual.librarian.title")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <form onSubmit={(e) => { e.preventDefault(); void askLibrarian(); }} className="mt-3 flex flex-wrap gap-2">
              <input
                id="librarian-ask"
                type="text"
                value={libAsk}
                onChange={(e) => setLibAsk(e.target.value)}
                placeholder={t("manual.librarian.placeholder")}
                maxLength={280}
                aria-label={t("manual.librarian.placeholder")}
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button type="submit" disabled={libBusy || !libAsk.trim()} className="fo-lift rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60">
                {libBusy ? t("pressroom.answering") : t("manual.librarian.ask")}
              </button>
            </form>
            {libAnswer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{libAnswer}</p>}
            {matchedChapter && (libTrace || libBusy) && (
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] uppercase tracking-widest text-primary">
                  {t("manual.librarian.matched", { chapter: t(matchedChapter.titleKey) })}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {t("manual.librarian.matchedOn", { keywords: t(matchedChapter.keywordKey).split("|").join(" · ") })}
                </p>
              </div>
            )}
            {libViolations && libViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {libViolations.map((v) => t(`manual.librarian.violation.${v}`)).join(" · ")}
              </p>
            )}
            {libTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("manual.librarian.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{libTrace.some((e) => e.verdict === "refused") ? t("manual.librarian.trace.refused") : t("manual.librarian.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {libTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`manual.librarian.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`manual.librarian.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("manual.librarian.via.local")}</p>
        )}
      </section>

      {/* Chapter 7 — print */}
      <section id="print" aria-labelledby="manual-print" className="rounded-xl border p-5 print:border-0 print:px-0 print:break-inside-avoid">
        <SectionTitle title={t("manual.printTitle")} />
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{t("manual.printBody")}</p>
      </section>

      <p className="text-center text-[11px] text-muted-foreground print:hidden">{t("manual.footer")}</p>
    </div>
  );
}
