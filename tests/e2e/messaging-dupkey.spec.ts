import { test, expect } from "@playwright/test";

// M1107 — regression guard for the duplicate-React-key warning on /messaging: the ring must not
// stack duplicate club keys. Walks the screen with a console listener and fails on that warning.
test("the messaging screen renders without the duplicate React key warning", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/#/messaging");
  await expect(page.getByRole("heading", { name: "The message pipeline" })).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500);
  const dupes = errors.filter((e) => e.includes("same key"));
  expect(dupes, `duplicate React key warnings: ${dupes.join(" | ") || "none"}`).toHaveLength(0);
});
