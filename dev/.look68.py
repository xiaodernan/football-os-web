import io, re
s = io.open("features/player/PlayerOS.tsx", encoding="utf-8").read()
idx = [m.start() for m in re.finditer(r"requestPlan", s)]
print("occurrences:", len(idx))
if idx:
    print(s[max(0,idx[0]-600):idx[0]+500])
