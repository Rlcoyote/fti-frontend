import { test, expect } from "@playwright/test";
import { mockApi, seedSession } from "./fixtures.js";

// ─── Tutorial (v28.419) ──────────────────────────────────────────────────────
// The tutorial is a first-class surface: the page renders role-filtered
// modules from the one content home, search narrows them, and the dashboard
// tour engine spotlights real anchors (auto-skipping absent ones).

test("Tutorial page renders modules and search narrows them", async ({ page }) => {
  await seedSession(page);
  await mockApi(page);
  await page.goto("/tutorial");

  await expect(page.getByText("START HERE", { exact: true })).toBeVisible();
  await expect(page.getByText("TESTER & PUMPER WEEKS", { exact: true })).toBeVisible();

  await page.getByPlaceholder(/Search the tutorial/).fill("rigged down");
  await expect(page.getByText("TICKETS — RIG UP, RIG DOWN, RENTAL", { exact: true })).toBeVisible();
  await expect(page.getByText("START HERE", { exact: true })).not.toBeVisible();
});

test("dashboard tour starts, spotlights, and steps through", async ({ page }) => {
  await seedSession(page);
  await mockApi(page);
  await page.goto("/tutorial");

  await page.getByRole("button", { name: /TAKE THE DASHBOARD TOUR/ }).click();
  // The tour navigates home and spotlights the first present anchor.
  await expect(page.getByText(/1 OF \d+/)).toBeVisible({ timeout: 8000 });
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect(page.getByText(/2 OF \d+/)).toBeVisible();
  await page.getByText("skip tour").click();
  await expect(page.getByText(/OF \d+/)).not.toBeVisible();
});
