import io, re
s = io.open("i18n/dictionaries.ts", encoding="utf-8").read()
for k in ["ops.trend.weekAvg", "ops.trend.slope", "ops.trend.forecastTitle", "ops.trend.method"]:
    for m in re.finditer(r'"' + re.escape(k) + r'": "([^"]*)"', s):
        print(k, "=>", m.group(1)[:80])
