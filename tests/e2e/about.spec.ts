import { test, expect } from "@playwright/test";

// M1129 — The world's chronicle of itself: the landing-page-to-everything essay about Football OS itself.
test("The About page renders its ledger, the chapters grid and the platform panel", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // M1130's scoped lane, mirroring the cinematic catalog: same-origin /api/spring/fleet 503 is the
    // untracked upstream being honestly absent, not a page error. Anything else reds the gate.
    const locationUrl = m.location()?.url ?? "";
    if (m.text().includes("503") && locationUrl.endsWith("/api/spring/fleet")) return;
    errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/about", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Football OS — the world's chronicle of itself" })).toBeVisible({ timeout: 20000 });
  // The world's ledger prints live counts.
  await expect(page.getByText("610", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("The atlases of the world")).toBeVisible();
  // The platform panel honestly reports the fleet probe state.
  await expect(page.getByText("The bedrock beneath the pitch")).toBeVisible();

  await page.waitForTimeout(400);
  expect(errors, `console errors on /about: ${errors.join(" || ")}`).toHaveLength(0);
});
