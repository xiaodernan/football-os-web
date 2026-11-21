import io
s = io.open("scripts/proof-i18n.mjs", encoding="utf-8").read()
import re
for m in re.finditer(r'\["attr\.name\.\|[^"]+",', s):
    ln = s[:m.start()].count("\n") + 1
    print(ln, "|", s.split("\n")[ln-1].strip()[:140])
