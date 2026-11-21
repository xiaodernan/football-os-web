import io
p = "tests/e2e/teach-hints.spec.ts"
s = io.open(p, encoding="utf-8").read()
old = '''  // Fresh device: every lesson is unread, so every "?" announces itself as an unread lesson.
  const hints = page.getByRole("button", { name: "Unread lesson" });
  await expect(hints).toHaveCount(22);'''
new = '''  // Fresh device: every lesson is unread, so every "?" announces itself as an unread lesson.
  // Scoped to the main board: the palette trigger in the header wears one of its own.
  const hints = page.locator("main").getByRole("button", { name: "Unread lesson" });
  await expect(hints).toHaveCount(22);'''
assert old in s
s = s.replace(old, new, 1)

old2 = '''  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Unread lesson" })).toHaveCount(21);
  await expect(page.getByRole("button", { name: "What is this?" })).toHaveCount(1);'''
new2 = '''  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(hints).toHaveCount(21);
  await expect(page.locator("main").getByRole("button", { name: "What is this?" })).toHaveCount(1);'''
assert old2 in s
s = s.replace(old2, new2, 1)

old3 = '''  const paletteHint = page.getByRole("button", { name: "Unread lesson" }).last();'''
new3 = '''  const paletteHint = page.locator("header").getByRole("button", { name: "Unread lesson" });'''
assert old3 in s
s = s.replace(old3, new3, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("spec scoped")
