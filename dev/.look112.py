import io, re
s = io.open("features/football/FootballWorld.tsx", encoding="utf-8").read()
idx = [m.start() for m in re.finditer(r"MatchDetail", s)]
print("occurrences:", len(idx))
for i in idx[:4]:
    print("---", i)
    print(s[max(0,i-100):i+120].replace("\n", " ")[:200])
