import io
p = "tests/e2e/broker.spec.ts"
s = io.open(p, encoding="utf-8").read()
old = '''  await expect(page.getByText("Market value").first()).toBeVisible();'''
new = '''  await expect(page.getByText("The world's valuation").first()).toBeVisible();'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("spec label updated")
