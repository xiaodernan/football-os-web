import { useMemo, useState } from "react";
import { useOnline } from "@/lib/hooks";
import { seedThreads, allTags, type Thread, type Comment } from "@/domain/community";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KEY = "football-os.community.v1";
const MY = "You";

interface CommunityStore {
  userThreads: Thread[];
  replies: Record<string, Comment[]>;
  likes: string[];
}
const EMPTY: CommunityStore = { userThreads: [], replies: {}, likes: [] };

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

export function CommunityHub() {
  const online = useOnline();
  const [store, setStore] = useState<CommunityStore>(load);
  const [tag, setTag] = useState("All");
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [mine, setMine] = useState(false);

  const save = (next: CommunityStore) => { setStore(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ } };

  const merged = useMemo<Thread[]>(() => {
    const base = [...store.userThreads, ...seedThreads()];
    return base.map((t) => ({ ...t, comments: [...(store.replies[t.id] ?? []), ...t.comments].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()) }));
  }, [store.userThreads, store.replies]);

  const likeCount = (id: string, base: number) => base + (store.likes.includes(id) ? 1 : 0);

  // Everything here is counted from what this device actually holds — the only
  // community numbers that are real in Demo Mode.
  const activity = useMemo(
    () => ({
      threads: store.userThreads.length,
      replies: Object.values(store.replies).reduce((s, a) => s + a.length, 0),
      likes: store.likes.length,
    }),
    [store],
  );

  const visible = useMemo(() => {
    let list = merged;
    if (mine) list = list.filter((t) => t.author === MY);
    if (tag !== "All") list = list.filter((t) => t.tag === tag);
    if (q.trim()) { const n = q.toLowerCase(); list = list.filter((t) => (t.title + t.body).toLowerCase().includes(n)); }
    const score = (t: Thread) => (t.seeded ? t.comments.length : t.comments.length + 2) + likeCount(t.id, 0) * 2;
    return [...list].sort((a, b) => sort === "top"
      ? score(b) - score(a)
      : Math.max(new Date(b.at).getTime(), ...b.comments.map((c) => new Date(c.at).getTime())) - Math.max(new Date(a.at).getTime(), ...a.comments.map((c) => new Date(c.at).getTime())));
  }, [merged, tag, q, sort, mine, store.likes]);

  const open = openId ? merged.find((t) => t.id === openId) ?? null : null;

  const toggleLike = (id: string) => save({ ...store, likes: store.likes.includes(id) ? store.likes.filter((x) => x !== id) : [...store.likes, id] });

  const addReply = (threadId: string, body: string) => {
    const c: Comment = { id: `u-${Date.now()}`, author: MY, body, at: new Date().toISOString(), likes: 0, sample: false };
    save({ ...store, replies: { ...store.replies, [threadId]: [c, ...(store.replies[threadId] ?? [])] } });
    toast("Comment posted");
  };

  const addThread = (title: string, body: string, threadTag: string) => {
    const t: Thread = { id: `u-t-${Date.now()}`, title, body, tag: threadTag, author: MY, at: new Date().toISOString(), seeded: false, comments: [] };
    save({ ...store, userThreads: [t, ...store.userThreads] });
    setComposing(false);
    setOpenId(t.id);
    toast("Thread posted");
  };

  if (open) return <ThreadDetail thread={open} liked={store.likes.includes(open.id)} onLike={() => toggleLike(open.id)} likedComments={store.likes} onLikeComment={toggleLike} onReply={(b) => addReply(open.id, b)} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">☍</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Community</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">Discussion topics are generated from the world dataset. Your posts and replies stay on this device.</p>
        </div>
        <Button size="sm" onClick={() => setComposing(true)}>＋ New thread</Button>
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Your activity on this device</span> · {activity.threads} thread{activity.threads === 1 ? "" : "s"} · {activity.replies} repl{activity.replies === 1 ? "y" : "ies"} · {activity.likes} like{activity.likes === 1 ? "" : "s"} given
          </div>
          <button onClick={() => setMine((m) => !m)} className={cn("rounded-md border px-2.5 py-1 text-xs", mine ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
            {mine ? "Showing yours" : "Show only mine"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          No network is connected. Posts labelled <span className="font-medium">sample</span> are generated demonstration discussion from the demo dataset — they are not real people, and they carry no audience metrics. Only your own posts are genuine.
        </p>
      </Panel>

      {!online && <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">You're offline — new posts save to this device and remain when you reconnect.</div>}

      {composing && <Composer onSubmit={addThread} onCancel={() => setComposing(false)} />}

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search discussions…" className="w-52 rounded-md border bg-card px-3 py-1.5 text-sm" />
        <div className="flex gap-1">
          {(["recent", "top"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className={cn("rounded-md border px-2.5 py-1 text-xs capitalize", sort === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{s}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {allTags().map((tg) => (
            <button key={tg} onClick={() => setTag(tg)} className={cn("rounded-md border px-2.5 py-1 text-xs", tag === tg ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{tg}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visible.length ? visible.map((t) => (
          <button key={t.id} onClick={() => setOpenId(t.id)} className="flex w-full items-start gap-3 rounded-xl border bg-card/50 p-4 text-left hover:border-primary/50">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-md border py-1.5 text-center">
              <span className="text-sm font-semibold text-primary">{likeCount(t.id, 0)}</span>
              <span className="text-[10px] text-muted-foreground">your likes</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{t.tag}</Badge>
                {t.seeded ? (
                  <Badge variant="outline" className="border-warning/40 text-[10px] text-warning">sample</Badge>
                ) : (
                  <Badge className="bg-primary/15 text-primary text-[10px]">yours</Badge>
                )}
                <span className="text-xs text-muted-foreground">{t.author} · {timeAgo(t.at)}</span>
              </div>
              <div className="mt-1 font-medium leading-snug">{t.title}</div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</p>
              <div className="mt-2 text-xs text-muted-foreground">💬 {t.comments.length} replies</div>
            </div>
          </button>
        )) : <EmptyState title="No discussions match" hint="Try another tag or clear your search." />}
      </div>
    </div>
  );
}

function Composer({ onSubmit, onCancel }: { onSubmit: (t: string, b: string, tag: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("General");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    if (title.trim().length < 4) return setErr("Give your thread a title of at least 4 characters.");
    if (!body.trim()) return setErr("Add a message to start the discussion.");
    onSubmit(title.trim(), body.trim(), tag);
  };
  return (
    <Panel className="p-4">
      <SectionTitle title="Start a discussion" />
      <div className="space-y-2">
        <input value={title} onChange={(e) => { setTitle(e.target.value); setErr(null); }} placeholder="Title" className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => { setBody(e.target.value); setErr(null); }} placeholder="What do you want to talk about?" rows={3} className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
        <div className="flex items-center justify-between gap-2">
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="rounded-md border bg-card px-2 py-1.5 text-sm">
            {allTags().filter((t) => t !== "All").map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={submit}>Post</Button>
          </div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>
    </Panel>
  );
}

function ThreadDetail({ thread, liked, onLike, likedComments, onLikeComment, onReply, onBack }: {
  thread: Thread; liked: boolean; onLike: () => void; likedComments: string[]; onLikeComment: (id: string) => void; onReply: (b: string) => void; onBack: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>← Back to community</Button>
      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{thread.tag}</Badge>
          {thread.seeded ? (
            <Badge variant="outline" className="border-warning/40 text-[10px] text-warning">sample post</Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary text-[10px]">yours</Badge>
          )}
          <span className="text-xs text-muted-foreground">{thread.author} · {timeAgo(thread.at)}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold">{thread.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{thread.body}</p>
        <div className="mt-3"><Button size="sm" variant={liked ? "secondary" : "outline"} onClick={onLike}>{liked ? "♥ Liked" : "♡ Like"}</Button></div>
        {thread.seeded && <p className="mt-2 text-[11px] text-muted-foreground">Generated from the demo dataset to show how the board works. It is not a real person and has no audience.</p>}
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={`Replies · ${thread.comments.length}`} />
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onReply(text.trim()); setText(""); } }} placeholder="Add a reply…" className="flex-1 rounded-md border bg-card px-3 py-2 text-sm" />
          <Button size="sm" disabled={!text.trim()} onClick={() => { onReply(text.trim()); setText(""); }}>Reply</Button>
        </div>
        <div className="mt-4 space-y-3">
          {thread.comments.length ? thread.comments.map((c) => {
            const cLiked = likedComments.includes(c.id);
            return (
              <div key={c.id} className="rounded-lg border bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className={cn("font-medium", c.sample ? "text-warning" : "text-foreground/80")}>{c.author}</span>
                    {c.sample && <Badge variant="outline" className="border-warning/40 text-[10px] text-warning">sample reply</Badge>}
                  </span>
                  <span>{timeAgo(c.at)}</span>
                </div>
                <p className="mt-1 text-sm">{c.body}</p>
                {!c.sample && (
                  <button onClick={() => onLikeComment(c.id)} className={cn("mt-2 text-xs", cLiked ? "text-primary" : "text-muted-foreground hover:text-primary")}>{cLiked ? "♥" : "♡"} {c.likes + (cLiked ? 1 : 0)}</button>
                )}
              </div>
            );
          }) : <p className="text-sm text-muted-foreground">No replies yet — start the conversation.</p>}
        </div>
      </Panel>
    </div>
  );
}

function load(): CommunityStore {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export { CommunityHub as default };
