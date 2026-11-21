import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1234: the cliff — the squad depth board.
const SquadDepth = lazy(() => import("@/features/depth/SquadDepth").then((m) => ({ default: m.SquadDepth })));'''
new = old + '''
// M1235: the training desk — the seventeenth imprisoned door, the second that decides.
const TrainingDesk = lazy(() => import("@/features/desk/TrainingDesk").then((m) => ({ default: m.TrainingDesk })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/depth") inner = <SquadDepth />;'
new = old + '\n  else if (path === "/desk") inner = <TrainingDesk />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/depth", label: t("nav.depth"), icon: I.chart, match: ["/depth"] },'''
new = old + '''
    { to: "/desk", label: t("nav.desk"), icon: I.trek, match: ["/desk"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "desk.title": "The Training Desk",
  "desk.subtitle": "The model reads your player's dossier and prescribes the week — and a lawful prescription can be adopted straight into your plan.",
  "desk.dossierTitle": "{name} · the dossier in the desk's hands",
  "desk.dossierHint": "The six weakest attributes and the load zone the fold reads",
  "desk.noDossier": "Complete onboarding first — the desk prescribes from a real player's own vector.",
  "desk.ask": "Ask the desk",
  "desk.thinking": "The desk is reading the dossier…",
  "desk.noKey": "no model key — the fold's prescription is the answer",
  "desk.prompt": "Prescribe my training week from this dossier.",
  "desk.rxTitle": "The desk's prescription",
  "desk.rxHint": "Focus attributes and minutes, re-proved against the dossier.",
  "desk.refusedTitle": "The desk's answer was refused",
  "desk.refusedHint": "Every refusal speaks with the fold's own prescription instead — openly, never a copy of the model's.",
  "desk.foldTitle": "The fold's prescription",
  "desk.foldHint": "What the deterministic fold prescribes, whatever the model said.",
  "desk.foldMethod": "The three weakest attributes and the minutes the load zone can honestly carry — a spike week gets the short sharp session. Deterministic; the same dossier always answers the same.",
  "desk.focusLabel": "Focus",
  "desk.minutesN": "{n} minutes",
  "desk.adopt": "Adopt into my plan",
  "desk.adoptedDone": "Adopted",
  "desk.adoptedToast": "Prescription adopted — the plan is being built",
  "desk.adoptPrompt": "the training desk prescribed {focus} for {min} minutes",
  "desk.via.local": "The desk could not answer through the model, so the fold's own prescription speaks.",
  "desk.v.noDirective": "no RX/MIN directive",
  "desk.v.tooManyFocus": "more than three focuses",
  "desk.v.unknownAttribute": "an attribute outside the dossier",
  "desk.v.duplicateFocus": "a focus named twice",
  "desk.v.badMinutes": "an unsupported minutes value",
  "desk.v.offDossier": "a figure the dossier cannot carry",
  "desk.v.prediction": "futurology",
'''
zh = '''  "desk.title": "训练处方席",
  "desk.subtitle": "模型读你球员的档案开出一周的训练处方——合法的处方可以直接采纳进你的计划。",
  "desk.dossierTitle": "{name} · 交到处方席手里的档案",
  "desk.dossierHint": "六项最弱属性与折叠读取的负荷区间",
  "desk.noDossier": "请先完成新手引导——处方席只从真实球员自己的属性向量里开方。",
  "desk.ask": "问处方席",
  "desk.thinking": "处方席正在读档案……",
  "desk.noKey": "无模型密钥——答案由折叠给出",
  "desk.prompt": "从这份档案里开出我的一周训练处方。",
  "desk.rxTitle": "处方席的处方",
  "desk.rxHint": "训练焦点与分钟数，每一项都对着档案重新验过。",
  "desk.refusedTitle": "处方席的回答被拒",
  "desk.refusedHint": "每次拒绝都由折叠自己的处方公开代答——绝不是模型答案的翻版。",
  "desk.foldTitle": "折叠的处方",
  "desk.foldHint": "无论模型说了什么，确定性折叠都会开出自己的方子。",
  "desk.foldMethod": "三项最弱属性，加上负荷区间能诚实承载的分钟数——撞负荷的一周只开短而 sharp 的一课。确定性；同一份档案永远开出同一张方子。",
  "desk.focusLabel": "焦点",
  "desk.minutesN": "{n} 分钟",
  "desk.adopt": "采纳进我的计划",
  "desk.adoptedDone": "已采纳",
  "desk.adoptedToast": "处方已采纳——计划正在生成",
  "desk.adoptPrompt": "训练处方席开了 {focus}，{min} 分钟",
  "desk.via.local": "处方席无法通过模型作答，由折叠自己的处方代答。",
  "desk.v.noDirective": "没有 RX/MIN 指令行",
  "desk.v.tooManyFocus": "焦点超过三项",
  "desk.v.unknownAttribute": "档案之外的属性",
  "desk.v.duplicateFocus": "同一焦点点名两次",
  "desk.v.badMinutes": "不支持的分钟数",
  "desk.v.offDossier": "档案承载不了的数字",
  "desk.v.prediction": "预言",
'''
tw = '''  "desk.title": "訓練處方席",
  "desk.subtitle": "模型讀你球員的檔案開出一週的訓練處方——合法的處方可以直接採納進你的計畫。",
  "desk.dossierTitle": "{name} · 交到處方席裡面的檔案",
  "desk.dossierHint": "六項最弱屬性與摺疊讀取的負荷區間",
  "desk.noDossier": "請先完成新手引導——處方席只從真實球員自己的屬性向量裡開方。",
  "desk.ask": "問處方席",
  "desk.thinking": "處方席正在讀檔案……",
  "desk.noKey": "無模型密鑰——答案由摺疊給出",
  "desk.prompt": "從這份檔案裡開出我的一週訓練處方。",
  "desk.rxTitle": "處方席的處方",
  "desk.rxHint": "訓練焦點與分鐘數，每一項都對著檔案重新驗過。",
  "desk.refusedTitle": "處方席的回答被拒",
  "desk.refusedHint": "每次拒絕都由摺疊自己的處方公開代答——絕不是模型答案的翻版。",
  "desk.foldTitle": "摺疊的處方",
  "desk.foldHint": "無論模型說了什麼，確定性摺疊都會開出自己的方子。",
  "desk.foldMethod": "三項最弱屬性，加上負荷區間能誠實承載的分鐘數——撞負荷的一週只開短而 sharp 的一課。確定性；同一份檔案永遠開出同一張方子。",
  "desk.focusLabel": "焦點",
  "desk.minutesN": "{n} 分鐘",
  "desk.adopt": "採納進我的計畫",
  "desk.adoptedDone": "已採納",
  "desk.adoptedToast": "處方已採納——計畫正在生成",
  "desk.adoptPrompt": "訓練處方席開了 {focus}，{min} 分鐘",
  "desk.via.local": "處方席無法通過模型作答，由摺疊自己的處方代答。",
  "desk.v.noDirective": "沒有 RX/MIN 指令行",
  "desk.v.tooManyFocus": "焦點超過三項",
  "desk.v.unknownAttribute": "檔案之外的屬性",
  "desk.v.duplicateFocus": "同一焦點點名兩次",
  "desk.v.badMinutes": "不支持的分鐘數",
  "desk.v.offDossier": "檔案承載不了的數字",
  "desk.v.prediction": "預言",
'''
for anchor, block in [
    ('  "depth.none": "No club has two players yet",', en),
    ('  "depth.none": "还没有球队有两名球员",', zh),
    ('  "depth.none": "還沒有球隊有兩名球員",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)
for anchor, val in [
    ('  "nav.depth": "Squad Depth",', '  "nav.desk": "Training Desk",'),
    ('  "nav.depth": "阵容深度",', '  "nav.desk": "训练处方席",'),
    ('  "nav.depth": "陣容深度",', '  "nav.desk": "訓練處方席",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("desk keys added")
