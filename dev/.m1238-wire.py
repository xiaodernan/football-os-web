import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1237: the talent map — the world by nation.
const TalentMap = lazy(() => import("@/features/nations/TalentMap").then((m) => ({ default: m.TalentMap })));'''
new = old + '''
// M1238: the transfer broker — the nineteenth imprisoned door, the one that prices a man.
const TransferBroker = lazy(() => import("@/features/broker/TransferBroker").then((m) => ({ default: m.TransferBroker })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/nations") inner = <TalentMap />;'
new = old + '\n  else if (path === "/broker") inner = <TransferBroker />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/nations", label: t("nav.nations"), icon: I.signal, match: ["/nations"] },'''
new = old + '''
    { to: "/broker", label: t("nav.broker"), icon: I.curtains, match: ["/broker"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
en = '''  "brk.title": "The Transfer Broker",
  "brk.subtitle": "A fee is on the table for the world's most valuable player — rule ACCEPT, REJECT or COUNTER, with the money proved against the dossier.",
  "brk.dealTitle": "{player} · the deal on the table",
  "brk.dealHint": "The roster's own facts and the fee a buyer has put up",
  "brk.tileValue": "Market value",
  "brk.tilePlayer": "The player",
  "brk.tileFee": "Fee on the table",
  "brk.clubN": "of {club}",
  "brk.ageOvrN": "{age} years · {overall} overall",
  "brk.multipleN": "{n}x the value",
  "brk.feeLabel": "Fee",
  "brk.ask": "Rule on the deal",
  "brk.ruling": "Ruling",
  "brk.noKey": "no model key — the fold's ruling is the answer",
  "brk.prompt": "Rule on this transfer deal.",
  "brk.rulingTitle": "The broker's ruling",
  "brk.rulingHint": "One of three codes, the money re-proved against the dossier.",
  "brk.refusedTitle": "The broker's ruling was refused",
  "brk.refusedHint": "Every refusal rules with the fold's own arithmetic instead — a number, not a shrug.",
  "brk.foldTitle": "The fold's ruling",
  "brk.foldHint": "What the deterministic arithmetic rules, whatever the model said.",
  "brk.foldMethod": "The fee against the value: accept at 1.5x, reject at 0.8x, and between them a counter at value x 1.2 rounded to the million. Deterministic; the same deal always rules the same.",
  "brk.via.local": "The broker could not answer through the model, so the fold's own ruling speaks.",
  "brk.code.accept": "ACCEPT",
  "brk.code.reject": "REJECT",
  "brk.code.counter": "COUNTER",
  "brk.v.noDirective": "no RULING directive",
  "brk.v.badCode": "an unknown ruling code",
  "brk.v.missingFee": "a counter with no fee",
  "brk.v.offDeal": "a figure the deal cannot carry",
  "brk.v.prediction": "futurology",
'''
zh = '''  "brk.title": "转会经纪人",
  "brk.subtitle": "桌上摆着对世界最贵球员的报价——裁决接受、拒绝还是还价，金额对着档案重新验过。",
  "brk.dealTitle": "{player} · 桌上的交易",
  "brk.dealHint": "名单自己的事实与买家摆上的报价",
  "brk.tileValue": "市场身价",
  "brk.tilePlayer": "球员",
  "brk.tileFee": "桌上报价",
  "brk.clubN": "效力于 {club}",
  "brk.ageOvrN": "{age} 岁 · 综合 {overall}",
  "brk.multipleN": "身价的 {n} 倍",
  "brk.feeLabel": "报价",
  "brk.ask": "裁决这笔交易",
  "brk.ruling": "裁决中",
  "brk.noKey": "无模型密钥——答案由折叠给出",
  "brk.prompt": "裁决这笔转会交易。",
  "brk.rulingTitle": "经纪人的裁决",
  "brk.rulingHint": "三种代码之一，金额对着档案重新验过。",
  "brk.refusedTitle": "经纪人的裁决被拒",
  "brk.refusedHint": "每次拒绝都由折叠自己的算术公开代裁——给的是一个数字，不是耸肩。",
  "brk.foldTitle": "折叠的裁决",
  "brk.foldHint": "无论模型说了什么，确定性算术都会裁出同一个结果。",
  "brk.foldMethod": "报价对身价：1.5 倍接受，0.8 倍拒绝，其间按身价 1.2 倍取整到百万还价。确定性；同一笔交易永远裁出同一个结果。",
  "brk.via.local": "经纪人无法通过模型作答，由折叠自己的裁决代答。",
  "brk.code.accept": "接受",
  "brk.code.reject": "拒绝",
  "brk.code.counter": "还价",
  "brk.v.noDirective": "没有 RULING 指令行",
  "brk.v.badCode": "未知的裁决代码",
  "brk.v.missingFee": "还价却没有带金额",
  "brk.v.offDeal": "交易承载不了的数字",
  "brk.v.prediction": "预言",
'''
tw = '''  "brk.title": "轉會經紀人",
  "brk.subtitle": "桌上擺著對世界最貴球員的報價——裁接受、拒絕還是還價，金額對著檔案重新驗過。",
  "brk.dealTitle": "{player} · 桌上的交易",
  "brk.dealHint": "名單自己的事實與買家擺上的報價",
  "brk.tileValue": "市場身價",
  "brk.tilePlayer": "球員",
  "brk.tileFee": "桌上報價",
  "brk.clubN": "效力於 {club}",
  "brk.ageOvrN": "{age} 歲 · 綜合 {overall}",
  "brk.multipleN": "身價的 {n} 倍",
  "brk.feeLabel": "報價",
  "brk.ask": "裁這筆交易",
  "brk.ruling": "裁決中",
  "brk.noKey": "無模型密鑰——答案由摺疊給出",
  "brk.prompt": "裁這筆轉會交易。",
  "brk.rulingTitle": "經紀人的裁決",
  "brk.rulingHint": "三種程式碼之一，金額對著檔案重新驗過。",
  "brk.refusedTitle": "經紀人的裁決被拒",
  "brk.refusedHint": "每次拒絕都由摺疊自己的算術公開代裁——給的是一個數字，不是聳肩。",
  "brk.foldTitle": "摺疊的裁決",
  "brk.foldHint": "無論模型說了什麼，確定性算術都會裁出同一個結果。",
  "brk.foldMethod": "報價對身價：1.5 倍接受，0.8 倍拒絕，其間按身價 1.2 倍取整到百萬還價。確定性；同一筆交易永遠裁出同一個結果。",
  "brk.via.local": "經紀人無法通過模型作答，由摺疊自己的裁決代答。",
  "brk.code.accept": "接受",
  "brk.code.reject": "拒絕",
  "brk.code.counter": "還價",
  "brk.v.noDirective": "沒有 RULING 指令行",
  "brk.v.badCode": "未知的裁決程式碼",
  "brk.v.missingFee": "還價卻沒有帶金額",
  "brk.v.offDeal": "交易承載不了的數字",
  "brk.v.prediction": "預言",
'''
for anchor, block in [
    ('  "nat.none": "The world carries no players yet",', en),
    ('  "nat.none": "这个世界还没有球员",', zh),
    ('  "nat.none": "這個世界還沒有球員",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)
for anchor, val in [
    ('  "nav.nations": "Talent Map",', '  "nav.broker": "Transfer Broker",'),
    ('  "nav.nations": "人才版图",', '  "nav.broker": "转会经纪人",'),
    ('  "nav.nations": "人才版圖",', '  "nav.broker": "轉會經紀人",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("brk keys added")
