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
dups = {v: ks for v, ks in vals.items() if len(ks) > 1}
print("total dup values:", len(dups))
# which involve my new keys?
for v, ks in dups.items():
    if any(k.startswith(("con.", "keep.", "guide.", "teach.")) for k in ks):
        print("NEW-KEY DUP:", ks, "->", v[:110])
