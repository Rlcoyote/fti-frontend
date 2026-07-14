import { test, expect } from "@playwright/test";
import { mockApi, seedSession } from "./fixtures.js";

// ─── Add-ticket type picker (v28.321) ────────────────────────────────────────
// Regression fence for the 7/14 clipped-dropdown failure: on a SHORT job
// card, the old absolutely-positioned menu was clipped by the card's
// overflow:hidden — only Rig Up + Rig Down were visible/clickable. The fence
// asserts every type is visible AND inside the viewport (a clipped or
// off-screen option fails the box check, which is exactly what unit tests
// cannot see).

const ALL_TYPES = ["RIG UP", "RIG DOWN", "TESTER", "PUMPER", "RENTAL"];

test("ADD TICKET on a short job card offers ALL five types, visible and tappable", async ({ page }) => {
  await seedSession(page);
  await mockApi(page); // one job, zero tickets — the SHORTEST possible card
  await page.goto("/");

  // Open the (short) job card, then its ADD TICKET
  await page.getByText("300999", { exact: true }).first().click();
  await page.getByRole("button", { name: "+ ADD TICKET" }).click();

  const viewport = page.viewportSize();
  for (const label of ALL_TYPES) {
    const option = page.getByRole("button", { name: label, exact: true });
    await expect(option, `${label} must be visible`).toBeVisible();
    const box = await option.boundingBox();
    expect(box, `${label} must have a hit area`).not.toBeNull();
    expect(box.y, `${label} must sit inside the viewport`).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, `${label} must not overflow the viewport`).toBeLessThanOrEqual(viewport.height);
  }
});

test("picking TESTER from the picker opens the ticket form typed as Tester", async ({ page }) => {
  await seedSession(page);
  await mockApi(page);
  await page.goto("/");

  await page.getByText("300999", { exact: true }).first().click();
  await page.getByRole("button", { name: "+ ADD TICKET" }).click();
  await page.getByRole("button", { name: "TESTER", exact: true }).click();

  // The form opened in the Tester family (week banner is log-family-only).
  await expect(page.getByText(/WEEK OF|TESTER/i).first()).toBeVisible();
});
