import io
s = io.open("features/dashboard/Dashboard.tsx", encoding="utf-8").read()
i = s.find("dash.nextSteps")
if i < 0: i = s.find("nextSteps")
print(s[max(0,i-1200):i+200])
