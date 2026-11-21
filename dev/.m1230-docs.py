import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1230 The First-Run Guide — six coach-marks walk a new visitor across the board once; domain/firstRunGuide.ts + ui/FirstRunGuide.tsx (non-modal, click-through) + proof-firstrunguide 10/10 + first-run-guide E2E 2/2; replay from the palette and the settings row, synced across surfaces without a reload; storage/i18n/coverage/app-tree/router pins paid (bundle 860 -> 863 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1229` The Teaching Hints"
new_head = "**当前HEAD**: 本提交落地后 `M1230` The First-Run Guide"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1229–M1206 · Latest ledger (newest first)"
new_sec = """## M1230–M1206 · Latest ledger (newest first)

- **M1230 The First-Run Guide — 新用户首次落板即有六站教练-mark 走读。** 用户总指令第七条「新用户要有简单的新手教程、快速上手演示」的兑现：`domain/firstRunGuide.ts`（新，纯域）——六步表（welcome → 已排好的下一步 → 22 扇模块门 → 指令面板 → 三种身份 → 说明书出口）、状态算术（advance 走过末步即完成而非掉出表尾、back 有界、skip 保步完成、parseTour 把损坏存储降解为初态）与 `tourProgress` 1 基计数；`ui/FirstRunGuide.tsx（新）——聚光灯环框住当步控件（box-shadow 雕洞），卡片在环下/居中，Esc 或 Skip 永久关闭。**非模态**：变暗与聚光灯是视觉，页面照常可点——「教不动的教程是监狱不是教程」，这一决策是 E2E 批量跑时暴露的真实问题（全模态浮层挡住首次落板后的所有交互）驱动的修复。进度写唯一键 `football-os.tour.v1`（localData 注册为 preference）。重放入口两处：设置页「按键教学」行 + 指令面板动作（任意屏幕触发、落板即演）；guide 单例随路由变化与 storage 事件重读该键——同标签页的存储写不触发任何实例的 React 状态，不加这段同步，重放要刷新页面才生效（E2E 抓到的真实 bug）。`scripts/proof-firstrunguide.mjs`（新，10/10）：表形状与三语占位符、可见性精确性、走读/回退/跳过算术、损坏存储降解、localStorage 往返、锚点接线（next-steps/modules/palette/modes 四锚 + 单例挂载一次）、双重重放入口、存储注册；两处零断言子句按普查规则补正向 pin（`TOUR_STEPS.length >= 6`）并去 OR 组合。门禁：proof-i18n 453/453（literal 3766→3776、expression 71→74、litVar 588→589、ariaKeyed 46→47、APP_SRC 228→230、TSX 117→118、SRC 231→233、excess-key 271→272、POOL_FIELDS 增 bodyKey、KEY_ROW_CONSUMERS 注册 titleKey/bodyKey 渲染器）、proof-storage 63/63（225→226）、proof-coverage 26/26（POP 232→234、domain 92→93、ui 4→5）、proof-app-tree 13/13（231→233）、proof-router 29/29（222→223）、proof-pwa 4/4（bundle 860→863 KB 诚实步进 + baseline 重录）、proof-i18n-scan 1/1；tsc 0、build 0；E2E 新增 first-run-guide 2/2（自动开演、步进/回退、Skip 后刷新不重现、设置行重放），teach-hints/ops/command-center 复跑绿，all-routes 94/94（/football 一例 Page crashed 为机器内存压力的环境抖动，单独重跑即过）。修复记录：① SettingsPage import 被脚本二次替换损坏（TEACH_SEEN_KEY 丢失 + initialTour 未调用）——tsc 抓出；② guide 同标签页不同步——E2E 抓出后加路由/storage 重读；③ 全模态挡交互——批量 E2E 抓出后改非模态。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
