import io
s = io.open("features/shell/AppShell.tsx", encoding="utf-8").read()
i = s.find("streaks")
print(s[max(0,i-700):i+200])
