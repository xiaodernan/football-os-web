import io
p = "features/congestion/CongestedCalendar.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''                    <span className="ml-auto shrink-0 font-mono font-semibold text-primary">{t("con.daysN", { n: r.minRest })}</span>'''
new = '''                    <span className="ml-auto shrink-0 font-mono font-semibold text-primary">{r.minRest}d</span>'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen updated")
