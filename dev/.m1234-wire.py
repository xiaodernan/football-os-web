import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1233: the selection chair — the sixteenth imprisoned door, the first that decides.
const SelectionChair = lazy(() => import("@/features/chair/SelectionChair").then((m) => ({ default: m.SelectionChair })));'''
new = old + '''
// M1234: the cliff — the squad depth board.
const SquadDepth = lazy(() => import("@/features/depth/SquadDepth").then((m) => ({ default: m.SquadDepth })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/chair") inner = <SelectionChair />;'
new = old + '\n  else if (path === "/depth") inner = <SquadDepth />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/chair", label: t("nav.chair"), icon: I.curtains, match: ["/chair"] },'''
new = old + '''
    { to: "/depth", label: t("nav.depth"), icon: I.chart, match: ["/depth"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "depth.title": "The Cliff",
  "depth.subtitle": "The drop from a club's best player to its eleventh — the distance between a table position and an injury crisis.",
  "depth.tileSteep": "Steepest cliff",
  "depth.tileShallow": "Shallowest cliff",
  "depth.tileAvg": "World average",
  "depth.clubsN": "{n} clubs with a depth to read",
  "depth.cliffN": "cliff {n}",
  "depth.board": "The depth table, steepest first",
  "depth.boardHint": "Every club with at least two players, ranked by the cliff.",
  "depth.rowLine": "{s} in the squad · best {best} · XI avg {x} · bench avg {b}",
  "depth.method": "The cliff is the overall distance from a club's best player to its eleventh; the XI average is the best eleven's, the bench average everyone past them. A club whose squad IS the eleven reads a bench average of zero.",
  "depth.none": "No club has two players yet",
'''
zh = '''  "depth.title": "断层榜",
  "depth.subtitle": "从一支球队的头牌到第十一名之间的落差——积分榜位置与伤病危机之间的距离。",
  "depth.tileSteep": "最陡断层",
  "depth.tileShallow": "最浅断层",
  "depth.tileAvg": "世界平均",
  "depth.clubsN": "{n} 支有深度可读的球队",
  "depth.cliffN": "断层 {n}",
  "depth.board": "深度表，最陡在前",
  "depth.boardHint": "每支至少有两名球员的球队，按断层排序。",
  "depth.rowLine": "阵容 {s} 人 · 头牌 {best} · 十一人均值 {x} · 替补均值 {b}",
  "depth.method": "断层是球队头牌与第十一名的综合落差；十一人均值取最强十一人，替补均值取其余所有人。阵容恰好十一人的球队替补均值读零。",
  "depth.none": "还没有球队有两名球员",
'''
tw = '''  "depth.title": "斷層榜",
  "depth.subtitle": "從一支球隊的頭牌到第十一名之間的落差——積分榜位置與傷病危機之間的距離。",
  "depth.tileSteep": "最陡斷層",
  "depth.tileShallow": "最淺斷層",
  "depth.tileAvg": "世界平均",
  "depth.clubsN": "{n} 支有深度可讀的球隊",
  "depth.cliffN": "斷層 {n}",
  "depth.board": "深度表，最陡在前",
  "depth.boardHint": "每支至少有兩名球員的球隊，按斷層排序。",
  "depth.rowLine": "陣容 {s} 人 · 頭牌 {best} · 十一人均值 {x} · 替補均值 {b}",
  "depth.method": "斷層是球隊頭牌與第十一名的綜合落差；十一人均值取最強十一人，替補均值取其餘所有人。陣容恰好十一人的球隊替補均值讀零。",
  "depth.none": "還沒有球隊有兩名球員",
'''
for anchor, block in [
    ('  "chair.v.prediction": "futurology",', en),
    ('  "chair.v.prediction": "预言",', zh),
    ('  "chair.v.prediction": "預言",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)
for anchor, val in [
    ('  "nav.chair": "Selection Chair",', '  "nav.depth": "The Cliff",'),
    ('  "nav.chair": "选人",', '  "nav.depth": "断层榜",'),
    ('  "nav.chair": "選人",', '  "nav.depth": "斷層榜",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("depth keys added")
