import { test, expect } from "@playwright/test";

// M1177 · The Scout's Studio — the rail's CI-checkable honesty, zero spend.
// Keyless preview (CI included, no VITE_LLM_ENABLED on the dev server): the studio section prints
// the frozen-seed note and no model button. Armed preview: the button stands in that slot instead.
// Either way the page must reach one of the two honest states — never a silent dead end.
// The live, paid witness is live-llm-scout-studio.spec.ts (LLM_LIVE=1); this spec costs nothing.
test("the dossier renders either the ask button or the keyless frozen-seed note", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/dossier", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /the last page/i })).toBeVisible({ timeout: 20000 });

  const ask = page.getByRole("button", { name: "get the desk's take" });
  const askCount = await ask.count();
  const noteCount = await page.getByText("the model is asleep in this build").count();
  expect(askCount + noteCount, "the studio must render either the ask button or the keyless note, never neither").toBeGreaterThan(0);
  expect(errors, `console errors on /dossier: ${errors.join(" || ")}`).toHaveLength(0);
});
