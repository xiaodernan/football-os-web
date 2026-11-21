import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1231 The Keepers' Union — /keepers names each club's number one with the club's own clean-sheet record read from the shared leagueWall fold; domain/keepers.ts + features/keepers/KeepersUnion.tsx + proof-keepers 8/8 + keepers E2E 1/1; all-routes auto-covers the new route; i18n/storage/coverage/app-tree/router/pwa pins paid (bundle 863 -> 865 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1230` The First-Run Guide"
new_head = "**当前HEAD**: 本提交落地后 `M1231` The Keepers' Union"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1231–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1230–M1206 · Latest ledger (newest first)"
new_sec = """## M1231–M1206 · Latest ledger (newest first)

- **M1231 The Keepers' Union — 门将工会（/keepers）。** 用户总指令第六条「不断加新东西」的又一屏：领袖榜此前的 wall 板块只排俱乐部的零封记录，从没点名站在门后的人。`domain/keepers.ts`（新，纯折叠）——每队的头号门将（综合最高，平局看 potential 再看 id 的全序比较器），零封数字**不重扫赛程**：直接读共享的 `leagueWall` 折叠（领袖榜 wall 板块打印的同一个），两块屏幕永不失和；`bestWall` 只认至少零封过一场的队（没墙可谈的队不参评）；空世界/无门将/无零封三种边界读空值不崩。`features/keepers/KeepersUnion.tsx`（新屏）——三块牌（最佳门将姓名+综合、最佳墙俱乐部+零封率、门将总数+俱乐部数）+ 各家门将榜（ crest + 姓名 + 俱乐部 + 综合 + 「出场 p · 零封 c · r%」+ 零封率条）+ 诚实方法句（零封是俱乐部的防守记录；点名的门将是该队综合最高的）。三语 13 键 + nav.keepers。`scripts/proof-keepers.mjs`（新，8/8）：手工对账世界（A 2/2 @100%、B 1/2 @50%、C 无门将不占行）、共享墙逐字段相等（防二次扫描漂移）、排序与两个头条读法、三种空边界、平局全序（potential → id）、屏幕键三语占位符一致 + 路由挂载。门禁：proof-i18n 453/453（literal 3776→3792、litVar 589→589+4=593、APP_SRC 230→232、TSX 118→119、SRC 233→235）、proof-storage 63/63（226→228：domain/keepers.ts + features/keepers/KeepersUnion.tsx 都在八目录 scope 内——首轮按 227 付被实测纠偏，storage scope 含 features）、proof-coverage 26/26（POP 234→236、domain 93→94、features 93→94、deep 109→110）、proof-app-tree 13/13（233→235）、proof-router 29/29（223→225）、proof-screens 32/32、proof-pwa 4/4（bundle 863→865 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E keepers 1/1 + all-routes 95/95（新路由自动入网）。教训：leagueWall 签名收 `Match[]` 不收 readonly，domain 折叠对齐代码库签名而非自创。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
