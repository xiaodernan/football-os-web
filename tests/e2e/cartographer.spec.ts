import { expect, test } from "@playwright/test";

// M1219 · The Cartographer — offline E2E. The model-directed arm is LLM_LIVE-only.
test("/cartographer renders the model-chosen-branch door and its honest keyless arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    // The 503 is the injected transport refusal, not an app defect.
    if (m.type() === "error" && !/503 \(Service Unavailable\)/.test(m.text())) errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  // The dev server carries a key in this workspace. Refuse the transport so this spec measures
  // the honest offline arm, never a live model call (the model-directed arm is LLM_LIVE-only).
  await page.route("**/api/llm/chat", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline test"}' }));
  await page.goto("/#/cartographer", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("button", { name: /the model chooses the lens|模型选择视角|模型選擇視角/i })).toBeVisible({ timeout: 10000 });

  // Keyless runs still walk the graph — into the refused arm with the fold's answer.
  await page.getByRole("button", { name: /the model chooses the lens|模型选择视角|模型選擇視角/i }).click();
  await expect(page.getByText(/The fold answers instead|改由折叠作答|改由折疊作答/)).toBeVisible({ timeout: 10000 });

  expect(errors, `console errors on /cartographer: ${errors.join(" || ")}`).toHaveLength(0);
});
