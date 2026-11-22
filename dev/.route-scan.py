import io, re
s = io.open("src/App.tsx", encoding="utf-8").read()
routes = re.findall(r'path === "(/[a-z-]+)"', s)
print(len(routes), "routes")
