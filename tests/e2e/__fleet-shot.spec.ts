import { expect, test } from "@playwright/test";

// One-off witness shot for M1104: the /platform fleet probe against the real local
// football-os-cache (UP on 8083) with the other six tiles intentionally not armed.
test("fleet probe live witness shot", async ({ page }) => {
  await page.goto("/#/platform");
  await expect(page.getByText("The fleet, right now (optional, server-only)")).toBeVisible({ timeout: 20000 });
  // The armed cache tile must report UP with a number
  await expect(page.getByText(/UP · \d+ ms/).first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "tests/e2e/__shots__/platform-fleet-live.png", fullPage: false });
});
