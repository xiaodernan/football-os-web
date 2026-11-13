import { expect, test } from "@playwright/test";

// M1104 — the Spring fleet probe, walked in a real browser against a real dev/preview server.
// The route /api/spring/fleet is same-origin, GET-only, and server-only: with no SPRING_*_BASE
// set (the default on this machine and in CI) the envelope says reason:"unconfigured" and the
// panel prints the honest "not armed" line. If a maintainer arms the envs, the same assertion
// also accepts the live summary line — we never fail a build for reporting the truth.
test("the platform fleet panel renders and degrades honestly", async ({ page }) => {
  const hit = page.waitForResponse(
    (r) => r.url().includes("/api/spring/fleet") && r.request().method() === "GET",
    { timeout: 20000 },
  );
  await page.goto("/#/platform");
  // The panel is present with its English dictionary copy (the anchor the i18n gate guards).
  await expect(page.getByText("The fleet, right now (optional, server-only)")).toBeVisible();
  await expect(page.getByText("never a fabricated green", { exact: false })).toBeVisible();
  // The same-origin probe answered — 503 + reason unconfigured when nothing is armed,
  // 200 + tiles when it is. Never a 404 into an unimplemented route.
  const response = await hit;
  expect([200, 503]).toContain(response.status());
  await expect(
    page.getByText(/not armed — no SPRING_\*_BASE is set/).or(page.getByText(/armed · .* reporting UP/)).first(),
  ).toBeVisible({ timeout: 10000 });
});
