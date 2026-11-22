import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1235: the training desk — the seventeenth imprisoned door, the second that decides.
const TrainingDesk = lazy(() => import("@/features/desk/TrainingDesk").then((m) => ({ default: m.TrainingDesk })));'''
new = old + '''
// M1236: the match reporter — the eighteenth imprisoned door, the one that writes the game.
const MatchReporter = lazy(() => import("@/features/reporter/MatchReporter").then((m) => ({ default: m.MatchReporter })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/desk") inner = <TrainingDesk />;'
new = old + '\n  else if (path === "/reporter") inner = <MatchReporter />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/desk", label: t("nav.desk"), icon: I.trek, match: ["/desk"] },'''
new = old + '''
    { to: "/reporter", label: t("nav.reporter"), icon: I.broadsheet, match: ["/reporter"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "rep.title": "The Match Reporter",
  "rep.subtitle": "The model writes the report of one real fixture — and every numeral must come from that fixture's own envelope.",
  "rep.fixtureTitle": "{home} v {away} · the fixture on the desk",
  "rep.fixtureHint": "{n} recorded events the report may draw on",
  "rep.noFixture": "The world has no finished fixture with recorded events yet.",
  "rep.ask": "Write the report",
  "rep.writing": "The reporter is at the keyboard…",
  "rep.noKey": "no model key — the fold's report is the answer",
  "rep.prompt": "Write the report of this fixture.",
  "rep.reportTitle": "The reporter's report",
  "rep.reportHint": "Every figure re-proved against the fixture's envelope.",
  "rep.refusedTitle": "The reporter's copy was refused",
  "rep.refusedHint": "Every refusal speaks with the fold's own report instead — built from the very same events.",
  "rep.foldTitle": "The fold's report",
  "rep.foldScreenHint": "What the deterministic fold wrote while the model was thinking.",
  "rep.foldHint": "The fold's own report, whatever the model said.",
  "rep.foldMethod": "The score, the goalscorers in minute order, and the engine's tallies — folded from the fixture's own events. Deterministic; the same fixture always reads the same.",
  "rep.via.local": "The reporter could not answer through the model, so the fold's own report speaks.",
  "rep.v.noDirective": "no REPORT directive",
  "rep.v.wrongFixture": "the directive names another fixture",
  "rep.v.offFixture": "a figure the fixture cannot carry",
  "rep.v.prediction": "futurology",
'''
zh = '''  "rep.title": "比赛记者",
  "rep.subtitle": "模型为一场真实比赛写报道——每一个数字都必须来自那场比赛自己的信封。",
  "rep.fixtureTitle": "{home} v {away} · 交到记者手里的比赛",
  "rep.fixtureHint": "{n} 条已记录事件可供报道引用",
  "rep.noFixture": "这个世界还没有带事件记录的完赛。",
  "rep.ask": "写报道",
  "rep.writing": "记者正在敲字……",
  "rep.noKey": "无模型密钥——答案由折叠给出",
  "rep.prompt": "为这场比赛写一篇报道。",
  "rep.reportTitle": "记者的报道",
  "rep.reportHint": "每一个数字都对着比赛信封重新验过。",
  "rep.refusedTitle": "记者的稿子被拒",
  "rep.refusedHint": "每次拒绝都由折叠自己的报道公开代答——用同一批事件写成。",
  "rep.foldTitle": "折叠的报道",
  "rep.foldScreenHint": "模型思考时，确定性折叠已经写好的那一篇。",
  "rep.foldHint": "无论模型写了什么，折叠都有自己的那一篇。",
  "rep.foldMethod": "比分、按分钟排序的进球者、引擎的计数——全部折叠自这场比赛自己的事件。确定性；同一场比赛永远读出同一篇。",
  "rep.via.local": "记者无法通过模型作答，由折叠自己的报道代答。",
  "rep.v.noDirective": "没有 REPORT 指令行",
  "rep.v.wrongFixture": "指令行指向另一场比赛",
  "rep.v.offFixture": "比赛承载不了的数字",
  "rep.v.prediction": "预言",
'''
tw = '''  "rep.title": "比賽記者",
  "rep.subtitle": "模型為一場真實比賽寫報導——每一個數字都必須來自那場比賽自己的信封。",
  "rep.fixtureTitle": "{home} v {away} · 交到記者裡面的比賽",
  "rep.fixtureHint": "{n} 條已記錄事件可供報導引用",
  "rep.noFixture": "這個世界還沒有帶事件記錄的完賽。",
  "rep.ask": "寫報導",
  "rep.writing": "記者正在敲字……",
  "rep.noKey": "無模型密鑰——答案由摺疊給出",
  "rep.prompt": "為這場比賽寫一篇報導。",
  "rep.reportTitle": "記者的報導",
  "rep.reportHint": "每一個數字都對著比賽信封重新驗過。",
  "rep.refusedTitle": "記者的稿子被拒",
  "rep.refusedHint": "每次拒絕都由摺疊自己的報導公開代答——用同一批事件寫成。",
  "rep.foldTitle": "摺疊的報導",
  "rep.foldScreenHint": "模型思考時，確定性摺疊已經寫好的那一篇。",
  "rep.foldHint": "無論模型寫了什麼，摺疊都有自己的那一篇。",
  "rep.foldMethod": "比分、按分鐘排序的進球者、引擎的計數——全部摺疊自這場比賽自己的事件。確定性；同一場比賽永遠讀出同一篇。",
  "rep.via.local": "記者無法通過模型作答，由摺疊自己的報導代答。",
  "rep.v.noDirective": "沒有 REPORT 指令行",
  "rep.v.wrongFixture": "指令行指向另一場比賽",
  "rep.v.offFixture": "比賽承載不了的數字",
  "rep.v.prediction": "預言",
'''
for anchor, block in [
    ('  "desk.v.prediction": "a prediction about the future",', en),
    ('  "desk.v.prediction": "对未来的预言",', zh),
    ('  "desk.v.prediction": "對未來的預言",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)
for anchor, val in [
    ('  "nav.desk": "Training Desk",', '  "nav.reporter": "Match Reporter",'),
    ('  "nav.desk": "训练处方席",', '  "nav.reporter": "比赛记者",'),
    ('  "nav.desk": "訓練處方席",', '  "nav.reporter": "比賽記者",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("rep keys added")
