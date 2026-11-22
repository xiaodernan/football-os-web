import io, re
s = io.open("features/ops/Ops.tsx", encoding="utf-8").read()
m = re.search(r"const fold[^=]*=[^;]+;", s)
print(m.group(0)[:300] if m else "nf")
i = s.find("fold.trend")
print("...fold.trend used")
# find the pulse fold shape
p = io.open("domain/pulse.ts", encoding="utf-8").read()
j = p.find("export interface PulseFold")
print(p[j:j+900])
