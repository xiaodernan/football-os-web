import { expect, test } from "@playwright/test";

// M965 — every route in the route table renders inside the shell, for a fresh visitor. This is
// the smoke net under the whole route table: a screen that throws during render blanks the
// shell, and a route whose screen was never mounted prints the build-queue line instead of its
// own heading — both fail here, on every run, without anyone hand-listing what each screen says.
const ROUTES = [
  "/squad", "/notebook", "/value", "/poll", "/injuries", "/club-compare", "/leaders",
  "/projection", "/run-in", "/scenarios", "/title-race", "/head-to-head", "/briefing",
  "/streaks", "/leads", "/coach", "/discipline", "/clock", "/timing", "/home-away",
];

for (const route of ROUTES) {
  test(`the ${route} screen mounts inside the shell`, async ({ page }) => {
    await page.goto(`/#${route}`);
    // The shell is up: the sidebar's first entry is the stable furniture of every mounted page.
    await expect(page.getByText("Command Center").first()).toBeVisible();
    // ...and the page is the screen itself, not the route table's build-queue fallback.
    await expect(page.getByText("This module is next in the build queue")).toBeHidden();
  });
}
