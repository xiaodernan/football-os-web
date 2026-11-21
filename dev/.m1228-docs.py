import io
p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()

old_head = "**当前HEAD**: 本提交落地后 `M1227` The Wheel-Direction Gate"
new_head = "**当前HEAD**: 本提交落地后 `M1228` The Stress Witness"
assert old_head in s, "head line not found"
s = s.replace(old_head, new_head, 1)

old_sec = "## M1227–M1206 · Latest ledger (newest first)"
new_sec = """## M1228–M1206 · Latest ledger (newest first)

- **M1228 The Stress Witness — 512 simulated visitors fold through the pure doors at once.** 从 `fos-m1228-storm` worktree 接手并收拢：`scripts/proof-storm.mjs`（13/13）把 512 个确定性设备队列（没耐心的单次访客、迷路的乱点者、忠实的回访者）同时折进同一批纯域门——并行折叠与串行折叠逐字节一致（无共享可变状态）；全部 512 个突发信封哈希到同一条内容派生的 24h 世界书缓存道（`PROMPT_CACHE_RETENTION === "24h"`）；512 个并发预测写入落进 512 个互不污染的每设备槽位，脉冲环零触碰；任何折叠都不打印 `NaN`/`Infinity`/`undefined`；LRU 缓存在满容量突发下逐值隔离。刻意种植（换道、错槽、缓存损坏）全部被charge。无任何真实模型调用、上游绝不拨号。未改一行应用代码：bundle 维持 855 KB / 117 assets。给证词加了 pid 隔离 cacheDir（沿用 1871de3 的 M1228 教训：共享 node_modules/.vite 锁会让并发构建把只读普查超时掉）。全电池 227/227 证词脚本（proof-i18n 普查读 227 个脚本、3934 条断言谓词、0 不可失败；proof-coverage 26/26、proof-app-tree 13/13 复核通过）。"""
assert old_sec in s, "ledger heading not found"
s = s.replace(old_sec, new_sec, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("status_report updated")

p2 = "PLAN-LONGTERM.md"
s2 = io.open(p2, encoding="utf-8").read()
lines = s2.rstrip("\n").split("\n")
lines.append("- M1228 The Stress Witness — 512 simulated visitors fold through the pure doors at once; proof-storm 13/13, taken over from the fos-m1228-storm worktree and landed on master; no app code changed (855 KB / 117 assets); battery 227/227.")
io.open(p2, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("plan updated")
