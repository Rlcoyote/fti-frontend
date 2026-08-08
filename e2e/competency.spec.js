import { test, expect } from "@playwright/test";
import { mockApi, seedSession } from "./fixtures.js";

// ─── Operator Certifications (v28.442 fence for the v28.441 build) ──────────
// The cloud-thread ship reached production without a CI run existing for its
// push; this fence + the finalize commit drag the merged tree through the
// gate, per CAM Article XXI (the gate has no side door).

const COMPETENCY_CERTS = {
  can_sign_off: false,
  certs: [
    {
      id: 1,
      title: "Man Basket / Aerial Boom Lift (MEWP)",
      test_passed: false,
      certified: false,
      test_id: 9,
      recert_months: 36,
    },
  ],
};

test("Operator Certs page lists the cert with its standing", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, { gets: { "/api/competency/certs": COMPETENCY_CERTS } });
  await page.goto("/competency");
  await expect(page.getByText("OPERATOR CERTIFICATIONS")).toBeVisible();
  await expect(page.getByText(/Man Basket \/ Aerial Boom Lift/)).toBeVisible();
});

// v28.444 — the strip list derives from navMap rows now (the FTIDashboard
// ALL_NAV_ITEMS copy silently dropped Operator Certs — Entry 7). This fence
// keeps the SAFETY group honest: Operator Certs present, Training displayed
// as TRAINING (not "Competency").
test("SAFETY nav group shows Training and Operator Certs", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, { gets: { "/api/competency/certs": COMPETENCY_CERTS } });
  await page.goto("/");
  // Hover, not click: the group pill opens on mouseenter; a click on the
  // already-hover-opened pill toggles it CLOSED (real mouse behavior).
  await page.getByRole("button", { name: "SAFETY" }).hover();
  await expect(page.getByRole("button", { name: "Operator Certs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Training", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Competency", exact: true })).toHaveCount(0);
});

// v28.444 — THE DOOR: picking an earned-in-app cert in the ADD CERTIFICATION
// name dropdown is not a grey wall; it lands on Operator Certs.
test("picking an in-house cert in Add Certification opens Operator Certs", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, { gets: { "/api/competency/certs": COMPETENCY_CERTS } });
  await page.goto("/safety");
  await page.getByRole("button", { name: "+ ADD CERTIFICATION" }).click();
  await page.locator("select", { hasText: "Pick a type first" }).waitFor();
  await page.locator("select", { hasText: "Select type..." }).selectOption("H2S");
  await page.locator("select", { hasText: "Select the certification..." }).selectOption("__inhouse__:1");
  await expect(page).toHaveURL(/\/competency$/);
  await expect(page.getByText("OPERATOR CERTIFICATIONS")).toBeVisible();
});

// v28.444 — dirty-close gate: typed input never silently vanishes.
test("Add Certification refuses to silently discard typed input", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, { gets: { "/api/competency/certs": COMPETENCY_CERTS } });
  await page.goto("/safety");
  await page.getByRole("button", { name: "+ ADD CERTIFICATION" }).click();
  await page.locator("select", { hasText: "Select employee..." }).selectOption({ label: "E2E Tester" });
  await page.getByRole("button", { name: "CANCEL" }).click();
  await expect(page.getByText("Unsaved Changes")).toBeVisible();
  await page.getByRole("button", { name: "KEEP EDITING" }).click();
  await expect(page.getByText("CERTIFICATION NAME *")).toBeVisible();
  await page.getByRole("button", { name: "CANCEL" }).click();
  await page.getByRole("button", { name: "YES, DISCARD" }).click();
  await expect(page.getByText("CERTIFICATION NAME *")).toHaveCount(0);
});
