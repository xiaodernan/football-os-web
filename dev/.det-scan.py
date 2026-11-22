import io, re
s = io.open("features/football/Details.tsx", encoding="utf-8").read()
keys = re.findall(r't\("(det\.[a-zA-Z.]+)"\)', s)
from collections import Counter
for k, n in Counter(keys).most_common(24):
    print(k, n)
