import { expect, test } from "@playwright/test";

// M1201 · The Frozen Diary — offline E2E; the artifact is committed, so the assertion is ironclad.
test("/frozen-diary renders the committed, fold-proved broadsheet", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/frozen-diary", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });

  // the meta row claims how many competitions the diary holds; no placeholder text tolerated
  await expect(page.getByText(/(15|quinze15|十五)\s*competitions|competitions? in the frozen diary/i).first()).toBeVisible({ timeout: 10000 });

  // fifteen competition entries — every competition in the frozen century is on the page
  const articles = page.locator("ol > li");
  expect(await articles.count()).toBe(15);

  expect(errors, `console errors on /frozen-diary: ${errors.join(" || ")}`).toHaveLength(0);
});
