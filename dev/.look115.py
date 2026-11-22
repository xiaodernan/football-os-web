import io
s = io.open("features/ops/Ops.tsx", encoding="utf-8").read()
i = s.find("ops.tide.forecast")
print(s[max(0,i-500):i+300])
