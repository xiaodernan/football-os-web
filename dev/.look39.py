import io
s = io.open("data/llm.ts", encoding="utf-8").read()
import re
for m in re.finditer(r"export (const|function|async function) (\w+)", s):
    print(m.group(0))
