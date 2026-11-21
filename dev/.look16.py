import io
s = io.open("domain/types.ts", encoding="utf-8").read()
print(s[:3500])
