import io
s = io.open("lib/utils.ts", encoding="utf-8").read()
import re
for name in ["epochMs", "dayMs", "DAYS", "byKickoff", "kickoffMs"]:
    for m in re.finditer(r"export (const|function) " + name, s):
        ln = s[:m.start()].count("\n") + 1
        print(name, "@", ln, "|", s.split("\n")[ln-1][:120])
