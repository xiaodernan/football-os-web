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

export function Library() {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [query, setQuery] = useState("");
  const hits: LibraryHit[] = useMemo(() => (query.trim() ? searchLibrary(query) : []), [query]);

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

      <p className="text-center text-[10px] text-muted-foreground">{t("library.method")}</p>
    </div>
  );
}
