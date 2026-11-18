import { test, expect } from "@playwright/test";

// M1181 · The Librarian — the keyless witness. CI runs without VITE_LLM_ENABLED on the
// preview server, so the section prints the frozen-manual note instead of an ask form.
// Either way the section must reach one of the two honest states, the manual must open
// and render its chapter doors, and the console should be clean.
// M1194: the gate lane joined the chapter list — the anchor must be attached and its
// traced-FSM diagram must render (all four stage labels visible).
test("the embedded manual opens with its doors and the librarian's honest arm", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 240)}`));

  await page.goto("/#/manual", { waitUntil: "domcontentloaded" });
  // The preview server cold-compiles the route on the first hit; CI's pre-built preview is fast,
  // local dev servers are not — the assertions stay strict, only the budget grows.
  await expect(page.getByRole("heading", { name: "Football OS Manual" }).first()).toBeVisible({ timeout: 45000 });

  // The chapter anchors are on the page's side-rail of contents.
  for (const id of ["welcome", "modes", "explore", "epics", "spring", "honesty", "gatelane", "print"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }

  // The gate lane diagram renders an SVG with the four FSM stage labels.
  const diagram = page.locator("#gatelane svg[role='img']");
  await expect(diagram).toBeAttached();
  for (const stage of ["preflight", "build", "model", "precommit"]) {
    await expect(diagram.locator(`text=${stage}`)).toBeAttached();
  }

  // The librarian section renders: either the armed button or the keyless note.
  const askBtn = page.getByRole("button", { name: "ask the librarian" });
  const askCount = await askBtn.count();
  const noteCount = await page.getByText(/asleep in this build/).count();
  expect(askCount + noteCount, "the librarian must render either the ask button or the keyless note, never neither").toBeGreaterThan(0);
  expect(errors, `console errors on /manual: ${errors.join(" || ")}`).toHaveLength(0);
});
