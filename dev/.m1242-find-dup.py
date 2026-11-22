import io, re
s = io.open("i18n/dictionaries.ts", encoding="utf-8").read()
lines = s.split("\n")
en_at = next(i for i, l in enumerate(lines) if l.startswith("const en: Dict"))
zh_at = next(i for i, l in enumerate(lines) if l.startswith("const zhCN: Dict"))
from collections import defaultdict
vals = defaultdict(list)
for i in range(en_at, zh_at):
    m = re.match(r'  "([^"]+)": "(.*)",', lines[i])
    if m:
        vals[m.group(2)].append(m.group(1))
for v, ks in vals.items():
    if len(ks) > 1 and any(k.startswith("dress.") or k == "nav.dressing" for k in ks):
        print("DUP:", ks, "->", v[:80])
