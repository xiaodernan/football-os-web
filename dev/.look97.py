import io
s = io.open("i18n/dictionaries.ts", encoding="utf-8").read()
import re
for k in ["ops.trend.weekAvg", "ops.trend.slope", "ops.trend.forecastTitle", "ops.trend.method"]:
    n = len(re.findall(r'"' + re.escape(k) + r'":', s))
    print(k, "->", n, "occurrences")
