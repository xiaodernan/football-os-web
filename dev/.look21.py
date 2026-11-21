import io, re
s = io.open("domain/analytics.ts", encoding="utf-8").read()
# find the enclosing export for line 4047
lines = s.split("\n")
for i in range(4046, 3900, -1):
    if "export" in lines[i]:
        print(i+1, "|", lines[i][:150]); break
# find where stopShare is consumed
for m in re.finditer(r"stopShare", s):
    ln = s[:m.start()].count("\n") + 1
    print("stopShare @", ln, "|", lines[ln-1][:120])
