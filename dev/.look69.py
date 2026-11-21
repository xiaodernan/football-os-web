import io, re
s = io.open("features/player/PlayerOS.tsx", encoding="utf-8").read()
idx = [m.start() for m in re.finditer(r"requestPlan\(", s)]
print(s[max(0,idx[1]-1500):idx[1]+700])
