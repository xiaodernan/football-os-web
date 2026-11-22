import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, block in [
    ('  "rep.foldMethod": "The score, the goalscorers in minute order, and the engine\'s tallies — folded from the fixture\'s own events. Deterministic; the same fixture always reads the same.",',
     '''  "rep.foldScore": "{home} {hg}-{ag} {away}.",
  "rep.foldGoals": "Goals: {list}.",
  "rep.foldNoGoals": "No goals were recorded.",
  "rep.foldTallies": "The engine recorded {shots} shots and {saves} saves.",'''),
    ('  "rep.foldMethod": "比分、按分钟排序的进球者、引擎的计数——全部折叠自这场比赛自己的事件。确定性；同一场比赛永远读出同一篇。",',
     '''  "rep.foldScore": "{home} {hg}-{ag} {away}。",
  "rep.foldGoals": "进球：{list}。",
  "rep.foldNoGoals": "没有进球记录。",
  "rep.foldTallies": "引擎记录 {shots} 次射门、{saves} 次扑救。",'''),
    ('  "rep.foldMethod": "比分、按分鐘排序的進球者、引擎的計數——全部摺疊自這場比賽自己的事件。確定性；同一場比賽永遠讀出同一篇。",',
     '''  "rep.foldScore": "{home} {hg}-{ag} {away}。",
  "rep.foldGoals": "進球：{list}。",
  "rep.foldNoGoals": "沒有進球記錄。",
  "rep.foldTallies": "引擎記錄 {shots} 次射門、{saves} 次撲救。",'''),
]:
    assert anchor in s, anchor[:50]
    s = s.replace(anchor, anchor + "\n" + block, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fold sentence keys added")
