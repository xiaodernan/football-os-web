import { useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useLocalStorage, useOnline } from "@/lib/hooks";
import { useI18n } from "@/i18n";
import { askIntelligence, buildGraph, type EvidenceFact, type KgGraph, type KgNode } from "@/data/intelligence";
import { rowLine } from "@/domain/rowText";
import { AI_CHAT_KEY } from "@/domain/localData";
import { Panel, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMsg =
  | { role: "user"; content: string; at: string }
  | { role: "ai"; content: string; facts?: EvidenceFact[]; sources?: string[]; confidence?: number; at: string };

// Sample prompts stay in English deliberately: they are queries sent to the
// demo provider, which composes its answers in English only. Translating them
// would have the app ask in one language and answer in another.
const SUGGESTIONS = [
  "Who is the key player at Real Madrid?",
  "Where do Arsenal sit in the Premier League?",
  "How much is Mbappé worth?",
  "Any transfer news about Haaland?",
];

// The two tab codes. At module scope rather than inline in a JSX child position,
// where the raw-UI scan reads them as display copy: they are keys into `ai.tab.*`,
// and the buttons below render t()-ed labels.
const TABS = ["chat", "graph"] as const;

export function AiStudio({ initialTab = "chat" }: { initialTab?: "chat" | "graph" }) {
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
            <button key={k} onClick={() => { setTab(k); navigate(k === "chat" ? "/ai" : "/knowledge"); }} className={cn("rounded-md border px-3 py-1.5 text-xs", tab === k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
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
  const { t } = useI18n();
  const online = useOnline();
  const [log, setLog] = useLocalStorage<ChatMsg[]>(AI_CHAT_KEY, []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setLog((l) => [...l, { role: "user", content: question, at: new Date().toISOString() }]);
    setInput("");
    setBusy(true);
    await new Promise((r) => setTimeout(r, 420));
    const a = askIntelligence(question);
    setLog((l) => [...l, { role: "ai", content: a.answer, facts: a.facts, sources: a.sources, confidence: a.confidence, at: a.at }]);
    setBusy(false);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }));
  };

  return (
    <Panel className="flex h-[62vh] flex-col p-0">
      {!online && <div className="border-b border-info/40 bg-info/10 px-4 py-2 text-xs text-info">{t("ai.offline")}</div>}
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
        {log.length === 0 && (
          <div className="space-y-3">
            <EmptyState title={t("ai.empty")} hint={t("ai.emptyHint")} icon="✦" />
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">{s}</button>)}
            </div>
          </div>
        )}
        {log.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end"><div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/90 px-3.5 py-2 text-sm text-primary-foreground">{m.content}</div></div>
        ) : (
          <div key={i} className="max-w-[92%] space-y-2">
            <div className="rounded-2xl rounded-bl-sm border bg-card/50 px-3.5 py-2 text-sm leading-relaxed">{m.content}</div>
            {m.facts?.length ? (
              <div className="rounded-lg border bg-card/30 p-2.5 text-xs">
                <div className="mb-1 font-semibold uppercase tracking-widest text-muted-foreground">{t("ai.evidence", { n: m.facts.length })}</div>
                <ul className="space-y-1">
                  {m.facts.map((f, j) => <li key={j}>{f.to ? <Link to={f.to} className="text-primary hover:underline">{f.label}</Link> : <span className="font-medium">{f.label}</span>}<span className="text-muted-foreground"> — {f.text}</span></li>)}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-muted-foreground">
                  <span>{t("common.confidence")} <span className="font-mono text-primary">{m.confidence}%</span></span>
                  <span>·</span>
                  <span>{t("common.sources")}: {(m.sources ?? []).join(", ")}</span>
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
          {KG_KINDS.map((kind) => <Legend key={kind} color={TYPE_COLOR[kind]} label={t(`ai.legend.${kind}`)} />)}
          <span className="ml-auto font-mono">{t("ai.graphMeta", { nodes: graph.nodes.length, edges: graph.edges.length })}</span>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>;
}

// One table names every kind the canvas can draw: its keys are the legend's rows and
// the key of each `ai.legend.…` lookup, and typing it against KgNode["type"] means a
// sixth kind is a compile error rather than an unnamed colour.
const TYPE_COLOR: Record<KgNode["type"], string> = {
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
      const ang = (i / Math.max(1, ring.length)) * Math.PI * 2 - Math.PI / 2;
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
        return (
          <g key={n.id} className="cursor-pointer" onClick={() => window.location.hash = n.to}>
            <circle cx={c.x} cy={c.y} r={isRoot ? 16 : 11} fill={TYPE_COLOR[n.type]} opacity={isRoot ? 0.95 : 0.8} />
            <text x={c.x} y={c.y + (isRoot ? 30 : 24)} fontSize={isRoot ? 12 : 10} fontWeight={isRoot ? 700 : 500} fill="var(--color-foreground)" textAnchor="middle">{n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
