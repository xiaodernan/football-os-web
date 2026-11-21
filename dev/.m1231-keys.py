import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()

en = '''  "keep.title": "The Keepers' Union",
  "keep.subtitle": "Every club's number one, and the wall they stand behind.",
  "keep.tileBest": "Best keeper",
  "keep.tileWall": "Best wall",
  "keep.tileCount": "Keepers",
  "keep.overallN": "{n} overall",
  "keep.rateN": "{n}% clean",
  "keep.clubsN": "{n} clubs",
  "keep.board": "The number ones",
  "keep.boardHint": "One keeper per club — its highest-rated goalkeeper — with the club's own clean-sheet record beside him.",
  "keep.rowLine": "{p} played · {c} clean · {r}%",
  "keep.method": "Clean sheets are the club's defensive record, folded from the world's finished fixtures; the keeper named is the side's highest-rated goalkeeper.",
  "keep.none": "No keepers yet",
'''
zh = '''  "keep.title": "门将工会",
  "keep.subtitle": "每家的头号门将，和他们身后的那堵墙。",
  "keep.tileBest": "最佳门将",
  "keep.tileWall": "最佳零封",
  "keep.tileCount": "门将总数",
  "keep.overallN": "综合 {n}",
  "keep.rateN": "零封率 {n}%",
  "keep.clubsN": "{n} 家俱乐部",
  "keep.board": "各家门将",
  "keep.boardHint": "每队一门——综合最高的门将——旁边是该队自己的零封记录。",
  "keep.rowLine": "出场 {p} · 零封 {c} · {r}%",
  "keep.method": "零封是俱乐部的防守记录，折叠自世界已结束的赛事；点名的门将是该队综合最高的门将。",
  "keep.none": "还没有门将",
'''
tw = '''  "keep.title": "門將工會",
  "keep.subtitle": "每家的頭號門將，和他們身後的那堵牆。",
  "keep.tileBest": "最佳門將",
  "keep.tileWall": "最佳零封",
  "keep.tileCount": "門將總數",
  "keep.overallN": "綜合 {n}",
  "keep.rateN": "零封率 {n}%",
  "keep.clubsN": "{n} 家俱樂部",
  "keep.board": "各家門將",
  "keep.boardHint": "每隊一門——綜合最高的門將——旁邊是該隊自己的零封記錄。",
  "keep.rowLine": "出場 {p} · 零封 {c} · {r}%",
  "keep.method": "零封是俱樂部的防守紀錄，摺疊自世界已結束的賽事；點名的門將是該隊綜合最高的門將。",
  "keep.none": "還沒有門將",
'''
for anchor, block in [
    ('  "guide.manual.body": "The operating manual explains every screen in your language, and the world tour shows you the leagues themselves. Enjoy the world.",', en),
    ('  "guide.manual.body": "使用说明书用你的语言讲清每个界面，世界巡礼带你亲历各联赛。享受这个世界吧。",', zh),
    ('  "guide.manual.body": "使用說明書用你的語言講清每個介面，世界巡禮帶你親歷各聯賽。享受這個世界吧。",', tw),
]:
    assert anchor in s, anchor[:60]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)

for anchor, val in [
    ('  "nav.streaks": "Runs",', '  "nav.keepers": "Keepers\' Union",'),
    ('  "nav.streaks": "连胜纪录",', '  "nav.keepers": "门将工会",'),
    ('  "nav.streaks": "連勝紀錄",', '  "nav.keepers": "門將工會",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("keep keys added")
