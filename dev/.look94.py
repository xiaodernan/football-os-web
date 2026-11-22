import io
s = io.open("features/ops/Ops.tsx", encoding="utf-8").read()
i = s.find("ops.panel.trend")
print(s[max(0,i-400):i+2400])
