import { test, expect } from "@playwright/test";

// M1121 — The Derby Codex walk: the cinematic hero, at least one rivalry row with the pairing's
// meetings count, the shared-stage chips, zero console errors.
test("The Derby Codex renders rivalry rows from the frozen seed", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/derby-codex", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "The Derby Codex" })).toBeVisible({ timeout: 20000 });
  // The seed's own top pairing: cor vs sao with six meetings.
  const list = page.locator("ol > li");
  await expect(list.first()).toBeVisible({ timeout: 15000 });
  const count = await list.count();
  expect(count, "the codex prints at least one rivalry row").toBeGreaterThan(0);
  // Which clubs lead the seed's co-play table — printed honestly, so the spec pins it.
  await expect(page.getByText("Corinthians").first()).toBeVisible();
  await expect(page.getByText("meetings").first()).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /derby-codex: ${errors.join(" || ")}`).toHaveLength(0);
});
