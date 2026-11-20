import { expect, test } from "@playwright/test";

// M1221 · The Cross-Examination. Door 14's second model-driven edge: a second sealed shelf
// must carry the first shelf's claim. This offline witness refuses the transport (503) in both
// calls, so both graph edges must take their honest fallback arms — the first says the model
// was unreachable, the second marks the claim contested and lets the fold answer. No key is
// involved and no real model call is spent.
test("/cartographer cross-examination takes the contested arm when the transport refuses both calls", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    // The injected 503 is this spec's transport refusal, not an application defect.
    if (m.type() === "error" && !/503 \(Service Unavailable\)/.test(m.text())) errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));
  await page.route("**/api/llm/chat", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline cross-examination"}' }));

  await page.goto("/#/cartographer", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /the model chooses the lens/i }).click();
  await expect(page.getByText(/model unreachable — the fold answered from the shelves/i)).toBeVisible({ timeout: 20000 });

  const before = await page.locator("main [title]").count();
  await page.getByRole("button", { name: /cross-examine the claim/i }).click();
  await expect(page.getByText(/the second shelf cannot corroborate — the fold answers/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/The fold answers instead:/i)).toBeVisible({ timeout: 20000 });
  await expect(page.getByTitle(/the model abstained from cross-examination/i)).toBeVisible({ timeout: 20000 });

  const after = await page.locator("main [title]").count();
  expect(after).toBeGreaterThan(before);
  expect(errors).toHaveLength(0);
});
