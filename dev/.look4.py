import io
s = io.open("src/App.tsx", encoding="utf-8").read()
i = s.find("AppShell")
j = s.find("AppShell", i+10)
print(s[max(0,j-900):j+300])
