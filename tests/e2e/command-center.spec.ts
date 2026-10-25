import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

test("the command centre lists the app's destinations and the visitor's standing", async ({ page }) => {
  await completeOnboarding(page, "CC Visitor");
  await expect(page.getByText("Command Center").first()).toBeVisible();
  for (const label of ["Player OS", "Manager OS", "Weekly Review", "Achievements"]) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  await expect(page.getByText(/PLAYER/).first()).toBeVisible();
});
