import { expect, test } from "@playwright/test";
import { completeOnboarding, dismissTour } from "./helpers";

// M1231 — the keepers' union: the world's goalkeepers, named, each with the club's own
// clean-sheet record read from the shared wall fold. The screen walks its tiles, its board and
// its method line.
test("the keepers' union names a number one per club with the wall behind him", async ({ page }) => {
  await completeOnboarding(page, "Keeper Visitor");
  await page.goto("/#/keepers");
  await dismissTour(page);

  await expect(page.getByRole("heading", { name: "The Keepers' Union" })).toBeVisible();
  await expect(page.getByText("Every club's number one, and the wall they stand behind.")).toBeVisible();

  // The three tiles carry real figures — no NaN anywhere on the board.
  await expect(page.getByText("Best keeper").first()).toBeVisible();
  await expect(page.getByText("Keepers").first()).toBeVisible();
  const body = await page.locator("main").innerText();
  expect(body).not.toContain("NaN");

  // The board's rows carry the club's clean-sheet line in the fold's own shape.
  await expect(page.getByText(/played · \d+ clean · [\d.]+%/).first()).toBeVisible();

  // The method line is honest about what the sheets are and who the keeper is.
  await expect(page.getByText(/Clean sheets are the club's defensive record/)).toBeVisible();
});
