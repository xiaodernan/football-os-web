import io
p = "tests/e2e/chair.spec.ts"
s = io.open(p, encoding="utf-8").read()
s = s.replace('await expect(page.getByText("Defence").first()).toBeVisible();', 'await expect(page.getByText("Defenders").first()).toBeVisible();')
s = s.replace('await expect(page.getByText("Midfield").first()).toBeVisible();', 'await expect(page.getByText("Midfielders").first()).toBeVisible();')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("spec labels fixed")
