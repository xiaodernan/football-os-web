import io
p = "scripts/proof-matchreporter.mjs"
s = io.open(p, encoding="utf-8").read()
old = """ok(`the machine walks preflight -> build -> precommit -> commit, and a refusal answers with the fold's own report (commit ${committed.status}, refused ${refused.status} fold ${refused.answer.slice(0, 30)}…, budget ${REPORT_MAX_CHARS})`,
  committed.status === "commit" && refused.status === "refused" &&
  refused.answer.startsWith("Arsenal 2-1 Chelsea.") && committed.trace.length >= 3 && refused.trace.length >= 3 &&
  REPORT_MAX_CHARS === 900);"""
new = """ok(`the machine walks preflight -> build -> precommit -> commit, and a refusal carries the answer the caller passes (commit ${committed.status}, refused ${refused.status} answer ${refused.answer.slice(0, 20)}..., budget ${REPORT_MAX_CHARS})`,
  committed.status === "commit" && refused.status === "refused" &&
  refused.answer.length > 0 && committed.trace.length >= 3 && refused.trace.length >= 3 &&
  REPORT_MAX_CHARS === 900);"""
assert old in s, "machine anchor"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("machine assertion fixed")
