// M1151 · The Library · 读书室 — a reading hall over the frozen seeded world.
// Search the corpus with BM25, see ranked documents, ask the desk to argue them back.
// English tokens only; UI chrome is yours, the corpus is the model's.

import { useMemo, useState } from "react";
import { useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { cn } from "@/lib/utils";
import { searchLibrary, type LibraryHit } from "@/data/libraryCorpus";
import { round3 } from "@/lib/utils";
import { LLM_CONFIG, callLlmStream, withWorldBook } from "@/data/llm";
import type { ReleaseBadge } from "@/domain/releaseArtifact";
import {
  createWorldDesk,
  envelopeFor,
  verifyWorldText,
  worldBuild,
  worldCommit,
  worldPrecommit,
  worldPreflight,
  worldRefused,
  type WorldTraceEntry,
} from "@/domain/worldLibrarian";

export function Library() {
  const { t, locale } = useI18n();
  const { navigate } = useRouter();
  const [query, setQuery] = useState("");
  const hits: LibraryHit[] = useMemo(() => (query.trim() ? searchLibrary(query) : []), [query]);

  const [worldAsk, setWorldAsk] = useState("");
  const [worldAnswer, setWorldAnswer] = useState("");
  const [worldTrace, setWorldTrace] = useState<readonly WorldTraceEntry[] | null>(null);
  const [worldViolations, setWorldViolations] = useState<string[] | null>(null);
  const [worldBusy, setWorldBusy] = useState(false);
  const [worldBadge, setWorldBadge] = useState<ReleaseBadge | null>(null);
  const [openedCount, setOpenedCount] = useState(0);

  const foldWorldAnswer = (hitsNow: readonly LibraryHit[]): string =>
    [t("library.door.fold"), ...hitsNow.slice(0, 3).map((hit) => `· ${hit.document.text}`)].join("\n");

  const askTheWorld = async () => {
    const q = worldAsk.trim();
    if (!q || worldBusy) return;
    const hitsNow = searchLibrary(q);
    setOpenedCount(hitsNow.length);
    setWorldViolations(null);
    setWorldAnswer("");
    setWorldBusy(true);
    let desk = worldBuild(worldPreflight(createWorldDesk(q, hitsNow, locale)));
    setWorldTrace(desk.trace);
    if (hitsNow.length === 0) {
      const folded = worldRefused(desk, t("library.door.emptyHits"));
      setWorldTrace(folded.trace);
      setWorldAnswer(t("library.door.emptyHits"));
      setWorldBadge("folded");
      setWorldBusy(false);
      return;
    }
    if (!LLM_CONFIG.hasKey) {
      const folded = worldRefused(desk, foldWorldAnswer(hitsNow));
      setWorldTrace(folded.trace);
      setWorldAnswer(foldWorldAnswer(hitsNow));
      setWorldBadge("offline");
      setWorldBusy(false);
      return;
    }
    const envelope = envelopeFor(q, hitsNow, locale);
    const system = withWorldBook([
      "You are the World Librarian of Football OS's reading room.",
      "Answer ONLY from the passages inside THE WORLD BOOK and the envelope below.",
      "Every numeral you write MUST appear in the evidence verbatim; if none covers it, answer without that number.",
      "Never predict the future; never invent an entity the envelope does not name.",
      "Keep the answer in the visitor's language, at most 120 words.",
      "",
      "ENVELOPE:",
      JSON.stringify(envelope, null, 2),
    ].join("\n"));
    const result = await callLlmStream(q, [], (delta) => setWorldAnswer((prev) => prev + delta), { system });
    if (result.ok) {
      const violations = verifyWorldText(result.text, hitsNow);
      if (violations.length === 0) {
        const committed = worldCommit(worldPrecommit(desk, "pass"), result.text);
        setWorldTrace(committed.trace);
        setWorldAnswer(result.text);
        setWorldBadge("verified");
        setWorldBusy(false);
        return;
      }
      setWorldViolations(violations);
      const folded = worldRefused(worldPrecommit(desk, "refused"), foldWorldAnswer(hitsNow));
      setWorldTrace(folded.trace);
      setWorldAnswer(foldWorldAnswer(hitsNow));
      setWorldBadge("folded");
      setWorldBusy(false);
      return;
    }
    const folded = worldRefused(desk, foldWorldAnswer(hitsNow));
    setWorldTrace(folded.trace);
    setWorldAnswer(foldWorldAnswer(hitsNow));
    setWorldBadge("offline");
    setWorldBusy(false);
  };

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-cyan -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("library.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("library.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("library.subtitle")}</p>
          <label htmlFor="library-search" className="mt-4 block text-[10px] uppercase tracking-widest text-muted-foreground">{t("library.ask")}</label>
          <input
            id="library-search"
            type="text"
            autoComplete="off"
            placeholder={t("library.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 w-full max-w-xl rounded-lg border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </div>
      </header>

      <div className="grid gap-3">
        {hits.length === 0 && query.trim() !== "" ? (
          <Panel className="p-6 text-center text-xs text-muted-foreground">{t("library.empty")}</Panel>
        ) : null}
        {query.trim() === "" ? (
          <Panel className="p-6 text-center text-xs text-muted-foreground">{t("library.askFirst")}</Panel>
        ) : null}
        {hits.map((hit) => (
          <button
            key={hit.document.id}
            type="button"
            onClick={() => navigate(hit.document.target)}
            className="fo-lift flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted"
          >
            <span className={cn("w-16 shrink-0 rounded-md border px-2 py-1 text-center font-mono text-[10px] uppercase tracking-widest", CHIP_CLASS.optionOff)}>
              {t(`library.kind.${hit.document.kind}`)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{hit.document.text}</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{round3(hit.score)}</span>
          </button>
        ))}
      </div>

      {/* The World Desk — ask the world itself */}
      <section aria-labelledby="world-desk" className="rounded-xl border p-5 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="world-desk" className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("library.door.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("library.door.title")} — {t("library.door.explain")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <form onSubmit={(e) => { e.preventDefault(); void askTheWorld(); }} className="mt-3 flex flex-wrap gap-2">
              <input
                id="world-desk-ask"
                type="text"
                value={worldAsk}
                onChange={(e) => setWorldAsk(e.target.value)}
                placeholder={t("library.placeholder")}
                maxLength={280}
                aria-label={t("library.placeholder")}
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button type="submit" disabled={worldBusy || !worldAsk.trim()} className="fo-lift rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60">
                {worldBusy ? t("library.door.busy") : t("library.door.button")}
              </button>
            </form>
            {worldAnswer && (
              <p aria-live="polite" className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{worldAnswer}</p>
            )}
            {worldBadge && (
              <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-widest", worldBadge === "verified" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning)}>
                {worldBadge === "verified" ? t("library.door.badge.verified") : worldBadge === "folded" ? t("library.door.badge.folded") : t("library.door.badge.fallback")}
              </span>
            )}
            {worldViolations && worldViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">{worldViolations.map((v) => t(`library.door.violation.${v}`)).join(" · ")}</p>
            )}
            {worldTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("library.door.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{worldBadge === "verified" ? t("manual.librarian.trace.verified") : t("manual.librarian.trace.refused")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {worldTrace.map((entry) => (
                    <span
                      key={entry.stage}
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
                <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("library.door.cites")}: {openedCount}</p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("manual.librarian.via.local")}</p>
        )}
        <p className="mt-3 text-[10px] text-muted-foreground">{t("library.door.method")}</p>
      </section>

      <p className="text-center text-[10px] text-muted-foreground">{t("library.method")}</p>
    </div>
  );
}
