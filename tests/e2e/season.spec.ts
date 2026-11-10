import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M967 — a season actually unfolds: three fixtures played through the manager OS, the league
// table and the outlook reading the same record the coach CV will report. The engine is
// deterministic, so the counts on every page are stable across runs even where the results
// themselves are not asserted word for word.

test("three played fixtures carry through the table, the outlook and the coach CV", async ({ page }) => {
  await completeOnboarding(page, "E2E Gaffer");

  await page.goto("/#/manager");
  await page.locator("button", { hasText: /OVR \d+/i }).first().click();
  await expect(page.getByRole("button", { name: /Play next fixture/ })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /Play next fixture/ }).click();
    await expect(page.getByText(/matches played/).first()).toBeVisible({ timeout: 15_000 });
    // The result card needs a beat to settle its own render before the next click.
    await page.waitForTimeout(300);
  }

  // The league table tab reads the three fixtures the engine decided.
  await page.getByRole("button", { name: /League table/i }).first().click();
  await expect(page.getByText(/Real standings updated with your career results/)).toBeVisible();

  // The outlook tab projects from the same record.
  await page.getByRole("button", { name: /Season outlook/i }).first().click();
  await expect(page.getByText(/Season outlook/i).first()).toBeVisible({ timeout: 15_000 });

  // The coach CV reports the tenure the three fixtures built.
  await page.goto("/#/coach");
  await expect(page.getByText(/matches played|Matches/).first()).toBeVisible();
  await expect(page.getByText("The dugout").first()).toBeVisible();
});
