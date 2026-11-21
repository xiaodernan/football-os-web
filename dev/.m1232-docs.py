import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1232 The Congested Calendar — /congestion reads the distance between fixtures: per-club tightest/mean turnaround and crowded stretches; domain/congestion.ts + features/congestion/CongestedCalendar.tsx + proof-congestion 7/7 + congestion E2E 1/1; fixed a real sentence-duplicate the gate caught (nav vs screen title); all-routes 96/96; pins paid (bundle 865 -> 867 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1231` The Keepers' Union"
new_head = "**当前HEAD**: 本提交落地后 `M1232` The Congested Calendar"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1232–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1231–M1206 · Latest ledger (newest first)"
new_sec = """## M1232–M1206 · Latest ledger (newest first)

- **M1232 The Congested Calendar — 魔鬼赛程（/congestion）。** 内容流水线第三屏：此前每块榜读的都是比赛「内部」发生的事，没有一块读比赛「之间」的距离——一支周二周五连打的球队和一个周二踢完下周一再踢的球队，过的是两种赛季。`domain/congestion.ts`（新，纯折叠）——按开球时刻给每队算轮换：最小轮换、平均轮换（round2）、三天及以内的「密集轮换」计数；整天数向下取整（1 天 5 小时是 1 天不是 2 天）；读不懂的开球时刻是跳过的记录而不是纪元零点的日期；单场球队没有间距可读、不占行；排序最窄在前（minRest 升 → crowded 降 → 平均升 → id），世界平均走遍所有间隙。`features/congestion/CongestedCalendar.tsx`（新屏）——三块牌（最窄轮换 + 队名、世界平均 + 间隙数、密集段总数）+ 榜单（ crest + 队名 + 最窄天数 + 「f 场 · 平均 m天 · c 次密集轮换」+ 以最窄轮换为刻度的条）+ 诚实方法句。三语 12 键 + nav.congestion。`scripts/proof-congestion.mjs`（新，7/7）：手工对账世界（A 2/4.00/1、B 1/2.50/1、C 单场不占行、世界平均 3.25、4 个间隙）、整天数下取整、3 天边界精确（3 计入 4 不计）、空世界与坏开球、平局落到 id、屏幕键三语占位符 + 路由挂载。**真实缺陷一次**：初版 `con.title` 与 `nav.congestion` 同值「The Congested Calendar」（23 字符 ≥ 句子门 20 字符下限）撞「一句英文两个键」硬门，另有 `con.daysN` 的 `{n}d` 撞 dup-value 天花板——修法是把导航标签改短（Congestion / 赛程密度）、删 daysN 键改行内单位（与既有 `{minutes}′` 行内单位惯例一致）。门禁：proof-i18n 453/453（literal 3792→3806、litVar 593→595、APP_SRC 232→234、TSX 119→120、SRC 235→237；句子门与 dup 门修复后归位）、proof-storage 63/63（228→230）、proof-coverage 26/26（POP 236→238、domain 94→95、features 94→95、deep 110→111）、proof-app-tree 13/13（235→237）、proof-router 29/29（225→227）、proof-screens 32/32、proof-pwa 4/4（bundle 865→867 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E congestion 1/1 + all-routes 96/96。**视觉 QA（用户第五条）**：playwright 实拍六屏（landing / dashboard / manual / keepers / football / ops）逐张人查——无字体变形、无实体重叠、无可见错别字；manual 目录序号 1–7 完好（初判「序号丢失」实为快速巡览卡片遮挡造成的误读）；六屏均见 M1229 的「?」与 M1230 的巡览卡片在实战中正常工作。**io 页核对（用户第十条）**：GitHub API 实测 30 个关联仓库，逐一核实可见性后确认——页面「16 公开（14 原创 + 2 fork）+ 1 私有旗舰 + 1 在线产品」的仓库索引对**公开**仓库已完整准确，其余同名 404 项实为组织/同学私有仓库（viayuu、sustech-cs304 等 owner）而非用户项目，不应列；identity-guard 全绿。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
