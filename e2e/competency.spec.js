import { test, expect } from "@playwright/test";
import { mockApi, seedSession } from "./fixtures.js";

// ─── Operator Certifications (v28.442 fence for the v28.441 build) ──────────
// The cloud-thread ship reached production without a CI run existing for its
// push; this fence + the finalize commit drag the merged tree through the
// gate, per CAM Article XXI (the gate has no side door).

test("Operator Certs page lists the cert with its standing", async ({ page }) => {
  await seedSession(page);
  await mockApi(page, {
    gets: {
      "/api/competency/certs": {
        can_sign_off: false,
        certs: [
          {
            id: 1,
            title: "Aerial / Articulating Boom Man Lift Operation Certification",
            test_passed: false,
            certified: false,
            test_id: 9,
            recert_months: 36,
          },
        ],
      },
    },
  });
  await page.goto("/competency");
  await expect(page.getByText("OPERATOR CERTIFICATIONS")).toBeVisible();
  await expect(page.getByText(/Man Lift Operation Certification/)).toBeVisible();
});
