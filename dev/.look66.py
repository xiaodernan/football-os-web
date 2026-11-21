import io, re
s = io.open("store/useFootballOS.tsx", encoding="utf-8").read()
idx = [m.start() for m in re.finditer(r"requestPlan", s)]
print("occurrences:", len(idx))
i = idx[-1]
print(s[max(0,i-300):i+1700])
