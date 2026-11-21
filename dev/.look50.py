import io
s = io.open("data/deepDigest.ts", encoding="utf-8").read()
import re
for m in re.finditer(r"byOverall", s):
    ln = s[:m.start()].count("\n") + 1
    print(ln, "|", s.split("\n")[ln-1].strip()[:120])
