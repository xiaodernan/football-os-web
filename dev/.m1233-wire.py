import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1232: the congested calendar — the fixture spacing board.
const CongestedCalendar = lazy(() => import("@/features/congestion/CongestedCalendar").then((m) => ({ default: m.CongestedCalendar })));'''
new = old + '''
// M1233: the selection chair — the sixteenth imprisoned door, the first that decides.
const SelectionChair = lazy(() => import("@/features/chair/SelectionChair").then((m) => ({ default: m.SelectionChair })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/congestion") inner = <CongestedCalendar />;'
new = old + '\n  else if (path === "/chair") inner = <SelectionChair />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/congestion", label: t("nav.congestion"), icon: I.calendar, match: ["/congestion"] },'''
new = old + '''
    { to: "/chair", label: t("nav.chair"), icon: I.curtains, match: ["/chair"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "chair.title": "The Selection Chair",
  "chair.subtitle": "The model names your starting XI — from this squad, and from nothing else.",
  "chair.squadTitle": "{club} · the squad in the chair's hands",
  "chair.squadHint": "{n} players the model may choose from",
  "chair.ask": "Ask the chair",
  "chair.asking": "The chair is thinking…",
  "chair.noKey": "no model key — the fold's XI is the answer",
  "chair.prompt": "Name my starting XI from this squad.",
  "chair.thinSquad": "This squad cannot fill an XI",
  "chair.xiTitle": "The chair's XI",
  "chair.xiHint": "Eleven names the model chose, re-proved against the squad.",
  "chair.refusedTitle": "The chair's answer was refused",
  "chair.refusedHint": "Every refusal speaks with the fold's own XI instead — openly, never a copy of the model's.",
  "chair.foldTitle": "The fold's XI",
  "chair.foldHint": "What the deterministic fold picks, whatever the model said.",
  "chair.foldMethod": "One keeper and a 4-3-3's worth of the best-rated outfielders; a thin squad fills the rest best-rated first. Deterministic — the same squad always answers the same.",
  "chair.via.local": "The chair could not answer through the model, so the fold's own XI speaks.",
  "chair.gk": "Keeper",
  "chair.def": "Defence",
  "chair.mid": "Midfield",
  "chair.att": "Attack",
  "chair.v.notEleven": "not eleven players",
  "chair.v.unknownPlayer": "a player outside the squad",
  "chair.v.noKeeper": "not exactly one keeper",
  "chair.v.duplicate": "a player named twice",
  "chair.v.offSquad": "a figure the squad cannot carry",
  "chair.v.prediction": "futurology",
'''
zh = '''  "chair.title": "选人席",
  "chair.subtitle": "模型来点名你的首发十一人——只能从这支阵容里选，别无其他。",
  "chair.squadTitle": "{club} · 交到选人席手里的阵容",
  "chair.squadHint": "模型可选的 {n} 名球员",
  "chair.ask": "问席",
  "chair.asking": "选人席正在思考……",
  "chair.noKey": "无模型密钥——答案由折叠给出",
  "chair.prompt": "从这支阵容里点名我的首发十一人。",
  "chair.thinSquad": "这套阵容凑不齐一支十一人队",
  "chair.xiTitle": "选人席的十一人",
  "chair.xiHint": "模型选出的十一个名字，每一个都对着阵容重新验过。",
  "chair.refusedTitle": "选人席的回答被拒",
  "chair.refusedHint": "每次拒绝都由折叠自己的十一人公开代答——绝不是模型答案的翻版。",
  "chair.foldTitle": "折叠的十一人",
  "chair.foldHint": "无论模型说了什么，确定性折叠都会给出自己的选择。",
  "chair.foldMethod": "一名门将加 4-3-3 所需的最佳外场球员；缺位的阵容由剩余最佳依次补齐。确定性——同一套阵容永远给出同一个答案。",
  "chair.via.local": "选人席无法通过模型作答，由折叠自己的十一人代答。",
  "chair.gk": "门将",
  "chair.def": "后卫",
  "chair.mid": "中场",
  "chair.att": "前锋",
  "chair.v.notEleven": "不是十一名球员",
  "chair.v.unknownPlayer": "阵容之外的球员",
  "chair.v.noKeeper": "门将不是恰好一名",
  "chair.v.duplicate": "同一球员点名两次",
  "chair.v.offSquad": "阵容承载不了的数字",
  "chair.v.prediction": "预言",
'''
tw = '''  "chair.title": "選人席",
  "chair.subtitle": "模型來點名你的首发十一人——只能從這支陣容裡選，別無其他。",
  "chair.squadTitle": "{club} · 交到選人手裡面的陣容",
  "chair.squadHint": "模型可選的 {n} 名球員",
  "chair.ask": "問席",
  "chair.asking": "選人席正在思考……",
  "chair.noKey": "無模型密鑰——答案由摺疊給出",
  "chair.prompt": "從這支陣容裡點名我的首發十一人。",
  "chair.thinSquad": "這套陣容湊不齊一支十一人隊",
  "chair.xiTitle": "選人席的十一人",
  "chair.xiHint": "模型選出的十一個名字，每一個都對著陣容重新驗過。",
  "chair.refusedTitle": "選人席的回答被拒",
  "chair.refusedHint": "每次拒絕都由摺疊自己的十一人公開代答——絕不是模型答案的翻版。",
  "chair.foldTitle": "摺疊的十一人",
  "chair.foldHint": "無論模型說了什麼，確定性摺疊都會給出自己的選擇。",
  "chair.foldMethod": "一名門將加 4-3-3 所需的最佳外場球員；缺位的陣容由剩餘最佳依次補齊。確定性——同一套陣容永遠給出同一個答案。",
  "chair.via.local": "選人席無法通過模型作答，由摺疊自己的十一人代答。",
  "chair.gk": "門將",
  "chair.def": "後衛",
  "chair.mid": "中場",
  "chair.att": "前鋒",
  "chair.v.notEleven": "不是十一名球員",
  "chair.v.unknownPlayer": "陣容之外的球員",
  "chair.v.noKeeper": "門將不是恰好一名",
  "chair.v.duplicate": "同一球員點名兩次",
  "chair.v.offSquad": "陣容承載不了的數字",
  "chair.v.prediction": "預言",
'''
for anchor, block in [
    ('  "con.none": "No club has two fixtures yet",', en),
    ('  "con.none": "还没有球队有两场比赛",', zh),
    ('  "con.none": "還沒有球隊有兩場比賽",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)
for anchor, val in [
    ('  "nav.congestion": "Congestion",', '  "nav.chair": "The Selection Chair",'),
    ('  "nav.congestion": "赛程密度",', '  "nav.chair": "选人席",'),
    ('  "nav.congestion": "賽程密度",', '  "nav.chair": "選人席",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("chair keys added")
