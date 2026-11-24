import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1238 — the transfer broker: door 19, the one that prices a man. The desk opens on the
// world's most valuable player with a fee multiple on the table; the fold's ruling is real
// arithmetic and is on screen before anyone asks; asking without a reachable model lands on
// the fold arm, labelled.
test("the transfer broker rules on a real deal", async ({ page }) => {
  await completeOnboarding(page, "Broker Visitor");
  await page.goto("/#/broker");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Transfer Broker" })).toBeVisible();
  await expect(page.getByText(/A fee is on the table for the world's most valuable player/)).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");

  // The deal tiles carry real figures and the fee multiples are switchable.
  await expect(page.getByText("The world's valuation").first()).toBeVisible();
  await page.getByRole("button", { name: "2x" }).click();
  await expect(page.getByText("2.0x the value")).toBeVisible();

  // The fold's ruling is on screen before anyone asks — the honest default.
  await expect(page.getByText("The fold's ruling").first()).toBeVisible();

  // Asking without a reachable model lands on the fold arm, labelled.
  await page.getByRole("button", { name: "Rule on the deal" }).click();
  await expect(page.getByText(/could not answer through the model/).first()).toBeVisible();
});
