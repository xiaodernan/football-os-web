import io, re
s = io.open("src/App.tsx", encoding="utf-8").read()
for m in re.finditer(r"<AppShell", s):
    print(s[max(0,m.start()-700):m.start()+200])
    print("=====")
