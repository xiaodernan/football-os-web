import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1241 The Ops Trend — the operator console's trend panel grows a forecast and advice: domain/opsTrend.ts projects the 7-day mean along the week's slope (clamped, UTC-labelled) and rules five advice codes on the fold's own measured numbers (an empty series prescribes NOTHING — the proof caught a zero depth reading as a low depth); proof-opstrend 9/9; ops E2E 3/3; pins paid (bundle 891 -> 893 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1240` The Manual Catches Up"
new_head = "**当前HEAD**: 本提交落地后 `M1241` The Ops Trend"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1241–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1240–M1206 · Latest ledger (newest first)"
new_sec = """## M1241–M1206 · Latest ledger (newest first)

- **M1241 The Ops Trend — 运营台趋势预测与优化建议。** 用户第九条点名要「分析和趋势预测，并根据这些数据给出下一步应该采取的深度优化措施」——潮汐面板此前只画 14 天柱状图说涨跌，不给预测也不给措施。`domain/opsTrend.ts`（新，纯折叠）——`trendRead`：七日均值、前窗均值、斜率（prevAvg 为 0 时读 0 不除零）；**投影**让七日均值沿斜率日行（下限零，UTC 步日，跨月跨年正确）；**建议**五条规则各触发于折叠自己的实测数字（bounce≥50→onboarding、depth<2→navigation、斜率≤-10→content、loop≥20→engagement、否则 healthy）。**空序列不处方**：证词的空臂抓到 depth=0 会被当成「低深度」误触发导航建议——没有数据的世界不该被劝修导航，已加守卫。`features/ops/Ops.tsx` 趋势面板——历史柱 + 虚线框投影柱（同尺度、明确标注「序列自身动量的直线读数，不是模型的猜测」）+ 建议列表（每条带它触发的数字）+ 方法句。三语 16 键。`scripts/proof-opstrend.mjs`（新，9/9）：手工对账双周（80/100/-20%）、投影七步算术、升/平两向、零前窗不除零、四条建议规则逐码、healthy、边界精确（50% 与 20% 触发、-9.99% 不触发）、空序列、nextDay 跨月跨年、静态键三语占位符 + 两个动态前缀的空间（10 个建议键）三语校验。门禁：proof-i18n 462/462（literal 3954→3958、template 201→203、litVar 617→619、APP_SRC 246→247、SRC 249→250；两个动态站点 + value space 从域层联合类型读取）、proof-storage 63/63（242→243）、proof-coverage 26/26（POP 250→251、domain 101→102）、proof-app-tree 13/13（249→250）、proof-router 29/29（239→240）、proof-screens 32/32、proof-pwa 4/4（bundle 891→893 KB 诚实步进 + baseline 重录）；tsc 0、build 0；ops E2E 3/3（首跑 1 条在 4 分钟重负载下抖动，页面实测渲染正常、零 console 错误，复跑即过——环境噪声如实记录）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
