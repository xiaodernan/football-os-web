import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1236 The Match Reporter — door 18, the one that writes the game: the model reports ONE real fixture with every numeral proved against that fixture's envelope (directive, fixture law, enforced length budget); domain/matchReporter.ts (pure; the fold's report is DATA worded by the screen — the domain-prose ceiling is zero) + features/reporter/MatchReporter.tsx + proof-matchreporter 8/8 + reporter E2E 1/1 + live witness 10/10 (REPORT:M1414 correct); all-routes 100/100; pins paid (bundle 878 -> 882 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1235` The Training Desk"
new_head = "**当前HEAD**: 本提交落地后 `M1236` The Match Reporter"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1236–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1235–M1206 · Latest ledger (newest first)"
new_sec = """## M1236–M1206 · Latest ledger (newest first)

- **M1236 The Match Reporter — 比赛记者（/reporter），第十八道禁闭门，会「写比赛』的那一道。** 用户第四条纵深：编年史从整卷磁带里封一章，这道为**一场**真实比赛写报道。`domain/matchReporter.ts`（新，纯域——屏幕传队名进来，不 import 数据层）——`sealFixture` 把一场带事件的完赛封成信封（比分、事件、24 个统计数字）；`REPORT:<id>` 指令行必须点名桌上那一场；信封数字法（比分/事件分钟/统计数字，外加世界书）；长度预算**真实执行**（超 900 字符拒，tooLong 码）；`foldReport` 返回**结构化数据**（比分、进球者分钟序、射门/扑救计数）——**域层零散文铁律**：初版在域层拼英文句子被 proof-i18n 的 domain-prose 门（ceiling 0）当场抓住，重构为「域出数据、屏幕用字典造句」（rep.foldScore/foldGoals/foldNoGoals/foldTallies 四句式键）。FSM 同门。`features/reporter/MatchReporter.tsx`（新屏）——桌上比赛（最新一场带事件完赛，byKickoff 确定性挑选）+ 写报道 + 模型报道与折叠报道并列 + 违规徽章 + 轨迹芯片。三语 25 键。`scripts/proof-matchreporter.mjs`（新，8/8）：信封封印（完赛+有事件，否则 null）、指令三态（对/错场/无）、信封数字法、折叠数据结构与确定性、无进球读空列表、预算执行、FSM 双臂。门禁：proof-i18n 457/457（literal 3870→3895、template 197→198、litVar 603→608、APP_SRC 240→242、TSX 123→124、SRC 243→245、SK_TEXT_CHILD_PIN 30→31（进球芯片的 map 读 e.type 经 filter，非裸码）；补 rep.v. 动态站点 + value space；rep.v.tooLong 从「声明未实现」补成真实执行；rep.via.local 重构后成死键已删；rep.v.prediction 与 desk.v.prediction 同句撞门——改为「对尚未进行的比赛的断言」）、proof-storage 63/63（236→238）、proof-coverage 26/26（POP 244→246、domain 98→99、features 98→99、deep 110→115）、proof-app-tree 13/13（243→245）、proof-router 29/29（233→235）、proof-screens 32/32、proof-pwa 4/4（bundle 878→882 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E reporter 1/1 + all-routes 100/100。**活体见证 10/10**（verify-reporter-live.mjs）：真实调用 200/9758ms，模型首行 `REPORT:M1414` 正确点名桌上比赛，311 字符全篇过信封数字法与预算，种植的错场与 987654 均被 charge，24h 道温热（cached=142529）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
