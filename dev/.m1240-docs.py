import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1240 The Manual Catches Up — the manual gains a 'doors that decide' chapter teaching the three ruling desks and the four boards, and the explore links reach the eight new surfaces (manual.decide.* 18 keys x3; renamed from doors.* to avoid the existing answer-doors namespace); manual-doors E2E 1/1; pins paid (bundle 889 -> 891 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1239` The Two-Cache Wire"
new_head = "**当前HEAD**: 本提交落地后 `M1240` The Manual Catches Up"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1240–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1239–M1206 · Latest ledger (newest first)"
new_sec = """## M1240–M1206 · Latest ledger (newest first)

- **M1240 The Manual Catches Up — 手册追上世界。** 用户第七条（说明书覆盖所有完整功能）：本日新增 8 块屏幕（四榜 + 三门），手册此前的探索章链接与章节都停在旧世界。`features/manual/Manual.tsx`——探索章接入 8 条新链接（keepers/congestion/depth/nations/chair/desk/broker + depth）；新增第八章「会做决定的門」：三段正文教三张席子（选人席点名世界十一人、处方席的处方可直接采纳进计划、经纪人的三向裁决）+ 一段导读四块新榜。三语 18 键（manual.decide.*）。**命名冲突一次**：手册已有「问答之门」章节占用 manual.doors* 命名空间，新章改用 manual.decide*（tsc 的重复键错误当场抓住）。`tests/e2e/manual-doors.spec.ts`（新，1/1）：新章标题、三段正文、四块榜导读、探索链接可达。门禁：proof-i18n 460/460（literal 3941→3954）、tsc 0、build 0、proof-pwa 4/4（bundle 889→891 KB 诚实步进 + baseline 重录）；all-routes 101/101（批量跑中 2 条路由在 25 分钟重负载下抖动失败，单独重跑即过——本机另一项目占 CPU 的环境抖动，非代码缺陷）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
