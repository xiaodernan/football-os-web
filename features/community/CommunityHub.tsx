import { useMemo, useState } from "react";
import { useOnline, useLearnRecords } from "@/lib/hooks";
import { useI18n, formatDate, type Locale } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { buildStarters, allTags, seedThreads, type StarterDraft, type StarterInput, type Thread, type Comment } from "@/domain/community";
import { LESSONS, isCompleted, summarizeLearn } from "@/domain/learn";
import { seasonSummary, type CareerState } from "@/domain/career";
import { CAREER_KEY, COMMUNITY_KEY } from "@/domain/localData";
import { rowLine, type RowText, type Translate } from "@/domain/rowText";
import { getClub } from "@/data/footballService";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const KEY = COMMUNITY_KEY;
// The stored author name for your own posts. It is written into records, so the
// word itself never changes — only its display does, via `comm.you`.
const MY = "You";

interface CommunityStore {
  userThreads: Thread[];
  replies: Record<string, Comment[]>;
  likes: string[];
}
const EMPTY: CommunityStore = { userThreads: [], replies: {}, likes: [] };

// A helper that hands back a string is the one shape the raw-UI scan cannot see: the
// words are written here and rendered as `{timeAgo(locale, x)}` somewhere else, so no position
// it reads carries a literal. Typing the return as RowText is what makes it auditable —
// check 26 reads the keys this module names and the variables each one fills, and the
// date branch is a value out of the record rather than a sentence anyone typed.
function timeAgo(locale: Locale, iso: string): RowText {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return { key: "comm.agoNow" };
  if (m < 60) return { key: "comm.agoMin", vars: { n: m } };
  const h = Math.floor(m / 60);
  if (h < 24) return { key: "comm.agoHour", vars: { n: h } };
  const d = Math.floor(h / 24);
  return d < 30 ? { key: "comm.agoDay", vars: { n: d } } : { value: formatDate(locale, iso) };
}

// The two sort codes. Kept at module scope rather than inline in the JSX child
// position: the raw-UI scan reads an array written inside a child as copy, so a
// `["recent", "top"]` sitting in the markup counts as two untranslated words even
// though every one is only ever resolved through `comm.sort.`.
const SORTS = ["recent", "top"] as const;

/** Tags are dataset words used as filter and stored values, so only their display is
 *  translated — the raw string stays what is compared and written. */
const tagLabel = (t: Translate, tag: string) => t(`comm.tag.${tag}`);
const authorName = (t: Translate, author: string) => (author === MY ? t("comm.you") : author);
const nReplies = (t: Translate, n: number) => t(n === 1 ? "comm.nRepliesOne" : "comm.nReplies", { n });

export function CommunityHub() {
  const { t, locale } = useI18n();
  const online = useOnline();
  const { state } = useOs();
  const learn = useLearnRecords();
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
    return base.map((th) => ({ ...th, comments: [...(store.replies[th.id] ?? []), ...th.comments].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()) }));
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

  // Draft topics built only from figures the user's own pillars produced.
  const starters = useMemo<StarterDraft[]>(() => {
    let career: StarterInput["career"];
    try {
      const raw = localStorage.getItem(CAREER_KEY);
      if (raw) {
        const cs = JSON.parse(raw) as CareerState;
        const s = seasonSummary(cs);
        career = {
          clubName: getClub(cs.clubId)?.name ?? cs.clubId,
          position: s.position,
          clubCount: s.clubCount,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          pointsPerGame: s.ppg,
          gamesRemaining: Math.max(0, (s.clubCount - 1) * 2 - s.played),
        };
      }
    } catch {
      /* unreadable career — that starter is simply not offered */
    }

    const done = state.sessions.filter((x) => x.status === "completed");
    const focus = new Map<string, number>();
    for (const x of done) for (const k of x.focusAttributes) focus.set(k, (focus.get(k) ?? 0) + 1);
    const top = [...focus.entries()].sort((a, b) => b[1] - a[1])[0];
    const ratings = done.map((x) => x.selfRating).filter((r): r is number => typeof r === "number");
    const lessons = summarizeLearn(learn);
    const latest = learn.filter((r) => isCompleted(r)).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    return buildStarters({
      career,
      training: done.length
        ? {
            sessions: done.length,
            minutes: done.reduce((s, x) => s + x.targetMinutes, 0),
            topFocusKey: top ? top[0] : undefined,
            topFocusSessions: top ? top[1] : undefined,
            avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
          }
        : undefined,
      academy: lessons.completed
        ? { completed: lessons.completed, mastered: lessons.mastered, lastLesson: latest ? LESSONS.find((l) => l.id === latest.id)?.title : undefined }
        : undefined,
      watchlist: state.watchlist.length,
    });
  }, [state, learn]);

  // Every callback below is named `th`, never `t`: `t` is this app's translator, and a
  // Thread bound to that name is how M159 ended up unable to key the list's own copy.
  const visible = useMemo(() => {
    let list = merged;
    if (mine) list = list.filter((th) => th.author === MY);
    if (tag !== "All") list = list.filter((th) => th.tag === tag);
    if (q.trim()) { const n = q.toLowerCase(); list = list.filter((th) => (th.title + th.body).toLowerCase().includes(n)); }
    const score = (th: Thread) => (th.seeded ? th.comments.length : th.comments.length + 2) + likeCount(th.id, 0) * 2;
    return [...list].sort((a, b) => sort === "top"
      ? score(b) - score(a)
      : Math.max(new Date(b.at).getTime(), ...b.comments.map((c) => new Date(c.at).getTime())) - Math.max(new Date(a.at).getTime(), ...a.comments.map((c) => new Date(c.at).getTime())));
  }, [merged, tag, q, sort, mine, store.likes]);

  const open = openId ? merged.find((th) => th.id === openId) ?? null : null;

  const toggleLike = (id: string) => save({ ...store, likes: store.likes.includes(id) ? store.likes.filter((x) => x !== id) : [...store.likes, id] });

  const addReply = (threadId: string, body: string) => {
    const c: Comment = { id: `u-${Date.now()}`, author: MY, body, at: new Date().toISOString(), likes: 0, sample: false };
    save({ ...store, replies: { ...store.replies, [threadId]: [c, ...(store.replies[threadId] ?? [])] } });
    toast(t("comm.toastComment"));
  };

  const addThread = (title: string, body: string, threadTag: string) => {
    const th: Thread = { id: `u-t-${Date.now()}`, title, body, tag: threadTag, author: MY, at: new Date().toISOString(), seeded: false, comments: [] };
    save({ ...store, userThreads: [th, ...store.userThreads] });
    setComposing(false);
    setOpenId(th.id);
    toast(t("comm.toastThread"));
  };

  if (open) return <ThreadDetail thread={open} liked={store.likes.includes(open.id)} onLike={() => toggleLike(open.id)} likedComments={store.likes} onLikeComment={toggleLike} onReply={(b) => addReply(open.id, b)} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">☍</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{t("comm.title")}</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">{t("comm.subtitle")}</p>
        </div>
        <Button size="sm" onClick={() => setComposing(true)}>{t("comm.newThread")}</Button>
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t("comm.activityLabel")}</span>
            {" · "}{t(activity.threads === 1 ? "comm.nThreadsOne" : "comm.nThreads", { n: activity.threads })}
            {" · "}{nReplies(t, activity.replies)}
            {" · "}{t(activity.likes === 1 ? "comm.nLikesGivenOne" : "comm.nLikesGiven", { n: activity.likes })}
          </div>
          <button onClick={() => setMine((m) => !m)} className={cn("rounded-md border px-2.5 py-1 text-xs", mine ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
            {mine ? t("comm.showingYours") : t("comm.showMine")}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("comm.disclaimerBefore")} <span className="font-medium">{t("comm.sample")}</span> {t("comm.disclaimerAfter")}
        </p>
      </Panel>

      {!online && <div className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-xs text-info">{t("community.offline")}</div>}

      {composing && <Composer starters={starters} onSubmit={addThread} onCancel={() => setComposing(false)} />}

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("comm.searchPlaceholder")} className="w-52 rounded-md border bg-card px-3 py-1.5 text-sm" />
        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button key={s} onClick={() => setSort(s)} className={cn("rounded-md border px-2.5 py-1 text-xs capitalize", sort === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{t(`comm.sort.${s}`)}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {allTags().map((tg) => (
            <button key={tg} onClick={() => setTag(tg)} className={cn("rounded-md border px-2.5 py-1 text-xs", tag === tg ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{tagLabel(t, tg)}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {visible.length ? visible.map((th) => (
          <button key={th.id} onClick={() => setOpenId(th.id)} className="flex w-full items-start gap-3 rounded-xl border bg-card/50 p-4 text-left hover:border-primary/50">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-md border py-1.5 text-center">
              <span className="text-sm font-semibold text-primary">{likeCount(th.id, 0)}</span>
              <span className="text-[10px] text-muted-foreground">{t("comm.yourLikes")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{tagLabel(t, th.tag)}</Badge>
                {th.seeded ? (
                  <Badge variant="outline" className="border-warning/40 text-[10px] text-warning">{t("comm.sample")}</Badge>
                ) : (
                  <Badge className="bg-primary/15 text-primary text-[10px]">{t("comm.yours")}</Badge>
                )}
                <span className="text-xs text-muted-foreground">{authorName(t, th.author)} · {rowLine(timeAgo(locale, th.at), t)}</span>
              </div>
              <div className="mt-1 font-medium leading-snug">{th.title}</div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{th.body}</p>
              <div className="mt-2 text-xs text-muted-foreground">💬 {nReplies(t, th.comments.length)}</div>
            </div>
          </button>
        )) : <EmptyState title={t("comm.empty")} hint={t("comm.emptyHint")} />}
      </div>
    </div>
  );
}

function Composer({ starters, onSubmit, onCancel }: { starters: StarterDraft[]; onSubmit: (title: string, b: string, tag: string) => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("General");
  const [err, setErr] = useState<string | null>(null);
  const [usedStarter, setUsedStarter] = useState<StarterDraft | null>(null);
  const submit = () => {
    if (title.trim().length < 4) return setErr(t("comm.errTitle"));
    if (!body.trim()) return setErr(t("comm.errBody"));
    onSubmit(title.trim(), body.trim(), tag);
  };
  const apply = (s: StarterDraft) => {
    setTitle(s.title);
    setBody(s.body);
    setTag(allTags().includes(s.tag) ? s.tag : "General");
    setErr(null);
    setUsedStarter(s);
  };
  return (
    <Panel className="p-4">
      <SectionTitle title={t("comm.composerTitle")} />
      {starters.length > 0 && (
        <div className="mt-2 rounded-md border bg-card/30 p-3">
          <div className="text-xs font-medium">{t("comm.startFromData")}</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("comm.startFromDataHint")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {starters.map((s) => (
              <button key={s.id} onClick={() => apply(s)} className={cn("rounded-md border px-2.5 py-1 text-xs", usedStarter?.id === s.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
                {tagLabel(t, s.tag)} · {s.evidence[0]}
              </button>
            ))}
          </div>
          {usedStarter && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              {t("comm.builtFrom", { evidence: usedStarter.evidence.join(" · ") })}
            </div>
          )}
        </div>
      )}
      <div className="mt-3 space-y-2">
        <input value={title} onChange={(e) => { setTitle(e.target.value); setErr(null); }} placeholder={t("comm.titlePlaceholder")} className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
        <textarea value={body} onChange={(e) => { setBody(e.target.value); setErr(null); }} placeholder={t("comm.bodyPlaceholder")} rows={3} className="w-full rounded-md border bg-card px-3 py-2 text-sm" />
        <div className="flex items-center justify-between gap-2">
          <select value={tag} onChange={(e) => setTag(e.target.value)} className="rounded-md border bg-card px-2 py-1.5 text-sm">
            {allTags().filter((tg) => tg !== "All").map((tg) => <option key={tg} value={tg}>{tagLabel(t, tg)}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>{t("comm.cancel")}</Button>
            <Button size="sm" onClick={submit}>{t("comm.post")}</Button>
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
  const { t, locale } = useI18n();
  const [text, setText] = useState("");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>{t("comm.backToCommunity")}</Button>
      <Panel className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{tagLabel(t, thread.tag)}</Badge>
          {thread.seeded ? (
            <Badge variant="outline" className="border-warning/40 text-[10px] text-warning">{t("comm.samplePost")}</Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary text-[10px]">{t("comm.yours")}</Badge>
          )}
          <span className="text-xs text-muted-foreground">{authorName(t, thread.author)} · {rowLine(timeAgo(locale, thread.at), t)}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold">{thread.title}</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{thread.body}</p>
        <div className="mt-3"><Button size="sm" variant={liked ? "secondary" : "outline"} onClick={onLike}>{liked ? t("comm.liked") : t("comm.like")}</Button></div>
        {thread.seeded && <p className="mt-2 text-[11px] text-muted-foreground">{t("comm.seededNote")}</p>}
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("comm.repliesHeader", { n: thread.comments.length })} />
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onReply(text.trim()); setText(""); } }} placeholder={t("comm.replyPlaceholder")} className="flex-1 rounded-md border bg-card px-3 py-2 text-sm" />
          <Button size="sm" disabled={!text.trim()} onClick={() => { onReply(text.trim()); setText(""); }}>{t("comm.reply")}</Button>
        </div>
        <div className="mt-4 space-y-3">
          {thread.comments.length ? thread.comments.map((c) => {
            const cLiked = likedComments.includes(c.id);
            return (
              <div key={c.id} className="rounded-lg border bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className={cn("font-medium", c.sample ? "text-warning" : "text-foreground/80")}>{authorName(t, c.author)}</span>
                    {c.sample && <Badge variant="outline" className="border-warning/40 text-[10px] text-warning">{t("comm.sampleReply")}</Badge>}
                  </span>
                  <span>{rowLine(timeAgo(locale, c.at), t)}</span>
                </div>
                <p className="mt-1 text-sm">{c.body}</p>
                {!c.sample && (
                  <button onClick={() => onLikeComment(c.id)} className={cn("mt-2 text-xs", cLiked ? "text-primary" : "text-muted-foreground hover:text-primary")}>{cLiked ? "♥" : "♡"} {c.likes + (cLiked ? 1 : 0)}</button>
                )}
              </div>
            );
          }) : <p className="text-sm text-muted-foreground">{t("comm.noReplies")}</p>}
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
