import { expect, test } from "@playwright/test";

// M1224 · The Long-Context Chronicler, door 15. The transport is refused with 503, so the graph
// must take an honest fold arm (folded when the live rail is armed, offline in a keyless build): a
// structure-valid, numeral-clean chapter told from the very same verbatim tape line the model was
// offered. No invented figure, no fake live badge.
test("the chronicler refuses an offline model and tells the chapter from the tape", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !/503 \(Service Unavailable\)|offline test/.test(m.text())) errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));

  await page.route("**/api/llm/chat", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"offline test"}' }));

  await page.goto("/#/chronicler", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /long-context chronicler/i })).toBeVisible({ timeout: 20000 });

  await expect(page.getByText(/offered fixtures|来自完整赛程带|來自完整賽程帶/i)).toBeVisible();
  await expect(page.getByText(/M\d{4}.*MD\d+/).first()).toBeVisible();
  await expect(page.getByText(/structure verifier then numeral verifier|先结构验证再数字验证|先結構驗證再數字驗證/i)).toBeVisible();

  await page.getByRole("button", { name: /write the chapter|从完整赛程带写|從完整賽程帶寫/i }).click();

  await expect(page.getByText(/SETTING:/)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/TURN:/)).toBeVisible();
  await expect(page.getByText(/ECHO:/)).toBeVisible();
  // The dev server arms the live rail when VITE_LLM_ENABLED is set, so a refused transport walks
  // the `folded` edge; a keyless build walks `offline`. Both badges are honest fold answers and the
  // assertion accepts the exact shipped copy of either, never a fabricated "live" badge.
  await expect(page.getByText(/a verifier refused|no model available|一道验证拒绝|没有可用模型|一道驗證拒絕|沒有可用模型/i)).toBeVisible();
  await expect(page.getByText(/CHAPTER · STATEGRAPH|章节 · 状态图|章節 · 狀態圖/i)).toBeVisible();
  // The method line and the state-seal line both name the two stages; `.first()` keeps the
  // assertion on the shipped copy rather than depending on how many times it is printed.
  await expect(page.getByText(/structure verifier|结构验证|結構驗證/i).first()).toBeVisible();
  await expect(page.getByText(/numeral verifier|数字验证|數字驗證/i).first()).toBeVisible();
  await expect(page.getByText(/without a model|没有模型时|沒有模型時/i)).toBeVisible();

  expect(errors, `console errors in the chronicler: ${errors.join(" || ")}`).toHaveLength(0);
});
