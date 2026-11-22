import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1239 The Two-Cache Wire — the Spring cache-service live wire now reads BOTH caches' censuses (league summary + league tables) in parallel; scripts/llm-proxy.mjs + CacheObservatory dual panel + proof-cache-wire 15/15 (NEW, the wire's first offline proof — caught a real robustness defect: one leg's unparseable body took the whole probe down); bundle held at 889 KB.")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1238` The Transfer Broker"
new_head = "**当前HEAD**: 本提交落地后 `M1239` The Two-Cache Wire"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1239–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1238–M1206 · Latest ledger (newest first)"
new_sec = """## M1239–M1206 · Latest ledger (newest first)

- **M1239 The Two-Cache Wire — 双缓存活线。** 用户第三条（Spring/Redis/前后端协同）的运营可视化深化：cache-service 里有两个缓存（联赛摘要 + 联赛积分榜只读），活线此前只读摘要的 /stats——半块故事。`scripts/llm-proxy.mjs` 的 probeService 现在并行读取两个 /stats（各自 1.2s abort，墙钟是最慢的一条腿而非总和——与舰队探针同一条「界定阻塞」纪律），信封同时带 stats 与 tables；**每腿独立容错**：一条腿的 body 解析失败只把那一条读成 null，不炸掉整个探针（证词首跑抓到的真实鲁棒性缺陷）。`features/cache/CacheObservatory.tsx` 活线面板并排显示两个缓存的请求/命中/未命中/命中率/源回/合并普查。三语各 +2 标签键。`scripts/proof-cache-wire.mjs`（**新，15/15——这道活线的第一道离线证词**）：注入 fetch 记录器覆盖全部路径——未配置不拨号、health 503 即停、双缓存 200 双 census、**两腿并行**（峰值在途 2）、tables 腿 500 只空那一条、坏 body 只空那一条、AbortError→timeout、throw→unreachable、哨兵 URL 零回显、405/next()/GET 契约、Java 侧 /table/stats 路由真实存在、屏幕双 census 读写、.d.mts 对齐。门禁：proof-i18n 460/460（literal 3938→3941、litVar 616→617）、proof-llm 48/48（代理改动无漂移）、proof-cache-probe 9/9、proof-cache-parity 24/24、proof-screens 32/32、tsc 0、build 0、proof-pwa 4/4（**bundle 守在 889 KB 未动**）、cache E2E 1/1。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
