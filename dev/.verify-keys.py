import io
lines = io.open("i18n/dictionaries.ts", encoding="utf-8").read().split("\n")
for ln in [1007, 5675, 10235]:
    print(ln, "|", lines[ln-1].strip()[:70], "|| next:", lines[ln].strip()[:50])
