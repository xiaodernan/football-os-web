import io
p = "PLAN-LONGTERM.md"
s = io.open(p, encoding="utf-8").read()
lines = s.rstrip("\n").split("\n")
lines.append("- M1238 The Transfer Broker — door 19, the one that prices a man: the model rules ACCEPT/REJECT/COUNTER on a real fee for the world's most valuable player, the money proved against the dossier, the fold ruling by real arithmetic (1.5x/0.8x/counter at 1.2x rounded); domain/broker.ts + features/broker/TransferBroker.tsx + proof-broker 7/7 (caught the unreachable badCode branch) + broker E2E 1/1 + live witness 10/10 (model ruled accept at 1.30x while the fold counters — an honest disagreement, the model's judgment as an independent input); all-routes 102/102; pins paid (bundle 884 -> 889 KB).")
io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")

p = "dev/status_report.md"
s = io.open(p, encoding="utf-8").read()
old_head = "**当前HEAD**: 本提交落地后 `M1237` The Talent Map"
new_head = "**当前HEAD**: 本提交落地后 `M1238` The Transfer Broker"
assert old_head in s
s = s.replace(old_head, new_head, 1)
old_sec = "## M1238–M1206 · Latest ledger (newest first)"
if old_sec not in s:
    old_sec = "## M1237–M1206 · Latest ledger (newest first)"
new_sec = """## M1238–M1206 · Latest ledger (newest first)

- **M1238 The Transfer Broker — 转会经纪人（/broker），第十九道禁闭门，会「给一个人定价』的那道。** 用户第四条纵深：选人席点名、处方席开方，这道**裁交易**——桌上摆着对世界最贵球员的报价，模型必须裁 ACCEPT / REJECT / COUNTER，还价必须带自己的金额。`domain/broker.ts`（新）——`RULING:` 指令行码按词读再查表（**证词抓到 badCode 不可达：旧正则只匹配三个合法码，未知码落进 noDirective——两种不同失败不该混为一谈，已放宽正则让 badCode 成为真实分支**）；counter 必须带 `FEE:<eur>`（缺失/零值拒）；交易数字法（身价/综合/年龄/桌上报价 + 世界书）；`foldRuling` 折叠算术（≥1.5x 接受、≤0.8x 拒绝、其间按身价 1.2x 取整到百万还价——**拒绝走的是一个数字，不是耸肩**）。FSM 同门。`features/broker/TransferBroker.tsx`（新屏）——交易三牌（身价/球员/桌上报价）+ 六档报价倍数切换 + 裁决徽章（三色）+ 模型与折叠并列 + 轨迹芯片。三语 27 键。`scripts/proof-broker.mjs`（新，7/7）：三种合法裁决、四种违规逐码、交易数字法、折叠算术五档对账（含 1.5x/0.8x 边界）、取整到百万与确定性、零身价/零报价预检拒绝、FSM 双臂。门禁：proof-i18n 460/460（literal 3911→3938、template 198→201、litVar 612→616、APP_SRC 244→246、TSX 125→126、SRC 247→249；三个动态站点 + 两个 value space（RULING_CODES 表与 BrokerViolation 联合，均从域层读取）；两处撞值差异化：brk.v.prediction 与 chair 的同句、brk.tileValue 与 compare 的同值）、proof-storage 63/63（240→242）、proof-coverage 26/26（POP 248→250、domain 100→101、features 100→101、deep 110→117）、proof-app-tree 13/13（247→249）、proof-router 29/29（237→239）、proof-screens 32/32、proof-pwa 4/4（bundle 884→889 KB 诚实步进 + baseline 重录）；tsc 0、build 0；E2E broker 1/1 + all-routes 102/102。**活体见证 10/10**（verify-broker-live.mjs）：真实调用 200/6361ms，对 Noah Roche（身价 399.8M）摆 520M（1.30x）报价——**模型裁 ACCEPT**（「1.3 倍已是强劲回报」，散文引用 520M/399.8M/22 岁/79 综合全是档案真实数字），**折叠算术要 COUNTER @ 480M**——两者诚实分歧，正证明模型的判断是独立输入而非算术的橡皮图；种植的未知码与 987654 均被 charge；24h 道温热（cached=142529）。
"""
assert old_sec in s
s = s.replace(old_sec, new_sec, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("docs updated")
