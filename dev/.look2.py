import io
s = io.open("features/dashboard/Dashboard.tsx", encoding="utf-8").read()
i = s.find("dash.next")
print(s[max(0,i-900):i+300])
