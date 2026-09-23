import { useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useLocalStorage, useOnline } from "@/lib/hooks";
import { askIntelligence, buildGraph, type EvidenceFact, type KgGraph } from "@/data/intelligence";
import { AI_CHAT_KEY } from "@/domain/localData";
import { Panel, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMsg =
  | { role: "user"; content: string; at: string }
  | { role: "ai"; content: string; facts?: EvidenceFact[]; sources?: string[]; confidence?: number; at: string };

const SUGGESTIONS = [
  "Who is the key player at Real Madrid?",
  "Where do Arsenal sit in the Premier League?",
  "How much is Mbappé worth?",
  "Any transfer news about Haaland?",
];

export function AiStudio({ initialTab = "chat" }: { initialTab?: "chat" | "graph" }) {
  const { navigate } = useRouter();
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">✦</div>
          <div>
            <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Football AI</h1>{<DemoBadge />}</div>
            <p className="text-xs text-muted-foreground">Answers are grounded in the world dataset — with evidence, sources & confidence. Demo provider, no API key.</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {(["chat", "graph"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); navigate(t === "chat" ? "/ai" : "/knowledge"); }} className={cn("rounded-md border px-3 py-1.5 text-xs", tab === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
              {t === "chat" ? "Chat" : "Knowledge graph"}
            </button>
          ))}
        </div>
      </div>
      {tab === "chat" ? <Chat /> : <Graph />}
    </div>
  );
}

function Chat() {
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
      {!online && <div className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-xs text-warning">You are offline. Answers use the last-loaded dataset only; retrieval is not refreshed.</div>}
      <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4">
        {log.length === 0 && (
          <div className="space-y-3">
            <EmptyState title="Ask about any club, player, fixture or headline" hint="Each answer cites the retrieved evidence and a confidence score." icon="✦" />
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
                <div className="mb-1 font-semibold uppercase tracking-widest text-muted-foreground">Evidence ({m.facts.length})</div>
                <ul className="space-y-1">
                  {m.facts.map((f, j) => <li key={j}>{f.to ? <Link to={f.to} className="text-primary hover:underline">{f.label}</Link> : <span className="font-medium">{f.label}</span>}<span className="text-muted-foreground"> — {f.text}</span></li>)}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-muted-foreground">
                  <span>Confidence <span className="font-mono text-primary">{m.confidence}%</span></span>
                  <span>·</span>
                  <span>Sources: {(m.sources ?? []).join(", ")}</span>
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="inline-block h-2 w-2 animate-ping rounded-full bg-primary" /> Retrieving from the football world…</div>}
      </div>
      <div className="border-t p-3">
        {log.length > 0 && <button onClick={() => setLog([])} className="mb-2 text-xs text-muted-foreground hover:text-foreground">Clear conversation</button>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1} placeholder="Ask the Football OS analyst…" className="max-h-32 min-h-[40px] flex-1 resize-none" />
          <Button type="submit" disabled={busy || !input.trim()}>Send</Button>
        </form>
      </div>
    </Panel>
  );
}

function Graph() {
  const [q, setQ] = useState("Manchester City");
  const graph = useMemo<KgGraph>(() => buildGraph(q), [q]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search an entity to map its relations…" className="max-w-md" />
      </div>
      <Panel className="p-2">
        {graph.nodes.length ? <GraphCanvas graph={graph} /> : <div className="p-6"><EmptyState title="No entity found" hint="Try a club, player, competition or headline." /></div>}
      </Panel>
      {graph.nodes.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Legend color="var(--color-primary)" label="Club" /><Legend color="var(--color-info)" label="Player" /><Legend color="var(--color-chart-4)" label="Competition" /><Legend color="var(--color-warning)" label="News" />
          <span className="ml-auto font-mono">{graph.nodes.length} nodes · {graph.edges.length} relations</span>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>;
}

const TYPE_COLOR: Record<string, string> = { club: "var(--color-primary)", player: "var(--color-info)", competition: "var(--color-chart-4)", news: "var(--color-warning)", match: "var(--color-destructive)" };

function GraphCanvas({ graph }: { graph: KgGraph }) {
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
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[460px] w-full" role="img" aria-label="Knowledge graph">
      <defs><radialGradient id="kg-bg" cx="50%" cy="45%" r="70%"><stop offset="0%" stopColor="var(--color-card)" /><stop offset="100%" stopColor="transparent" /></radialGradient></defs>
      <rect width={W} height={H} fill="url(#kg-bg)" />
      {graph.edges.map((e, i) => {
        const a = pos.get(e.from), b = pos.get(e.to);
        if (!a || !b) return null;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--grid-line)" strokeWidth={1} />
            {Math.abs(mx - a.x) + Math.abs(my - a.y) > 0 && <text x={mx} y={my} fontSize={8} fill="var(--color-muted-foreground)" textAnchor="middle">{e.relation}</text>}
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
