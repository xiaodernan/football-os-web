import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1229 The Teaching Hints — every module tile, the palette, the manual and the ops console wear a one-line lesson behind a \"?\"; domain/teachHint.ts + ui/TeachHint.tsx + proof-teachhint 11/11 + teach-hints E2E 3/3; storage/i18n/coverage/app-tree/pwa/router pins paid (bundle 855 -> 860 KB); MASTER-DIRECTIVE.md 固化用户 12 点总指令.")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1228` The Stress Witness"
new_head = "**当前HEAD**: 本提交落地后 `M1229` The Teaching Hints"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1228–M1206 · Latest ledger (newest first)"
new_sec = """## M1229–M1206 · Latest ledger (newest first)

- **M1229 The Teaching Hints — the main interface teaches itself.** 用户总指令第五条「主界面给各种按键和操作加上附带的教学说明」的兑现：`domain/teachHint.ts`（新，纯域）持有 25 条课程目录（22 个模块磁贴 + 指令面板 + 说明书 + 运营台）与已读账簿算术（markSeen 幂等且拒绝目录外 id、parseSeen 把损坏存储降解为干净账簿、unseenIds 补集按目录序）；`ui/TeachHint.tsx`（新）是「?」气泡——未读的轻轻脉冲、读了就安静，Esc/点外面关闭，aria-label 未读时播报「未读教学」；已读态写唯一存储键 `football-os.teachSeen.v1`（localData 注册为 preference——重置活动不清已读）。接线：Dashboard 22 个模块磁贴每贴一课（气泡在锚点**之外**——读教学绝不导航）、AppShell 顶栏搜索钮、Manual  hero、Ops 控制台、SettingsPage 新增「按键教学」行（未读计数 + 全部标为未读）。三语 25 条课程 + 9 个组件/设置键。`scripts/proof-teachhint.mjs`（新，11/11）：目录形状、账簿算术、localStorage 往返逐字节、22 贴接线且种植的「锚点内气泡」被拒、四屏同读一个目录、占位符三语一致。门禁：proof-i18n 453/453（literal 3760→3766、expression 70→71、computed 26→27、litVar 587→588、ariaKeyed 45→46、APP_SRC 226→228、TSX 116→117、SRC 229→231）、proof-storage 63/63（APP_FILES 224→225）、proof-coverage 26/26（POP 230→232、domain 91→92、ui 3→4）、proof-app-tree 13/13（229→231）、proof-router 29/29（221→222）、proof-pwa 4/4（bundle 855→860 KB 诚实步进 + baseline 重录）、proof-i18n-scan 1/1；tsc 0、build 0；E2E 新增 `teach-hints.spec.ts` 3/3（22 个未读「?」、点开教学不导航、Esc 关闭后计数 21、设置行 25 条未读与重置、顶栏 palette 教学），command-center + all-routes 94/94、ops 3/3 复跑绿。另：`docs/MASTER-DIRECTIVE.md`（新）把用户 2026-11-22 十二点总指令固化为治理计划；分支收拢完成（六个分支独有提交均为 0，M1228-storm worktree 成果已接手落地为 M1228）；大模型 API 当日实测 19/19（真实作答 8.5s、缓存二击 6ms、4 并发合并 1 次真调用、70k 上下文 ≈90% 命中）。环境注记：本机另有项目 dev server 抢占 CPU，proof 偶发变慢属环境竞争；Playwright chromium 1248 构建缺失已补装。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("plan + status updated")
