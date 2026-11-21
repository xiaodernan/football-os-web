import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1234 The Cliff — /depth reads the drop from each club's best player to its eleventh (squad depth, XI vs bench averages); domain/depth.ts + features/depth/SquadDepth.tsx + proof-depth 5/5 + depth E2E 1/1; all-routes 98/98; pins paid (bundle 871 -> 874 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1233` The Selection Chair"
new_head = "**当前HEAD**: 本提交落地后 `M1234` The Cliff"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1234–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1233–M1206 · Latest ledger (newest first)"
new_sec = """## M1234–M1206 · Latest ledger (newest first)

- **M1234 The Cliff — 断层榜（/depth）。** 内容流水线第四屏：此前的榜都排「最强」，这块量「落差」——从头牌到第十一名的综合距离，积分榜位置与伤病危机之间的距离。`domain/depth.ts`（新，纯折叠）——每队：阵容人数、头牌综合、十一人均值（round2）、替补均值（其余所有人，恰好十一人读 0 不除零）、断层（头牌 − 第十一名）；排序断层降序（平局看十一人均值降、再 id）；最陡/最浅两块磁贴的平局判据看替补厚度（同等断层、身后更薄的更浅）——保证两块磁卡尽量点名不同球队。`features/depth/SquadDepth.tsx`（新屏）——三块牌 + 榜单（断层为刻度条）+ 诚实方法句。三语 12 键。`scripts/proof-depth.mjs`（新，5/5）：手工对账（A 断层 10/十一人 85/替补 58.5，B 断层 10/75/0，C 单人不占行、世界平均 10）、恰好十一人读零替补不 NaN、空世界、平局落 id、屏幕键三语占位符 + 路由。门禁：proof-i18n 454/454（literal 3827→3842、litVar 596→599、APP_SRC 236→238、TSX 121→122、SRC 239→241；两处撞值修正：depth.tileAvg 与 con.tileAvg 同值改 Mean cliff、nav.depth 与 depth.title 同值改 Squad Depth）、proof-storage 63/63（232→234）、proof-coverage 26/26（POP 240→242、domain 96→97、features 96→97、deep 110→113）、proof-app-tree 13/13（239→241）、proof-router 29/29（229→231）、proof-screens 32/32、proof-pwa 4/4（bundle 871→874 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E depth 1/1 + all-routes 98/98。环境注记：dev server 长跑后 goto 偶发超时（本机另一项目占 CPU），重跑即过。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
