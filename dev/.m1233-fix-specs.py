import io
p = "tests/e2e/helpers.ts"
s = io.open(p, encoding="utf-8").read()
old = '''// The onboarding walk every spec starts from: the visitor picks Player, names themself, picks
// striker and first-touch, skips the favourites and enters. Written once so a change to the
// flow is one edit, not four.'''
new = '''// M1230/M1233: a fresh device's first landing opens the first-run guide, whose card can sit over
// the board and intercept a click on the control underneath it. Specs that click main content
// dismiss it first — the tour is a known first-run overlay, not a defect to route around.
export async function dismissTour(page: Page) {
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.count() > 0) await skip.click();
  await expect(page.getByRole("dialog", { name: "Welcome to Football OS" })).toHaveCount(0);
}

// The onboarding walk every spec starts from: the visitor picks Player, names themself, picks
// striker and first-touch, skips the favourites and enters. Written once so a change to the
// flow is one edit, not four.'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("helper added")

for path, anchor in [
    ("tests/e2e/chair.spec.ts", '  await page.goto("/#/chair");'),
    ("tests/e2e/keepers.spec.ts", '  await page.goto("/#/keepers");'),
    ("tests/e2e/congestion.spec.ts", '  await page.goto("/#/congestion");'),
    ("tests/e2e/teach-hints.spec.ts", '  await completeOnboarding(page, "Teach Visitor");'),
]:
    s = io.open(path, encoding="utf-8").read()
    if "dismissTour" in s:
        continue
    s = s.replace('import { completeOnboarding } from "./helpers";',
                  'import { completeOnboarding, dismissTour } from "./helpers";', 1)
    if path.endswith("teach-hints.spec.ts"):
        # the first test needs the "?"s visible; dismiss after landing on the board
        s = s.replace('''  await completeOnboarding(page, "Teach Visitor");

  // Fresh device: every lesson is unread''', '''  await completeOnboarding(page, "Teach Visitor");
  await dismissTour(page);

  // Fresh device: every lesson is unread''', 1)
    else:
        s = s.replace(anchor, anchor + '\n  await dismissTour(page);', 1)
    io.open(path, "w", encoding="utf-8", newline="\n").write(s)
    print("dismissed in", path)
