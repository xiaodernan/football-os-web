import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1236: the match reporter — the eighteenth imprisoned door, the one that writes the game.
const MatchReporter = lazy(() => import("@/features/reporter/MatchReporter").then((m) => ({ default: m.MatchReporter })));'''
new = old + '''
// M1237: the talent map — the world by nation.
const TalentMap = lazy(() => import("@/features/nations/TalentMap").then((m) => ({ default: m.TalentMap })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/reporter") inner = <MatchReporter />;'
new = old + '\n  else if (path === "/nations") inner = <TalentMap />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/reporter", label: t("nav.reporter"), icon: I.broadsheet, match: ["/reporter"] },'''
new = old + '''
    { to: "/nations", label: t("nav.nations"), icon: I.signal, match: ["/nations"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "nat.title": "The Talent Map",
  "nat.subtitle": "Where the world's talent comes from — the nations by their best, their depth and their average.",
  "nat.tileStrongest": "Strongest nation",
  "nat.tileDeepest": "Deepest nation",
  "nat.tileAvg": "World average",
  "nat.bestN": "best {n} · {name}",
  "nat.playersN": "{n} players in the world",
  "nat.scaleN": "{n} nations · {p} players",
  "nat.board": "The nations, strongest first",
  "nat.boardHint": "Every nation the world carries a player from, ranked by its best overall.",
  "nat.rowLine": "{p} players · best {best} · avg {avg}",
  "nat.method": "A nation's best is its highest overall, its average the mean across everyone from it, and its depth the player count — all read from the world's own roster. Nations are the seed's own; a nation with one player is a name, not a depth.",
  "nat.none": "The world carries no players yet",
'''
zh = '''  "nat.title": "人才版图",
  "nat.subtitle": "世界的人才从哪里来——按最强、最厚与平均看的国籍版图。",
  "nat.tileStrongest": "最强国籍",
  "nat.tileDeepest": "最厚国籍",
  "nat.tileAvg": "世界平均",
  "nat.bestN": "最佳 {n} · {name}",
  "nat.playersN": "世界共 {n} 人",
  "nat.scaleN": "{n} 个国籍 · {p} 名球员",
  "nat.board": "国籍榜，最强者在前",
  "nat.boardHint": "世界里每一位球员的国籍，按该国最佳综合排序。",
  "nat.rowLine": "{p} 名球员 · 最佳 {best} · 平均 {avg}",
  "nat.method": "一国的最佳是其最高综合，平均是全体均值，厚度是球员人数——全部读自世界自己的名单。国籍是种子自带的；只有一名球员的国籍是一个名字，不是一种厚度。",
  "nat.none": "这个世界还没有球员",
'''
tw = '''  "nat.title": "人才版圖",
  "nat.subtitle": "世界的人才從哪裡來——按最強、最厚與平均看的國籍版圖。",
  "nat.tileStrongest": "最強國籍",
  "nat.tileDeepest": "最厚國籍",
  "nat.tileAvg": "世界平均",
  "nat.bestN": "最佳 {n} · {name}",
  "nat.playersN": "世界共 {n} 人",
  "nat.scaleN": "{n} 個國籍 · {p} 名球員",
  "nat.board": "國籍榜，最強者在前",
  "nat.boardHint": "世界裡每一位球員的國籍，按該國最佳綜合排序。",
  "nat.rowLine": "{p} 名球員 · 最佳 {best} · 平均 {avg}",
  "nat.method": "一國的最佳是其最高綜合，平均是全體均值，厚度是球員人數——全部讀自世界自己的名單。國籍是種子自帶的；只有一名球員的國籍是一個名字，不是一種厚度。",
  "nat.none": "這個世界還沒有球員",
'''
for anchor, block in [
    ('  "rep.v.prediction": "a claim about a match not yet played",', en),
    ('  "rep.v.prediction": "对尚未进行的比赛的断言",', zh),
    ('  "rep.v.prediction": "對尚未進行的比賽的斷言",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)
for anchor, val in [
    ('  "nav.reporter": "Match Reporter",', '  "nav.nations": "Talent Map",'),
    ('  "nav.reporter": "比赛记者",', '  "nav.nations": "人才版图",'),
    ('  "nav.reporter": "比賽記者",', '  "nav.nations": "人才版圖",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nat keys added")
