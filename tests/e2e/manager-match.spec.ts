import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

test("the manager OS opens on a league and lists its clubs", async ({ page }) => {
  await completeOnboarding(page, "Manager Visitor");
  await page.goto("/#/manager");

  // First, go through the ClubPicker - select Premier League
  await expect(page.getByRole("button", { name: /Premier League/ })).toBeVisible();
  await page.getByRole("button", { name: /Premier League/ }).click();

  // Then select Arsenal
  await expect(page.getByRole("button", { name: /Arsenal/ })).toBeVisible();
  await page.getByRole("button", { name: /Arsenal/ }).click();

  // Now verify we're in the Manager OS overview - check for manager-specific tabs
  await expect(page.getByRole("button", { name: /Squad/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Transfers/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tactics/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /League table/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Season outlook/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Match prep/ })).toBeVisible();
  
  // Verify the club name appears
  await expect(page.getByText("Arsenal")).toBeVisible();
});