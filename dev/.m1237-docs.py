import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1237 The Talent Map — /nations reads the world by nation: who supplies the most, who supplies the best, what the average side of a nation looks like; domain/nations.ts + features/nations/TalentMap.tsx + proof-nations 6/6 + nations E2E 1/1; all-routes 101/101; pins paid (bundle 882 -> 884 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1236` The Match Reporter"
new_head = "**当前HEAD**: 本提交落地后 `M1237` The Talent Map"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1237–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1236–M1206 · Latest ledger (newest first)"
new_sec = """## M1237–M1206 · Latest ledger (newest first)

- **M1237 The Talent Map — 人才版图（/nations）。** 内容流水线第五屏：此前的榜都排俱乐部和球员，没有一块问过「人才从哪里来」。`domain/nations.ts`（新，纯折叠）——按国籍读世界地理：球员人数、最佳综合及其姓名、均值（round2）；排序最佳降 → 人数降 → 国名；最强国籍/最厚国籍两块头条（后者的平局看最佳再国名）；世界总均值；空国籍是跳过的记录不是空行。`features/nations/TalentMap.tsx`（新屏）——三块牌 + 国籍榜（均值为刻度条）+ 诚实方法句。三语 13 键。`scripts/proof-nations.mjs`（新，6/6）：手工对账（Brazil 3/91/82.00、Spain 2/88/81.50、Japan 1/70/70.00、世界 79.83）、排序与两块头条、最佳球员姓名、空国籍与空世界、平局落国名、屏幕键三语占位符 + 路由。门禁：proof-i18n 457/457（literal 3895→3911、litVar 608→612、APP_SRC 242→244、TSX 124→125、SRC 245→247；nat.tileAvg 与 con.tileAvg 撞值改 The world's mean）、proof-storage 63/63（238→240）、proof-coverage 26/26（POP 246→248、domain 99→100、features 99→100、deep 110→116）、proof-app-tree 13/13（245→247）、proof-router 29/29（235→237）、proof-screens 32/32、proof-pwa 4/4（bundle 882→884 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E nations 1/1 + all-routes 101/101。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
