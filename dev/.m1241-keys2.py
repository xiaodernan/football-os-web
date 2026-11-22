import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
zh = '''  "ops.trend.weekAvg": "七日均值 {n}",
  "ops.trend.slope": "本周 {p}%",
  "ops.trend.forecastTitle": "未来七日投影——序列自身动量的直线读数，不是模型的猜测",
  "ops.trend.advice.onboarding": "新手引导",
  "ops.trend.advice.onboarding.note": "{n}% 的会话直接跳出——首次运行引导与说明书需要更短的首训路径。",
  "ops.trend.advice.navigation": "导航发现",
  "ops.trend.advice.navigation.note": "平均深度 {n}——访客找不到模块网格；指令面板的教学说明应该把他们带过去。",
  "ops.trend.advice.content": "内容供给",
  "ops.trend.advice.content.note": "本周较上周读作 {n}%——最新的榜与门需要在着陆页占一行。",
  "ops.trend.advice.engagement": "参与度",
  "ops.trend.advice.engagement.note": "{n}% 的会话在同一批路由间打转——世界有广度，路牌没有。",
  "ops.trend.advice.healthy": "健康",
  "ops.trend.advice.healthy.note": "没有任何规则触发——本周均值 {n}，序列不携警告。",
  "ops.trend.method": "投影让七日均值沿本周斜率行走，下限为零；每条建议都触发于折叠自己的实测数字。没有历史就没有投影，也没有建议。",
'''
tw = '''  "ops.trend.weekAvg": "七日均值 {n}",
  "ops.trend.slope": "本週 {p}%",
  "ops.trend.forecastTitle": "未來七日投影——序列自身動量的直線讀數，不是模型的猜測",
  "ops.trend.advice.onboarding": "新手引導",
  "ops.trend.advice.onboarding.note": "{n}% 的會議直接跳出——首次執行引導與說明書需要更短的首訓路徑。",
  "ops.trend.advice.navigation": "導航發現",
  "ops.trend.advice.navigation.note": "平均深度 {n}——訪客找不到模組網格；指令面板的教學說明應該把他們帶過去。",
  "ops.trend.advice.content": "內容供給",
  "ops.trend.advice.content.note": "本週較上週讀作 {n}%——最新的榜與門需要在著陸頁佔一行。",
  "ops.trend.advice.engagement": "參與度",
  "ops.trend.advice.engagement.note": "{n}% 的會議在同一批路由間打轉——世界有廣度，路牌沒有。",
  "ops.trend.advice.healthy": "健康",
  "ops.trend.advice.healthy.note": "沒有任何規則觸發——本週均值 {n}，序列不攜警告。",
  "ops.trend.method": "投影讓七日均值沿本週斜率行走，下限為零；每條建議都觸發於摺疊自己的實測數字。沒有歷史就沒有投影，也沒有建議。",
'''
for anchor, block in [
    ('  "ops.panel.trend": "近 14 天访问",', zh),
    ('  "ops.panel.trend": "近 14 天訪問",', tw),
]:
    assert anchor in s, anchor[:40]
    line_end = s.find("\n", s.find(anchor))
    s = s[:line_end] + "\n" + block.rstrip("\n") + s[line_end:]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("zh + tw keys added")
