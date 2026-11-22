import io
lines = io.open("i18n/dictionaries.ts", encoding="utf-8").read().split("\n")
for ln in [5285, 5286, 5287, 5288, 5289]:
    print(ln, "|", lines[ln-1][:110])
print("---")
for ln in [10025, 10026, 10027, 10028, 10029]:
    print(ln, "|", lines[ln-1][:110])
