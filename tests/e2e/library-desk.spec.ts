import { expect, test } from "@playwright/test";

// M1197 · The World Desk — the Library's imprisoned ask door. In CI there is no key,
// so the honest fold / via-local arm is what renders; the live path is proven by the
// LLM_LIVE witness suite, never by this offline spec.
test("/library renders the World Desk door beside the corpus", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.goto("/#/library", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 });

  // the World Desk section itself renders (trilingual-tolerant matcher)
  const desk = page.getByRole("region", { name: /THE WORLD DESK|世界问答台|世界問答台|THE WORLD DESK/i });
  await expect(desk.first()).toBeVisible({ timeout: 20000 });

  // the ask affordance exists — or, offline, the honest via-local note; either way, no fake live badge
  const askButton = page.getByRole("button", { name: /ask the world|请世界作答|請世界作答/i });
  const viaLocal = page.getByText(/the model is not reachable|未接.*模型|模型.*不可達|model is not/i);
  const buttonVisible = await askButton.first().isVisible().catch(() => false);
  if (buttonVisible) {
    await expect(askButton.first()).toBeDisabled();
  } else {
    await expect(viaLocal.first()).toBeVisible();
  }

  expect(errors, `console errors on /library: ${errors.join(" || ")}`).toHaveLength(0);
});
