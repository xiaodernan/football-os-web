import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1235 The Training Desk — the seventeenth imprisoned door, the second that decides: the model prescribes a training week from ONE player's dossier, and adopting a lawful prescription feeds the real plan pipeline; domain/trainingDesk.ts + features/desk/TrainingDesk.tsx + proof-trainingdesk 8/8 + desk E2E 1/1 + live witness 10/10 (the model's three weakest for Saliba converged exactly with the fold's); all-routes 99/99; pins paid (bundle 874 -> 878 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1234` The Cliff"
new_head = "**当前HEAD**: 本提交落地后 `M1235` The Training Desk"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1235–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1234–M1206 · Latest ledger (newest first)"
new_sec = """## M1235–M1206 · Latest ledger (newest first)

- **M1235 The Training Desk — 训练处方席（/desk），第十七道禁闭门，第二道会做决定的门。** 用户第四条纵深：选人席点名十一人，这道开一周训练方。`domain/trainingDesk.ts`（新）——`RX:<attrKey>×≤3` + `MIN:<n>` 双指令行严格解析（七种违规码：无指令/超三项/重复/档案外属性/不支持分钟数/档案外数字/预言）；数字法（档案向量 + 世界书）；`foldRx` 折叠兜底（三项最弱属性 + 负荷区间分钟数：spike 30 / caution-high 45 / under-low 60 / optimal 45，五区到四区的映射在屏幕侧显式字典）；FSM 同门（preflight→build→model→precommit→commit 带处方 / refused 带折叠处方）。`features/desk/TrainingDesk.tsx`（新屏）——档案面板（玩家姓名 + 六项最弱属性 + 负荷区间）+ 问席 + 模型处方与折叠处方并列 + 违规徽章 + 轨迹芯片 + **「采纳进我的计划」按钮：合法处方直接喂入既有 `requestPlan` 计划管线（模型的分析落成真实训练计划，不是一段话）**。三语 28 键。`scripts/proof-trainingdesk.mjs`（新，8/8）：合法处方解析、五种违规逐码、数字法、折叠处方与确定性、四区分钟数、空档案、FSM 双臂、档案克隆。**纪律一刻**：证词首版的消息用 91、断言用 987654（digest 恰好含 91）——「报告与断言不一致」正是本项自禁的虚妄，已对齐。门禁：proof-i18n 456/456（literal 3842→3870、template 193→197、litVar 599→603、APP_SRC 238→240、TSX 122→123、SRC 241→243；补 desk.v. 动态站点 + value space（从域层联合类型读取）+ 两个 attr.name. 站点（k 表达式两处各一条）；漏定义的 desk.adopted 键补上；desk.v.prediction 与 chair.v.prediction 撞值差异化）、proof-storage 63/63（234→236）、proof-coverage 26/26（POP 242→244、domain 97→98、features 97→98、deep 110→114）、proof-app-tree 13/13（241→243）、proof-router 29/29（231→233）、proof-screens 32/32、proof-pwa 4/4（bundle 874→878 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E desk 1/1 + all-routes 99/99。**活体见证 10/10**（verify-desk-live.mjs）：真实调用 200/10897ms，模型给 William Saliba 开 `RX:set_pieces,crossing,first_touch / MIN:45`——**与折叠的三项最弱完全收敛**（模型真的读了档案的证据），散文过数字法，种植的幽灵属性与 47 分钟均被 charge，24h 道温热（cached=142529）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
