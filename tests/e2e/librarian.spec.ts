import { test, expect } from "@playwright/test";

// M1181 · The Librarian — the keyless witness. CI runs without VITE_LLM_ENABLED on the
// preview server, so the section prints the frozen-manual note instead of an ask form.
// Either way the section must reach one of the two honest states, the manual must open
// and render its chapter doors, and the console should be clean.
test("the embedded manual opens with its seven doors and the librarian's honest arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/manual", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Football OS Manual" }).first()).toBeVisible({ timeout: 20000 });

  // Seven chapter anchors are on the page's side-rail of contents.
  for (const id of ["welcome", "modes", "explore", "epics", "spring", "honesty", "print"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }

  // The librarian section renders: either the armed button or the keyless note.
  const askBtn = page.getByRole("button", { name: "ask the librarian" });
  const askCount = await askBtn.count();
  const noteCount = await page.getByText(/asleep in this build/).count();
  expect(askCount + noteCount, "the librarian must render either the ask button or the keyless note, never neither").toBeGreaterThan(0);
  expect(errors, `console errors on /manual: ${errors.join(" || ")}`).toHaveLength(0);
});
