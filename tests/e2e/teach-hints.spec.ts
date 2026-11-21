import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M1229 The Teaching Hints: every module tile on the dashboard wears a one-line lesson behind a
// "?", the lesson never navigates, reading it marks it on the device, and the settings row counts
// and resets the ledger. The dashboard is where a first-time reader lands, so this is where the
// teaching contract is walked.
test("the dashboard's module tiles each carry a lesson that teaches without navigating", async ({ page }) => {
  await completeOnboarding(page, "Teach Visitor");

  // Fresh device: every lesson is unread, so every "?" announces itself as an unread lesson.
  // Scoped to the main board: the palette trigger in the header wears one of its own.
  const hints = page.locator("main").getByRole("button", { name: "Unread lesson" });
  await expect(hints).toHaveCount(22);

  // The first tile's lesson opens with the player OS's own sentence.
  await hints.first().click();
  await expect(page.getByRole("note")).toBeVisible();
  await expect(page.getByText("Your player OS: train, complete sessions and watch your attributes grow week by week.")).toBeVisible();

  // Reading a lesson must NOT navigate: the URL stays on the command centre.
  expect(page.url()).toContain("#/");
  expect(page.url()).not.toContain("#/player");

  // Escape closes it, and the hint that was read stops announcing "unread".
  await page.keyboard.press("Escape");
  await expect(page.getByRole("note")).toHaveCount(0);
  await expect(hints).toHaveCount(21);
  await expect(page.locator("main").getByRole("button", { name: "What is this?" })).toHaveCount(1);
});

test("the settings row counts the unread lessons and marks them all unread again", async ({ page }) => {
  await completeOnboarding(page, "Teach Visitor");
  await page.goto("/#/settings");

  await expect(page.getByText("Teaching hints").first()).toBeVisible();
  await expect(page.getByText("25 lessons unread")).toBeVisible();

  await page.getByRole("button", { name: "Mark all unread" }).click();
  await expect(page.getByText("All lessons marked unread")).toBeVisible();
  await expect(page.getByText("25 lessons unread")).toBeVisible();
});

test("the palette trigger wears its lesson beside the search box", async ({ page }) => {
  await completeOnboarding(page, "Teach Visitor");
  const paletteHint = page.locator("header").getByRole("button", { name: "Unread lesson" });
  await paletteHint.click();
  await expect(page.getByText("The command palette: press the button (or Ctrl+K) to jump anywhere or run any action.")).toBeVisible();
});
