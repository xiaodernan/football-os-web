import io, re
code = io.open("features/reporter/MatchReporter.tsx", encoding="utf-8").read()
SK_CHILD_KIND = re.compile(r"\.(?:type|kind)\b")
# crude text-child finder: {...} directly after >
for m in re.finditer(r">\s*\{", code):
    i = m.end() - 1
    depth = 0
    j = i
    while j < len(code):
        if code[j] == "{": depth += 1
        elif code[j] == "}":
            depth -= 1
            if depth == 0: break
        j += 1
    inner = code[i+1:j].strip()
    if SK_CHILD_KIND.search(inner):
        print("TEXT CHILD:", inner[:120])
