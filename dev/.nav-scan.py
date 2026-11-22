import io, re
s = io.open("features/shell/AppShell.tsx", encoding="utf-8").read()
navs = re.findall(r'to: "(/[a-z-]+)", label: t\("nav\.([a-zA-Z]+)"\)', s)
print(len(navs), "nav entries")
print(" ".join(to for to, _ in navs))
