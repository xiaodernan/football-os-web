import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()

en = '''  "con.title": "The Congested Calendar",
  "con.subtitle": "The turnaround each club's legs actually get — the distance between its fixtures.",
  "con.tileTight": "Tightest turn",
  "con.tileAvg": "World average",
  "con.tileCrowded": "Crowded stretches",
  "con.crowdedHint": "turns of three days or fewer",
  "con.gapsN": "{n} turnarounds walked",
  "con.daysN": "{n}d",
  "con.board": "The calendar, tightest first",
  "con.boardHint": "Every club with at least two fixtures, ranked by its tightest turnaround.",
  "con.rowLine": "{f} fixtures · avg {m}d · {c} tight turns",
  "con.method": "A turnaround is the whole days between two kickoff instants; a club with a single fixture has no spacing to read.",
  "con.none": "No club has two fixtures yet",
'''
zh = '''  "con.title": "魔鬼赛程",
  "con.subtitle": "每支球队的腿真正得到的轮换——比赛与比赛之间的距离。",
  "con.tileTight": "最窄轮换",
  "con.tileAvg": "世界平均",
  "con.tileCrowded": "密集段",
  "con.crowdedHint": "三天及以内的轮换",
  "con.gapsN": "共 {n} 个轮换",
  "con.daysN": "{n}天",
  "con.board": "赛程表，最窄在前",
  "con.boardHint": "每支至少有两场比赛的球队，按最窄轮换排序。",
  "con.rowLine": "{f} 场 · 平均 {m}天 · {c} 次密集轮换",
  "con.method": "轮换是两场开球时刻之间的整天数；只有一场比赛的球队没有间距可读。",
  "con.none": "还没有球队有两场比赛",
'''
tw = '''  "con.title": "魔鬼賽程",
  "con.subtitle": "每支球隊的腿真正得到的輪換——比賽與比賽之間的距離。",
  "con.tileTight": "最窄輪換",
  "con.tileAvg": "世界平均",
  "con.tileCrowded": "密集段",
  "con.crowdedHint": "三天及以內的輪換",
  "con.gapsN": "共 {n} 個輪換",
  "con.daysN": "{n}天",
  "con.board": "賽程表，最窄在前",
  "con.boardHint": "每支至少有兩場比賽的球隊，按最窄輪換排序。",
  "con.rowLine": "{f} 場 · 平均 {m}天 · {c} 次密集輪換",
  "con.method": "輪換是兩場開球時刻之間的整天數；只有一場比賽的球隊沒有間距可讀。",
  "con.none": "還沒有球隊有兩場比賽",
'''
for anchor, block in [
    ('  "keep.none": "No keepers yet",', en),
    ('  "keep.none": "还没有门将",', zh),
    ('  "keep.none": "還沒有門將",', tw),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)

for anchor, val in [
    ('  "nav.keepers": "Keepers\' Union",', '  "nav.congestion": "The Congested Calendar",'),
    ('  "nav.keepers": "门将工会",', '  "nav.congestion": "魔鬼赛程",'),
    ('  "nav.keepers": "門將工會",', '  "nav.congestion": "魔鬼賽程",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("con keys added")
