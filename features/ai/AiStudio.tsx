import { useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useLocalStorage, useOnline } from "@/lib/hooks";
import { useI18n } from "@/i18n";
import { askIntelligence, buildGraph, type EvidenceFact, type KgGraph } from "@/data/intelligence";
import { SUGGESTED_ASKS } from "@/data/ai";
import { rowLine, asRowText, searchKindLabel, type RowText } from "@/domain/rowText";
import type { SearchKind } from "@/domain/types";
import { AI_CHAT_KEY } from "@/domain/localData";
import { Panel, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, safeDiv } from "@/lib/utils";

type ChatMsg =
  | { role: "user"; content: string; at: string }
  | { role: "ai"; content: RowText[]; facts?: EvidenceFact[]; sources?: RowText[]; confidence?: number; at: string };

// A suggested question is two things at once, and only one half ever justified English here: it is
// a query the demo provider matches on Latin tokens (`data/intelligence.ts:246` strips everything
// outside `a-z0-9' -`), and it is copy the reader reads under this heading. M215 recorded that as a
// defect rather than fixing it quietly; M217 fixes the shape. The pairs live in `data/ai.ts`, which
// names the dictionary row the reader sees and the English row of the same key that the provider
// receives, so nothing in the view has to know two languages. The raw-UI census still cannot see
// this shape — a module-scope value reaching a JSX child through a variable, the same blind spot
// `relativeDay` was found in at M214 — which is why the claim is a key-and-ask gate (26e), not a
// position scan.

// The two tab codes. At module scope rather than inline in a JSX child position,
// where the raw-UI scan reads them as display copy: they are keys into `ai.tab.*`,
// and the buttons below render t()-ed labels.
const TABS = ["chat", "graph"] as const;
// M435: the type is derived from the list, so the two tabs and the type that names them cannot
// drift — the same shape the domain's own vocabularies use.
type AiTab = (typeof TABS)[number];

export function AiStudio({ initialTab = "chat" }: { initialTab?: AiTab }) {
  const { t } = useI18n();
  const { navigate } = useRouter();
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">✦</div>
          <div>
            <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{t("ai.title")}</h1>{<DemoBadge />}</div>
            <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {TABS.map((k) => (
            <button key={k} onClick={() => { setTab(k); navigate(k === "chat" ? "/ai" : "/knowledge"); }} className={cn("rounded-md border px-3 py-1.5 text-xs", tab === k ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>
              {k === "chat" ? t("ai.tab.chat") : t("ai.tab.graph")}
            </button>
          ))}
        </div>
      </div>
      {tab === "chat" ? <Chat /> : <Graph />}
    </div>
  );
}

function Chat() {
  const { t, locale } = useI18n();
  const online = useOnline();
  const [log, setLog] = useLocalStorage<ChatMsg[]>(AI_CHAT_KEY, []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  // A log written before the chips and sources became rows stores plain strings. Normalising
  // them here — the boundary — keeps every read below a plain `rowLine` instead of a guard
  // at each site, and a value stored by an older visit stays exactly as it was written.
  const entries = useMemo<ChatMsg[]>(
    () =>
      log.map((m) =>
        m.role === "user"
          ? m
          : {
              ...m,
              // A log written before answers became rows holds one English string; it stays
              // visible exactly as it was written — a value row, never a key to resolve.
              content: Array.isArray(m.content) ? m.content : [asRowText(m.content as string | RowText)],
              facts: m.facts?.map((f) => ({ ...f, label: asRowText(f.label as string | RowText), text: asRowText(f.text as string | RowText) })),
              sources: m.sources?.map((s) => asRowText(s as string | RowText)),
            },
      ),
    [log],
  );

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setLog((l) => [...l, { role: "user", content: question, at: new Date().toISOString() }]);
    setInput("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 420));
    const a = askIntelligence(question, locale);
    setLog((l) => [...l, { role: "ai", content: a.answer, facts: a.facts, sources: a.sources, confidence: a.confidence, at: a.at }]);
    setBusy(false);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
  };

  return (
    <Panel className="flex h-[62vh] flex-col p-0">
      {!online && <div className={cn("border-b px-4 py-2 text-xs", CHIP_CLASS.info)}>{t("ai.offline")}</div>}
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
        {log.length === 0 && (
          <div className="space-y-3">
            <EmptyState title={t("ai.empty")} hint={t("ai.emptyHint")} icon="✦" />
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_ASKS.map((a) => <button key={a.id} onClick={() => send(a.ask)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">{t(`ai.sug.${a.id}`)}</button>)}
            </div>
          </div>
        )}
        {entries.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/90 px-3.5 py-2 text-sm text-primary-foreground">{m.content}</div></div>
        ) : (
          <div key={i} className="max-w-[92%] space-y-2">
            <div className="rounded-2xl rounded-bl-sm border bg-card/50 px-3.5 py-2 text-sm leading-relaxed">
              {Array.isArray(m.content)
                ? m.content.map((r, j) => <p key={j} className={j ? "mt-1" : undefined}>{rowLine(r, t)}</p>)
                : m.content}
            </div>
            {m.facts?.length ? (
              <div className="rounded-lg border bg-card/30 p-2.5 text-xs">
                <div className="mb-1 font-semibold uppercase tracking-widest text-muted-foreground">{t("ai.evidence", { n: m.facts.length })}</div>
                <ul className="space-y-1">
                  {m.facts.map((f, j) => <li key={j}>{f.to ? <Link to={f.to} className="text-primary hover:underline">{rowLine(f.label, t)}</Link> : <span className="font-medium">{rowLine(f.label, t)}</span>}<span className="text-muted-foreground"> — {rowLine(f.text, t)}</span></li>)}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-muted-foreground">
                  <span>{t("common.confidence")} <span className="font-mono text-primary">{m.confidence}%</span></span>
                  <span>·</span>
                  <span>{t("common.sources")}: {(m.sources ?? []).map((s) => rowLine(s, t)).join(", ")}</span>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="inline-block h-2 w-2 animate-ping rounded-full bg-primary" /> {t("ai.retrieving")}</div>}
      </div>
      <div className="border-t p-3">
        {log.length > 0 && <button onClick={() => setLog([])} className="mb-2 text-xs text-muted-foreground hover:text-foreground">{t("ai.clear")}</button>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1} placeholder={t("ai.placeholder")} className="max-h-32 min-h-[40px] flex-1 resize-none" />
          <Button type="submit" disabled={busy || !input.trim()}>{t("ai.send")}</Button>
        </form>
      </div>
    </Panel>
  );
}

function Graph() {
  const { t } = useI18n();
  const [q, setQ] = useState("Manchester City");
  const graph = useMemo<KgGraph>(() => buildGraph(q), [q]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ai.graphPlaceholder")} className="max-w-md" />
      </div>
      <Panel className="p-2">
        {graph.nodes.length ? <GraphCanvas graph={graph} ariaLabel={t("ai.graphAria")} /> : <div className="p-6"><EmptyState title={t("ai.graphEmpty")} hint={t("ai.graphEmptyHint")} /></div>}
      </Panel>
      {graph.nodes.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {KG_KINDS.map((kind) => <Legend key={kind} color={TYPE_COLOR[kind]} label={searchKindLabel(kind, t)} />)}
          <span className="ml-auto font-mono">{t("ai.graphMeta", { nodes: graph.nodes.length, edges: graph.edges.length })}</span>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>;
}

// One table names every kind the canvas can draw: its keys are the legend's rows and the key of
// each kind's word, and typing it against SearchKind — the same type as a KgNode's own field —
// means a sixth kind is a compile error in the table rather than an unnamed colour, and that the
// legend and the node can never disagree about which kinds exist.
const TYPE_COLOR: Record<SearchKind, string> = {
  club: "var(--color-primary)",
  player: "var(--color-info)",
  competition: "var(--color-chart-4)",
  news: "var(--color-warning)",
  match: "var(--color-destructive)",
};

// The legend walks this list, so a kind can gain a colour only by gaining a word.
const KG_KINDS = Object.keys(TYPE_COLOR) as (keyof typeof TYPE_COLOR)[];

function GraphCanvas({ graph, ariaLabel }: { graph: KgGraph; ariaLabel: string }) {
  const { t } = useI18n();
  const W = 720; const H = 460;
  // Radial layout: root in the centre, everything else on a ring, clustered by type.
  const pos = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    const cx = W / 2, cy = H / 2;
    if (graph.root) p.set(graph.root, { x: cx, y: cy });
    const ring = graph.nodes.filter((n) => n.id !== graph.root);
    const R = Math.min(W, H) / 2 - 70;
    ring.forEach((n, i) => {
      const ang = safeDiv(i, ring.length) * Math.PI * 2 - Math.PI / 2;
      p.set(n.id, { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R });
    });
    return p;
  }, [graph]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[460px] w-full" role="img" aria-label={ariaLabel}>
      <defs><radialGradient id="kg-bg" cx="50%" cy="45%" r="70%"><stop offset="0%" stopColor="var(--color-card)" /><stop offset="100%" stopColor="transparent" /></radialGradient></defs>
      <rect width={W} height={H} fill="url(#kg-bg)" />
      {graph.edges.map((e, i) => {
        const a = pos.get(e.from), b = pos.get(e.to);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--grid-line)" strokeWidth={1} />
            {Math.abs(mx - a.x) + Math.abs(my - a.y) > 0 && <text x={mx} y={my} fontSize={8} fill="var(--color-muted-foreground)" textAnchor="middle">{rowLine(e.relation, t)}</text>}
          </g>
        );
      })}
      {graph.nodes.map((n) => {
        const c = pos.get(n.id); if (!c) return null;
        const isRoot = n.id === graph.root;
        // The label is a row now (M275): the news family's headline words itself in the
        // reader's locale, and the ellipsis cut is taken on the READ words, not the row.
        const lbl = rowLine(n.label, t) ?? "";
        return (
          <g key={n.id} className="cursor-pointer" onClick={() => window.location.hash = n.to}>
            <circle cx={c.x} cy={c.y} r={isRoot ? 16 : 11} fill={TYPE_COLOR[n.type]} opacity={isRoot ? 0.95 : 0.8} />
            <text x={c.x} y={c.y + (isRoot ? 30 : 24)} fontSize={isRoot ? 12 : 10} fontWeight={isRoot ? 700 : 500} fill="var(--color-foreground)" textAnchor="middle">{lbl.length > 18 ? lbl.slice(0, 17) + "…" : lbl}</text>
          </g>
        );
      })}
    </svg>
  );
}
