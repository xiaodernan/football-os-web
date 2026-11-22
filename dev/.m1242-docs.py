import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1242 The Dressing Room — door 20, the one that briefs the next match: the model briefs the dressing room on the next fixture's opponent from that opponent's OWN demonstrated season (record through the ladder's resultPoints door, last-five form, the danger), every numeral proved against the record, futurology refused; domain/dressingRoom.ts + features/dressing/DressingRoom.tsx + proof-dressingroom 7/7 + dressing E2E 1/1 + live witness 10/10 (BRIEF:juv correct); all-routes 103/103; pins paid (bundle 893 -> 898 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1241` The Ops Trend"
new_head = "**当前HEAD**: 本提交落地后 `M1242` The Dressing Room"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1242–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1241–M1206 · Latest ledger (newest first)"
new_sec = """## M1242–M1206 · Latest ledger (newest first)

- **M1242 The Dressing Room — 更衣室（/dressing），第二十道禁闭门，会「给下一场写简报』的那道。** 用户第四条纵深：比赛记者写的是已经踢完的比赛，这道为**下一场的对手**写更衣室简报——只从对手自己打出来的赛季里写。`domain/dressingRoom.ts`（新）——`opponentRecord` 从世界完赛折叠对手战绩（`creditRecord` + **`resultPoints` 走积分榜自己的门**，绝不自写 `points += 3`——M420 方言门会抓；证词首跑正是 points=0 抓住我第一版用了吃字母的 leaguePoints）、近五场字母、危险人物（综合最高球员）；`BRIEF:<id>` 指令必须点名桌上对手；记录数字法（战绩/综合 + 世界书）；**长度预算真实执行**；**预言拒绝**（模型只许描述对手已经做的事，对即将到来的比赛的断言拒——`next match|they are going to` 等未来时态）；`foldBrief` 返回结构化数据（域层零散文，屏幕造句）。FSM 同门 + `createDressing`（档案克隆）。`features/dressing/DressingRoom.tsx`（新屏）——对手三牌（战绩/进失球/危险人物）+ 近五场 + 问柜 + 模型简报与折叠简报并列 + 违规徽章 + 轨迹芯片 + **「最近读过的简报」本地记录**（DRESSING_KEY，localData 注册为 preference）。三语 26 键 + nav.dressing + set.key.dressing。`scripts/proof-dressingroom.mjs`（新，7/7）：手工对账对手（5 场 3W1D1L 9:5 10 分 WWDLW Palmer 85）、排定赛不是结果、无完赛读 null、指令三态、记录数字法、折叠数据结构与确定性、预算执行、FSM 双臂与无记录预检拒绝。门禁：proof-i18n 463/463（literal 3958→3991、template 203→204、litVar 619→625、APP_SRC 247→249、TSX 126→127、SRC 250→252；补 nav.dressing 漏键；dress.v. 动态站点 + value space；**tooLong 从「声明未建键」补成实现+键**；三处撞值差异化：overallN/playedN/briefing）、proof-storage 63/63（243→245）、proof-coverage 26/26（POP 251→253、domain 102→103、features 101→102、deep 110→118）、proof-app-tree 13/13（250→252）、proof-router 29/29（240→242）、proof-screens 32/32、proof-pwa 4/4（bundle 893→898 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E dressing 1/1 + all-routes 103/103。**活体见证 10/10**（verify-dressing-live.mjs）：真实调用 200/7178ms，模型首行 `BRIEF:juv` 正确点名桌上对手（尤文——世界完赛最多的俱乐部），385 字符全篇过记录数字法与预算，种植的错对手与 987654 均被 charge，24h 道温热（cached=142529）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
