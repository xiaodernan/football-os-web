import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1233 The Selection Chair — the sixteenth imprisoned door, the first that DECIDES: the model names a World XI from the world's strongest sixty, every choice re-proved against the pool, refusals answered by the fold's own deterministic XI; domain/selectionChair.ts + features/chair/SelectionChair.tsx + proof-selectionchair 8/8 (caught a real double-count bug in the thin-squad fill) + chair E2E 1/1 + all-routes 97/97; pins paid (bundle 867 -> 871 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1232` The Congested Calendar"
new_head = "**当前HEAD**: 本提交落地后 `M1233` The Selection Chair"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1233–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1232–M1206 · Latest ledger (newest first)"
new_sec = """## M1233–M1206 · Latest ledger (newest first)

- **M1233 The Selection Chair — 选人席（/chair），第十六道禁闭门，第一道会「做决定」的门。** 用户总指令第四条「通过大模型的分析能力实现各种状态的流转和内容的输出」的纵深：此前的门都回答「问题」，这道门「拍板」——模型从世界最强的六十人里点名一支世界十一人。`domain/selectionChair.ts`（新）——`XI:<id>,…` 首行严格解析（十一人、一名门将、不重复、全在池内，六种违规码）；数字法（池内承载不了的数字拒、预言拒）；`foldXi` 折叠兜底（一门将 + 4-3-3 各线最佳，缺位由剩余最佳补齐，确定性）；`worldSquad` 池子用 digest 自己的 `byOverall` 比较器切前六十——门与卷宗永不失和；八组位置经 `chairLine` 经典映射到四线（GK/CB,FB→DEF/DM,CM,AM→MID/W,ST→ATT）。共享 tracedFsm：preflight（池能凑齐才放行）→ build → model → precommit → commit（带 selection）/ refused（带折叠的 XI 公开代答）。`features/chair/SelectionChair.tsx`（新屏）——池子面板（四线人数）+ 问席按钮 + 模型/折叠双 XI 分组展示 + 违规徽章 + 轨迹芯片 + 诚实标签。三语 26 键。`scripts/proof-selectionchair.mjs`（新，8/8）：合法 XI 解析、六种违规逐码、数字法、折叠 XI 与确定性、**薄弱阵容填充**、FSM 全程、八组映射、worldSquad 同比较器。**证词真抓到两个 bug**：① 薄弱阵容填充把「各线剩余」与「未选集合」相加，同一球员进 XI 两次；② 俱乐部门将池不可行——实测全世界 73 支球队只有 1 支能凑齐 11 人（阵容 7–11 人），改为世界最强六十的 World XI 设计（这也是 digest LEDGER 的天然延伸）。门禁：proof-i18n 454/454（literal 3806→3827、template 192→193、expression 74→77、litVar 595→596、APP_SRC 234→236、TSX 120→121、SRC 237→239；**新增 DYN_SITE + value space 声明** chair.v.|v 从域层联合类型读取；三处线标签撞值改 Defenders/Midfielders/Forwards）、proof-storage 63/63（230→232）、proof-coverage 26/26（POP 238→240、domain 95→96、features 95→96、deep 110→112）、proof-app-tree 13/13（237→239）、proof-router 29/29（227→229）、proof-screens 32/32、proof-pwa 4/4（bundle 867→871 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E chair 1/1 + all-routes 97/97。**测试卫生**：helpers 增 `dismissTour`——首次登录的快速巡览卡片（z-60）会物理遮挡主内容按钮，四个新屏 spec 统一先跳过巡览再点主内容（这是预期的首跑覆盖层，不是缺陷绕行）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
