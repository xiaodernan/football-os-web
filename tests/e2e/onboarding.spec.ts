import { expect, test } from "@playwright/test";
import { completeOnboarding } from "./helpers";

// M1069 — the cinematic hero is decoration, not content. proof-motion.mjs guards the shipped
// CSS/JSX statically; this walks the real browser to confirm the two things a source parse cannot
// see: the glow orbs stay OUT of the accessibility tree (a screen reader hears words, not blur),
// and a visitor who asked the OS for reduced motion actually gets a still hero.
test("the hero keeps its words visible and its orbs hidden from assistive tech", async ({ page }) => {
  // The hero is a first-visit cold-compile window on a shared machine: wait for the DOM, not for
  // every resource's `load` (the animated glow/fade can hold `load` open). Visibility assertions
  // below are the real contract; the goto is only navigation.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // The headline and CTA are the content — still visible in the visible tree.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Enter Football OS/i }).first()).toBeVisible();
  // Three stadium-glow orbs + the grid + the fade are pure decor: present in the DOM, but hidden
  // from assistive tech. proof-motion pins the same contract on the source; this checks the render.
  const orbs = page.locator("section .fo-orb");
  expect(await orbs.count()).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < await orbs.count(); i++) {
    // React serialises the boolean JSX attribute as aria-hidden="true" — the accessible state.
    await expect(orbs.nth(i)).toHaveAttribute("aria-hidden", "true");
  }
});

test("a reduced-motion visitor gets a still hero", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The universal prefers-reduced-motion rule collapses every animation to ~0ms / 1 iteration.
  // A still headline is the symptom a visitor actually cares about; the token-level contract
  // (duration, iteration-count, transition all zeroed) lives in proof-motion.mjs.
  const animCount = await page.evaluate(() => {
    const el = document.querySelector(".fo-spectrum, .fo-orb") as HTMLElement | null;
    return el ? getComputedStyle(el).animationDuration : "none";
  });
  expect(typeof animCount).toBe("string");
  expect(animCount === "none" || parseFloat(animCount as string) < 0.01).toBe(true);
});

// The core path the plan names first: landing → onboarding → command centre.
test("a visitor enters from the landing page and lands in the command centre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Enter Football OS/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /Enter Football OS/i }).first().click();
  await expect(page.getByText("What are you?")).toBeVisible();
  await page.getByRole("button", { name: /^Manager/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.locator("input").first()).toBeVisible();
});

test("the onboarding walk completes and the profile follows the visitor into the app", async ({ page }) => {
  await completeOnboarding(page, "E2E Striker");
  await expect(page.getByText("Command Center").first()).toBeVisible();
  await expect(page.getByText("E2E Striker").first()).toBeVisible();
  await expect(page.getByText(/Level 1/).first()).toBeVisible();
});

// M1073/M1076 — the command centre borrowed landing's cinematic hero, so it inherits the SAME
// decoration contract proof-motion pins on the source: the two stadium-glow orbs are present in the
// DOM but stay OUT of the accessibility tree, while the heading (home · displayName) is real
// content. This walks the rendered dashboard after onboarding — the cold visitor's actual first
// screen — which a source parse alone cannot confirm.
test("the command centre hero keeps its heading visible and its orbs hidden from assistive tech", async ({ page }) => {
  await completeOnboarding(page, "E2E Striker");
  // The hero headline is content: "Home · E2E Striker" (nav.home · profile.displayName).
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E Striker");
  // Two lime/cyan glow orbs + the faint grid decorate this hero only; each is aria-hidden so a
  // screen reader hears the heading, not the blur. React serialises the boolean as aria-hidden="true".
  const orbs = page.locator(".fo-orb");
  expect(await orbs.count()).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < await orbs.count(); i++) {
    await expect(orbs.nth(i)).toHaveAttribute("aria-hidden", "true");
  }
});
