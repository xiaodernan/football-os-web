import io
# add the tooLong arm to the proof
p = "scripts/proof-matchreporter.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''// The machine: both arms, the fold's report carried on a refusal.'''
new = '''// The budget is real: a report past REPORT_MAX_CHARS is refused.
const long = "REPORT:fx-1 " + "x".repeat(REPORT_MAX_CHARS);
ok(`the budget is enforced — a report past ${REPORT_MAX_CHARS} characters is refused (${verifyReporterText(long, fx).includes("tooLong")})`,
  verifyReporterText(long, fx).includes("tooLong") && verifyReporterText("A short report.", fx).length === 0);

// The machine: both arms, the fold's report carried on a refusal.'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("budget arm added")
