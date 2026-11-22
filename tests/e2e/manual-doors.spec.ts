import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1240 — the manual catches up with the world: the new "doors that decide" chapter teaches the
// three ruling desks and the four boards, and the explore links reach the new surfaces.
test("the manual teaches the doors that decide", async ({ page }) => {
  await completeOnboarding(page, "Manual Visitor");
  await page.goto("/#/manual");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The doors that decide" })).toBeVisible();
  await expect(page.getByText(/Three desks let the model RULE, not just answer/)).toBeVisible();

  // The three desks and the boards paragraph are all on the page.
  const body = await page.locator("main").innerText();
  expect(body).toContain("The Selection Chair");
  expect(body).toContain("The Training Desk");
  expect(body).toContain("The Transfer Broker");
  expect(body).toContain("Four boards read the world's shape");

  // The explore links reach the new surfaces.
  await expect(page.getByRole("link", { name: "Keepers' Union" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Transfer Broker" }).first()).toBeVisible();
});
