import io, re
s = io.open("features/ops/Ops.tsx", encoding="utf-8").read()
i = s.find("fold")
m = re.search(r"const fold = [^;]+;", s)
print(m.group(0)[:400] if m else "not found")
i2 = s.find("import")
print(s[i2:i2+1500])
