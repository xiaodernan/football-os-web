import io
s = io.open("domain/tracedFsm.ts", encoding="utf-8").read()
import re
for m in re.finditer(r"export (const|function|type|interface) (\w+)", s):
    print(m.group(0))
