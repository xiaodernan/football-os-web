import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1233 — the selection chair: the sixteenth door, and the first that DECIDES. Without a model
// key in the browser's reach the door answers with the fold's own deterministic XI, openly
// labelled — which is exactly what a fresh test device has, so this walks the honest arm.
test("the selection chair answers with the fold's XI and names the squad", async ({ page }) => {
  await completeOnboarding(page, "Chair Visitor");
  await page.goto("/#/chair");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Selection Chair" })).toBeVisible();
  await expect(page.getByText("The model names a World XI — from the world's strongest sixty, and from nothing else.")).toBeVisible();

  // The squad panel names the club and the four lines.
  await expect(page.getByText("The pool in the chair's hands")).toBeVisible();
  await expect(page.getByText("Keeper").first()).toBeVisible();
  await expect(page.getByText("Defenders").first()).toBeVisible();

  // The fold's XI is on screen before anyone asks — the honest default.
  await expect(page.getByText("The fold's XI").first()).toBeVisible();

  // Asking without a reachable model lands on the fold arm, labelled.
  await page.getByRole("button", { name: "Ask the chair" }).click();
  await expect(page.getByText(/could not answer through the model/).first()).toBeVisible();

  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");
});
